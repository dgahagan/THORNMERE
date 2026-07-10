// Turn-based combat: party vs up to 4 monster groups at 10'–90'.
// Flow: makeCombat() → UI collects one order per able character
// (setOrder / setPartyOrder) → resolveRound() returns narration events and
// advances state ('orders' | 'fled' | 'victory' | 'defeat').

import { DB } from './db.js';
import { rollDice } from './rng.js';
import {
  partyChars, realParty, partySlotsFree, summonSlotFree, inZone, currentMap
} from './gamestate.js';
import {
  statMod, effectiveAC, attackBonus, damageBonus, attacksPerRound, critChance,
  weaponOf, unarmedDice, savingThrow, applyDamage, healChar, isAlive, clsOf,
  invItem, removeFromInventory
} from './character.js';
import { partyAcBonus, songDmgBonus, getEffect, hasEffect, addEffect } from './effects.js';
import { advanceClock } from './maze.js';
import { canCastNow, paySpell, durationOf, makeSummon } from './spells.js';
import { singCombat } from './songs.js';

const MAX_GROUPS = 4;
const MAX_MEMBERS = 9;

function makeGroup(rng, monsterId, count, dist, illusion = false) {
  const def = DB.monster(monsterId);
  const members = [];
  for (let i = 0; i < Math.min(count, MAX_MEMBERS); i++) {
    const hp = Math.max(1, rollDice(rng, def.hp));
    members.push({ hp, maxHp: hp });
  }
  return {
    monsterId, def, members, dist,
    illusion: illusion || !!def.illusionFlag,
    debuffHit: 0, debuffAc: 0,
    silenced: 0, feared: 0, stunned: 0,
    rage: 1, phasesDone: []
  };
}

export function makeCombat(game, rng, spec) {
  const map = currentMap(game);
  const groups = [];
  for (const g of spec.groups.slice(0, MAX_GROUPS)) {
    const count = typeof g.count === 'number' ? g.count : rollDice(rng, String(g.count));
    const dist = spec.fixed ? 30 : (map.kind === 'town' ? 10 * rng.range(1, 3) : 10 * rng.range(1, 9));
    groups.push(makeGroup(rng, g.monster, Math.max(1, count), dist));
  }
  // Random encounters always open with a foe in reach — never a string of
  // dead "advance" turns. Pull the nearest group to melee if none rolled there.
  if (!spec.fixed && groups.length && !groups.some(g => g.dist <= 10)) {
    let nearest = groups[0];
    for (const g of groups) if (g.dist < nearest.dist) nearest = g;
    nearest.dist = 10;
  }
  // an exploration song dies the moment swords come out
  const songEnded = !!game.song;
  game.song = null;
  return {
    game, rng, groups,
    state: 'orders', round: 0,
    orders: {}, partyOrder: null,
    fixed: spec.fixed || null,
    canRun: spec.fixed ? false : true,
    songEnded,
    songRound: null,
    defending: {}, hidden: {},
    killedXp: 0, killedGold: 0,
    result: null
  };
}

export function groupLabel(c, i) {
  const g = c.groups[i];
  const n = g.members.length;
  const name = n === 1 ? g.def.name : g.def.plural;
  return `${n} ${name} (${g.dist}')`;
}

export function livingGroups(c) { return c.groups.filter(g => g.members.length > 0); }

export function ableParty(c) {
  return partyChars(c.game).filter(ch => isAlive(ch) && !ch.summon);
}

export function setOrder(c, chId, order) { c.orders[chId] = order; }
export function setPartyOrder(c, order) { c.partyOrder = order; } // 'run' | 'advance'

// The living close ranks: "front rank" is the first three LIVING members of
// the marching order, so a fight never stalemates over the fallen.
function livingOrder(c) {
  return partyChars(c.game).filter(ch => isAlive(ch));
}
function frontRank(c) {
  return livingOrder(c).slice(0, 3).filter(ch => !c.hidden[ch.id]);
}
function anyRank(c) {
  return livingOrder(c).filter(ch => !c.hidden[ch.id]);
}

function needToHit(targetAC, bonus) {
  return Math.max(2, Math.min(20, 10 + Math.floor((10 - targetAC) / 2) - bonus));
}

function monsterSaves(rng, group, casterLevel, mod = 0) {
  const r = rng.d(20);
  if (r === 20) return true;
  if (r === 1) return false;
  return r + group.def.tier * 2 + mod >= 12 + Math.floor(casterLevel / 2);
}

function killMember(c, group, idx) {
  group.members.splice(idx, 1);
  if (!group.illusion) {
    c.killedXp += group.def.xp;
    c.killedGold += rollDice(c.rng, group.def.gold || '0');
  }
}

function checkPhases(c, group, ev) {
  const def = group.def;
  if (!def.phases || !group.members.length) return;
  const frac = group.members[0].hp / group.members[0].maxHp;
  for (let i = 0; i < def.phases.length; i++) {
    const ph = def.phases[i];
    if (group.phasesDone.includes(i) || frac > ph.at) continue;
    group.phasesDone.push(i);
    ev(ph.text);
    if (ph.rage) { group.rage = ph.rage; }
    for (const add of ph.add || []) {
      const count = rollDice(c.rng, String(add.count));
      const existing = c.groups.find(g => g.monsterId === add.monster && g.members.length > 0);
      if (livingGroups(c).length < MAX_GROUPS && (!existing || c.rng.chance(50))) {
        c.groups.push(makeGroup(c.rng, add.monster, count, 30));
      } else if (existing) {
        for (let k = 0; k < count && existing.members.length < MAX_MEMBERS; k++) {
          const hp = Math.max(1, rollDice(c.rng, DB.monster(add.monster).hp));
          existing.members.push({ hp, maxHp: hp });
        }
      }
    }
  }
}

// damage one group member; returns true if it died
function damageMember(c, group, idx, dmg, ev, label) {
  const m = group.members[idx];
  m.hp -= dmg;
  if (m.hp <= 0) {
    killMember(c, group, idx);
    ev(`${label} for ${dmg}, slaying it!`);
    return true;
  }
  ev(`${label} for ${dmg}.`);
  checkPhases(c, group, ev);
  return false;
}

function partyDamageBonusTotal(c) {
  let b = songDmgBonus(c.game);
  const bc = getEffect(c.game, 'battlecry');
  if (bc) b += bc.dmg;
  if (c.songRound?.song.combat.kind === 'dmg') b += c.songRound.song.combat.amount + (c.songRound.power >= 3 ? 1 : 0);
  return b;
}
function partyAcBonusTotal(c) {
  let b = partyAcBonus(c.game);
  if (c.songRound?.song.combat.kind === 'ac') b += c.songRound.song.combat.amount + (c.songRound.power >= 3 ? 1 : 0);
  return b;
}
function foeHitPenalty(c) {
  if (c.songRound?.song.combat.kind === 'foehit') return c.songRound.song.combat.amount + (c.songRound.power >= 3 ? 1 : 0);
  return 0;
}
function songSaveBonus(c) {
  if (c.songRound?.song.combat.kind === 'saves') return c.songRound.song.combat.amount;
  return 0;
}

// ---- party-side actions ----------------------------------------------------
function actAttack(c, ch, targetIdx, ev) {
  let group = c.groups[targetIdx];
  if (!group || !group.members.length) group = livingGroups(c)[0];
  if (!group) return;
  const rank = livingOrder(c).indexOf(ch);
  const weapon = ch.summon ? null : weaponOf(ch);
  const missile = weapon?.missile;
  const inMelee = group.dist <= 10 && rank < 3;
  const inRange = missile && weapon.range >= group.dist;
  if (!inMelee && !inRange) {
    // try any group in reach instead
    const alt = livingGroups(c).find(g =>
      (g.dist <= 10 && rank < 3) || (missile && weapon.range >= g.dist));
    if (!alt) { ev(`${ch.name} can reach no foe and stands ready.`); c.defending[ch.id] = true; return; }
    group = alt;
  }
  const sneak = c.hidden[ch.id];
  delete c.hidden[ch.id];
  const swings = attacksPerRound(ch);
  for (let s = 0; s < swings && group.members.length; s++) {
    const ac = group.def.ac + group.debuffAc;
    const bonus = attackBonus(ch, { missile }) + (sneak ? 4 : 0);
    const roll = c.rng.d(20);
    const verb = missile ? 'shoots at' : 'swings at';
    if (roll === 1 || (roll !== 20 && roll < needToHit(ac, bonus))) {
      ev(`${ch.name} ${verb} the ${group.def.name} and misses.`);
      continue;
    }
    // Strider's killing eye
    if (!missile && !group.def.boss && critChance(ch) && c.rng.chance(critChance(ch))
      && !monsterSaves(c.rng, group, ch.level)) {
      killMember(c, group, 0);
      ev(`${ch.name} strikes true — the ${group.def.name} drops where it stands!`);
      continue;
    }
    let dice = weapon ? weapon.dmg : unarmedDice(ch);
    let dmg = Math.max(1, rollDice(c.rng, dice) + damageBonus(ch) + partyDamageBonusTotal(c));
    if (sneak && s === 0) dmg *= 2;
    if (weapon?.bonus?.undeadDouble && group.def.undead) dmg *= 2;
    damageMember(c, group, 0, dmg, ev, `${ch.name} ${missile ? 'hits' : 'strikes'} the ${group.def.name}`);
  }
}

function summonAct(c, s, ev) {
  const def = DB.monster(s.monsterId);
  const targets = livingGroups(c);
  if (!targets.length) return;
  for (const atk of def.attacks) {
    const group = targets.find(g => g.dist <= (atk.range || 10));
    if (!group) continue;
    const ac = group.def.ac + group.debuffAc;
    const bonus = def.tier * 2;
    const roll = c.rng.d(20);
    if (roll === 1 || (roll !== 20 && roll < needToHit(ac, bonus))) {
      ev(`The ${s.name} misses the ${group.def.name}.`);
    } else {
      const dmg = Math.max(1, rollDice(c.rng, atk.dmg));
      damageMember(c, group, 0, dmg, ev, `The ${s.name}'s ${atk.name} hits the ${group.def.name}`);
    }
    return;
  }
  ev(`The ${s.name} can reach no foe.`);
}

export function castCombatSpell(c, ch, spell, target, ev) {
  const err = canCastNow(c.game, ch, spell, { combat: true });
  if (err) { ev(`${ch.name} hesitates — ${err}`); return; }
  if (!paySpell(c.game, ch, spell)) {
    ev(`${ch.name} casts ${spell.name}... and the dead air swallows it. Fizzle!`);
    return;
  }
  ev(`${ch.name} casts ${spell.name} (${spell.code})!`);
  const eff = spell.effect;
  const game = c.game;
  const until = game.clock + durationOf(eff, ch.level);

  const resisted = (g) => g.def.magicResist && c.rng.chance(g.def.magicResist);
  const groupsFor = () => spell.target === 'allgroups'
    ? livingGroups(c).filter(g => g.dist <= spell.range)
    : [c.groups[target]].filter(g => g && g.members.length && g.dist <= spell.range);

  switch (eff.kind) {
    case 'damage': {
      const gs = groupsFor();
      if (!gs.length) { ev('The spell finds nothing in reach.'); break; }
      for (const g of gs) {
        if (resisted(g)) { ev(`The magic splashes off the ${g.def.plural}!`); continue; }
        if (spell.target === 'foe') {
          let dmg = rollDice(c.rng, eff.dice);
          if (eff.undeadDouble && g.def.undead) dmg *= 2;
          damageMember(c, g, 0, dmg, ev, `The spell sears the ${g.def.name}`);
        } else {
          let dmg = rollDice(c.rng, eff.dice);
          if (eff.undeadDouble && g.def.undead) dmg *= 2;
          let killed = 0;
          for (let i = g.members.length - 1; i >= 0; i--) {
            g.members[i].hp -= dmg;
            if (g.members[i].hp <= 0) { killMember(c, g, i); killed++; }
          }
          ev(`${spell.name} engulfs the ${g.def.plural} for ${dmg}${killed ? `, slaying ${killed}` : ''}!`);
          checkPhases(c, g, ev);
          if (eff.stun && g.members.length && !g.def.boss && !monsterSaves(c.rng, g, ch.level)) {
            g.stunned = 1; ev(`The ${g.def.plural} reel, senseless!`);
          }
        }
      }
      break;
    }
    case 'instakill': {
      const gs = groupsFor();
      if (!gs.length) { ev('The spell finds nothing in reach.'); break; }
      for (const g of gs) {
        if (g.def.boss) { ev(`The ${g.def.name} is beyond such words.`); continue; }
        if (resisted(g)) { ev(`The magic splashes off!`); continue; }
        if (spell.target === 'foe') {
          if (monsterSaves(c.rng, g, ch.level, eff.save || 0)) ev(`The ${g.def.name} shudders, but stands.`);
          else { killMember(c, g, 0); ev(`The ${g.def.name} simply ceases.`); }
        } else {
          let slain = 0;
          for (let i = g.members.length - 1; i >= 0; i--) {
            if (!monsterSaves(c.rng, g, ch.level, eff.save || 0)) { killMember(c, g, i); slain++; }
          }
          ev(slain ? `${slain} of the ${g.def.plural} cease to be!` : `The ${g.def.plural} withstand the word.`);
        }
      }
      break;
    }
    case 'fear': {
      for (const g of groupsFor()) {
        if (g.def.boss) { ev(`The ${g.def.name} knows no fear.`); continue; }
        if (resisted(g) || monsterSaves(c.rng, g, ch.level, eff.save || 0)) ev(`The ${g.def.plural} hold firm.`);
        else { g.feared = 3; ev(`The ${g.def.plural} quail in terror!`); }
      }
      break;
    }
    case 'silence': {
      for (const g of groupsFor()) {
        if (resisted(g) || monsterSaves(c.rng, g, ch.level, eff.save || 0)) ev(`The ${g.def.plural} keep their voices.`);
        else { g.silenced = 3; ev(`The ${g.def.plural} mouth empty air!`); }
      }
      break;
    }
    case 'stun': {
      for (const g of groupsFor()) {
        if (g.def.boss) { ev(`The ${g.def.name} shrugs it off.`); continue; }
        if (resisted(g) || monsterSaves(c.rng, g, ch.level, eff.save || 0)) ev(`The ${g.def.plural} shake it off.`);
        else { g.stunned = 1; ev(`The ${g.def.plural} stand frozen!`); }
      }
      break;
    }
    case 'debuff': {
      for (const g of groupsFor()) {
        if (resisted(g)) { ev('The magic splashes off!'); continue; }
        if (eff.what === 'hit') g.debuffHit += eff.amount;
        else g.debuffAc += eff.amount;
        if (eff.silence) g.silenced = 3;
        ev(`The ${g.def.plural} falter.`);
      }
      break;
    }
    case 'heal': {
      const targets = spell.target === 'party' ? realParty(game) : [target];
      for (const t of targets) {
        if (!t || !isAlive(t)) continue;
        const amt = eff.full ? t.maxHp : rollDice(c.rng, eff.dice);
        const healed = healChar(t, amt);
        if (healed) ev(`${t.name} is healed ${healed}.`, { who: t.id, kind: 'heal' });
        for (const flag of eff.cure || []) if (t.status[flag]) { delete t.status[flag]; ev(`${t.name} is cured of ${flag}.`, { who: t.id, kind: 'heal' }); }
      }
      break;
    }
    case 'cure': {
      const t = target;
      if (t) for (const flag of eff.flags) if (t.status[flag]) { delete t.status[flag]; ev(`${t.name} is cured of ${flag}.`, { who: t.id, kind: 'heal' }); }
      break;
    }
    case 'shield':
      addEffect(game, { kind: 'shield', ac: eff.ac, until });
      ev('The air hardens about the party.');
      break;
    case 'battlecry':
      addEffect(game, { kind: 'battlecry', dmg: eff.dmg, until: game.clock + 10 });
      ev('Every blade in the party hums with intent.');
      break;
    case 'trueseeing': {
      addEffect(game, { kind: 'trueseeing', until });
      ev('Eyes unclouded — the false cannot stand!');
      dispelIllusions(c, ev);
      break;
    }
    case 'light':
      addEffect(game, { kind: 'light', radius: eff.radius, until });
      ev('Light blooms.');
      break;
    case 'summon': {
      if (!summonSlotFree(game)) { ev('No room in the marching order!'); break; }
      if (game.settings?.seventhSlot && game.summons.length > 0) game.summons = [];
      const s = makeSummon(c.rng, eff.monster, eff.illusion);
      game.summons.push(s);
      ev(`${s.name} answers the call!`);
      break;
    }
    default:
      ev('The spell sputters strangely. (Unhandled: ' + eff.kind + ')');
  }
}

function dispelIllusions(c, ev) {
  if (!hasEffect(c.game, 'trueseeing')) return;
  for (const g of c.groups) {
    if (g.illusion && g.members.length) {
      g.members = [];
      ev(`Seen truly, the ${g.def.plural} unravel into nothing!`);
    }
  }
  for (let i = c.game.summons.length - 1; i >= 0; i--) {
    // your own illusions survive your sight — you believe in them
  }
}

function actUseItem(c, ch, order, ev) {
  const item = invItem(ch, order.itemIdx);
  if (!item) { ev(`${ch.name} fumbles for a missing item.`); return; }
  const use = item.use;
  if (!use) { ev(`The ${item.name} does nothing in battle.`); return; }
  ev(`${ch.name} uses ${item.name}.`);
  if (use.kind === 'heal') {
    const t = order.targetChar || ch;
    const healed = healChar(t, rollDice(c.rng, use.dice));
    ev(`${t.name} is healed ${healed}.`, { who: t.id, kind: 'heal' });
  } else if (use.kind === 'cure') {
    const t = order.targetChar || ch;
    for (const flag of use.flags) if (t.status[flag]) { delete t.status[flag]; ev(`${t.name} is cured of ${flag}.`, { who: t.id, kind: 'heal' }); }
  } else if (use.kind === 'damage') {
    const g = c.groups[order.target ?? 0] || livingGroups(c)[0];
    if (!g || g.dist > (use.range || 30)) { ev('It bursts short of any foe!'); }
    else {
      const dmg = rollDice(c.rng, use.dice);
      let killed = 0;
      for (let i = g.members.length - 1; i >= 0; i--) {
        g.members[i].hp -= dmg;
        if (g.members[i].hp <= 0) { killMember(c, g, i); killed++; }
      }
      ev(`Thunder bursts among the ${g.def.plural} for ${dmg}${killed ? `, slaying ${killed}` : ''}!`);
      checkPhases(c, g, ev);
    }
  } else if (use.kind === 'trueseeing') {
    addEffect(c.game, { kind: 'trueseeing', until: c.game.clock + use.duration });
    ev('Eyes unclouded!');
    dispelIllusions(c, ev);
  } else if (use.kind === 'song_restore') {
    const t = order.targetChar || ch;
    if (t.cls === 'skald') { t.songsLeft = Math.min(t.level, t.songsLeft + use.amount); ev(`${t.name}'s voice returns.`); }
    else ev('A pleasant vintage, wasted.');
  } else {
    ev('Nothing happens.');
  }
  removeFromInventory(ch, order.itemIdx);
}

// ---- monster-side ----------------------------------------------------------
function monsterAttackMember(c, group, ev) {
  const def = group.def;
  const melee = def.attacks.filter(a => (a.range || 10) <= 10);
  const ranged = def.attacks.filter(a => (a.range || 10) > 10 && a.range >= group.dist);
  let atk = null, pool = null;
  if (group.dist <= 10 && melee.length) { atk = c.rng.pick(melee); pool = frontRank(c); }
  else if (ranged.length) { atk = c.rng.pick(ranged); pool = anyRank(c); }
  if (!atk || !pool || !pool.length) return false;
  const ch = c.rng.pick(pool);
  const acBonus = partyAcBonusTotal(c) + (c.defending[ch.id] ? 3 : 0);
  const ac = ch.summon ? DB.monster(ch.monsterId).ac : effectiveAC(ch, acBonus);
  const bonus = def.tier * 2 + group.debuffHit * -1 - foeHitPenalty(c);
  const roll = c.rng.d(20);
  const name = def.name;
  if (roll === 1 || (roll !== 20 && roll < needToHit(ac, bonus))) {
    ev(`The ${name}'s ${atk.name} misses ${ch.name}.`);
    return true;
  }
  let dmg = Math.max(1, Math.round(rollDice(c.rng, atk.dmg) * group.rage));
  applyDamage(ch, dmg);
  ev(`The ${name}'s ${atk.name} hits ${ch.name} for ${dmg}!${ch.status.dead ? ` ${ch.name} falls!` : ''}`, { who: ch.id, kind: 'hp' });
  if (ch.status.dead && ch.summon) {
    c.game.summons = c.game.summons.filter(s => s.id !== ch.id);
  }
  const sp = atk.special;
  if (sp && !ch.status.dead && !ch.summon) {
    const extraSave = songSaveBonus(c);
    switch (sp.kind) {
      case 'poison':
        if (!savingThrow(c.rng, ch, sp.dc, extraSave)) { ch.status.poison = true; ev(`${ch.name} is poisoned!`, { who: ch.id, kind: 'poison' }); }
        break;
      case 'drain':
        if (!savingThrow(c.rng, ch, sp.dc, extraSave)) {
          if (ch.level > 1) { ch.level -= 1; ch.drained += 1; ch.maxHp = Math.max(1, ch.maxHp - 4); ch.hp = Math.min(ch.hp, ch.maxHp); }
          ev(`A grave-cold pull — ${ch.name} is drained of life's memory!`, { who: ch.id, kind: 'drain' });
        }
        break;
      case 'stone':
        if (!savingThrow(c.rng, ch, sp.dc, extraSave)) { ch.status.stone = true; ev(`${ch.name} stiffens into grey stone!`, { who: ch.id, kind: 'stone' }); }
        break;
      case 'fear':
        if (!savingThrow(c.rng, ch, sp.dc, extraSave)) { ch.status.fear = true; ev(`${ch.name} is gripped by fear!`, { who: ch.id, kind: 'fear' }); }
        break;
      case 'spdrain': {
        const loss = Math.min(ch.sp, rollDice(c.rng, sp.amount || '1d4'));
        if (loss > 0) { ch.sp -= loss; ev(`${ch.name} feels ${loss} points of mind-fire sipped away!`, { who: ch.id, kind: 'drain' }); }
        break;
      }
    }
  }
  return true;
}

function monsterCast(c, group, ev) {
  const def = group.def;
  if (!def.spells || group.silenced > 0) return false;
  if (inZone(c.game, 'antimagic')) return false;
  if (!c.rng.chance(def.castChance || 0)) return false;
  const spell = c.rng.pick(def.spells);
  ev(`The ${def.name} casts ${spell.name}!`);
  if (spell.kind === 'damage') {
    if (spell.target === 'party') {
      const dmg = rollDice(c.rng, spell.dice);
      for (const ch of anyRank(c)) {
        applyDamage(ch, dmg);
        if (ch.status.dead) {
          ev(`${ch.name} takes ${dmg} and falls!`, { who: ch.id, kind: 'hp' });
          if (ch.summon) c.game.summons = c.game.summons.filter(s => s.id !== ch.id);
        }
      }
      ev(`The spell tears through the party for ${dmg}!`, { who: 'party', kind: 'hp' });
    } else {
      const pool = anyRank(c);
      if (pool.length) {
        const ch = c.rng.pick(pool);
        const dmg = rollDice(c.rng, spell.dice);
        applyDamage(ch, dmg);
        ev(`${ch.name} is blasted for ${dmg}!${ch.status.dead ? ` ${ch.name} falls!` : ''}`, { who: ch.id, kind: 'hp' });
        if (ch.status.dead && ch.summon) c.game.summons = c.game.summons.filter(s => s.id !== ch.id);
      }
    }
  } else if (spell.kind === 'summon' || spell.kind === 'illusion') {
    const illusion = spell.kind === 'illusion';
    if (illusion && hasEffect(c.game, 'trueseeing')) {
      ev('The conjured shapes unravel before your unclouded eyes!');
      return true;
    }
    const count = rollDice(c.rng, String(spell.count));
    if (livingGroups(c).length < MAX_GROUPS) {
      c.groups.push(makeGroup(c.rng, spell.monster, count, group.dist, illusion));
      ev(`${count} ${DB.monster(spell.monster).plural} answer the call!`);
    } else {
      const existing = c.groups.find(g => g.monsterId === spell.monster && g.members.length);
      if (existing) {
        for (let k = 0; k < count && existing.members.length < MAX_MEMBERS; k++) {
          const hp = Math.max(1, rollDice(c.rng, DB.monster(spell.monster).hp));
          existing.members.push({ hp, maxHp: hp });
        }
        ev(`The ranks of the ${existing.def.plural} swell!`);
      }
    }
  }
  return true;
}

function monsterGroupAct(c, group, ev) {
  if (!group.members.length) return;
  if (group.stunned > 0) { group.stunned--; ev(`The ${group.def.plural} stand senseless.`); return; }
  if (group.dist > 10) {
    group.dist = Math.max(10, group.dist - group.def.speed);
    ev(`The ${group.def.plural} advance! (${group.dist}')`);
  }
  // enemy spellcasters may disbelieve your illusory allies
  if (group.def.spells && c.rng.chance(15)) {
    const ill = c.game.summons.find(s => s.illusion);
    if (ill) {
      c.game.summons = c.game.summons.filter(s => s.id !== ill.id);
      ev(`The ${group.def.name} sneers at the ${ill.name} — and it is not there, and never was.`);
    }
  }
  if (monsterCast(c, group, ev)) return;
  let acted = 0;
  for (let i = 0; i < group.members.length; i++) {
    if (group.feared > 0 && c.rng.chance(40)) continue;
    if (monsterAttackMember(c, group, ev)) acted++;
    if (!anyRank(c).length) return;
  }
  if (!acted && group.dist <= 10) ev(`The ${group.def.plural} press in, snarling.`);
}

// ---- round resolution ------------------------------------------------------
export function resolveRound(c) {
  const events = [];
  // fx (optional) = { who: charId | 'party', kind } — drives the roster status-line flash
  const ev = (text, fx) => events.push(fx ? { type: 'msg', text, fx } : { type: 'msg', text });
  c.round += 1;

  // true sight burns illusions at the top of every round
  dispelIllusions(c, ev);

  if (c.partyOrder === 'run') {
    const party = ableParty(c);
    const avgDx = party.reduce((a, ch) => a + statMod(ch.stats.DX), 0) / Math.max(1, party.length);
    const maxTier = Math.max(...livingGroups(c).map(g => g.def.tier), 0);
    const chance = Math.max(10, Math.min(90, 50 + avgDx * 10 - maxTier * 8));
    if (!c.canRun) { ev('There is no running from this.'); }
    else if (c.rng.chance(chance)) {
      ev('You turn and run — and the dark does not follow!');
      c.state = 'fled';
      endOfRoundUpkeep(c, events);
      return events;
    } else {
      ev('You try to flee, but they cut off your escape!');
      for (const g of livingGroups(c)) monsterGroupAct(c, g, ev);
      finishRound(c, events);
      return events;
    }
  }

  if (c.partyOrder === 'advance') {
    for (const g of livingGroups(c)) g.dist = Math.max(10, g.dist - 10);
    ev('The party advances!');
  }

  // build initiative
  const actors = [];
  for (const ch of ableParty(c)) {
    const order = c.orders[ch.id];
    if (!order) continue;
    actors.push({ init: c.rng.d(10) + statMod(ch.stats.DX), kind: 'char', ch, order });
  }
  for (const s of c.game.summons) {
    if (s.hp > 0) actors.push({ init: c.rng.d(10) + 1, kind: 'summon', s });
  }
  for (const g of livingGroups(c)) {
    actors.push({ init: c.rng.d(10) + Math.floor(g.def.tier / 2) + (g.def.speed >= 20 ? 2 : 0), kind: 'group', g });
  }
  actors.sort((a, b) => b.init - a.init);

  for (const a of actors) {
    if (c.state !== 'orders') break;
    if (a.kind === 'char') {
      const ch = a.ch;
      if (!isAlive(ch)) continue;
      const o = a.order;
      if (o.type === 'attack') actAttack(c, ch, o.target ?? 0, ev);
      else if (o.type === 'defend') { c.defending[ch.id] = true; ev(`${ch.name} stands on guard.`); }
      else if (o.type === 'hide') {
        if (clsOf(ch).canHide) { c.hidden[ch.id] = true; ev(`${ch.name} melts into the shadows.`); }
        else ev(`${ch.name} tries to hide and fails embarrassingly.`);
      }
      else if (o.type === 'cast') castCombatSpell(c, ch, DB.spell(o.code), o.target, ev);
      else if (o.type === 'sing') {
        const r = singCombat(ch, o.songId);
        if (!r.ok) ev(r.msg);
        else {
          c.songRound = r;
          ev(`${ch.name} plays ${r.song.name}!`);
          if (r.song.combat.kind === 'undead_dmg') {
            for (const g of livingGroups(c)) {
              if (!g.def.undead) continue;
              const dmg = rollDice(c.rng, r.song.combat.dice) + r.power - 1;
              let killed = 0;
              for (let i = g.members.length - 1; i >= 0; i--) {
                g.members[i].hp -= dmg;
                if (g.members[i].hp <= 0) { killMember(c, g, i); killed++; }
              }
              ev(`The dirge tolls through the ${g.def.plural} for ${dmg}${killed ? `, laying ${killed} to rest` : ''}!`);
            }
          }
          if (r.song.combat.kind === 'regen') {
            for (const t of realParty(c.game)) healChar(t, r.song.combat.amount + (r.power >= 3 ? 1 : 0));
            ev('The lull knits torn flesh.', { who: 'party', kind: 'heal' });
          }
        }
      }
      else if (o.type === 'use') actUseItem(c, ch, o, ev);
    } else if (a.kind === 'summon') {
      if (a.s.hp > 0) summonAct(c, a.s, ev);
    } else {
      monsterGroupAct(c, a.g, ev);
    }
    if (!livingGroups(c).length) break;
    if (!aliveAny(c)) break;
  }

  finishRound(c, events);
  return events;
}

function aliveAny(c) {
  return partyChars(c.game).some(ch => isAlive(ch));
}

function finishRound(c, events) {
  const ev = (text, fx) => events.push(fx ? { type: 'msg', text, fx } : { type: 'msg', text });
  // poison ticks in battle too
  for (const ch of realParty(c.game)) {
    if (ch.status.poison && isAlive(ch)) {
      applyDamage(ch, 1);
      if (ch.status.dead) ev(`${ch.name} succumbs to the poison!`, { who: ch.id, kind: 'hp' });
    }
  }
  // trollish regeneration
  for (const g of livingGroups(c)) {
    if (g.def.regen) for (const m of g.members) m.hp = Math.min(m.maxHp, m.hp + g.def.regen);
    if (g.feared > 0) g.feared--;
    if (g.silenced > 0) g.silenced--;
  }
  endOfRoundUpkeep(c, events);

  if (!livingGroups(c).length) {
    c.state = 'victory';
    buildResult(c, events);
  } else if (!aliveAny(c)) {
    c.state = 'defeat';
    events.push({ type: 'msg', text: 'Darkness takes the last of you. The fen has won.' });
  } else {
    c.orders = {}; c.partyOrder = null; c.songRound = null; c.defending = {};
  }
}

function endOfRoundUpkeep(c, events) {
  advanceClock(c.game, c.rng, events); // light burns down in battle too
}

function buildResult(c, events) {
  const game = c.game;
  const alive = realParty(game).filter(ch => isAlive(ch));
  const share = alive.length ? Math.floor(c.killedXp / alive.length) : 0;
  for (const ch of alive) ch.xp += share;
  game.gold += c.killedGold;
  for (const ch of realParty(game)) delete ch.status.fear; // terror fades with the foe
  c.result = { xp: c.killedXp, xpEach: share, gold: c.killedGold };
  events.push({ type: 'msg', text: `Victory! Each survivor earns ${share} experience. You gather ${c.killedGold} gold.` });

  if (c.fixed) {
    const ms = game.mapState[game.pos.map] || (game.mapState[game.pos.map] = { secrets: [], riddle: false, once: {}, zapped: {} });
    ms.once[c.fixed.id] = true;
    if (c.fixed.victoryText) events.push({ type: 'msg', text: c.fixed.victoryText });
    const reward = c.fixed.reward || {};
    if (reward.gold) { game.gold += reward.gold; events.push({ type: 'msg', text: `You claim ${reward.gold} gold.` }); }
    for (const itemId of reward.items || []) {
      const holder = realParty(game).find(ch => isAlive(ch));
      holder.inventory.push({ id: itemId, ident: true }); // quest relics always fit
      events.push({ type: 'msg', text: `${holder.name} takes ${DB.item(itemId).name}.` });
    }
  } else if (currentMap(game).kind === 'dungeon' && c.rng.chance(40)) {
    c.result.chest = true;
    events.push({ type: 'chest' });
  }
}

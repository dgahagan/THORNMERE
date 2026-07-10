// Realistic playtest harness v2 for Thornmere.
//
// What changed vs v1 (dev/playtest/harness.mjs):
//  - HONEST ECONOMY. Pre-built party gets the real flat 220 gold; a created
//    party gets the per-character muster purse (90 + 0..60 each). ALL gear and
//    spells are paid for. Gold is tracked end to end and constrains everything.
//  - TOWN TRIPS ARE NOT FREE. Recovery happens in town, and getting there/back
//    costs real steps that advance the clock (toward night) and roll random
//    encounters en route (using the real maze.advanceClock + maze.rollEncounter).
//  - A LIVING CLOCK. Day/night is derived from game.clock, not a flag. Grinding
//    town fights drifts you into night (where encounters are 6x more likely and
//    far nastier) — exactly the "destroyed walking around town" trap.
//  - SP RECOVERY TRADEOFF. Recharge by paying the Spark House (fast, costs gold)
//    OR by waiting (wandering town by day to trickle SP back free — but each
//    wait step rolls an encounter and advances the clock).
//  - HEALING TRADEOFF. Lorist heal spells (cost SP) vs potions vs Temple (gold)
//    vs the Skald's Hearthsong Lull passive regen while walking.
//  - RESURRECTION ECONOMICS + permanent-death tracking (250g+ is often
//    unaffordable early, so a death sticks).
//  - SPELL-TIER UPGRADES as a gold sink that competes with healing/res.
//  - CHESTS via the real loot.js (gold/item income + trap risk; Knave disarms).
//  - FLOOR TRAPS faithfully modeled from the map's trap cells while exploring.
//  - FLEE-TO-SURVIVE: the policy runs from a fight it judges unwinnable rather
//    than feeding the party to a wipe (a flee is survival, not a win).
//
// Abstraction note: we do not literally pathfind the maze. "Wandering" a map =
// repeatedly calling the REAL maze.advanceClock + maze.rollEncounter (so clock,
// poison ticks, song regen, SP trickle, light burn and the encounter tables all
// behave exactly as in-engine) plus a faithful floor-trap roll in dungeons. The
// only thing skipped is bumping into walls (a wasted step). Travel distances are
// modeled as step counts grounded in the map sizes.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { loadAll, DB } from '../../src/core/db.js';
import { Rng, rollDice } from '../../src/core/rng.js';
import { newGame, currentMap, realParty, aliveParty, isNight } from '../../src/core/gamestate.js';
import { newSettings } from '../../src/core/settings.js';
import {
  createCharacter, rollStats, statMod, clsOf, isAlive, equipItem, addToInventory,
  effectiveAC, weaponOf, healChar, savingThrow, applyDamage, invItem, removeFromInventory
} from '../../src/core/character.js';
import {
  canLevelUp, levelUp, canBuyTier, buyTier, nextTierFor, maxTierAtLevel, tierCost
} from '../../src/core/leveling.js';
import {
  makeCombat, setOrder, setPartyOrder, resolveRound, livingGroups, ableParty
} from '../../src/core/combat.js';
import {
  templePrices, templeService, sparkRecharge, sparkCost, buyWine, buyItem, addToParty
} from '../../src/core/services.js';
import { advanceClock, rollEncounter } from '../../src/core/maze.js';
import { castExplore } from '../../src/core/spells.js';
import { startExploreSong } from '../../src/core/songs.js';
import { makeChest, inspectChest, disarmChest, openChest } from '../../src/core/loot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

let loaded = false;
export async function ensureDb() {
  if (loaded) return;
  await loadAll(async (p) => JSON.parse(await readFile(path.join(ROOT, p), 'utf8')));
  loaded = true;
}

const XP_MULT = (game) => game.settings?.reducedXp ? DB.balance.remasteredXpMultiplier : 1.0;

// ===========================================================================
// PARTY CONSTRUCTION (honest economy)
// ===========================================================================
function statScore(cls, stats) {
  let s = stats[cls.primeStat] * 3 + stats.CN * 2 + stats.LK;
  if (cls.spDie) s += stats.IQ * 1.5;
  if (!cls.school) s += stats.ST + stats.DX;
  return s;
}
function bestStats(rng, m, rerolls) {
  const cls = DB.cls(m.cls);
  let best = null, bs = -1;
  for (let i = 0; i < rerolls; i++) {
    const st = rollStats(rng, m.race);
    const sc = statScore(cls, st);
    if (sc > bs) { bs = sc; best = st; }
  }
  return best;
}

// Buy spell tiers up to wantTier, limited by level and gold. Returns gold spent.
function buySpellsUpTo(game, ch, school, wantTier) {
  let spent = 0;
  while (true) {
    const t = nextTierFor(ch, school);
    if (t == null || t > wantTier) break;
    if (maxTierAtLevel(ch.level) < t) break;
    const cost = tierCost(t);
    if (game.gold < cost) break;
    game.gold -= cost; spent += cost; buyTier(ch, school);
  }
  return spent;
}

// spec: { rerolls, prebuilt:bool, musterReserve?, members:[{name,race,cls,
//         weapon,armor,shield,helm,gauntlets,instrument, spellTier?}],
//         potions?:[{id,count}] }
// prebuilt=true → flat 220 gold (the Fen-Pact); else per-character muster purse.
//
// A smart player can't afford the FULL kit + spells + potions + a reserve, so
// buildParty prioritizes: essential gear (weapon/armor/instrument) → spells →
// non-essential gear (shield/helm/gauntlets) only while staying above the muster
// reserve → potions only with surplus. The reserve is the emergency
// heal/resurrect fund the v1 harness never kept.
function buyGear(game, ch, m, slot, muster, prebuilt, reserveFloor) {
  if (!m[slot]) return;
  const price = DB.item(m[slot]).price || 0;
  if (!prebuilt) {
    if (game.gold - price < reserveFloor) return;   // protect the reserve
    game.gold -= price; muster.gear += price;
  }
  const idx = ch.inventory.length;
  if (addToInventory(ch, m[slot])) equipItem(ch, idx);
}

export function buildParty(game, rng, spec) {
  const muster = { purse: 0, gear: 0, spells: 0, potions: 0 };
  const reserve = spec.musterReserve ?? 150;
  const chars = [];
  for (const m of spec.members) {
    const stats = bestStats(rng, m, spec.rerolls ?? 1);
    const ch = createCharacter(rng, { name: m.name, raceId: m.race, classId: m.cls, stats });
    ch.portrait = `pc_${m.race}_a`;
    addToInventory(ch, 'torch');
    if (!spec.prebuilt) { const p = 90 + rng.range(0, 60); game.gold += p; muster.purse += p; }
    game.roster.push(ch); addToParty(game, ch.id); chars.push([ch, m]);
  }
  if (spec.prebuilt) game.gold += 220;
  // pass 1: essential gear (let it dip toward 0 — a weapon is non-negotiable)
  for (const [ch, m] of chars) for (const slot of ['weapon', 'armor', 'instrument']) buyGear(game, ch, m, slot, muster, spec.prebuilt, 0);
  // pass 2: spells (top priority lever) — for created parties always; prebuilt only if opted in
  if (!spec.prebuilt || spec.prebuiltBuySpells) {
    for (const [ch, m] of chars) {
      const school = clsOf(ch).school;
      if (school && school !== 'all' && (m.spellTier ?? 7) > 0) muster.spells += buySpellsUpTo(game, ch, school, m.spellTier ?? (spec.prebuilt ? 1 : 7));
    }
  }
  // pass 3: non-essential gear, protecting the reserve
  for (const [ch, m] of chars) for (const slot of ['shield', 'helm', 'gauntlets']) buyGear(game, ch, m, slot, muster, spec.prebuilt, reserve);
  // pass 4: potions only with surplus above the reserve
  for (const p of spec.potions || []) {
    for (let i = 0; i < (p.count || 1); i++) {
      const price = DB.item(p.id).price || 0;
      if (game.gold - price < reserve) break;
      const holder = realParty(game).find(c => c.inventory.length < 8) || realParty(game)[0];
      if (addToInventory(holder, p.id, true)) { game.gold -= price; muster.potions += price; }
    }
  }
  return muster;
}

// ===========================================================================
// FLOOR TRAPS (faithful reimplementation of maze.triggerTrap, which is private)
// ===========================================================================
function trapCellsFor(mapId) {
  const map = DB.map(mapId);
  return Object.values(map.cells || {}).filter(c => c.t === 'trap');
}
function springTrap(game, rng, sp, run) {
  const ward = game.song?.effect?.kind === 'trapward' ? game.song.effect.amount : 0;
  const party = aliveParty(game).filter(c => !c.summon);
  if (!party.length) return;
  run.trapsSprung++;
  const dc = sp.dc;
  if (sp.trap === 'spikes') {
    const ch = rng.pick(party);
    if (!savingThrow(rng, ch, dc, ward)) applyDamage(ch, rollDice(rng, '1d8') + Math.floor(dc / 4));
  } else if (sp.trap === 'gas') {
    for (const ch of party) if (!savingThrow(rng, ch, dc, ward)) ch.status.poison = true;
  } else if (sp.trap === 'pit') {
    const ch = rng.pick(party);
    if (!savingThrow(rng, ch, dc, ward + statMod(ch.stats.DX))) applyDamage(ch, rollDice(rng, '1d6') + Math.floor(dc / 4));
  } else if (sp.trap === 'crumble') {
    for (const ch of party) if (!savingThrow(rng, ch, dc, ward)) applyDamage(ch, rollDice(rng, '1d6'));
  }
}

// ===========================================================================
// WANDER: one step on a map — real clock + real encounter roll (+ dungeon traps)
// Returns { combat: spec|null }
// ===========================================================================
const PER_TRAP_STEP_CHANCE = 0.8;   // % per still-armed trap cell, per dungeon step

function wanderStep(game, rng, run, { dungeon }) {
  const evs = [];
  advanceClock(game, rng, evs);     // clock, poison ticks, song regen, SP trickle, light
  // record poison deaths during travel
  for (const e of evs) if (/succumbs to the poison/.test(e.text || '')) run.travelPoisonDeaths++;
  if (dungeon) {
    // floor traps: each still-armed trap cell has a small chance per step
    for (const sp of run._armedTraps) {
      if (sp._sprung) continue;
      if (rng.chance(PER_TRAP_STEP_CHANCE)) { springTrap(game, rng, sp, run); sp._sprung = true; }
    }
  }
  if (!aliveParty(game).filter(c => !c.summon).length) return { wiped: true };
  const ce = [];
  rollEncounter(game, rng, ce);
  const enc = ce.find(e => e.type === 'combat');
  return { combat: enc ? { groups: enc.groups } : null };
}

// ===========================================================================
// COMBAT POLICY (improved)
// ===========================================================================
export function fightBattle(game, rng, spec, run, { inTown }) {
  game.pos.map = inTown ? 'town' : run.dungeon;
  const night = inTown && isNight(game);
  const c = makeCombat(game, rng, spec);
  const deathsBefore = new Set(realParty(game).filter(ch => !isAlive(ch)).map(ch => ch.id));
  let rounds = 0, fled = false;
  const maxRounds = 50;

  while (c.state === 'orders' && rounds < maxRounds) {
    rounds++;
    c.orders = {}; c.partyOrder = null;
    if (shouldFlee(game, c)) { setPartyOrder(c, 'run'); resolveRound(c); if (c.state === 'fled') { fled = true; } continue; }
    planRound(game, rng, c);
    resolveRound(c);
  }
  const deaths = realParty(game).filter(ch => !isAlive(ch) && !deathsBefore.has(ch.id)).map(ch => ch.name);

  // chest after a dungeon victory
  let chestGold = 0;
  if (c.state === 'victory' && !inTown && c.result?.chest) chestGold = resolveChest(game, rng, run);

  const res = {
    map: inTown ? 'town' : run.dungeon, night,
    foes: spec.groups.map(g => `${g.count}x${g.monster}`).join('+'),
    state: c.state, win: c.state === 'victory', fled, rounds,
    deaths, xp: c.result?.xpEach || 0, gold: (c.result?.gold || 0) + chestGold
  };
  run.battles.push(res);
  if (res.win) {
    if (inTown) { run.townWins++; night ? run.townNightFights++ : run.townDayFights++; }
    else run.dungeonWins++;
  }
  run.deaths.push(...deaths);
  run.goldTimeline.push({ at: `${res.map}${res.night ? '·night' : ''} ${res.state}`, gold: game.gold, w: `${run.townWins}/${run.dungeonWins}` });
  return res;
}

// Flee when the fight looks lost: too few left and outnumbered/outgunned.
function shouldFlee(game, c) {
  if (!c.canRun) return false;
  const alive = realParty(game).filter(ch => isAlive(ch));
  const foeHp = livingGroups(c).reduce((a, g) => a + g.members.reduce((b, m) => b + m.hp, 0), 0);
  const partyHp = alive.reduce((a, ch) => a + ch.hp, 0);
  if (alive.length <= 1) return true;
  if (alive.length <= 2 && foeHp > partyHp) return true;
  // front line gone and many foes in melee
  const frontAlive = realParty(game).slice(0, 3).filter(ch => isAlive(ch)).length;
  if (frontAlive === 0 && livingGroups(c).some(g => g.dist <= 10)) return true;
  return false;
}

function planRound(game, rng, c) {
  const groups = livingGroups(c);
  const able = ableParty(c);
  const order = realParty(game).filter(ch => isAlive(ch));
  const totalFoes = groups.reduce((a, g) => a + g.members.length, 0);
  const nearest = Math.min(...groups.map(g => g.dist));
  const biggest = () => groups.slice().sort((a, b) => b.members.length - a.members.length || a.dist - b.dist)[0];
  const idxOf = (g) => c.groups.indexOf(g);

  const anyMissileReaches = able.some(ch => { const w = weaponOf(ch); return w?.missile && w.range >= nearest; });
  if (nearest > 10 && !anyMissileReaches) setPartyOrder(c, 'advance');

  for (const ch of able) {
    const rank = order.indexOf(ch);
    const cls = clsOf(ch);
    const target = biggest();
    const ti = target ? idxOf(target) : 0;

    if (cls.bard && ch.songsLeft > 0 && totalFoes >= 2) {
      // Confounding Jig (all foes -3 to hit) is the best survival tool when
      // there are several attackers; Wayfarer's March (+2 AC) otherwise.
      setOrder(c, ch.id, { type: 'sing', songId: totalFoes >= 3 ? 'jig' : 'march' });
      continue;
    }
    if (cls.school) {
      const o = casterOrder(game, rng, ch, c, groups, totalFoes);
      if (o) { setOrder(c, ch.id, o); continue; }
    }
    // potion fallback: out-of-SP body bails out a dying ally
    const heal = ch.inventory?.findIndex(en => DB.item(en.id).use?.kind === 'heal');
    const critical = realParty(game).find(a => isAlive(a) && a.hp < a.maxHp * 0.30);
    if (heal != null && heal >= 0 && critical && !anyCasterCanHeal(game, c)) {
      setOrder(c, ch.id, { type: 'use', itemIdx: heal, targetChar: critical });
      continue;
    }
    const w = weaponOf(ch);
    const canMelee = rank < 3 && nearest <= 10;
    const canShoot = w?.missile && groups.some(g => w.range >= g.dist);
    setOrder(c, ch.id, (canMelee || canShoot) ? { type: 'attack', target: ti } : { type: 'defend' });
  }
}

function anyCasterCanHeal(game, c) {
  return ableParty(c).some(ch => clsOf(ch).school && ['SALV', 'MEND', 'BALM', 'WELL'].some(code =>
    ch.knownSpells.includes(code) && ch.sp >= DB.spell(code).sp));
}

function casterOrder(game, rng, ch, c, groups, totalFoes) {
  const has = (code) => ch.knownSpells.includes(code) && ch.sp >= (DB.spell(code)?.sp ?? 99);
  const big = groups.slice().sort((a, b) => b.members.length - a.members.length)[0];

  // 1) emergency heal
  const hurt = realParty(game).filter(a => isAlive(a) && a.hp < a.maxHp * 0.45)
    .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
  if (hurt.length) {
    if (hurt.length >= 2 && has('BALM')) return { type: 'cast', code: 'BALM', target: 0 };
    const single = ['SALV', 'MEND', 'WELL', 'QUIK'].find(has);
    if (single) { const sp = DB.spell(single); return { type: 'cast', code: single, target: sp.target === 'party' ? 0 : hurt[0] }; }
  }
  // 2) cure a poisoned front-liner
  if (has('PURG')) {
    const psn = realParty(game).slice(0, 3).find(a => isAlive(a) && a.status.poison);
    if (psn) return { type: 'cast', code: 'PURG', target: psn };
  }
  // 3) AoE a cluster
  const aoe = ['EMBR', 'CIND', 'RUIN', 'HAIL', 'SQAL'].map(x => DB.spell(x)).find(sp => sp && has(sp.code) && sp.range >= big.dist);
  if (big && big.members.length >= 3 && aoe) return { type: 'cast', code: aoe.code, target: c.groups.indexOf(big) };
  // 4) crowd control: fear / hit-debuff a group early (cheap damage mitigation;
  //    a feared group skips ~40% of its attacks — vital at low level)
  for (const code of ['MOCK', 'NUMB']) {
    if (has(code) && big && big.members.length >= 3 && c.round <= 2 && big.feared === 0) {
      const sp = DB.spell(code); if (sp.range >= big.dist) return { type: 'cast', code, target: c.groups.indexOf(big) };
    }
  }
  // 5) single-target nuke
  const nuke = ['JOLT', 'ASHD', 'SPRK', 'GUST', 'LANC'].map(x => DB.spell(x)).find(sp => sp && has(sp.code) && sp.range >= big.dist);
  if (nuke) return { type: 'cast', code: nuke.code, target: c.groups.indexOf(big) };
  return null;
}

// ===========================================================================
// CHESTS (real loot.js; Knave or highest-DX disarms)
// ===========================================================================
function resolveChest(game, rng, run) {
  const before = game.gold;
  const chest = makeChest(rng, currentMap(game));
  const cand = aliveParty(game).filter(c => !c.summon);
  if (!cand.length) return 0;
  const opener = cand.slice().sort((a, b) =>
    (clsOf(b).disarmBonus ? 1 : 0) - (clsOf(a).disarmBonus ? 1 : 0) || statMod(b.stats.DX) - statMod(a.stats.DX))[0];
  inspectChest(rng, chest, opener);
  if (chest.trap) { const evs = []; disarmChest(rng, game, chest, opener, evs); }
  openChest(rng, game, chest, opener);
  run.chestsOpened++;
  return game.gold - before;
}

// ===========================================================================
// TOWN RECOVERY (gold-managed: spend vs save)
// ===========================================================================
function reserveTarget(game) {
  // keep enough to resurrect one and patch the party once
  const lvl = Math.max(...realParty(game).map(c => c.level), 1);
  return (200 + lvl * 50) + 80;
}
function partyHurt(game) {
  return realParty(game).some(c => isAlive(c) && c.hp < c.maxHp);
}
function casterSpTotal(game) {
  return realParty(game).filter(c => c.maxSp > 0 && isAlive(c)).reduce((a, c) => a + c.sp, 0);
}
function casterSpMax(game) {
  return realParty(game).filter(c => c.maxSp > 0).reduce((a, c) => a + c.maxSp, 0);
}

// Heal HP using the cheapest adequate source: Lorist spells (SP) → potions →
// Temple (gold). Cure poison/fear similarly.
function healWithSpells(game, rng) {
  const lorists = realParty(game).filter(c => isAlive(c) && c.maxSp > 0);
  let guard = 0;
  while (partyHurt(game) && guard++ < 30) {
    let acted = false;
    for (const ch of lorists) {
      const hurt = realParty(game).filter(a => isAlive(a) && a.hp < a.maxHp)
        .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      if (!hurt) break;
      const code = ['BALM', 'SALV', 'MEND'].find(x => ch.knownSpells.includes(x) && ch.sp >= DB.spell(x).sp);
      if (!code) continue;
      const sp = DB.spell(code);
      castExplore(game, rng, ch, sp, sp.target === 'party' ? null : hurt);
      acted = true;
    }
    if (!acted) break;
  }
}
function curePoisonFear(game, rng, run) {
  for (const ch of realParty(game)) {
    if (!isAlive(ch)) continue;
    for (const flag of ['poison', 'fear']) {
      if (!ch.status[flag]) continue;
      // Lorist PURG first (free-ish)
      const lor = realParty(game).find(c => isAlive(c) && c.knownSpells.includes('PURG') && c.sp >= DB.spell('PURG').sp);
      if (lor) { castExplore(game, rng, lor, DB.spell('PURG'), ch); }
      else if (ch.status[flag]) {
        // potion?
        const pid = flag === 'poison' ? 'antidote' : 'calming_salt';
        const holder = realParty(game).find(c => c.inventory.some(en => en.id === pid));
        if (holder) { const i = holder.inventory.findIndex(en => en.id === pid); delete ch.status[flag]; removeFromInventory(holder, i); }
        else { const before = game.gold; const r = templeService(game, ch, flag); if (r.ok) run.gold.temple += before - game.gold; }
      }
    }
  }
}

// Full town visit. SURVIVAL spending (heal/cure/resurrect) happens freely —
// it's cheap at low level and skipping it is what gets you killed. Only
// DISCRETIONARY spending (spell-tier upgrades, wine, SP recharge) is gated by a
// reserve, and SP recharge falls back to free waiting when gold is tight.
function townVisit(game, rng, run, { wantSp = true } = {}) {
  // 1) free: level up everyone who can (more levels = more HP = survival)
  for (const ch of realParty(game)) while (canLevelUp(ch, XP_MULT(game))) { levelUp(rng, ch); run.levelUps++; }
  // 2) resurrect the dead if affordable (survival; else they stay down)
  for (const ch of realParty(game)) {
    if (ch.status.dead) {
      const cost = templePrices(ch).resurrect;
      if (game.gold >= cost) { game.gold -= cost; delete ch.status.dead; ch.hp = 1; run.gold.resurrect += cost; run.resurrections++; }
      else run.permaDeaths.add(ch.id);
    }
    if (ch.drained && game.gold >= templePrices(ch).drain) { const b = game.gold; templeService(game, ch, 'drain'); run.gold.temple += b - game.gold; }
  }
  // 3) cure status (spells → potions → temple), survival priority
  curePoisonFear(game, rng, run);
  // 4) heal HP to full — Lorist spells first (free if SP), then Temple (cheap)
  healWithSpells(game, rng);
  for (const ch of realParty(game)) {
    if (!isAlive(ch) || ch.hp >= ch.maxHp) continue;
    const cost = templePrices(ch).heal;
    if (game.gold >= cost) { const b = game.gold; templeService(game, ch, 'heal'); run.gold.temple += b - game.gold; }
  }
  // 5) recover SP: pay the Spark House if it leaves a small buffer; else WAIT
  if (wantSp) recoverSp(game, rng, run);
  // 6) DISCRETIONARY (reserve-gated): next spell tier, then skald wine
  const reserve = reserveTarget(game);
  for (const ch of realParty(game)) {
    const school = clsOf(ch).school; if (!school || school === 'all') continue;
    const t = nextTierFor(ch, school);
    if (t == null || maxTierAtLevel(ch.level) < t) continue;
    if (game.gold - tierCost(t) >= reserve) { const b = game.gold; buySpellsUpTo(game, ch, school, t); run.gold.upgrades += b - game.gold; }
  }
  for (const ch of realParty(game)) {
    if (ch.cls === 'skald' && ch.songsLeft < ch.level && game.gold > reserve) {
      const b = game.gold; buyWine(game, ch); run.gold.wine += b - game.gold;
    }
  }
  if (game.gold < 30) run.brokeEvents++;
}

// Recover spell points. Spark House if we can afford it above reserve; else wait
// (wander town by day to trickle SP, fighting whatever turns up).
function recoverSp(game, rng, run) {
  const SP_BUFFER = 20;   // keep a little coin after paying for recharge
  const casters = realParty(game).filter(c => c.maxSp > 0 && isAlive(c) && c.sp < c.maxSp);
  if (!casters.length) return;
  const totalCost = casters.reduce((a, c) => a + sparkCost(c), 0);
  if (game.gold - totalCost >= SP_BUFFER) {
    for (const ch of casters) { const b = game.gold; sparkRecharge(game, ch); run.gold.spark += b - game.gold; }
    return;
  }
  // wait: wander town (day) until casters are ~70% SP or we give up (capped)
  game.pos.map = 'town';
  let guard = 0;
  while (casterSpTotal(game) < casterSpMax(game) * 0.7 && guard++ < 200) {
    if (isNight(game)) { // don't wait out fights in the deadly dark; bail
      run.waitedIntoNight++; break;
    }
    const w = wanderStep(game, rng, run, { dungeon: false });
    run.waitSteps++;
    if (w.wiped) return;
    if (w.combat) { fightBattle(game, rng, w.combat, run, { inTown: true }); if (!aliveParty(game).filter(c => !c.summon).length) return; }
  }
}

// ===========================================================================
// RUN DRIVER: 5 town wins, then 5 dungeon wins, fully costed.
// ===========================================================================
export function runAttempt(spec, opts = {}) {
  const seed = (opts.seed ?? 1) >>> 0;
  const game = newGame(seed);
  game.settings = newSettings(opts.mode || 'remastered');
  if (game.settings.sharedInventory && !game.pool) game.pool = { items: [] };
  const rng = new Rng(seed ^ 0x9e3779b9);

  const run = {
    mode: opts.mode || 'remastered', seed, dungeon: opts.dungeon || 'undercroft1',
    townWins: 0, dungeonWins: 0, battles: [], deaths: [], permaDeaths: new Set(),
    townDayFights: 0, townNightFights: 0,
    gold: { temple: 0, spark: 0, wine: 0, resurrect: 0, upgrades: 0 },
    levelUps: 0, resurrections: 0, chestsOpened: 0, trapsSprung: 0,
    waitSteps: 0, waitedIntoNight: 0, retreats: 0, townTrips: 0,
    travelStepsTown: 0, travelStepsDungeon: 0, travelFights: 0, travelPoisonDeaths: 0,
    brokeEvents: 0, fledCount: 0, wiped: false, stuck: false, success: false,
    _armedTraps: [],
  };
  run.muster = buildParty(game, rng, spec);
  run.startGold = game.gold;
  run.goldTimeline = [{ at: 'muster', gold: game.gold }];

  const partyDead = () => !aliveParty(game).filter(c => !c.summon).length;
  const fightReady = () => {
    if (partyDead()) return false;
    if (realParty(game).some(c => c.status.dead && !run.permaDeaths.has(c.id))) return false;
    // every living member should be near-full before stepping out — at level 1
    // a squishy at "50%" is one hit from dead, and a fallen front-liner rotates
    // a 6-HP caster into the melee.
    const living = realParty(game).filter(c => isAlive(c));
    const hpOk = living.every(c => c.hp >= c.maxHp * 0.7);
    // Don't ping-pong to town just to top up SP: melee carries the trash, and we
    // recharge only when the casters can't even manage a single cheap spell.
    const spOk = casterSpMax(game) === 0 || casterSpTotal(game) >= 3;
    const noPoison = !living.some(c => c.status.poison);
    return hpOk && spOk && noPoison;
  };

  // signature of recoverable progress — if a town visit changes none of this,
  // the party is stuck (broke, hurt, no SP to self-heal) and the run is over.
  const sig = () => run.townWins * 1e7 + run.dungeonWins * 1e6 + game.gold * 100
    + realParty(game).reduce((a, c) => a + c.hp + c.sp + (isAlive(c) ? 1000 : 0), 0);

  // ---- PHASE 1: TOWN (wander; the clock drifts toward night naturally) ----
  game.pos.map = 'town';
  let guard = 0, stall = 0;
  while (run.townWins < 5 && !partyDead() && guard++ < 4000) {
    if (!fightReady()) {
      run.townTrips++;
      const before = sig(); townVisit(game, rng, run);
      if (sig() === before) { if (++stall >= 2) { run.stuck = true; break; } } else stall = 0;
      if (partyDead()) break;
      continue;
    }
    stall = 0;
    const w = wanderStep(game, rng, run, { dungeon: false });
    run.travelStepsTown++;
    if (w.wiped) { run.wiped = true; break; }
    if (w.combat) fightBattle(game, rng, w.combat, run, { inTown: true });
  }
  if (partyDead()) run.wiped = true;

  // ---- TRANSITION: top up, then descend ----
  if (!run.wiped && run.townWins >= 5) {
    townVisit(game, rng, run);
    run.goldTimeline.push({ at: 'pre-descend', gold: game.gold });
  }

  // ---- PHASE 2: DUNGEON (delve; retreat to town when not fight-ready) ----
  if (!run.wiped && run.townWins >= 5) {
    run._armedTraps = trapCellsFor(run.dungeon).map(sp => ({ ...sp }));
    let depth = 0; guard = 0; stall = 0;
    while (run.dungeonWins < 5 && !partyDead() && guard++ < 4000) {
      if (!fightReady()) {
        // RETREAT: walk out (dungeon steps, fighting en route), then town visit, then re-enter
        run.retreats++;
        const before = sig();
        retreatToTown(game, rng, run, depth);
        if (partyDead()) break;
        townVisit(game, rng, run);
        if (sig() === before) { if (++stall >= 2) { run.stuck = true; break; } } else stall = 0;
        // re-descend: re-arm traps, reset depth
        run._armedTraps = trapCellsFor(run.dungeon).map(sp => ({ ...sp }));
        depth = 0;
        game.pos.map = run.dungeon;
        continue;
      }
      stall = 0;
      game.pos.map = run.dungeon;
      const w = wanderStep(game, rng, run, { dungeon: true });
      run.travelStepsDungeon++; depth++;
      if (w.wiped) { run.wiped = true; break; }
      if (w.combat) fightBattle(game, rng, w.combat, run, { inTown: false });
    }
  }
  if (partyDead()) run.wiped = true;

  run.fledCount = run.battles.filter(b => b.fled).length;
  run.success = run.townWins >= 5 && run.dungeonWins >= 5 && !run.wiped && !run.stuck;
  run.finalGold = game.gold;
  run.goldTimeline.push({ at: 'end', gold: game.gold });
  run.permaDeaths = [...run.permaDeaths];
  run.party = realParty(game).map(ch => ({
    name: ch.name, race: ch.race, cls: ch.cls, lvl: ch.level,
    hp: `${ch.hp}/${ch.maxHp}`, sp: `${ch.sp}/${ch.maxSp}`, ac: effectiveAC(ch),
    dead: !!ch.status.dead, drained: ch.drained, tiers: { ...ch.schoolTiers }
  }));
  run.endClock = game.clock;
  return run;
}

// Walk out of the dungeon: `depth` steps, fighting whatever blocks the path.
function retreatToTown(game, rng, run, depth) {
  game.pos.map = run.dungeon;
  let steps = Math.max(2, depth), guard = 0;
  while (steps-- > 0 && guard++ < 500) {
    const w = wanderStep(game, rng, run, { dungeon: true });
    run.travelStepsDungeon++;
    if (w.wiped) return;
    if (w.combat) { run.travelFights++; fightBattle(game, rng, w.combat, run, { inTown: false }); if (!aliveParty(game).filter(c => !c.summon).length) return; }
  }
  game.pos.map = 'town';   // emerge into town (whatever time it now is)
}

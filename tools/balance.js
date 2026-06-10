// Balance simulator: runs scripted parties against encounter specs and
// reports win rates. Usage: node tools/balance.js
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll, DB } from '../src/core/db.js';
import { Rng } from '../src/core/rng.js';
import { newGame, realParty } from '../src/core/gamestate.js';
import {
  createCharacter, addToInventory, equipItem, isAlive, statMod
} from '../src/core/character.js';
import { maxTierAtLevel } from '../src/core/leveling.js';
import {
  makeCombat, setOrder, resolveRound, livingGroups, ableParty
} from '../src/core/combat.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
await loadAll(async p => JSON.parse(readFileSync(join(ROOT, p), 'utf8')));

function gearFor(level, cls) {
  if (['blade', 'warden'].includes(cls)) {
    if (level >= 14) return ['oathblade', 'plate_armor', 'tower_shield', 'crowned_helm', 'mail_gauntlets'];
    if (level >= 9) return [cls === 'blade' ? 'fen_cleaver' : 'longsword', 'scale_mail', 'tower_shield', 'iron_helm', 'mail_gauntlets'];
    if (level >= 4) return ['longsword', 'chain_mail', 'round_shield', 'iron_helm'];
    return ['broadsword', 'leather_armor'];
  }
  if (cls === 'skald') {
    if (level >= 9) return ['fine_rapier', 'studded_leather', 'war_drum'];
    if (level >= 4) return ['shortsword', 'studded_leather', 'fen_fiddle'];
    return ['shortsword', 'padded_jack', 'reed_pipe'];
  }
  // casters
  if (level >= 9) return ['dagger', 'mistweave_robe'];
  return ['dagger', 'robes'];
}

function makeChar(rng, name, race, cls, level) {
  // roll until decent stats, like a player would
  let stats;
  for (let i = 0; i < 8; i++) {
    stats = {};
    const raceDef = DB.race(race);
    for (const s of ['ST', 'IQ', 'DX', 'CN', 'LK']) {
      stats[s] = Math.max(3, Math.min(20, rng.d(6) + rng.d(6) + rng.d(6) + (raceDef.mods[s] || 0)));
    }
    const key = cls === 'hexen' || cls === 'lorist' ? stats.IQ : stats.ST;
    if (key >= 13) break;
  }
  const ch = createCharacter(rng, { name, raceId: race, classId: cls, stats });
  for (let l = 1; l < level; l++) {
    const c = DB.cls(cls);
    ch.level++;
    ch.maxHp += Math.max(1, rng.d(c.hpDie) + statMod(stats.CN));
    if (c.spDie) ch.maxSp += Math.max(1, rng.d(c.spDie) + statMod(stats.IQ));
  }
  ch.hp = ch.maxHp; ch.sp = ch.maxSp;
  if (cls === 'skald') ch.songsLeft = ch.level;
  const school = DB.cls(cls).school;
  if (school && school !== 'all') {
    const t = maxTierAtLevel(level);
    ch.schoolTiers[school] = t;
    for (let tier = 1; tier <= t; tier++) {
      for (const sp of DB.spellsFor(school, tier)) ch.knownSpells.push(sp.code);
    }
  }
  for (const it of gearFor(level, cls)) {
    addToInventory(ch, it);
    equipItem(ch, ch.inventory.length - 1);
  }
  return ch;
}

function makeSimParty(rng, level) {
  const game = newGame(1);
  const spec = [
    ['Hroth', 'korrun', 'blade'], ['Brenna', 'vael', 'blade'],
    ['Aldwyn', 'korrun', 'warden'], ['Tamsin', 'fennick', 'skald'],
    ['Morrigan', 'aldari', 'hexen'], ['Elspeth', 'aldari', 'lorist']
  ];
  for (const [n, r, c] of spec) {
    const ch = makeChar(rng, n, r, c, level);
    game.roster.push(ch); game.partyIds.push(ch.id);
  }
  return game;
}

function bestDamageSpell(ch, multiGroup) {
  const known = ch.knownSpells.map(c => DB.spell(c))
    .filter(s => s.combat && s.sp <= ch.sp && s.effect.kind === 'damage');
  known.sort((a, b) => b.tier - a.tier);
  if (multiGroup) {
    const aoe = known.find(s => s.target === 'allgroups');
    if (aoe) return aoe;
  }
  return known.find(s => s.target === 'group') || known[0] || null;
}

function biggestGroup(c) {
  let best = -1, idx = 0;
  c.groups.forEach((g, i) => { if (g.members.length > best && g.members.length > 0) { best = g.members.length; idx = i; } });
  return idx;
}

function orderParty(c, game) {
  const groupsAlive = livingGroups(c).length;
  for (const ch of ableParty(c)) {
    if (ch.cls === 'hexen' || ch.cls === 'lorist') {
      const hurt = realParty(game).filter(x => isAlive(x) && x.hp < x.maxHp * 0.35);
      if (ch.cls === 'lorist' && hurt.length) {
        const heal = ch.knownSpells.map(cd => DB.spell(cd))
          .filter(s => s.combat && s.sp <= ch.sp && s.effect.kind === 'heal')
          .sort((a, b) => b.tier - a.tier)[0];
        if (heal) { setOrder(c, ch.id, { type: 'cast', code: heal.code, target: heal.target === 'ally' ? hurt[0] : 0 }); continue; }
      }
      const spell = bestDamageSpell(ch, groupsAlive > 1);
      if (spell) { setOrder(c, ch.id, { type: 'cast', code: spell.code, target: biggestGroup(c) }); continue; }
      setOrder(c, ch.id, { type: 'defend' });
    } else if (ch.cls === 'skald' && ch.songsLeft > 0) {
      const undead = livingGroups(c).some(g => g.def.undead);
      setOrder(c, ch.id, { type: 'sing', songId: undead ? 'dirge' : 'fireheart' });
    } else {
      setOrder(c, ch.id, { type: 'attack', target: 0 });
    }
  }
}

function runFight(seed, level, groups) {
  const rng = new Rng(seed);
  const game = makeSimParty(rng, level);
  game.pos = { map: 'undercroft1', x: 5, y: 5, facing: 0 };
  const c = makeCombat(game, rng, { groups });
  c.canRun = false;
  let rounds = 0;
  while (c.state === 'orders' && rounds < 80) {
    orderParty(c, game);
    resolveRound(c);
    rounds++;
  }
  const alive = realParty(game).filter(ch => isAlive(ch)).length;
  return { win: c.state === 'victory', alive, rounds };
}

function scenario(label, level, groups, trials = 60) {
  let wins = 0, cleanWins = 0, aliveSum = 0, roundsSum = 0;
  for (let i = 0; i < trials; i++) {
    const r = runFight(10_000 + i * 37, level, groups);
    if (r.win) { wins++; aliveSum += r.alive; roundsSum += r.rounds; if (r.alive >= 5) cleanWins++; }
  }
  console.log(
    `${label.padEnd(46)} L${String(level).padStart(2)}  win ${String(Math.round(wins / trials * 100)).padStart(3)}%` +
    `  clean ${String(Math.round(cleanWins / trials * 100)).padStart(3)}%` +
    (wins ? `  avg alive ${(aliveSum / wins).toFixed(1)}  avg rounds ${(roundsSum / wins).toFixed(1)}` : ''));
}

console.log('=== Thornmere balance simulation ===');
scenario('U1: 2d4 fen rats', 1, [{ monster: 'fen_rat', count: '2d4' }]);
scenario('U1: mixed (rats + mirefangs)', 1, [{ monster: 'fen_rat', count: '1d4' }, { monster: 'mirefang', count: '1d3' }]);
scenario('U1: crypt thieves', 1, [{ monster: 'crypt_thief', count: '1d3' }]);
scenario('U2: sodden dead + bonechatters', 3, [{ monster: 'sodden_dead', count: '1d4' }, { monster: 'bonechatter', count: '1d6' }]);
const TK = [{ monster: 'tallow_king', count: '1' }, { monster: 'tallow_acolyte', count: '1d2' }, { monster: 'tallow_crawler', count: '1d3' }];
scenario('TALLOW KING', 4, TK);
scenario('TALLOW KING', 5, TK);
scenario('TALLOW KING', 6, TK);
scenario('B1: wights + hounds', 7, [{ monster: 'barrow_wight', count: '1d4' }, { monster: 'moor_hound', count: '2d3' }]);
scenario('B3: sorcerer + trolls', 10, [{ monster: 'barrow_sorcerer', count: '1d2' }, { monster: 'peat_troll', count: '1d2' }]);
const CHOIR = [{ monster: 'choir_eldest', count: '1' }, { monster: 'hollow_cantor', count: '1d2+1' }, { monster: 'hollow_man', count: '2d3' }, { monster: 'hollow_man', count: '2d3' }];
scenario('THE CHOIR', 10, CHOIR);
scenario('THE CHOIR', 12, CHOIR);
scenario('N2: golems + weavers', 14, [{ monster: 'rune_golem', count: '1d2' }, { monster: 'illusion_weaver', count: '1d2' }]);
scenario('N4: hands + choristers', 16, [{ monster: 'maldrec_hand', count: '1d2' }, { monster: 'fell_chorister', count: '1d3' }]);
scenario('MALDREC', 16, [{ monster: 'maldrec', count: '1' }]);
scenario('MALDREC', 18, [{ monster: 'maldrec', count: '1' }]);

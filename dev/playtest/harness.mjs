// Headless playtest harness for Thornmere.
//
// Loads the REAL game data and drives the REAL combat engine (src/core/*) with
// a "smart player" decision policy, so balance findings reflect actual rules,
// not a re-implementation. No DOM is touched.
//
// Usage: imported by experiment runners (run-*.mjs). See README in this dir.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { loadAll, DB } from '../../src/core/db.js';
import { Rng, rollDice } from '../../src/core/rng.js';
import { newGame, currentMap, realParty, aliveParty } from '../../src/core/gamestate.js';
import { newSettings } from '../../src/core/settings.js';
import {
  createCharacter, rollStats, statMod, clsOf, isAlive, equipItem,
  addToInventory, effectiveAC, weaponOf
} from '../../src/core/character.js';
import {
  xpForLevel, canLevelUp, levelUp, maxTierAtLevel, tierCost, buyTier, nextTierFor
} from '../../src/core/leveling.js';
import {
  makeCombat, setOrder, setPartyOrder, resolveRound, livingGroups, ableParty
} from '../../src/core/combat.js';
import {
  templePrices, templeService, sparkRecharge, sparkCost, buyWine, wineCost,
  buyItem, addToParty
} from '../../src/core/services.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

// ---- data loading ----------------------------------------------------------
let loaded = false;
export async function ensureDb() {
  if (loaded) return;
  await loadAll(async (p) => JSON.parse(await readFile(path.join(ROOT, p), 'utf8')));
  loaded = true;
}

// ---- spell-tier reference helpers ------------------------------------------
const XP_MULT = (game) => game.settings?.reducedXp ? DB.balance.remasteredXpMultiplier : 1.0;

// Buy spell tiers for a caster up to the highest tier their level allows,
// limited by gold. Returns gold spent. Honors canBuyTier rules (level + cost).
function buySpellsUpTo(game, ch, school, wantTier) {
  let spent = 0;
  while (true) {
    const t = nextTierFor(ch, school);
    if (t == null || t > wantTier) break;
    if (maxTierAtLevel(ch.level) < t) break;
    const cost = tierCost(t);
    if (game.gold < cost) break;
    game.gold -= cost;
    buyTier(ch, school);
    spent += cost;
  }
  return spent;
}

// ---- party construction ----------------------------------------------------
// spec.members: [{ name, race, cls, weapon, armor, shield, helm, gauntlets,
//                  instrument, school?, spellTier? }]
// Rerolls stats up to `rerolls` times keeping the best (by a class-weighted
// score) — the "roll until satisfied" a smart player does.
export function buildParty(game, rng, spec) {
  for (const m of spec.members) {
    const stats = bestStats(rng, m, spec.rerolls ?? 40);
    const ch = createCharacter(rng, { name: m.name, raceId: m.race, classId: m.cls, stats });
    ch.portrait = `pc_${m.race}_a`;
    addToInventory(ch, 'torch');
    game.gold += 90 + rng.range(0, 60);   // muster purse, as in the Hall
    // outfit from the spec, paying Greta's price for each piece we can afford
    for (const slot of ['weapon', 'armor', 'shield', 'helm', 'gauntlets', 'instrument']) {
      if (!m[slot]) continue;
      const price = DB.item(m[slot]).price || 0;
      if (game.gold < price) continue;
      game.gold -= price;
      const idx = ch.inventory.length;
      if (addToInventory(ch, m[slot])) equipItem(ch, idx);
    }
    // casters buy spell tiers (level 1 only allows tier 1)
    const school = clsOf(ch).school;
    if (school && school !== 'all') buySpellsUpTo(game, ch, school, m.spellTier ?? 7);
    game.roster.push(ch);
    addToParty(game, ch.id);
  }
  return realParty(game);
}

function statScore(cls, stats) {
  // Weight the prime stat heavily, CN for survivability, and a class flavour.
  const prime = cls.primeStat;
  let s = stats[prime] * 3 + stats.CN * 2 + stats.LK;
  if (cls.spDie) s += stats.IQ * 1.5;          // casters love IQ for SP
  if (!cls.school) s += stats.ST + stats.DX;   // martials want both
  return s;
}
function bestStats(rng, m, rerolls) {
  const cls = DB.cls(m.cls);
  let best = null, bestScore = -1;
  for (let i = 0; i < rerolls; i++) {
    const st = rollStats(rng, m.race);
    const sc = statScore(cls, st);
    if (sc > bestScore) { bestScore = sc; best = st; }
  }
  return best;
}

// ---- encounter generation (faithful to maze.rollEncounter table sampling) --
export function rollEncounterSpec(rng, mapId, { night = false } = {}) {
  const map = DB.map(mapId);
  let enc = map.encounters;
  if (map.kind === 'town') enc = night ? enc.night : enc.day;
  const nGroups = Math.min(4, rollDice(rng, enc.groups));
  const totalWeight = enc.table.reduce((a, t) => a + t.weight, 0);
  const groups = [];
  for (let i = 0; i < nGroups; i++) {
    let w = rng.int(totalWeight);
    let row = enc.table[0];
    for (const r of enc.table) { if (w < r.weight) { row = r; break; } w -= r.weight; }
    const def = DB.monster(row.monster);
    groups.push({ monster: row.monster, count: rollDice(rng, def.group) });
  }
  return { groups };
}

// ---- the smart combat policy ----------------------------------------------
// Returns one battle result: { win, fled, rounds, deaths:[names], xp, gold,
//   startHpFrac, endAliveCount }
export function fightBattle(game, rng, spec, opts = {}) {
  const maxRounds = opts.maxRounds ?? 40;
  // allow fleeing only when the policy judges the fight unwinnable
  const c = makeCombat(game, rng, spec);
  let rounds = 0;
  const deathsBefore = new Set(realParty(game).filter(ch => !isAlive(ch)).map(ch => ch.id));

  while (c.state === 'orders' && rounds < maxRounds) {
    rounds++;
    c.orders = {}; c.partyOrder = null;
    planRound(game, rng, c);
    resolveRound(c);
  }
  if (c.state === 'orders') c.state = 'timeout';

  const deaths = realParty(game)
    .filter(ch => !isAlive(ch) && !deathsBefore.has(ch.id))
    .map(ch => ch.name);
  return {
    win: c.state === 'victory',
    fled: c.state === 'fled',
    state: c.state,
    rounds,
    deaths,
    xp: c.result?.xpEach || 0,
    gold: c.result?.gold || 0,
    aliveAfter: aliveParty(game).filter(ch => !ch.summon).length
  };
}

// Decide and set orders for every able party member for one round.
function planRound(game, rng, c) {
  const groups = livingGroups(c);
  const able = ableParty(c);
  const order = realParty(game).filter(ch => isAlive(ch));   // marching order

  // group bookkeeping
  const totalFoes = groups.reduce((a, g) => a + g.members.length, 0);
  const biggest = () => groups.slice().sort((a, b) =>
    b.members.length - a.members.length || a.dist - b.dist)[0];
  const groupIdx = (g) => c.groups.indexOf(g);

  // Should the party advance? Only if no foe is in melee reach and nobody has a
  // missile that reaches — otherwise everyone can already act.
  const nearest = Math.min(...groups.map(g => g.dist));
  const anyMissileReaches = able.some(ch => {
    const w = weaponOf(ch); return w?.missile && w.range >= nearest;
  });
  if (nearest > 10 && !anyMissileReaches) setPartyOrder(c, 'advance');

  for (const ch of able) {
    const rank = order.indexOf(ch);
    const cls = clsOf(ch);
    const target = biggest();
    const ti = target ? groupIdx(target) : 0;

    // --- Skald: buff while it matters, else swing ---
    if (cls.bard && ch.songsLeft > 0 && weaponOf(ch)?.type !== undefined) {
      // sing only if there's a meaningful fight left
      if (totalFoes >= 2) {
        const songId = totalFoes >= 4 ? 'jig' : 'march'; // foe -hit when swarmed, else +AC
        setOrder(c, ch.id, { type: 'sing', songId });
        continue;
      }
    }

    // --- Casters ---
    if (cls.school) {
      const o = casterOrder(game, rng, ch, c, groups, totalFoes, ti);
      if (o) { setOrder(c, ch.id, o); continue; }
      // fall through to melee/defend if out of SP
    }

    // --- Martial / fallback ---
    const w = weaponOf(ch);
    const canMelee = rank < 3 && nearest <= 10;
    const canShoot = w?.missile && groups.some(g => w.range >= g.dist);
    if (canMelee || canShoot) setOrder(c, ch.id, { type: 'attack', target: ti });
    else setOrder(c, ch.id, { type: 'defend' });
  }
}

function casterOrder(game, rng, ch, c, groups, totalFoes, ti) {
  const known = ch.knownSpells.map(code => DB.spell(code));
  const has = (code) => ch.sp >= (DB.spell(code)?.sp ?? 99) && ch.knownSpells.includes(code);

  // 1) Emergency heal: any ally below 45% hp and we can heal.
  const hurt = realParty(game).filter(a => isAlive(a) && a.hp < a.maxHp * 0.45)
    .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
  const healSpell = ['SALV', 'MEND', 'WELL', 'QUIK', 'BALM'].find(has);
  if (hurt.length && healSpell) {
    const sp = DB.spell(healSpell);
    if (sp.target === 'party') return { type: 'cast', code: healSpell, target: 0 };
    return { type: 'cast', code: healSpell, target: hurt[0] };
  }

  // 2) Group damage when foes are clustered (>=3 in the biggest group, or
  //    multiple groups), preferring an in-range AoE.
  const big = groups.slice().sort((a, b) => b.members.length - a.members.length)[0];
  const aoe = ['EMBR', 'CIND', 'RUIN', 'HAIL', 'SQAL'].map(code => DB.spell(code))
    .find(sp => sp && has(sp.code) && sp.range >= big.dist);
  if (big && big.members.length >= 3 && aoe) {
    return { type: 'cast', code: aoe.code, target: c.groups.indexOf(big) };
  }

  // 3) Crowd control: fear a big group early (free action economy).
  const fear = ['MOCK'].find(has);
  if (fear && big && big.members.length >= 3 && big.feared === 0 && c.round <= 2) {
    const sp = DB.spell(fear);
    if (sp.range >= big.dist) return { type: 'cast', code: fear, target: c.groups.indexOf(big) };
  }

  // 4) Single-target nuke on the biggest group.
  const nuke = ['JOLT', 'ASHD', 'SPRK', 'GUST', 'LANC'].map(code => DB.spell(code))
    .find(sp => sp && has(sp.code) && sp.range >= big.dist);
  if (nuke) return { type: 'cast', code: nuke.code, target: c.groups.indexOf(big) };

  return null; // out of SP / nothing in range
}

// ---- town services (the careful player's between-fight routine) ------------
export function townRest(game, { heal = true, recharge = true, wine = true, level = true } = {}) {
  const spend = { temple: 0, spark: 0, wine: 0 };
  for (const ch of realParty(game)) {
    if (level) while (canLevelUp(ch, XP_MULT(game))) levelUp(game._lvlRng || (game._lvlRng = new Rng(game.seed ^ 0xabcd)), ch);
    if (heal) {
      for (const what of ['poison', 'fear', 'stone']) {
        if (ch.status[what]) { const r = templeService(game, ch, what); if (r.ok) spend.temple += 0; }
      }
      if (ch.status.dead) { const before = game.gold; templeService(game, ch, 'resurrect'); spend.temple += before - game.gold; }
      if (ch.drained) { const before = game.gold; templeService(game, ch, 'drain'); spend.temple += before - game.gold; }
      if (ch.hp < ch.maxHp && !ch.status.dead && !ch.status.stone) {
        const before = game.gold; templeService(game, ch, 'heal'); spend.temple += before - game.gold;
      }
    }
    if (recharge && ch.maxSp > 0 && ch.sp < ch.maxSp) {
      const before = game.gold; sparkRecharge(game, ch); spend.spark += before - game.gold;
    }
    if (wine && ch.cls === 'skald' && ch.songsLeft < ch.level) {
      const before = game.gold; buyWine(game, ch); spend.wine += before - game.gold;
    }
  }
  return spend;
}

// ---- full run: 5 town wins then 5 dungeon wins -----------------------------
// opts: { mode:'remastered'|'legacy', managed:bool, townNight:bool,
//         dungeon:'undercroft1'|'barrow1', seed }
export function runAttempt(spec, opts = {}) {
  const seed = opts.seed >>> 0;
  const game = newGame(seed);
  game.settings = newSettings(opts.mode || 'remastered');
  if (game.settings.sharedInventory && !game.pool) game.pool = { items: [] };
  const rng = new Rng(seed ^ 0x9e3779b9);

  buildParty(game, rng, spec);
  // initial shopping happens in spec via gear; extra gold-spend hook:
  if (spec.onMuster) spec.onMuster(game, rng);

  const log = { mode: opts.mode || 'remastered', managed: !!opts.managed, seed,
    townWins: 0, dungeonWins: 0, battles: [], goldSpent: { temple: 0, spark: 0, wine: 0 },
    deaths: [], wiped: false, success: false };

  const phases = [
    { map: 'town', need: 5, night: !!opts.townNight },
    { map: opts.dungeon || 'undercroft1', need: 5, night: false }
  ];

  for (const phase of phases) {
    game.pos.map = phase.map;
    let wins = 0, guard = 0;
    while (wins < phase.need && guard++ < 400) {
      // careful player tops up before stepping out
      if (opts.managed) {
        const s = townRest(game, {});
        for (const k in s) log.goldSpent[k] += s[k];
      } else {
        // attrition: only natural town daytime SP regen (3 ticks) between steps
        if (phase.map === 'town' && !phase.night) for (const ch of realParty(game))
          if (ch.maxSp > 0 && ch.sp < ch.maxSp) ch.sp = Math.min(ch.maxSp, ch.sp + 1);
      }
      if (!aliveParty(game).filter(ch => !ch.summon).length) { log.wiped = true; break; }

      const espec = rollEncounterSpec(rng, phase.map, { night: phase.night });
      const before = realParty(game).map(ch => ({ n: ch.name, hp: ch.hp }));
      const res = fightBattle(game, rng, espec);
      log.battles.push({
        phase: phase.map, foes: espec.groups.map(g => `${g.count}x${g.monster}`).join('+'),
        ...res
      });
      log.deaths.push(...res.deaths);
      if (res.win) { wins++; if (phase.map === 'town') log.townWins++; else log.dungeonWins++; }
      if (!aliveParty(game).filter(ch => !ch.summon).length) {
        log.wiped = true; break;
      }
      // in attrition mode a fled/timeout battle still counts as survival but not a win
    }
    if (log.wiped) break;
  }
  log.success = log.townWins >= 5 && log.dungeonWins >= 5;
  log.finalGold = game.gold;
  log.party = realParty(game).map(ch => ({
    name: ch.name, race: ch.race, cls: ch.cls, lvl: ch.level,
    hp: `${ch.hp}/${ch.maxHp}`, sp: `${ch.sp}/${ch.maxSp}`, ac: effectiveAC(ch),
    dead: !!ch.status.dead, drained: ch.drained
  }));
  return log;
}

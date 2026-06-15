// Level 3 grind playtest — how long / how much gold to reach Level 3 before
// the first dungeon, using the new enterable empty houses (Plan A)?
//
// BT1-faithful economy:
//  - Dead LOW-LEVEL chars (<TARGET) → free recruit from Hall (same class, fresh L1)
//  - Dead HIGH-LEVEL chars (≥TARGET) → resurrection only if affordable
//  - Lorist heals party with MEND between fights (out-of-combat castExplore)
//  - Temple: fallback for badly hurt front-row chars when Lorist SP dry
//  - Night falls → sleep safely in tavern (overnight skip, new mechanic)
//  - Level up at Review Board whenever XP permits (free)
//  - Buy spell tiers (Lorist T1 at muster; Hexen T1 bought in-run from income)
//
// Usage: node dev/playtest/run-level3-v1.mjs [runs]   default 200

import { ensureDb, buildParty, fightBattle } from './harness-v2.mjs';
import { DB } from '../../src/core/db.js';
import { Rng, rollDice } from '../../src/core/rng.js';
import {
  newGame, realParty, aliveParty, isNight, DAY_LEN,
} from '../../src/core/gamestate.js';
import { newSettings } from '../../src/core/settings.js';
import { rollStats, statMod, isAlive, clsOf } from '../../src/core/character.js';
import {
  canLevelUp, levelUp, nextTierFor, maxTierAtLevel, tierCost, buyTier,
} from '../../src/core/leveling.js';
import { templeService, templePrices } from '../../src/core/services.js';
import { advanceClock, rollHouseEncounter } from '../../src/core/maze.js';
import { castExplore } from '../../src/core/spells.js';

const RUNS    = parseInt(process.argv[2] ?? '200', 10);
const TARGET  = 3;   // "all party members at this level" = success
const REPLACE_BELOW = TARGET;   // recruit replacement if dead char level < TARGET
const TIER_RESERVE  = 60;       // gold to keep in pocket when buying spell tiers
const CLOCK_CAP     = 3200;     // 8 game-days; safety valve

await ensureDb();

// Reset a dead char as a fresh Level 1 recruit of the same class/race.
// The replacement inherits gear from the dead char (party took it from the body).
// Moves to the back of the marching order (newest member goes to slot 5).
function recruitReplacement(game, rng, deadCh, stats) {
  const cls = DB.cls(deadCh.cls);
  const st  = rollStats(rng, deadCh.race);

  deadCh.stats   = st;
  deadCh.level   = 1;
  deadCh.xp      = 0;
  deadCh.drained = 0;
  deadCh.status  = {};
  deadCh.maxHp   = Math.max(1, cls.hpDie + statMod(st.CN));
  deadCh.hp      = deadCh.maxHp;

  if (cls.spDie) {
    deadCh.maxSp       = Math.max(1, rollDice(rng, `1d${cls.spDie}`) + statMod(st.IQ) * 2);
    deadCh.sp          = deadCh.maxSp;
    deadCh.schoolTiers = { [cls.school]: 0 };
  } else {
    deadCh.maxSp       = 0;
    deadCh.sp          = 0;
    deadCh.schoolTiers = {};
  }
  deadCh.knownSpells = [];
  deadCh.songsLeft   = deadCh.cls === 'skald' ? 1 : 0;

  // Send to the back — newest member is most vulnerable
  game.partyIds = game.partyIds.filter(id => id !== deadCh.id);
  game.partyIds.push(deadCh.id);

  stats.replacements++;
}

// Heal party post-combat: Lorist first (SP cost), Temple for badly hurt front-liners.
function postCombatHeal(game, rng, stats) {
  const party   = realParty(game);
  const casters = party.filter(ch => isAlive(ch) && ch.maxSp > 0);
  const hurt    = () => party.filter(ch => isAlive(ch) && ch.hp < ch.maxHp);

  let guard = 0;
  while (hurt().length && guard++ < 40) {
    let acted = false;
    for (const caster of casters) {
      const target = hurt().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      if (!target) break;
      const code = ['BALM', 'SALV', 'MEND'].find(
        x => caster.knownSpells.includes(x) && caster.sp >= DB.spell(x).sp
      );
      if (!code) continue;
      const sp = DB.spell(code);
      castExplore(game, rng, caster, sp, sp.target === 'party' ? null : target);
      acted = true;
    }
    if (!acted) break;
  }

  // Temple fallback: front-row chars still at <50% HP (Lorist was dry)
  for (const ch of party.slice(0, 3)) {
    if (!isAlive(ch) || ch.hp >= Math.ceil(ch.maxHp / 2)) continue;
    const cost = templePrices(ch).heal;
    if (game.gold >= cost + 30) {
      const r = templeService(game, ch, 'heal');
      if (r.ok) stats.goldTemple += cost;
    }
  }
}

// Between fights: level up, handle dead chars (recruit or resurrect), buy spell tiers.
function maintenance(game, rng, run, stats) {
  const party = realParty(game);

  for (const ch of party) {
    if (!isAlive(ch)) continue;
    while (canLevelUp(ch)) { levelUp(rng, ch); run.levelUps++; stats.levelUps++; }
  }

  for (const ch of party) {
    if (!ch.status.dead) continue;
    if (ch.level < REPLACE_BELOW) {
      recruitReplacement(game, rng, ch, stats);
    } else {
      const cost = templePrices(ch).resurrect;
      if (game.gold >= cost + 50) {
        const r = templeService(game, ch, 'resurrect');
        if (r.ok) { run.gold.resurrect += cost; stats.resurrections++; }
      }
    }
  }

  for (const ch of realParty(game)) {
    if (!isAlive(ch)) continue;
    const school = clsOf(ch).school;
    if (!school || school === 'all') continue;
    const t = nextTierFor(ch, school);
    if (t == null || maxTierAtLevel(ch.level) < t) continue;
    const cost = tierCost(t);
    if (game.gold - cost >= TIER_RESERVE) {
      game.gold -= cost;
      buyTier(ch, school);
      run.gold.upgrades += cost;
      stats.tiersAdded++;
    }
  }
}

function makeRun(seed) {
  const game = newGame(seed);
  game.settings = newSettings('legacy');
  game.pos.map  = 'town';
  const rng = new Rng(seed ^ 0x9e3779b9);

  const run = {
    dungeon: 'undercroft1', battles: [], deaths: [],
    townWins: 0, dungeonWins: 0, townDayFights: 0, townNightFights: 0,
    gold: { temple: 0, spark: 0, wine: 0, resurrect: 0, upgrades: 0 },
    levelUps: 0, chestsOpened: 0, trapsSprung: 0,
    waitSteps: 0, waitedIntoNight: 0, retreats: 0, townTrips: 0,
    travelStepsTown: 0, travelStepsDungeon: 0, travelFights: 0, travelPoisonDeaths: 0,
    brokeEvents: 0, fledCount: 0, wiped: false, stuck: false, success: false,
    resurrections: 0, permaDeaths: new Set(), goldTimeline: [], _armedTraps: [],
  };

  // Buy Lorist T1 (MEND) at muster; Hexen stays at T0 (buy T1 from fight income).
  // 220g start: Lorist T1 = 120g → ~100g reserve for early healing.
  const spec = {
    prebuilt: true,
    prebuiltBuySpells: true,
    rerolls: 1,
    members: [
      { name: 'Hroth',    race: 'korrun',  cls: 'blade',  weapon: 'broadsword',  armor: 'leather_armor' },
      { name: 'Brenna',   race: 'vael',    cls: 'blade',  weapon: 'spear',        armor: 'leather_armor' },
      { name: 'Aldwyn',   race: 'vael',    cls: 'warden', weapon: 'shortsword',   armor: 'leather_armor' },
      { name: 'Tamsin',   race: 'fennick', cls: 'skald',  weapon: 'shortsword',   armor: 'padded_jack', instrument: 'reed_pipe' },
      { name: 'Morrigan', race: 'aldari',  cls: 'hexen',  weapon: 'dagger',       armor: 'robes', spellTier: 0 },
      { name: 'Elspeth',  race: 'aldari',  cls: 'lorist', weapon: 'quarterstaff', armor: 'robes', spellTier: 1 },
    ],
  };
  buildParty(game, rng, spec);

  return { game, rng, run };
}

function oneRun(seed) {
  const { game, rng, run } = makeRun(seed);
  const stats = {
    fights: 0, nights: 0, wipe: false,
    goldTemple: 0, levelUps: 0, tiersAdded: 0,
    replacements: 0, resurrections: 0,
  };

  const allDead     = () => !aliveParty(game).filter(c => !c.summon).length;
  const allAtTarget = () => realParty(game).every(ch => ch.level >= TARGET);

  while (!allDead() && !allAtTarget() && game.clock < CLOCK_CAP) {
    maintenance(game, rng, run, stats);
    if (allAtTarget()) break;

    // Night → sleep safely in the tavern until morning
    if (isNight(game)) {
      game.clock = (Math.floor(game.clock / DAY_LEN) + 1) * DAY_LEN;
      stats.nights++;
      for (const ch of realParty(game)) {
        if (ch.cls === 'skald' && isAlive(ch)) ch.songsLeft = ch.level;
      }
      continue;
    }

    // Enter a house: 1 clock tick + 25% day encounter roll
    const events = [];
    advanceClock(game, rng, events);
    rollHouseEncounter(game, rng, events);
    const enc = events.find(e => e.type === 'combat');
    if (!enc) continue;

    const res = fightBattle(game, rng, { groups: enc.groups }, run, { inTown: true });

    if (allDead()) { stats.wipe = true; break; }

    if (res.win) {
      stats.fights++;
      postCombatHeal(game, rng, stats);
    } else if (!res.fled) {
      stats.wipe = true; break;
    }
  }

  const party   = realParty(game);
  const alive   = party.filter(ch => isAlive(ch));
  const aliveL3 = alive.filter(ch => ch.level >= TARGET);

  return {
    allDone:         party.every(ch => ch.level >= TARGET),
    allSurvivorsL3:  alive.length > 0 && aliveL3.length === alive.length,
    survivorsAtL3:   aliveL3.length,
    totalSurvivors:  alive.length,
    wipe:            stats.wipe,
    hitCap:          game.clock >= CLOCK_CAP && !stats.wipe,
    clock:           game.clock,
    days:            Math.ceil(game.clock / DAY_LEN),
    nights:          stats.nights,
    fights:          stats.fights,
    replacements:    stats.replacements,
    resurrections:   stats.resurrections,
    levelUps:        stats.levelUps,
    tiersAdded:      stats.tiersAdded,
    fled:            run.fledCount,
    goldTemple:      stats.goldTemple,
    goldTiers:       run.gold.upgrades,
    goldResurrect:   run.gold.resurrect,
    finalGold:       game.gold,
    casterT1s:       party.filter(ch => {
      const s = clsOf(ch).school;
      return s && s !== 'all' && (ch.schoolTiers?.[s] ?? 0) >= 1;
    }).length,
  };
}

// ---- Run -------------------------------------------------------------------

console.log(`\n=== Level 3 grind playtest  ${RUNS} runs  (house 25% day / tavern overnight) ===\n`);
console.log('Model: dead L1-L2 chars → free recruit from Hall (same class, L1 reset)');
console.log('       dead L3+ chars   → resurrect when affordable (250g+)');
console.log('       night falls      → sleep in tavern until morning\n');

const results = [];
for (let i = 0; i < RUNS; i++) {
  process.stdout.write(`\r  run ${i + 1}/${RUNS}...`);
  results.push(oneRun(i + 1));
}
process.stdout.write('\r                        \r');

const done    = results.filter(r => r.allDone);
const partial = results.filter(r => !r.allDone && r.allSurvivorsL3 && !r.wipe && !r.hitCap);
const wipes   = results.filter(r => r.wipe);
const cap     = results.filter(r => r.hitCap);

const succeeding = [...done, ...partial];

function avg(arr, fn) {
  if (!arr.length) return '-';
  return (arr.reduce((s, r) => s + fn(r), 0) / arr.length).toFixed(1);
}

console.log('--- COMPLETION ---');
console.log(`All 6 slots at Level 3 (incl. replacements):  ${done.length}/${RUNS} (${(done.length/RUNS*100).toFixed(1)}%)`);
console.log(`All survivors at L3, some slots replaced:     ${partial.length}/${RUNS} (${(partial.length/RUNS*100).toFixed(1)}%)`);
console.log(`Full party wipe (all dead):                   ${wipes.length}/${RUNS} (${(wipes.length/RUNS*100).toFixed(1)}%)`);
console.log(`Hit clock cap (>${CLOCK_CAP} ticks, ~8 days):  ${cap.length}/${RUNS}`);

if (succeeding.length) {
  console.log('\n--- SUCCESSFUL RUNS (all survivors at L3) ---');
  console.log(`Avg days to finish:          ${avg(succeeding, r => r.days)}`);
  console.log(`Avg nights slept in tavern:  ${avg(succeeding, r => r.nights)}`);
  console.log(`Avg house fight wins:        ${avg(succeeding, r => r.fights)}`);
  console.log(`Avg replacements recruited:  ${avg(succeeding, r => r.replacements)}`);
  console.log(`Avg level-ups total:         ${avg(succeeding, r => r.levelUps)}`);
  console.log(`Avg spell tiers bought:      ${avg(succeeding, r => r.tiersAdded)}`);
  console.log(`Avg gold to temple:          ${avg(succeeding, r => r.goldTemple)}`);
  console.log(`Avg gold to spell tiers:     ${avg(succeeding, r => r.goldTiers)}`);
  console.log(`Avg final gold:              ${avg(succeeding, r => r.finalGold)}`);
  console.log(`Avg casters with T1:         ${avg(succeeding, r => r.casterT1s)}`);

  const n  = succeeding.length;
  const r0 = succeeding.filter(r => r.replacements === 0).length;
  const r1 = succeeding.filter(r => r.replacements === 1).length;
  const r2 = succeeding.filter(r => r.replacements === 2).length;
  const r3 = succeeding.filter(r => r.replacements >= 3).length;
  console.log('\n--- REPLACEMENT HISTOGRAM (free Hall recruits) ---');
  console.log(`  0 replacements (original 6 all alive):  ${r0}/${n} (${(r0/n*100).toFixed(1)}%)`);
  console.log(`  1 replacement:                          ${r1}/${n} (${(r1/n*100).toFixed(1)}%)`);
  console.log(`  2 replacements:                         ${r2}/${n} (${(r2/n*100).toFixed(1)}%)`);
  console.log(`  3+ replacements:                        ${r3}/${n} (${(r3/n*100).toFixed(1)}%)`);

  const days   = succeeding.map(r => r.days);
  const maxDay = Math.min(Math.max(...days), 10);
  console.log('\n--- DAYS TO L3 HISTOGRAM ---');
  for (let d = 1; d <= maxDay; d++) {
    const cnt = days.filter(x => x === d).length;
    const bar = '█'.repeat(Math.round(cnt / n * 40));
    console.log(`  Day ${d}: ${String(cnt).padStart(4)}  ${bar}`);
  }
}

console.log('\n--- VERDICT ---');
const successRate = succeeding.length / RUNS * 100;
const wipeRate    = wipes.length    / RUNS * 100;
const capRate     = cap.length      / RUNS * 100;
console.log(`Success (all survivors at L3):  ${successRate.toFixed(1)}%  (target ≥ 70%)`);
console.log(`Full party wipe rate:           ${wipeRate.toFixed(1)}%  (target < 15%)`);
console.log(`Clock cap (stuck > 8 days):     ${capRate.toFixed(1)}%  (expect ~0 with recruitment)`);
console.log(`Overnight tavern use:           ${succeeding.length ? avg(succeeding, r => r.nights) : '-'} nights avg`);

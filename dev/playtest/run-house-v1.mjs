// House encounter tuning harness — Plan A empty houses.
// Metric: a fresh 6-char party wins ~5 day fights in under ~200 clock-turns
// with zero wipes; night looting still risks a wipe (gate-wight drain intact).
//
// Usage: node dev/playtest/run-house-v1.mjs [runs] [dayRate]
//   node dev/playtest/run-house-v1.mjs          # 200 runs, rate from town.json
//   node dev/playtest/run-house-v1.mjs 200 20   # override dayRate to 20

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

import { loadAll, DB } from '../../src/core/db.js';
import { Rng, rollDice } from '../../src/core/rng.js';
import { newGame, currentMap, realParty, aliveParty, isNight, NIGHT_AT } from '../../src/core/gamestate.js';
import { createCharacter, rollStats, isAlive, equipItem, addToInventory } from '../../src/core/character.js';
import { makeCombat, setOrder, setPartyOrder, resolveRound, livingGroups, ableParty } from '../../src/core/combat.js';
import { advanceClock, rollHouseEncounter } from '../../src/core/maze.js';

const RUNS     = parseInt(process.argv[2] ?? '200', 10);
const DAY_RATE = process.argv[3] != null ? parseInt(process.argv[3], 10) : null;

await loadAll(async (p) => JSON.parse(await readFile(path.join(ROOT, p), 'utf8')));

function makeFreshParty(seed) {
  const rng = new Rng(seed);
  const game = newGame(seed);
  game.pos.map = 'town';
  game.gold = 220;
  const specs = [
    ['Hroth',    'korrun',  'blade',  'broadsword',   'leather_armor'],
    ['Brenna',   'vael',    'blade',  'spear',         'leather_armor'],
    ['Aldwyn',   'vael',    'warden', 'shortsword',    'leather_armor'],
    ['Tamsin',   'fennick', 'skald',  'shortsword',    'padded_jack'],
    ['Morrigan', 'aldari',  'hexen',  'dagger',        'robes'],
    ['Elspeth',  'aldari',  'lorist', 'quarterstaff',  'robes'],
  ];
  for (const [name, raceId, classId, weapon, armor] of specs) {
    const ch = createCharacter(rng, { name, raceId, classId, stats: rollStats(rng, raceId) });
    addToInventory(ch, weapon); equipItem(ch, 0);
    addToInventory(ch, armor);  equipItem(ch, 1);
    game.roster.push(ch);
    game.partyIds.push(ch.id);
  }
  return { game, rng };
}

// Roll a house encounter; returns groups array or null.
function houseEncounterRoll(game, rng, events) {
  if (DAY_RATE != null && !isNight(game)) {
    // Rate override for day tuning experiments
    const enc = currentMap(game).encounters;
    if (!rng.chance(DAY_RATE)) return null;
    const timeEnc = enc.day;
    const nGroups = Math.min(4, rollDice(rng, timeEnc.groups));
    const totalWeight = timeEnc.table.reduce((a, t) => a + t.weight, 0);
    const groups = [];
    for (let i = 0; i < nGroups; i++) {
      let w = rng.int(totalWeight);
      let pickRow = timeEnc.table[0];
      for (const row of timeEnc.table) { if (w < row.weight) { pickRow = row; break; } w -= row.weight; }
      const def = DB.monster(pickRow.monster);
      groups.push({ monster: pickRow.monster, count: rollDice(rng, def.group) });
    }
    return groups.length ? groups : null;
  }
  rollHouseEncounter(game, rng, events);
  const ev = events.find(e => e.type === 'combat');
  return ev ? ev.groups : null;
}

// Restore HP to max and clear dead/stone status after each fight (simulates
// a trip to the temple between house visits — the intended grind loop).
function healParty(game) {
  for (const ch of realParty(game)) {
    ch.hp = ch.maxHp;
    ch.status = {};
  }
}

// Simulate combat with simple "advance and attack" AI.
function fightCombat(game, rng, groups) {
  const c = makeCombat(game, rng, { groups });
  let rounds = 0;
  while (c.state === 'orders' && rounds < 40) {
    rounds++;
    c.orders = {};
    c.partyOrder = null;
    const living = livingGroups(c);
    if (!living.length) break;
    const nearest = living.reduce((mn, g) => Math.min(mn, g.dist), Infinity);
    if (nearest > 10) {
      c.partyOrder = 'advance';
    } else {
      for (const ch of ableParty(c)) {
        c.orders[ch.id] = { type: 'attack', target: 0 };
      }
    }
    resolveRound(c);
  }
  return { won: c.state === 'victory', rounds, state: c.state };
}

function oneRun(seed, nightMode = false) {
  const { game, rng } = makeFreshParty(seed);
  if (nightMode) game.clock = NIGHT_AT;

  let wins = 0, visits = 0, wiped = false, wight_drain = false;
  const TARGET = 5, VISIT_CAP = 400;

  while (wins < TARGET && visits < VISIT_CAP && !wiped) {
    if (!nightMode && isNight(game)) break;

    const events = [];
    advanceClock(game, rng, events);
    visits++;

    const groups = houseEncounterRoll(game, rng, events);
    if (groups) {
      const levelsBefore = realParty(game).map(ch => ch.level);
      const result = fightCombat(game, rng, groups);
      const levelsAfter = realParty(game).map(ch => ch.level);
      if (levelsBefore.some((l, i) => levelsAfter[i] < l)) wight_drain = true;
      const alive = aliveParty(game);
      if (!alive.length || !result.won) { wiped = true; break; }
      wins++;
      healParty(game); // temple visit between fights
    }
  }

  return { wins, visits, clock: game.clock, nightArrived: isNight(game), wiped, wight_drain };
}

const rateLabel = DAY_RATE != null ? DAY_RATE : '25 (from data)';
console.log(`\n=== House encounter tuning (${RUNS} runs, dayRate=${rateLabel}) ===\n`);

// Day grind
const dayR = [];
for (let i = 0; i < RUNS; i++) dayR.push(oneRun(i + 1, false));

const dayWins5  = dayR.filter(r => r.wins >= 5).length;
const dayWipes  = dayR.filter(r => r.wiped).length;
const pct5u200  = dayR.filter(r => r.wins >= 5 && r.clock <= 200).length;
const avgClock  = (dayR.reduce((a, r) => a + r.clock, 0) / RUNS).toFixed(1);
const avgVisits = (dayR.reduce((a, r) => a + r.visits, 0) / RUNS).toFixed(1);

console.log('--- DAY GRIND (stop at night or 5 wins) ---');
console.log(`Reach 5 wins before night:    ${dayWins5}/${RUNS} (${(dayWins5/RUNS*100).toFixed(1)}%)`);
console.log(`5 wins AND clock ≤ 200:       ${pct5u200}/${RUNS} (${(pct5u200/RUNS*100).toFixed(1)}%)`);
console.log(`Wipes:                         ${dayWipes}/${RUNS}`);
console.log(`Avg clock at stop:             ${avgClock} turns`);
console.log(`Avg house visits:              ${avgVisits}`);
console.log(`Night arrived before 5 wins:   ${dayR.filter(r => r.nightArrived && r.wins < 5).length}/${RUNS}`);

// Night risk
const nightR = [];
for (let i = 0; i < RUNS; i++) nightR.push(oneRun(i + 1, true));
const nightWipes = nightR.filter(r => r.wiped).length;
const nightDrain = nightR.filter(r => r.wight_drain).length;

console.log('\n--- NIGHT RISK (5 visits starting at NIGHT_AT) ---');
console.log(`Wipes:                         ${nightWipes}/${RUNS} (${(nightWipes/RUNS*100).toFixed(1)}%)`);
console.log(`Level-drain events:            ${nightDrain}/${RUNS} (${(nightDrain/RUNS*100).toFixed(1)}%)`);

console.log('\n--- VERDICT ---');
const dayOk   = (dayWins5/RUNS*100) >= 70;
const wipeOk  = dayWipes === 0;
const nightOk = (nightWipes/RUNS*100) >= 5;
console.log(`Day 5-win rate ≥70%:   ${dayOk   ? 'PASS' : 'FAIL'} (${(dayWins5/RUNS*100).toFixed(1)}%)`);
console.log(`Day zero wipes:        ${wipeOk  ? 'PASS' : 'FAIL'} (${dayWipes} wipes)`);
console.log(`Night has wipe risk:   ${nightOk ? 'PASS' : 'FAIL'} (${(nightWipes/RUNS*100).toFixed(1)}% wipes)`);

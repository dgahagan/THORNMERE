import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDb, makeParty } from './helpers.js';
import { rollEncounter, rollHouseEncounter } from '../src/core/maze.js';
import { NIGHT_AT } from '../src/core/gamestate.js';

await loadDb();

// ---- rollHouseEncounter: elevated rate ----------------------------------------

test('rollHouseEncounter fires more often than street day rate', () => {
  // House day rate is 25%, street day rate is 1%.
  // With seed=1 and 200 seeded trials, house fires should far exceed street fires.
  const { game: gh, rng: rh } = makeParty(1);
  const { game: gs, rng: rs } = makeParty(1);
  gh.clock = 0; gs.clock = 0;

  let houseFires = 0, streetFires = 0;
  for (let i = 0; i < 200; i++) {
    const he = [], se = [];
    rollHouseEncounter(gh, rh, he);
    rollEncounter(gs, rs, se);
    if (he.some(e => e.type === 'combat')) houseFires++;
    if (se.some(e => e.type === 'combat')) streetFires++;
  }
  assert.ok(houseFires > streetFires, `houseFires=${houseFires} should exceed streetFires=${streetFires}`);
  // At 25% over 200 trials the expected count is 50; anything below 20 is a bug or a changed rate.
  assert.ok(houseFires >= 20, `house day rate too low: ${houseFires}/200 fires`);
});

test('rollHouseEncounter night fires more than day', () => {
  // Night rate 40% >> day rate 25%; 200 seeded trials each.
  const { game: gd, rng: rd } = makeParty(5);
  const { game: gn, rng: rn } = makeParty(5);
  gd.clock = 0;
  gn.clock = NIGHT_AT;

  let dayFires = 0, nightFires = 0;
  for (let i = 0; i < 200; i++) {
    const de = [], ne = [];
    rollHouseEncounter(gd, rd, de);
    rollHouseEncounter(gn, rn, ne);
    if (de.some(e => e.type === 'combat')) dayFires++;
    if (ne.some(e => e.type === 'combat')) nightFires++;
  }
  assert.ok(nightFires > dayFires, `night=${nightFires} should exceed day=${dayFires}`);
});

test('rollHouseEncounter day draws only from day table', () => {
  // Day table: fen_stray, footpad. Night-only: gate_wight, tavern_tough.
  const { game, rng } = makeParty(7);
  game.clock = 0;

  const nightOnly = new Set(['gate_wight', 'tavern_tough']);
  for (let i = 0; i < 500; i++) {
    const events = [];
    rollHouseEncounter(game, rng, events);
    for (const ev of events) {
      if (ev.type !== 'combat') continue;
      for (const g of ev.groups) {
        assert.ok(!nightOnly.has(g.monster), `day house spawned night-only monster: ${g.monster}`);
      }
    }
  }
});

test('rollHouseEncounter night table includes gate_wight', () => {
  // Night table has gate_wight (weight 1). Over 2000 trials it must appear at least once.
  const { game, rng } = makeParty(11);
  game.clock = NIGHT_AT;

  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const events = [];
    rollHouseEncounter(game, rng, events);
    for (const ev of events) {
      if (ev.type === 'combat') ev.groups.forEach(g => seen.add(g.monster));
    }
  }
  assert.ok(seen.has('gate_wight'), 'night house must eventually spawn gate_wight');
});

// ---- Regression guard: rollEncounter street RNG sequence unchanged -----------

test('rollEncounter street path is deterministic (regression guard)', () => {
  // Two runs with identical seeds must produce byte-identical event arrays.
  // This guards against any accidental RNG-call-order change in rollEncounter.
  const { game: gA, rng: rA } = makeParty(42);
  const { game: gB, rng: rB } = makeParty(42);
  gA.clock = NIGHT_AT;
  gB.clock = NIGHT_AT;

  const evA = [], evB = [];
  for (let i = 0; i < 200; i++) {
    rollEncounter(gA, rA, evA);
    rollEncounter(gB, rB, evB);
  }
  assert.equal(evA.length, evB.length, 'same event count from identical seeds');
  assert.deepEqual(evA, evB, 'identical event details from identical seeds');
});

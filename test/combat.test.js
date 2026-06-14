import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDb, makeParty, makeChar } from './helpers.js';
import { Rng } from '../src/core/rng.js';
import { DB } from '../src/core/db.js';
import {
  makeCombat, setOrder, setPartyOrder, resolveRound, livingGroups, ableParty
} from '../src/core/combat.js';
import { realParty } from '../src/core/gamestate.js';
import { addToInventory, equipItem } from '../src/core/character.js';
import { startExploreSong } from '../src/core/songs.js';
import { xpForLevel, levelUp, canLevelUp, buyTier, canBuyTier, changeClass, classChangeOptions, maxTierAtLevel } from '../src/core/leveling.js';

await loadDb();

function orderAllAttack(c) {
  for (const ch of ableParty(c)) setOrder(c, ch.id, { type: 'attack', target: 0 });
}

function fightToEnd(c, maxRounds = 60) {
  while (c.state === 'orders' && c.round < maxRounds) {
    orderAllAttack(c);
    resolveRound(c);
  }
  return c.state;
}

test('a starter party beats a pack of fen rats and earns xp/gold shares', () => {
  const { game } = makeParty(11);
  game.pos = { map: 'undercroft1', x: 2, y: 2, facing: 0 };
  const rng = new Rng(99);
  const c = makeCombat(game, rng, { groups: [{ monster: 'fen_rat', count: 4 }] });
  const state = fightToEnd(c);
  assert.equal(state, 'victory');
  assert.ok(c.result.xpEach >= 1, 'xp shared');
  for (const ch of realParty(game)) {
    if (!ch.status.dead) assert.equal(ch.xp, c.result.xpEach);
  }
});

test('groups advance from range until melee distance', () => {
  const { game } = makeParty(12);
  game.pos = { map: 'undercroft1', x: 2, y: 2, facing: 0 };
  const rng = new Rng(5);
  const c = makeCombat(game, rng, { groups: [{ monster: 'mirefang', count: 2 }] });
  c.groups[0].dist = 90;
  orderAllAttack(c);
  resolveRound(c);
  assert.equal(c.groups[0].dist, 70, 'advanced by speed 20');
  // party advance closes another 10
  if (c.state === 'orders') {
    setPartyOrder(c, 'advance');
    orderAllAttack(c);
    resolveRound(c);
    assert.ok(c.groups[0].dist <= 50);
  }
});

test('random encounters always open with a group in melee range', () => {
  // No fight should start with every group out of reach — that strands a
  // melee-only party in dead "advance" turns. Sweep many seeds to be sure.
  for (let i = 0; i < 200; i++) {
    const { game } = makeParty(2000 + i);
    game.pos = { map: 'undercroft1', x: 2, y: 2, facing: 0 };
    const c = makeCombat(game, new Rng(i), {
      groups: [{ monster: 'fen_rat', count: 2 }, { monster: 'mirefang', count: 1 }]
    });
    assert.ok(c.groups.some(g => g.dist <= 10), `seed ${i}: a group must be in melee range`);
  }
});

test('the melee floor leaves fixed-encounter distances untouched', () => {
  const { game } = makeParty(2500);
  game.pos = { map: 'undercroft1', x: 2, y: 2, facing: 0 };
  const c = makeCombat(game, new Rng(7), { groups: [{ monster: 'mirefang', count: 1 }], fixed: {} });
  assert.equal(c.groups[0].dist, 30, 'scripted encounters stay at their placed distance');
});

test('combat ends an exploration song', () => {
  const { game } = makeParty(13);
  const skald = realParty(game).find(ch => ch.cls === 'skald');
  const r = startExploreSong(game, skald, 'march');
  assert.ok(r.ok, r.msg);
  assert.ok(game.song);
  const c = makeCombat(game, new Rng(1), { groups: [{ monster: 'fen_rat', count: 1 }] });
  assert.equal(game.song, null);
  assert.ok(c.songEnded);
});

test('songs-per-day: skald runs dry', () => {
  const { game } = makeParty(14);
  const skald = realParty(game).find(ch => ch.cls === 'skald');
  skald.songsLeft = 1;
  assert.ok(startExploreSong(game, skald, 'lantern').ok);
  assert.equal(skald.songsLeft, 0);
  const again = startExploreSong(game, skald, 'lantern');
  assert.equal(again.ok, false);
  assert.match(again.msg, /Wine/);
});

test('hexen damage spell kills things and costs SP', () => {
  const { game } = makeParty(15);
  const hexen = realParty(game).find(ch => ch.cls === 'hexen');
  hexen.knownSpells.push('ASHD');
  hexen.schoolTiers.hexen = 1;
  hexen.sp = 10;
  game.pos = { map: 'undercroft1', x: 2, y: 2, facing: 0 };
  const rng = new Rng(3);
  const c = makeCombat(game, rng, { groups: [{ monster: 'grave_mite', count: 2 }] });
  c.groups[0].dist = 30;
  const before = c.groups[0].members.length;
  setOrder(c, hexen.id, { type: 'cast', code: 'ASHD', target: 0 });
  const events = resolveRound(c);
  assert.ok(hexen.sp < 10, 'sp spent');
  const txt = events.map(e => e.text).join(' ');
  assert.match(txt, /Ash Dart/);
});

test('boss fight: tallow king phases trigger and verse is awarded', () => {
  const { game } = makeParty(16);
  // beef the party up to make victory certain
  for (const ch of realParty(game)) {
    ch.level = 8; ch.maxHp = 80; ch.hp = 80;
  }
  game.pos = { map: 'undercroft2', x: 3, y: 17, facing: 0 };
  const fixed = DB.map('undercroft2').cells['3,17'];
  assert.equal(fixed.t, 'encounter');
  const rng = new Rng(8);
  const c = makeCombat(game, rng, { groups: fixed.groups, fixed });
  assert.equal(c.canRun, false, 'no fleeing a guardian');
  const state = fightToEnd(c, 120);
  assert.equal(state, 'victory');
  assert.ok(realParty(game).some(ch => ch.inventory.some(e => e.id === 'verse_first')), 'First Verse taken');
  assert.ok(game.mapState.undercroft2.once.tallow_king, 'boss marked done');
});

test('defeat is detected', () => {
  const { game } = makeParty(17);
  for (const ch of realParty(game)) { ch.maxHp = 1; ch.hp = 1; ch.level = 1; }
  game.pos = { map: 'needle4', x: 11, y: 19, facing: 0 };
  const rng = new Rng(2);
  const c = makeCombat(game, rng, { groups: [{ monster: 'pit_horror', count: 2 }] });
  c.groups[0].dist = 10;
  const state = fightToEnd(c, 40);
  assert.equal(state, 'defeat');
});

test('leveling math is monotonic and level-up raises hp', () => {
  let prev = 0;
  for (let l = 1; l <= 20; l++) {
    const need = xpForLevel('blade', l);
    assert.ok(need >= prev, 'monotonic');
    prev = need;
  }
  assert.equal(xpForLevel('blade', 1), 0);
  const rng = new Rng(4);
  const ch = makeChar(rng, 'Test', 'korrun', 'blade');
  const hpBefore = ch.maxHp;
  ch.xp = xpForLevel('blade', 2);
  assert.ok(canLevelUp(ch));
  levelUp(rng, ch);
  assert.equal(ch.level, 2);
  assert.ok(ch.maxHp > hpBefore);
});

test('spell tiers: gating by level and gold; class change path to riddlemaster', () => {
  const rng = new Rng(6);
  const ch = makeChar(rng, 'Mage', 'aldari', 'hexen');
  assert.equal(maxTierAtLevel(1), 1);
  assert.equal(maxTierAtLevel(13), 7);
  let res = canBuyTier(ch, 'hexen', 0);
  assert.equal(res.ok, false, 'no gold');
  res = canBuyTier(ch, 'hexen', 100000);
  assert.ok(res.ok);
  buyTier(ch, 'hexen');
  assert.equal(ch.schoolTiers.hexen, 1);
  assert.ok(ch.knownSpells.length === 4);
  res = canBuyTier(ch, 'hexen', 100000);
  assert.equal(res.ok, false, 'tier 2 needs level 3');

  // stormcaller requires tier 5 in hexen or lorist
  ch.level = 13;
  for (let t = 2; t <= 5; t++) buyTier(ch, 'hexen');
  let opts = classChangeOptions(ch);
  assert.ok(opts.find(o => o.cls.id === 'stormcaller').ok);
  assert.ok(!opts.find(o => o.cls.id === 'riddlemaster').ok);
  changeClass(ch, 'stormcaller');
  assert.equal(ch.level, 1);
  assert.equal(ch.xp, 0);
  assert.equal(ch.knownSpells.length, 20, 'keeps learned spells');
  // master two schools to tier 6 → riddlemaster opens
  ch.level = 11;
  buyTier(ch, 'hexen');                       // hexen 6
  for (let t = 1; t <= 6; t++) buyTier(ch, 'storm'); // storm 6
  opts = classChangeOptions(ch);
  assert.ok(opts.find(o => o.cls.id === 'riddlemaster').ok);
  changeClass(ch, 'riddlemaster');
  assert.deepEqual(ch.classHistory, ['hexen', 'stormcaller', 'riddlemaster']);
});

test('level-1 party survives a typical undercroft-1 encounter most of the time', () => {
  let wins = 0;
  const TRIALS = 50;
  for (let i = 0; i < TRIALS; i++) {
    const { game } = makeParty(1000 + i);
    game.pos = { map: 'undercroft1', x: 5, y: 5, facing: 0 };
    const rng = new Rng(2000 + i);
    // typical: one group from the level table at modest size
    const c = makeCombat(game, rng, { groups: [{ monster: 'fen_rat', count: '2d4' }] });
    const state = fightToEnd(c);
    if (state === 'victory' && realParty(game).filter(ch => !ch.status.dead).length >= 4) wins++;
  }
  assert.ok(wins >= TRIALS * 0.8, `${wins}/${TRIALS} clean wins (want >=80%)`);
});

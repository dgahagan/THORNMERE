import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDb, makeParty } from './helpers.js';
import { Rng } from '../src/core/rng.js';
import { gameToJSON, gameFromJSON, realParty, mapStateFor } from '../src/core/gamestate.js';
import { step, turn, answerRiddle } from '../src/core/maze.js';
import { addEffect } from '../src/core/effects.js';
import { makeCombat, resolveRound, setOrder, ableParty } from '../src/core/combat.js';
import { startExploreSong } from '../src/core/songs.js';
import { createCharacter, rollStats } from '../src/core/character.js';

await loadDb();

test('save/load round-trips the entire game state mid-delve', () => {
  const { game } = makeParty(77);
  const rng = new Rng(77);

  // get the game into a messy, interesting state
  game.pos = { map: 'undercroft1', x: 5, y: 5, facing: 1 };
  addEffect(game, { kind: 'light', radius: 2, until: game.clock + 150, fire: true });
  addEffect(game, { kind: 'shield', ac: 2, until: game.clock + 100 });
  for (let i = 0; i < 6; i++) { step(game, rng); turn(game, 1); }
  answerRiddle(game, 'candle');
  mapStateFor(game, 'undercroft1').secrets.push('v5,5');
  const skald = realParty(game).find(c => c.cls === 'skald');
  startExploreSong(game, skald, 'lull');
  const hexen = realParty(game).find(c => c.cls === 'hexen');
  hexen.status.poison = true;
  hexen.sp = 1;
  game.gold = 4321;
  game.flags.rumorIdx = 3;

  const fought = makeCombat(game, rng, { groups: [{ monster: 'fen_rat', count: 2 }] });
  for (const ch of ableParty(fought)) setOrder(fought, ch.id, { type: 'attack', target: 0 });
  resolveRound(fought);

  const json = gameToJSON(game);
  const loaded = gameFromJSON(json);
  assert.deepEqual(loaded, JSON.parse(JSON.stringify(game)), 'identical state');
  // and a second round-trip is stable
  assert.equal(gameToJSON(loaded), json);
});

test('character ids continue after load (no collisions)', () => {
  const { game } = makeParty(78);
  const rng = new Rng(1);
  const before = game.roster.length;
  const json = gameToJSON(game);
  const loaded = gameFromJSON(json);
  const ch = createCharacter(rng, { name: 'New', raceId: 'vael', classId: 'blade', stats: rollStats(rng, 'vael') });
  assert.ok(!loaded.roster.some(c => c.id === ch.id), 'fresh id after load');
  loaded.roster.push(ch);
  assert.equal(loaded.roster.length, before + 1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDb, makeParty } from './helpers.js';
import { DB } from '../src/core/db.js';
import { Rng } from '../src/core/rng.js';
import {
  edgeAt, step, turn, answerRiddle, DX, DY, searchSecrets
} from '../src/core/maze.js';
import { mapStateFor } from '../src/core/gamestate.js';

await loadDb();

const DUNGEONS = ['undercroft1', 'undercroft2', 'barrow1', 'barrow2', 'barrow3',
  'needle1', 'needle2', 'needle3', 'needle4'];

function bfs(map, sx, sy, passable) {
  const seen = new Set([sx + ',' + sy]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d], ny = y + DY[d];
      if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) continue;
      if (seen.has(nx + ',' + ny)) continue;
      if (passable.includes(edgeAt(map, x, y, d))) { seen.add(nx + ',' + ny); q.push([nx, ny]); }
    }
  }
  return seen;
}

test('edges are consistent from both sides', () => {
  for (const id of DUNGEONS) {
    const map = DB.map(id);
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      if (x + 1 < map.w) assert.equal(edgeAt(map, x, y, 1), edgeAt(map, x + 1, y, 3));
      if (y + 1 < map.h) assert.equal(edgeAt(map, x, y, 0), edgeAt(map, x, y + 1, 2));
    }
  }
});

test('every dungeon cell is reachable (counting doors/secrets/riddle)', () => {
  for (const id of DUNGEONS) {
    const map = DB.map(id);
    const seen = bfs(map, map.entry.x, map.entry.y, ['0', 'd', 's', 'r']);
    assert.equal(seen.size, map.w * map.h, id);
  }
});

test('riddle doors gate the objective', () => {
  for (const id of ['undercroft1', 'barrow2', 'needle3']) {
    const map = DB.map(id);
    assert.ok(map.riddle, id + ' has a riddle');
    const stairs = Object.entries(map.cells).find(([, s]) => s.t === 'stairs' && s.dir === 'down');
    const seen = bfs(map, map.entry.x, map.entry.y, ['0', 'd', 's']); // no 'r'
    assert.ok(!seen.has(stairs[0]), `${id}: stairs ${stairs[0]} must be behind the riddle door`);
  }
});

test('perimeters are sealed', () => {
  for (const id of [...DUNGEONS, 'town']) {
    const map = DB.map(id);
    for (let x = 0; x < map.w; x++) {
      assert.equal(edgeAt(map, x, 0, 2), '1');
      assert.equal(edgeAt(map, x, map.h - 1, 0), '1');
    }
    for (let y = 0; y < map.h; y++) {
      assert.equal(edgeAt(map, 0, y, 3), '1');
      assert.equal(edgeAt(map, map.w - 1, y, 1), '1');
    }
  }
});

test('movement: walls block, open edges pass, turns rotate', () => {
  const { game } = makeParty();
  const rng = new Rng(7);
  game.pos = { map: 'town', x: 4, y: 16, facing: 0 };
  // find an open direction and a walled one from the entry
  const map = DB.map('town');
  let moved = false;
  for (let d = 0; d < 4; d++) {
    game.pos = { map: 'town', x: 4, y: 16, facing: d };
    const before = { ...game.pos };
    const events = step(game, rng);
    if (events.some(e => e.type === 'bump' || e.type === 'building')) {
      assert.deepEqual({ x: game.pos.x, y: game.pos.y }, { x: before.x, y: before.y });
    } else {
      assert.notDeepEqual({ x: game.pos.x, y: game.pos.y }, { x: before.x, y: before.y });
      moved = true;
    }
  }
  assert.ok(moved, 'at least one direction from the hall front is open');
  game.pos.facing = 0;
  turn(game, 1); assert.equal(game.pos.facing, 1);
  turn(game, -1); assert.equal(game.pos.facing, 0);
  turn(game, 2); assert.equal(game.pos.facing, 2);
});

test('spinner randomizes facing, teleporter relocates', () => {
  const { game } = makeParty();
  const map = DB.map('undercroft2');
  const spinner = Object.entries(map.cells).find(([, s]) => s.t === 'spinner');
  const tele = Object.entries(map.cells).find(([, s]) => s.t === 'teleport');
  assert.ok(spinner && tele, 'undercroft2 has spinner and teleporter');

  // walk INTO the spinner cell from an adjacent open edge
  const [sx, sy] = spinner[0].split(',').map(Number);
  let entered = false;
  const facings = new Set();
  for (let trial = 0; trial < 40 && !entered; trial++) {
    for (let d = 0; d < 4 && !entered; d++) {
      const px = sx + DX[d], py = sy + DY[d];
      if (px < 0 || py < 0 || px >= map.w || py >= map.h) continue;
      const back = (d + 2) % 4;
      if (!['0', 'd'].includes(edgeAt(map, px, py, back))) continue;
      for (let t = 0; t < 30; t++) {
        const rng2 = new Rng(1000 + trial * 31 + t);
        game.pos = { map: 'undercroft2', x: px, y: py, facing: back };
        game.effects = [{ kind: 'light', radius: 3, until: 1e9 }];
        step(game, rng2);
        if (game.pos.x === sx && game.pos.y === sy) { entered = true; facings.add(game.pos.facing); }
      }
    }
  }
  assert.ok(entered, 'could enter the spinner cell');

  const [tx, ty] = tele[0].split(',').map(Number);
  for (let d = 0; d < 4; d++) {
    const px = tx + DX[d], py = ty + DY[d];
    if (px < 0 || py < 0 || px >= map.w || py >= map.h) continue;
    const back = (d + 2) % 4;
    if (!['0', 'd'].includes(edgeAt(map, px, py, back))) continue;
    const rng2 = new Rng(5);
    game.pos = { map: 'undercroft2', x: px, y: py, facing: back };
    step(game, rng2);
    assert.deepEqual({ x: game.pos.x, y: game.pos.y }, { x: tele[1].to.x, y: tele[1].to.y }, 'teleported to destination');
    return;
  }
  assert.fail('no open approach to teleporter');
});

test('riddle answers unlock the door', () => {
  const { game } = makeParty();
  game.pos = { map: 'undercroft1', x: 1, y: 1, facing: 0 };
  assert.equal(answerRiddle(game, 'gravy'), false);
  assert.equal(mapStateFor(game, 'undercroft1').riddle, false);
  assert.equal(answerRiddle(game, '  A Candle '), true);
  assert.equal(mapStateFor(game, 'undercroft1').riddle, true);
});

test('searching can find adjacent secret doors', () => {
  const { game } = makeParty();
  const map = DB.map('undercroft1');
  outer: for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    for (let d = 0; d < 4; d++) {
      if (edgeAt(map, x, y, d) === 's') {
        game.pos = { map: 'undercroft1', x, y, facing: 0 };
        let found = false;
        for (let i = 0; i < 60 && !found; i++) {
          const events = searchSecrets(game, new Rng(i));
          found = events.some(e => /secret door/.test(e.text || ''));
        }
        assert.ok(found, 'secret door found by repeated searching');
        break outer;
      }
    }
  }
});

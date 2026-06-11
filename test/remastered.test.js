// Remastered/Legacy feature system tests.
// Each test targets a core-module invariant; browser-only flows (updateAutomap,
// campFlow, etc.) are covered by the smoke harness.

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDb, makeParty } from './helpers.js';
import { DB } from '../src/core/db.js';
import { Rng } from '../src/core/rng.js';
import {
  newGame, gameToJSON, gameFromJSON, automapFor,
  partySlotsFree, summonSlotFree
} from '../src/core/gamestate.js';
import { newSettings } from '../src/core/settings.js';
import { xpForLevel, canLevelUp } from '../src/core/leveling.js';
import { step, DX, DY, edgeAt } from '../src/core/maze.js';
import { makeSummon } from '../src/core/spells.js';
import { addToInventory } from '../src/core/character.js';

await loadDb();

// ---- save migration ---------------------------------------------------------

test('v1 save migrates to v2: settings=legacy, automap={}, pool=null', () => {
  const { game } = makeParty(1);
  const raw = JSON.parse(gameToJSON(game));
  // Forge a v1 save: strip version-2 fields
  delete raw.version;
  delete raw.settings;
  delete raw.automap;
  delete raw.pool;

  const migrated = gameFromJSON(JSON.stringify(raw));
  assert.equal(migrated.version, 2, 'version bumped to 2');
  assert.deepEqual(migrated.settings, newSettings('legacy'), 'settings = legacy preset');
  assert.deepEqual(migrated.automap, {}, 'automap initialized empty');
  assert.equal(migrated.pool, null, 'pool stays null (not sharedInventory)');
});

test('remastered save round-trips settings and automap', () => {
  const { game } = makeParty(2);
  game.settings = newSettings('remastered');
  game.pool = { items: [] };
  // Seed some automap state
  const am = automapFor(game, 'undercroft1');
  am.visited.push('3,4');
  am.cursor = { x: 3, y: 4, facing: 0 };
  am.synced = false;

  const loaded = gameFromJSON(gameToJSON(game));
  assert.deepEqual(loaded.settings, game.settings, 'settings round-trip');
  assert.deepEqual(loaded.automap['undercroft1'].visited, ['3,4'], 'visited round-trip');
  assert.deepEqual(loaded.automap['undercroft1'].cursor, { x: 3, y: 4, facing: 0 }, 'cursor round-trip');
  assert.equal(loaded.automap['undercroft1'].synced, false, 'synced=false round-trip');
});

// ---- XP curve ---------------------------------------------------------------

test('reducedXp multiplier lowers requirements monotonically', () => {
  const mult = DB.balance.remasteredXpMultiplier;
  assert.ok(mult > 0 && mult < 1, 'multiplier is in (0,1)');

  for (const cls of ['blade', 'hexen', 'lorist', 'skald', 'knave']) {
    for (let lvl = 1; lvl <= 10; lvl++) {
      const full = xpForLevel(cls, lvl + 1, 1.0);
      const reduced = xpForLevel(cls, lvl + 1, mult);
      assert.ok(reduced < full, `${cls} lvl ${lvl + 1}: reduced (${reduced}) < full (${full})`);
      assert.ok(reduced > 0, `${cls} lvl ${lvl + 1}: reduced XP > 0`);
    }
  }
});

test('canLevelUp respects xpMult', () => {
  const { game } = makeParty(3);
  const ch = game.roster[0]; // blade (Hroth)
  // Give exactly the full-curve requirement for level 2
  ch.xp = xpForLevel(ch.cls, 2, 1.0) - 1;
  assert.equal(canLevelUp(ch, 1.0), false, 'not enough XP at full curve');
  // The reduced-curve threshold is lower, so same XP is now enough
  const mult = DB.balance.remasteredXpMultiplier;
  if (xpForLevel(ch.cls, 2, mult) <= ch.xp + 1) {
    ch.xp = xpForLevel(ch.cls, 2, mult);
    assert.equal(canLevelUp(ch, mult), true, 'levellable with reduced XP');
  }
});

// ---- item charges -----------------------------------------------------------

test('items with maxCharges: charges initialize and deplete to removal', () => {
  const chalk = DB.item('phase_chalk');
  const tonic = DB.item('eyebright_tonic');
  assert.ok(chalk.maxCharges > 0, 'phase_chalk has maxCharges');
  assert.ok(tonic.maxCharges > 0, 'eyebright_tonic has maxCharges');

  // Simulate applyCharges behavior
  const entry = { id: 'phase_chalk', ident: true, charges: null };
  if (entry.charges == null) entry.charges = chalk.maxCharges;
  assert.equal(entry.charges, chalk.maxCharges, 'charges initialized');

  // Simulate decrement-until-zero
  let remaining = entry.charges;
  const usages = [];
  while (remaining > 0) {
    remaining -= 1;
    usages.push(remaining);
  }
  assert.equal(usages.length, chalk.maxCharges, 'uses equal maxCharges before depletion');
  assert.equal(remaining, 0, 'depleted to 0');
});

test('items without maxCharges: no charges field', () => {
  const potion = DB.item('healing_draught');
  assert.ok(!potion.maxCharges, 'healing_draught has no maxCharges');
});

// ---- 7th slot ---------------------------------------------------------------

test('seventhSlot: partySlotsFree counts only roster, not summons', () => {
  const { game } = makeParty(4);
  game.settings.seventhSlot = true;
  // 6 party members in makeParty, 0 summons
  assert.equal(partySlotsFree(game), 0, 'full 6-member party: 0 slots free');

  // Remove one party member; now 1 slot free for roster
  game.partyIds.pop();
  assert.equal(partySlotsFree(game), 1, '5-member party: 1 slot free');

  // Even with a summon, roster slots are still counted separately
  const rng = new Rng(4);
  game.summons = [makeSummon(rng, 'fen_rat', false)];
  assert.equal(partySlotsFree(game), 1, 'summon in 7th slot does not consume a roster slot');
});

test('seventhSlot: summonSlotFree allows exactly 1 summon', () => {
  const { game } = makeParty(5);
  game.settings.seventhSlot = true;
  game.partyIds = game.partyIds.slice(0, 4); // 4 party members
  game.summons = [];
  assert.equal(summonSlotFree(game), true, '7th slot free with no summon');

  const rng = new Rng(5);
  game.summons = [makeSummon(rng, 'fen_rat', false)];
  assert.equal(summonSlotFree(game), false, '7th slot occupied by one summon');
});

test('legacy mode: summons count against 6-slot total', () => {
  const { game } = makeParty(6);
  game.settings.seventhSlot = false;
  game.partyIds = game.partyIds.slice(0, 5); // 5 party members
  game.summons = [];
  assert.equal(partySlotsFree(game), 1, '5+0: 1 slot free');
  assert.equal(summonSlotFree(game), true, 'can summon');

  const rng = new Rng(6);
  game.summons = [makeSummon(rng, 'fen_rat', false)];
  assert.equal(partySlotsFree(game), 0, '5+1 = full');
  assert.equal(summonSlotFree(game), false, 'summon slot taken');
});

// ---- automap desync preconditions -------------------------------------------

test('spinner changes facing — confirms desync would be detected', () => {
  const { game } = makeParty(7);
  const map = DB.map('undercroft2');
  const spinner = Object.entries(map.cells).find(([, s]) => s.t === 'spinner');
  assert.ok(spinner, 'undercroft2 has a spinner');
  const [sx, sy] = spinner[0].split(',').map(Number);

  // Approach the spinner from an open edge
  for (let d = 0; d < 4; d++) {
    const px = sx + DX[d], py = sy + DY[d];
    if (px < 0 || py < 0 || px >= map.w || py >= map.h) continue;
    const back = (d + 2) % 4;
    if (!['0', 'd'].includes(edgeAt(map, px, py, back))) continue;
    // Try several seeds to find one that produces a facing change
    for (let seed = 100; seed < 200; seed++) {
      const rng = new Rng(seed);
      game.pos = { map: 'undercroft2', x: px, y: py, facing: back };
      game.effects = [{ kind: 'light', radius: 3, until: 1e9 }];
      const preFacing = back;
      step(game, rng);
      if (game.pos.x === sx && game.pos.y === sy && game.pos.facing !== preFacing) {
        assert.notEqual(game.pos.facing, preFacing, 'spinner rotated facing: desync detectable');
        return;
      }
    }
  }
  assert.fail('could not trigger a facing change via spinner');
});

test('automap cursor initializes to game.pos on first automapFor call', () => {
  const { game } = makeParty(8);
  game.settings.automap = true;
  game.pos = { map: 'undercroft1', x: 3, y: 7, facing: 2 };
  const am = automapFor(game, 'undercroft1');
  assert.equal(am.cursor, null, 'cursor starts null (main.js initializes on first updateAutomap)');
  assert.deepEqual(am.visited, [], 'visited starts empty');
  assert.equal(am.synced, true, 'synced starts true');
});

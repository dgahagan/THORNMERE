// Casters know their school's first tier from the muster (BT1-faithful);
// granted by the creation flows via grantStartingSpells, not by createCharacter,
// so the original tier-purchase semantics (and their tests) are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDb, makeChar } from './helpers.js';
import { Rng } from '../src/core/rng.js';
import { grantStartingSpells, canBuyTier } from '../src/core/leveling.js';

await loadDb();

test('new casters are granted their school tier 1; martials are not', () => {
  const rng = new Rng(9);
  const hexen = makeChar(rng, 'Morrigan', 'aldari', 'hexen');
  assert.equal(grantStartingSpells(hexen), true);
  assert.equal(hexen.schoolTiers.hexen, 1);
  assert.equal(hexen.knownSpells.length, 4, 'knows the whole first tier');

  const blade = makeChar(rng, 'Hroth', 'korrun', 'blade');
  assert.equal(grantStartingSpells(blade), false);
  assert.equal(blade.knownSpells.length, 0);
});

test('starting grant is idempotent and leaves the Board selling tier 2 next', () => {
  const rng = new Rng(9);
  const lorist = makeChar(rng, 'Elspeth', 'aldari', 'lorist');
  assert.equal(grantStartingSpells(lorist), true);
  assert.equal(grantStartingSpells(lorist), false, 'no double grant');
  assert.equal(lorist.schoolTiers.lorist, 1);
  const res = canBuyTier(lorist, 'lorist', 100000);
  assert.equal(res.ok, false, 'tier 2 still gated by level 3');
});

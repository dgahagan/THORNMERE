import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDb } from './helpers.js';
import { DB } from '../src/core/db.js';

await loadDb();

test('content volume targets', () => {
  assert.equal(DB.spells.length, 84, '7 tiers x 4 spells x 3 schools');
  assert.equal(DB.songs.length, 7);
  assert.ok(DB.items.length >= 60, `60+ items (got ${DB.items.length})`);
  const enemies = DB.monsters.filter(m => !m.summon);
  assert.ok(enemies.length >= 35, `35+ monster types (got ${enemies.length})`);
  assert.equal(DB.races.length, 5);
  assert.equal(DB.classes.length, 10);
});

test('every school has 4 spells per tier, unique codes', () => {
  const codes = new Set();
  for (const s of DB.spells) {
    assert.ok(!codes.has(s.code), 'dup code ' + s.code);
    codes.add(s.code);
  }
  for (const school of ['hexen', 'lorist', 'storm']) {
    for (let tier = 1; tier <= 7; tier++) {
      assert.equal(DB.spellsFor(school, tier).length, 4, `${school} tier ${tier}`);
    }
  }
});

test('summon spells reference real monsters', () => {
  for (const s of DB.spells.filter(s => s.effect.kind === 'summon')) {
    assert.ok(DB.monster(s.effect.monster), s.code);
  }
});

test('monster spells and phases reference real monsters', () => {
  for (const m of DB.monsters) {
    for (const sp of m.spells || []) {
      if (sp.monster) DB.monster(sp.monster);
    }
    for (const ph of m.phases || []) {
      for (const add of ph.add || []) DB.monster(add.monster);
    }
  }
});

test('maps reference real monsters and items', () => {
  for (const id of Object.keys(DB.maps)) {
    const map = DB.maps[id];
    const tables = map.kind === 'town'
      ? [map.encounters.day.table, map.encounters.night.table]
      : [map.encounters.table];
    for (const t of tables) for (const row of t) DB.monster(row.monster);
    for (const key of Object.keys(map.cells)) {
      const sp = map.cells[key];
      if (sp.t === 'treasure') for (const it of sp.items) DB.item(it);
      if (sp.t === 'encounter') {
        for (const g of sp.groups) DB.monster(g.monster);
        for (const it of sp.reward?.items || []) DB.item(it);
      }
      if (sp.t === 'stairs' || sp.t === 'gate') {
        if (sp.to) assert.ok(DB.maps[sp.to.map], `${id} ${key} -> ${sp.to?.map}`);
      }
    }
  }
});

test('every monster, item and spell has flavor text', () => {
  for (const m of DB.monsters) assert.ok(m.flavor?.length > 4, m.id);
  for (const i of DB.items) assert.ok(i.flavor?.length > 4, i.id);
  for (const s of DB.spells) assert.ok(s.flavor?.length > 4, s.code);
});

test('quest chain items exist and are placed', () => {
  for (const v of ['verse_first', 'verse_second', 'verse_third']) DB.item(v);
  const placed = [];
  for (const id of Object.keys(DB.maps)) {
    for (const sp of Object.values(DB.maps[id].cells)) {
      if (sp.t === 'encounter') placed.push(...(sp.reward?.items || []));
    }
  }
  assert.deepEqual(placed.sort(), ['verse_first', 'verse_second', 'verse_third']);
});

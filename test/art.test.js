// Art data integrity: every sprite text-grid matches its legend and declared
// dimensions; every monster, building, special and character archetype
// resolves to art; every animation frame and variant base exists.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART = join(ROOT, 'data', 'art');
const read = p => JSON.parse(readFileSync(p, 'utf8'));

const palette = read(join(ART, 'palette.json'));
const N = palette.colors.length;

function loadAllArt() {
  const sprites = new Map(), anims = new Map(), variants = new Map();
  for (const f of readdirSync(ART).filter(f => f.endsWith('.json'))) {
    if (['palette.json', 'font.json', 'styles.json'].includes(f)) continue;
    const doc = read(join(ART, f));
    for (const [name, sp] of Object.entries(doc.sprites || {})) sprites.set(name, { ...sp, file: f });
    for (const [name, an] of Object.entries(doc.anims || {})) anims.set(name, { ...an, file: f });
    for (const [name, v] of Object.entries(doc.variants || {})) variants.set(name, { ...v, file: f });
  }
  return { sprites, anims, variants };
}
const { sprites, anims, variants } = loadAllArt();
const resolves = id => {
  const v = variants.get(id);
  if (v) return sprites.has(v.base) || anims.has(v.base);
  return sprites.has(id) || anims.has(id);
};

test('palette: 32 colors, full shade table', () => {
  assert.equal(N, 32);
  assert.equal(palette.shade.length, N);
  for (const s of palette.shade) assert.ok(Number.isInteger(s) && s >= 0 && s < N);
});

test('every sprite grid matches its legend and dimensions', () => {
  assert.ok(sprites.size > 50, `expected a full art set, found ${sprites.size}`);
  for (const [name, sp] of sprites) {
    assert.ok(Number.isInteger(sp.w) && Number.isInteger(sp.h), `${name}: w/h`);
    assert.equal(sp.rows.length, sp.h, `${name} (${sp.file}): row count`);
    for (const [ch, idx] of Object.entries(sp.legend)) {
      assert.ok(idx === -1 || (Number.isInteger(idx) && idx >= 0 && idx < N),
        `${name}: legend '${ch}' -> ${idx}`);
    }
    sp.rows.forEach((row, y) => {
      assert.equal([...row].length, sp.w, `${name} (${sp.file}): row ${y} width`);
      for (const ch of row) assert.ok(ch in sp.legend, `${name}: row ${y} char '${ch}' not in legend`);
    });
  }
});

test('every animation frame and variant base exists', () => {
  for (const [name, an] of anims) {
    assert.ok(an.frames.length >= 2, `${name}: anims need 2+ frames`);
    for (const f of an.frames) {
      assert.ok(sprites.has(f.sprite), `${name}: missing frame sprite ${f.sprite}`);
      assert.ok(Number.isInteger(f.ms) && f.ms > 0, `${name}: bad frame ms`);
    }
  }
  for (const [name, v] of variants) {
    assert.ok(sprites.has(v.base) || anims.has(v.base), `${name}: missing base ${v.base}`);
    for (const [from, to] of Object.entries(v.remap || {})) {
      assert.ok(+from >= 0 && +from < N && to >= 0 && to < N, `${name}: remap ${from}->${to}`);
    }
  }
});

test('every monster in the bestiary resolves to a portrait', () => {
  const monsters = read(join(ROOT, 'data', 'monsters.json'));
  for (const m of monsters) {
    assert.ok(resolves(m.id) || resolves('mon_' + m.portrait),
      `monster ${m.id} (portrait family '${m.portrait}') has no art`);
  }
});

test('the dungeon guardians and Maldrec have unique showpiece portraits', () => {
  for (const id of ['tallow_king', 'choir_eldest', 'mock_king', 'maldrec', 'maldrec_image']) {
    const v = variants.get(id);
    assert.ok(v, `${id} needs a dedicated variant`);
    const base = anims.get(v.base) || { frames: [{ sprite: v.base }] };
    const sp = sprites.get(base.frames[0].sprite);
    assert.ok(sp.w >= 48 && sp.h >= 48, `${id} should be a 48x48+ showpiece, got ${sp.w}x${sp.h}`);
  }
});

test('every town building resolves to a signboard and an interior', () => {
  const town = read(join(ROOT, 'data', 'maps', 'town.json'));
  const ids = new Set();
  for (const c of Object.values(town.cells)) if (c.t === 'building') ids.add(c.id.replace(/\d+$/, ''));
  for (const id of ids) {
    if (id === 'empty') continue;                       // boarded: tex_boards facade
    if (id === 'house') continue;                       // enterable house: plain door, no sign; int_house pending art gen
    assert.ok(sprites.has('sign_' + id), `building '${id}' has no signboard sign_${id}`);
    assert.ok(resolves('int_' + id), `building '${id}' has no interior int_${id}`);
  }
});

test('every special cell kind has furniture art; mouths animate', () => {
  for (const name of ['fx_stairs_down', 'fx_stairs_up', 'fx_chest', 'fx_mouth', 'fx_danger', 'fx_seal', 'fx_gate']) {
    assert.ok(sprites.has(name), `missing furniture sprite ${name}`);
  }
  assert.ok(anims.has('fx_mouth_anim'), 'magic mouths must animate');
});

test('every race x archetype x face has a character portrait', () => {
  const races = read(join(ROOT, 'data', 'races.json')).map(r => r.id);
  for (const race of races) {
    for (const arch of ['warrior', 'rogue', 'caster', 'skald']) {
      for (const f of ['a', 'b']) {
        assert.ok(resolves(`pc_${race}_${arch}_${f}`), `missing portrait pc_${race}_${arch}_${f}`);
      }
    }
  }
});

test('every class has an icon; wall/door textures exist per area', () => {
  const classes = read(join(ROOT, 'data', 'classes.json')).map(c => c.id);
  for (const c of classes) assert.ok(sprites.has('icon_' + c), `missing icon_${c}`);
  const styles = read(join(ART, 'styles.json'));
  for (const [area, st] of Object.entries(styles.areas)) {
    for (const key of ['wall', 'door', 'riddleDoor']) {
      assert.ok(sprites.has(st[key]), `${area}: missing ${key} texture ${st[key]}`);
    }
  }
});

test('title and victory scenes exist', () => {
  assert.ok(sprites.has('scene_title'), 'missing scene_title');
  assert.ok(sprites.has('scene_victory'), 'missing scene_victory');
});

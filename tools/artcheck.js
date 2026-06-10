// Validates every art data file: JSON parses, each sprite's rows match its
// declared w/h, every legend character maps to a valid palette index (or -1),
// and every row character appears in the legend. Run: node tools/artcheck.js
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART = join(ROOT, 'data', 'art');

const palette = JSON.parse(readFileSync(join(ART, 'palette.json'), 'utf8'));
const N = palette.colors.length;
let errors = 0;
const bad = (file, name, msg) => { console.error(`${file} :: ${name}: ${msg}`); errors++; };

export function checkSprite(file, name, sp) {
  if (!Number.isInteger(sp.w) || !Number.isInteger(sp.h)) return bad(file, name, 'missing w/h');
  if (!Array.isArray(sp.rows)) return bad(file, name, 'missing rows');
  if (sp.rows.length !== sp.h) return bad(file, name, `has ${sp.rows.length} rows, declared h=${sp.h}`);
  for (const [ch, idx] of Object.entries(sp.legend || {})) {
    if (idx !== -1 && (!Number.isInteger(idx) || idx < 0 || idx >= N)) {
      bad(file, name, `legend '${ch}' -> ${idx} outside palette (0..${N - 1})`);
    }
  }
  sp.rows.forEach((row, y) => {
    if ([...row].length !== sp.w) bad(file, name, `row ${y} is ${[...row].length} chars, declared w=${sp.w}`);
    for (const ch of row) {
      if (!(ch in (sp.legend || {}))) bad(file, name, `row ${y} char '${ch}' not in legend`);
    }
  });
}

export function checkAnim(file, name, anim, sprites) {
  if (!Array.isArray(anim.frames) || !anim.frames.length) return bad(file, name, 'anim without frames');
  for (const f of anim.frames) {
    if (!sprites.has(f.sprite)) bad(file, name, `frame references missing sprite '${f.sprite}'`);
    if (!Number.isInteger(f.ms) || f.ms <= 0) bad(file, name, `frame ms must be a positive integer`);
  }
}

export function loadAllArt() {
  const files = readdirSync(ART).filter(f => f.endsWith('.json'));
  const sprites = new Map(), anims = new Map(), variants = new Map();
  for (const f of files) {
    if (f === 'palette.json' || f === 'font.json' || f === 'styles.json') continue;
    const doc = JSON.parse(readFileSync(join(ART, f), 'utf8'));
    for (const [name, sp] of Object.entries(doc.sprites || {})) {
      if (sprites.has(name)) bad(f, name, 'duplicate sprite name');
      sprites.set(name, { ...sp, file: f });
    }
    for (const [name, an] of Object.entries(doc.anims || {})) anims.set(name, { ...an, file: f });
    for (const [name, v] of Object.entries(doc.variants || {})) variants.set(name, { ...v, file: f });
  }
  return { sprites, anims, variants };
}

function main() {
  // font glyphs
  const font = JSON.parse(readFileSync(join(ART, 'font.json'), 'utf8'));
  for (const [ch, rows] of Object.entries(font.glyphs)) {
    if (rows.length !== font.h) bad('font.json', ch, `glyph has ${rows.length} rows, want ${font.h}`);
    rows.forEach((r, y) => { if (r.length !== font.w) bad('font.json', ch, `row ${y} is ${r.length} wide, want ${font.w}`); });
  }
  if (!Array.isArray(palette.shade) || palette.shade.length !== N) bad('palette.json', 'shade', `shade table must have ${N} entries`);
  palette.shade?.forEach((s, i) => { if (!Number.isInteger(s) || s < 0 || s >= N) bad('palette.json', 'shade', `entry ${i} -> ${s} invalid`); });

  const { sprites, anims, variants } = loadAllArt();
  for (const [name, sp] of sprites) checkSprite(sp.file, name, sp);
  for (const [name, an] of anims) checkAnim(an.file, name, an, sprites);
  for (const [name, v] of variants) {
    if (!sprites.has(v.base) && !anims.has(v.base)) bad(v.file, name, `variant base '${v.base}' missing`);
    for (const [from, to] of Object.entries(v.remap || {})) {
      if (+from < 0 || +from >= N || to < 0 || to >= N) bad(v.file, name, `remap ${from}->${to} outside palette`);
    }
  }
  console.log(`artcheck: ${sprites.size} sprites, ${anims.size} anims, ${variants.size} variants, ${Object.keys(font.glyphs).length} glyphs — ${errors ? errors + ' ERROR(S)' : 'OK'}`);
  process.exit(errors ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

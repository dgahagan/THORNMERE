// Render any sprite, animation frame, or sprite family to PNG at N× scale.
// Uses only Node.js built-ins (zlib) — no npm deps.
//
// Usage:
//   node tools/artrender.js <sprite-name-or-prefix> [scale=4] [outdir]
//   node tools/artrender.js --sheet <family-prefix> [scale=4] [outdir]
//   node tools/artrender.js --all [scale=4] [outdir]
//
// outdir may be given positionally (any token with a '/', e.g. dev/advisor/render/)
// or as out=DIR; it defaults to art-review/ and is created if missing. Unrecognized
// arguments are a hard error — a mistyped outdir will NOT silently fall back to
// art-review/ (which once clobbered tracked reference sheets).
//
// Examples:
//   node tools/artrender.js mon_rat                              # mon_rat_a.png + mon_rat_b.png -> art-review/
//   node tools/artrender.js mon_skeleton 4 dev/advisor/render/   # positional outdir
//   node tools/artrender.js --sheet monsters 4 out=/tmp/sheets   # out= form, absolute path
//   node tools/artrender.js tex_under_wall                       # single texture

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART_DIR = join(ROOT, 'data', 'art');

// ---- load palette and all sprites ------------------------------------------
const palette = JSON.parse(readFileSync(join(ART_DIR, 'palette.json'), 'utf8'));
const COLORS = palette.colors.map(c => {
  const h = c.hex.slice(1);
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
});

const sprites = new Map();
for (const f of readdirSync(ART_DIR).filter(f => f.endsWith('.json'))) {
  if (['palette.json','font.json','styles.json'].includes(f)) continue;
  const doc = JSON.parse(readFileSync(join(ART_DIR, f), 'utf8'));
  for (const [name, sp] of Object.entries(doc.sprites || {})) sprites.set(name, sp);
}

// ---- PNG encoder (no external deps) ----------------------------------------
function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) {
    crc ^= b;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const payload = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(payload));
  return Buffer.concat([len, payload, crcBuf]);
}

function encodePNG(width, height, rgbaPixels) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB (alpha handled by premix with black bg)

  // IDAT: raw scan-lines, each preceded by filter byte 0
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * (1 + width * 3) + 1 + x * 3;
      // composite over dark background (#16121e = night)
      const a = rgbaPixels[si + 3] / 255;
      raw[di]   = Math.round(rgbaPixels[si]   * a + 0x16 * (1 - a));
      raw[di+1] = Math.round(rgbaPixels[si+1] * a + 0x12 * (1 - a));
      raw[di+2] = Math.round(rgbaPixels[si+2] * a + 0x1e * (1 - a));
    }
  }
  const compressed = deflateSync(raw, { level: 6 });

  return Buffer.concat([
    Buffer.from('\x89PNG\r\n\x1a\n', 'binary'),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---- sprite → RGBA buffer ---------------------------------------------------
function spriteToRGBA(sp, scale = 4, remapFn = null) {
  const w = sp.w * scale, h = sp.h * scale;
  const buf = Buffer.alloc(w * h * 4, 0);
  const legMap = {};
  for (const [ch, idx] of Object.entries(sp.legend)) legMap[ch] = idx;
  for (let sy = 0; sy < sp.h; sy++) {
    const row = sp.rows[sy];
    for (let sx = 0; sx < sp.w; sx++) {
      let idx = legMap[row[sx]];
      if (idx === undefined || idx === -1) continue;
      if (remapFn) idx = remapFn(idx);
      const [r,g,b] = COLORS[idx];
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const pi = ((sy * scale + dy) * w + sx * scale + dx) * 4;
        buf[pi] = r; buf[pi+1] = g; buf[pi+2] = b; buf[pi+3] = 255;
      }
    }
  }
  return { buf, w, h };
}

// ---- contact sheet ----------------------------------------------------------
function makeSheet(spList, scale = 4, cols = 8, label = '') {
  const pad = 4;
  const maxW = Math.max(...spList.map(s => s.sp.w)) * scale;
  const maxH = Math.max(...spList.map(s => s.sp.h)) * scale;
  const rows = Math.ceil(spList.length / cols);
  const W = cols * (maxW + pad) + pad;
  const H = rows * (maxH + pad) + pad;
  const buf = Buffer.alloc(W * H * 4, 0);

  spList.forEach(({ sp, name }, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const ox = pad + col * (maxW + pad);
    const oy = pad + row * (maxH + pad);
    const { buf: sb, w: sw, h: sh } = spriteToRGBA(sp, scale);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const si = (y * sw + x) * 4;
      const di = ((oy + y) * W + ox + x) * 4;
      buf[di] = sb[si]; buf[di+1] = sb[si+1]; buf[di+2] = sb[si+2]; buf[di+3] = sb[si+3];
    }
  });
  return encodePNG(W, H, buf);
}

// ---- main -------------------------------------------------------------------
// Argument grammar: [--all | --sheet <prefix> | <name>] [scale] [outdir]
//   scale  = the bare integer (default 4)
//   outdir = `out=DIR` OR any positional token containing a '/' (sprite/family
//            names never contain a slash, so this is unambiguous). Relative to
//            the repo root; absolute paths are honoured as-is. Default art-review/.
// Every argument must be accounted for — an unrecognized token is a loud error
// rather than being silently dropped (which used to send renders to art-review/
// and clobber tracked reference sheets).
const args = process.argv.slice(2);
const scaleArg = args.find(a => /^\d+$/.test(a));
const scale = parseInt(scaleArg || '4', 10);
const outArg = args.find(a => a.startsWith('out=')) || args.find(a => a.includes('/'));
const outDir = outArg ? outArg.replace(/^out=/, '') : 'art-review';
const OUT = resolve(ROOT, outDir);

const USAGE = 'Usage: artrender.js [--all | --sheet <prefix> | <name>] [scale] [outdir|out=DIR]';
const consumed = new Set();
if (scaleArg) consumed.add(scaleArg);
if (outArg) consumed.add(outArg);
if (args.includes('--all')) {
  consumed.add('--all');
} else if (args.includes('--sheet')) {
  consumed.add('--sheet');
  const prefix = args[args.indexOf('--sheet') + 1];
  if (prefix) consumed.add(prefix);
} else {
  const nameArg = args.find(a => !a.startsWith('--') && !consumed.has(a));
  if (nameArg) consumed.add(nameArg);
}
const leftover = args.filter(a => !consumed.has(a));
if (leftover.length) {
  console.error('artrender: unrecognized argument(s):', leftover.join(' '), '\n' + USAGE);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

if (args.includes('--all')) {
  // one contact sheet per source file
  const files = readdirSync(ART_DIR).filter(f => f.endsWith('.json') &&
    !['palette.json','font.json','styles.json'].includes(f));
  for (const f of files) {
    const doc = JSON.parse(readFileSync(join(ART_DIR, f), 'utf8'));
    const list = Object.entries(doc.sprites || {}).map(([name, sp]) => ({ name, sp }));
    if (!list.length) continue;
    const png = makeSheet(list, scale);
    const out = join(OUT, f.replace('.json', '-sheet.png'));
    writeFileSync(out, png);
    console.log('wrote', out);
  }
} else if (args.includes('--sheet')) {
  const prefix = args[args.indexOf('--sheet') + 1];
  const list = [...sprites.entries()]
    .filter(([n]) => n.startsWith(prefix))
    .map(([name, sp]) => ({ name, sp }));
  if (!list.length) { console.error('no sprites match prefix:', prefix); process.exit(1); }
  const png = makeSheet(list, scale);
  const out = join(OUT, prefix + '-sheet.png');
  writeFileSync(out, png);
  console.log('wrote', out, `(${list.length} sprites)`);
} else {
  const nameArg = args.find(a => !a.startsWith('--') && a !== outArg && a !== scaleArg);
  if (!nameArg) { console.error('Usage: artrender.js <name-or-prefix> [scale]'); process.exit(1); }
  const matches = [...sprites.entries()].filter(([n]) => n.startsWith(nameArg));
  if (!matches.length) { console.error('no sprite matches:', nameArg); process.exit(1); }
  if (matches.length === 1 || nameArg === matches[0][0]) {
    const [name, sp] = matches[0];
    const { buf, w, h } = spriteToRGBA(sp, scale);
    const png = encodePNG(w, h, buf);
    const out = join(OUT, name + '.png');
    writeFileSync(out, png);
    console.log('wrote', out, `(${sp.w}x${sp.h} → ${w}x${h})`);
  } else {
    const list = matches.map(([name, sp]) => ({ name, sp }));
    const png = makeSheet(list, scale);
    const out = join(OUT, nameArg + '-sheet.png');
    writeFileSync(out, png);
    console.log('wrote', out, `(${list.length} sprites)`);
  }
}

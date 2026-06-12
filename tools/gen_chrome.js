// Generates ornate DOM-chrome sprites into data/art/chrome.json — hand-pixeled
// in code (deterministic, re-runnable), palette-only. These are 9-slice
// border-image sources for style.css (outer frame, panel bevels, plaque,
// carved buttons) plus the title-screen thorn-vine the framebuffer tiles.
//
// Run:  node tools/gen_chrome.js
// Then: node tools/artrender.js --sheet chrome 4 art-review/   (judge the PNGs)
//       node tools/gen_chrome.js --png                          (emit assets/chrome/*.png for CSS)
//
// Dark Thornmere palette: brass thorn-vine (gold/gold-dark/amber) on umber/peat,
// stolen in spirit from the Amiga ornate frame — never its cream colour scheme.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- pixel canvas helpers (same idiom as tools/gen_signs.js) ----------------
function make(w, h, fill = -1) { return Array.from({ length: h }, () => new Array(w).fill(fill)); }
function pset(px, x, y, c) { if (y >= 0 && y < px.length && x >= 0 && x < px[0].length) px[y][x] = c; }
function hline(px, x0, x1, y, c) { for (let x = x0; x <= x1; x++) pset(px, x, y, c); }
function vline(px, x, y0, y1, c) { for (let y = y0; y <= y1; y++) pset(px, x, y, c); }
function fillRect(px, x, y, w, h, c) { for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) pset(px, x + dx, y + dy, c); }

function encode(px) {
  const h = px.length, w = px[0].length;
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const used = [...new Set(px.flat())].sort((a, b) => a - b);
  const legend = {}; const idx2ch = {}; let ci = 0;
  for (const v of used) {
    if (v === -1) { legend['.'] = -1; idx2ch[-1] = '.'; }
    else { const ch = CHARS[ci++]; legend[ch] = v; idx2ch[v] = ch; }
  }
  const rows = px.map(row => row.map(v => idx2ch[v]).join(''));
  return { w, h, legend, rows };
}

// Palette: 1 night 2 shadow 3 slate-dark 4 slate 5 stone 6 bone 7 chalk
// 8 peat 9 umber 10 leather 11 amberwood 12 honey 13 parchment
// 28 gold-dark 29 gold 30 candle
const PEAT = 8, UMBER = 9, LEATH = 10, AMBER = 11, HONEY = 12;
const GDK = 28, GOLD = 29, CANDLE = 30;
const SLD = 3, SLATE = 4, STONE = 5, BONE = 6, SHADOW = 2, NIGHT = 1;

// ===========================================================================
// 1. OUTER FRAME — 36×36, 9-slice with 12px corners + 12px tiling edges.
//    A brass band: peat/gold-dark rules outside, gold rule inside, an umber
//    field carrying a thorn-vine cable with diamond knots.
// ===========================================================================
// Paint the 12-thick band cross-section into a single row-span [oy..oy+11]
// running horizontally across [x0..x1]; `flip` mirrors light for the bottom.
function bandH(px, x0, x1, oy, flip) {
  // outer→inner indices (top edge); bottom edge flips the bevel light
  const lay = flip
    ? [PEAT, GOLD, GDK, UMBER, UMBER, UMBER, UMBER, UMBER, UMBER, UMBER, GDK, PEAT]
    : [PEAT, GDK, GOLD, UMBER, UMBER, UMBER, UMBER, UMBER, UMBER, UMBER, GDK, PEAT];
  for (let i = 0; i < 12; i++) hline(px, x0, x1, oy + i, lay[i]);
}
function bandV(px, oy0, oy1, ox, flip) {
  const lay = flip
    ? [PEAT, GOLD, GDK, UMBER, UMBER, UMBER, UMBER, UMBER, UMBER, UMBER, GDK, PEAT]
    : [PEAT, GDK, GOLD, UMBER, UMBER, UMBER, UMBER, UMBER, UMBER, UMBER, GDK, PEAT];
  for (let i = 0; i < 12; i++) vline(px, ox + i, oy0, oy1, lay[i]);
}
// A diamond knot centred in a 12×12 cell, oriented across the band.
// axis 'h' = knot on a horizontal edge (varies in y across thickness),
// axis 'v' = knot on a vertical edge.
function knot(px, cx, cy, axis) {
  // half-width by distance from centre row of the band (thickness centre ~5.5)
  const hw = [0, 1, 2, 3, 3, 2, 1, 0];      // 8-tall diamond, rows -3..+4 of centre
  for (let i = 0; i < 8; i++) {
    const across = i - 3;                    // -3..+4
    const w = hw[i];
    for (let j = -w; j <= w; j++) {
      let x, y;
      if (axis === 'h') { x = cx + j; y = cy + across; }
      else { x = cx + across; y = cy + j; }
      const edge = (Math.abs(j) === w);
      pset(px, x, y, edge ? GDK : (w >= 3 && Math.abs(j) <= 1 ? GOLD : AMBER));
    }
  }
  pset(px, cx, cy, CANDLE);                   // bright boss
}
function buildFrame() {
  const px = make(36, 36);
  // top & bottom edges (rows 0..11 and 24..35)
  bandH(px, 0, 35, 0, false);
  bandH(px, 0, 35, 24, true);
  // left & right edges (cols 0..11 and 24..35)
  bandV(px, 0, 35, 0, false);
  bandV(px, 0, 35, 24, true);
  // thorn cable along each middle edge + a knot centred in each middle cell
  // top-middle (x 12..23): cable at y5/6, knot at (18,5)
  hline(px, 12, 23, 5, GOLD); hline(px, 12, 23, 6, GDK); knot(px, 18, 5, 'h');
  // bottom-middle
  hline(px, 12, 23, 29, GDK); hline(px, 12, 23, 30, GOLD); knot(px, 18, 30, 'h');
  // left-middle (y 12..23): cable at x5/6
  vline(px, 5, 12, 23, GOLD); vline(px, 6, 12, 23, GDK); knot(px, 5, 18, 'v');
  // right-middle
  vline(px, 29, 12, 23, GDK); vline(px, 30, 12, 23, GOLD); knot(px, 30, 18, 'v');
  // corner rosettes — a fat brass boss where the rules meet
  for (const [cx, cy] of [[5, 5], [30, 5], [5, 30], [30, 30]]) {
    fillRect(px, cx - 2, cy - 2, 5, 5, AMBER);
    hline(px, cx - 2, cx + 2, cy - 2, GDK); hline(px, cx - 2, cx + 2, cy + 2, GDK);
    vline(px, cx - 2, cy - 2, cy + 2, GDK); vline(px, cx + 2, cy - 2, cy + 2, GDK);
    pset(px, cx, cy, CANDLE); pset(px, cx - 1, cy - 1, GOLD); pset(px, cx + 1, cy - 1, GOLD);
  }
  return encode(px);
}

// ===========================================================================
// 2. PANEL BEVEL — 12×12, 9-slice slice=4. Carved stone: gold-dark outer rule,
//    light bevel on top/left, dark bevel on bottom/right, umber inner.
// ===========================================================================
function buildPanel() {
  const px = make(12, 12);
  fillRect(px, 0, 0, 12, 12, -1);
  // top edge (4 thick): gold-dark, bone hi, stone, umber
  const top = [GDK, BONE, STONE, UMBER];
  for (let i = 0; i < 4; i++) hline(px, 0, 11, i, top[i]);
  // left edge
  for (let i = 0; i < 4; i++) vline(px, i, 0, 11, top[i]);
  // bottom edge (dark): umber, slate-dark, shadow, gold-dark
  const bot = [UMBER, SLD, SHADOW, GDK];
  for (let i = 0; i < 4; i++) hline(px, 0, 11, 8 + i, bot[i]);
  // right edge
  for (let i = 0; i < 4; i++) vline(px, 8 + i, 0, 11, bot[i]);
  // re-assert corners so the outer gold-dark rule wraps cleanly
  pset(px, 0, 0, GDK); pset(px, 11, 0, GDK); pset(px, 0, 11, GDK); pset(px, 11, 11, GDK);
  return encode(px);
}

// ===========================================================================
// 3. PLAQUE — 32×16 nameplate, 9-slice (left/right caps 10px, middle 12 tiles;
//    top/bottom slice 6). Carved wood: gold rim over umber face, scroll ends.
// ===========================================================================
function buildPlaque() {
  const px = make(32, 16);
  // face
  fillRect(px, 0, 0, 32, 16, UMBER);
  // top + bottom rims
  hline(px, 0, 31, 0, PEAT); hline(px, 0, 31, 1, GOLD); hline(px, 0, 31, 2, GDK);
  hline(px, 0, 31, 15, PEAT); hline(px, 0, 31, 14, GDK); hline(px, 0, 31, 13, LEATH);
  // face shading: leather body
  fillRect(px, 0, 3, 32, 10, LEATH);
  hline(px, 0, 31, 3, AMBER);   // top inner highlight
  // left cap (scroll): 10px
  fillRect(px, 0, 0, 4, 16, PEAT);
  vline(px, 1, 1, 14, GDK); vline(px, 2, 2, 13, GOLD);
  fillRect(px, 3, 4, 2, 8, AMBER);
  pset(px, 2, 7, CANDLE); pset(px, 2, 8, CANDLE);
  // right cap mirror
  fillRect(px, 28, 0, 4, 16, PEAT);
  vline(px, 30, 1, 14, GDK); vline(px, 29, 2, 13, GOLD);
  fillRect(px, 27, 4, 2, 8, AMBER);
  pset(px, 29, 7, CANDLE); pset(px, 29, 8, CANDLE);
  return encode(px);
}

// ===========================================================================
// 4. BUTTONS — 12×12 slice=4 carved bevel. Up = raised (light top-left),
//    down = pressed (light bottom-right). Centre transparent (CSS bg fills).
// ===========================================================================
function buildButton(down) {
  const px = make(12, 12);
  const hi = [GOLD, CANDLE, HONEY, LEATH];     // raised light ramp
  const lo = [LEATH, UMBER, PEAT, GDK];        // shadow ramp
  const topRamp = down ? lo : hi;
  const botRamp = down ? hi.slice().reverse() : lo;
  for (let i = 0; i < 4; i++) { hline(px, 0, 11, i, topRamp[i]); vline(px, i, 0, 11, topRamp[i]); }
  for (let i = 0; i < 4; i++) { hline(px, 0, 11, 8 + i, botRamp[i]); vline(px, 8 + i, 0, 11, botRamp[i]); }
  // outer rule
  hline(px, 0, 11, 0, GDK); vline(px, 0, 0, 11, GDK);
  hline(px, 0, 11, 11, GDK); vline(px, 11, 0, 11, GDK);
  return encode(px);
}

// ===========================================================================
// emit
// ===========================================================================
const sprites = {
  chrome_frame: buildFrame(),
  chrome_panel: buildPanel(),
  chrome_plaque: buildPlaque(),
  chrome_button: buildButton(false),
  chrome_button_down: buildButton(true),
};

const doc = {
  comment: 'Ornate DOM-chrome 9-slice border-image sources (gen_chrome.js). Brass thorn-vine on umber, dark Thornmere palette. -1 = transparent.',
  sprites,
};
writeFileSync(join(ROOT, 'data', 'art', 'chrome.json'), JSON.stringify(doc, null, 2) + '\n');
console.log('wrote data/art/chrome.json:', Object.keys(sprites).join(', '));

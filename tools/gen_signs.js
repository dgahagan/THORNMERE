// Generates all sign_ (36×28) and int_ (96×72) sprites into data/art/signs.json
// Run: node tools/gen_signs.js

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- pixel canvas helpers ---------------------------------------------------
function make(w, h, fill = 0) {
  return Array.from({ length: h }, () => new Array(w).fill(fill));
}

function pset(px, x, y, c) {
  if (x >= 0 && x < px[0].length && y >= 0 && y < px.length) px[y][x] = c;
}
function hline(px, x0, x1, y, c) {
  for (let x = x0; x <= x1; x++) pset(px, x, y, c);
}
function vline(px, x, y0, y1, c) {
  for (let y = y0; y <= y1; y++) pset(px, x, y, c);
}
function fillRect(px, x, y, w, h, c) {
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) pset(px, x + dx, y + dy, c);
}

// Paint a sub-sprite (2D array) into px at (ox, oy)
function blit(px, sprite, ox, oy) {
  for (let sy = 0; sy < sprite.length; sy++)
    for (let sx = 0; sx < sprite[sy].length; sx++) {
      const c = sprite[sy][sx];
      if (c >= 0) pset(px, ox + sx, oy + sy, c);
    }
}

// Encode canvas to {w, h, legend, rows}
function encode(px) {
  const h = px.length, w = px[0].length;
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const used = [...new Set(px.flat())].sort((a, b) => a - b);
  const legend = {};
  const idx2ch = {};
  let ci = 0;
  for (const v of used) {
    if (v === -1) { legend['.'] = -1; idx2ch[-1] = '.'; }
    else { const ch = CHARS[ci++]; legend[ch] = v; idx2ch[v] = ch; }
  }
  const rows = px.map(row => row.map(v => idx2ch[v]).join(''));
  return { w, h, legend, rows };
}

// ---- Palette shorthand (indices from palette.json) -------------------------
// 0=black 1=night 2=shadow 3=slate-dark 4=slate 5=stone 6=bone 7=chalk
// 8=peat  9=umber 10=leather 11=amberwood 12=honey 13=parchment
// 14=moss-deep 15=moss 16=fen-green 17=leaf 18=pale-leaf
// 19=abyss-blue 20=deep-blue 21=sky-blue 22=day-sky 23=mist-blue
// 24=blood-dark 25=blood 26=ember 27=flame
// 28=gold-dark 29=gold 30=candle 31=violet

// ---- SIGNBOARD builder (36×28) ----------------------------------------------
// Wooden plaque: outer border peat(8), inner border umber(9), face leather(10)
// icon drawn in 24×16 region centred at (18, 13)
function makeSign(drawIcon) {
  const px = make(36, 28);
  // Background leather(10)
  fillRect(px, 0, 0, 36, 28, 10);
  // Outer border — peat(8)
  hline(px, 0, 35, 0, 8); hline(px, 0, 35, 27, 8);
  vline(px, 0, 0, 27, 8); vline(px, 35, 0, 27, 8);
  // Inner shadow border — umber(9)
  hline(px, 1, 34, 1, 9); hline(px, 1, 34, 26, 9);
  vline(px, 1, 1, 26, 9); vline(px, 34, 1, 26, 9);
  // Top highlight — amberwood(11)
  hline(px, 2, 33, 2, 11); vline(px, 2, 2, 25, 11);
  // Inner panel — honey(12)
  fillRect(px, 3, 3, 30, 22, 12);
  // Inner panel shadow edge
  hline(px, 3, 32, 24, 9); vline(px, 32, 3, 24, 9);
  // Draw icon
  drawIcon(px);
  return encode(px);
}

// Centered icon bounds: x_center=18, y_center=13
// Icon area approx 24×16 so ix=6..29, iy=5..20

function signHall(px) {
  // Crossed swords silhouette
  // sword 1: NW→SE diagonal
  for (let i = 0; i < 14; i++) { pset(px, 7 + i, 6 + i, 3); pset(px, 6 + i, 6 + i, 5); }
  // sword 2: NE→SW diagonal
  for (let i = 0; i < 14; i++) { pset(px, 28 - i, 6 + i, 3); pset(px, 29 - i, 6 + i, 5); }
  // Guard (crossguard) at center for each sword
  fillRect(px, 14, 12, 4, 2, 29); // gold guard 1
  fillRect(px, 19, 12, 4, 2, 29); // gold guard 2
}

function signGreta(px) {
  // Boot — clear side-profile silhouette: narrow shaft, wide foot, rounded toe
  // Shaft (upper leg): 8px wide, centred
  fillRect(px, 13, 5, 8, 11, 9);   // umber shaft
  fillRect(px, 14, 5, 6, 10, 10);  // leather face highlight
  hline(px, 13, 20, 5, 11);        // shaft top highlight
  // Ankle transition — slightly wider
  fillRect(px, 12, 16, 10, 3, 9);
  fillRect(px, 13, 16, 8, 2, 10);
  // Foot — wide, extends right of shaft
  fillRect(px, 9, 18, 18, 4, 9);   // full foot sole
  fillRect(px, 10, 18, 16, 3, 10); // foot face
  hline(px, 10, 25, 18, 11);       // sole top highlight
  // Heel: slightly darker square at back-left
  fillRect(px, 9, 18, 4, 4, 8);    // peat heel
  // Toe: rounded cap at right
  pset(px, 26, 19, 10); pset(px, 26, 20, 9); pset(px, 27, 20, 8); // toe rounding
  // Lace row — 3 pairs of eyelets on shaft face
  for (let ly = 8; ly < 16; ly += 3) {
    pset(px, 15, ly, 8); pset(px, 18, ly, 8);
  }
}

function signReview(px) {
  // Balance scales
  // Central post
  fillRect(px, 17, 6, 2, 14, 3);
  // Horizontal beam
  fillRect(px, 8, 9, 20, 2, 5);
  pset(px, 8, 9, 6); pset(px, 27, 9, 6);
  // Left pan
  fillRect(px, 6, 14, 7, 3, 5);
  hline(px, 6, 12, 14, 6);
  vline(px, 9, 11, 14, 4);
  vline(px, 7, 12, 14, 4); vline(px, 12, 12, 14, 4);
  // Right pan
  fillRect(px, 22, 14, 7, 3, 5);
  hline(px, 22, 28, 14, 6);
  vline(px, 25, 11, 14, 4);
  vline(px, 23, 12, 14, 4); vline(px, 28, 12, 14, 4);
}

function signTemple(px) {
  // Lantern: body + flame
  fillRect(px, 14, 9, 8, 10, 9);  // lantern body umber
  fillRect(px, 15, 10, 6, 8, 12); // glass pane honey
  fillRect(px, 13, 8, 10, 2, 3);  // top cap slate-dark
  fillRect(px, 14, 19, 8, 1, 3);  // bottom cap
  fillRect(px, 17, 6, 2, 3, 11);  // hanger
  // Flame inside
  pset(px, 18, 12, 27); pset(px, 17, 13, 27); pset(px, 18, 13, 30); pset(px, 19, 13, 27);
  pset(px, 17, 14, 26); pset(px, 18, 14, 27); pset(px, 19, 14, 26);
  pset(px, 18, 15, 26);
}

function signSpark(px) {
  // Lightning bolt — bold 3-wide zigzag, classic ↙ shape
  // Top-right block (3×5)
  fillRect(px, 17, 5, 7, 5, 30);   // candle yellow upper block
  // Mid diagonal step left (3×3 each)
  fillRect(px, 14, 9, 7, 4, 30);   // mid band
  // Lower right block (3×5)
  fillRect(px, 12, 12, 7, 5, 30);  // lower block
  // Bright core (inner highlight)
  fillRect(px, 18, 6, 5, 3, 27);   // flame upper
  fillRect(px, 15, 10, 5, 2, 27);  // flame mid
  fillRect(px, 13, 13, 5, 3, 27);  // flame lower
  // Shadow edge (right side of each block) — gives depth
  vline(px, 23, 5, 9, 29);  // gold-dark right edge upper
  vline(px, 20, 9, 12, 29); // gold-dark right mid
  vline(px, 18, 12, 16, 29); // gold-dark right lower
}

function signGoose(px) {
  // Goose / grey goose in profile facing right
  // Body ellipse
  fillRect(px, 10, 13, 12, 7, 6); // bone body
  fillRect(px, 11, 12, 10, 9, 7); // chalk upper body
  // Neck
  fillRect(px, 20, 9, 3, 5, 7); // chalk neck
  // Head
  fillRect(px, 21, 6, 5, 4, 7); // chalk head
  // Beak
  fillRect(px, 25, 7, 3, 2, 29); // gold beak
  // Eye
  pset(px, 23, 7, 0);
  // Wing detail
  hline(px, 12, 21, 15, 6); // wing line
  // Feet
  vline(px, 14, 19, 21, 9); vline(px, 17, 19, 21, 9);
  hline(px, 12, 16, 21, 9); hline(px, 15, 19, 21, 9); // toes
}

function signHart(px) {
  // Stag antlers
  // Left antler
  vline(px, 11, 5, 11, 9); // main left beam
  hline(px, 8, 11, 7, 9);  // tine
  hline(px, 8, 11, 9, 9);  // tine
  pset(px, 8, 7, 9); pset(px, 8, 5, 9); // tips
  // Right antler
  vline(px, 24, 5, 11, 9);
  hline(px, 24, 27, 7, 9);
  hline(px, 24, 27, 9, 9);
  pset(px, 27, 7, 9); pset(px, 27, 5, 9);
  // Head
  fillRect(px, 15, 11, 6, 7, 10); // leather head
  fillRect(px, 16, 10, 4, 2, 10); // forehead
  // Eyes
  pset(px, 16, 13, 0); pset(px, 19, 13, 0);
  // Snout
  fillRect(px, 15, 16, 6, 2, 9);
  pset(px, 16, 17, 0); pset(px, 19, 17, 0); // nostrils
  // Highlight on antler top
  pset(px, 11, 5, 11); pset(px, 24, 5, 11);
}

function signTannery(px) {
  // Stretched animal hide on a wooden stretching frame
  // Outer frame — 4 wooden sticks forming a rectangle
  hline(px, 6, 29, 5, 9);   // top bar umber
  hline(px, 6, 29, 22, 9);  // bottom bar
  vline(px, 6, 5, 22, 9);   // left bar
  vline(px, 29, 5, 22, 9);  // right bar
  hline(px, 6, 29, 5, 11);  // top highlight
  // Pelt body (irregular — wider centre, narrower at top/bottom)
  fillRect(px, 10, 7, 16, 14, 10); // leather centre mass
  fillRect(px, 8, 9, 20, 10, 10);  // wider middle band
  fillRect(px, 11, 6, 14, 1, 10);  // narrow top edge
  fillRect(px, 11, 20, 14, 1, 10); // narrow bottom edge
  // Pelt highlight — upper-left lit region
  fillRect(px, 11, 8, 7, 5, 11);   // amberwood hi patch
  // Pelt shadow — lower-right
  fillRect(px, 20, 15, 6, 4, 9);   // umber shadow
  // Tie cords (4 corners connecting pelt to frame)
  pset(px, 8, 7, 6); pset(px, 27, 7, 6);   // bone tie cord top
  pset(px, 8, 19, 6); pset(px, 27, 19, 6); // bone tie cord bottom
  // Texture marks (hair follicle dots)
  for (const [x, y] of [[13,11],[17,11],[15,15],[21,13],[12,17]]) pset(px, x, y, 9);
}

function signBelltower(px) {
  // Bell hanging from arch
  // Arch posts
  vline(px, 9, 5, 20, 3);  // left post
  vline(px, 26, 5, 20, 3); // right post
  hline(px, 9, 26, 5, 3);  // top beam
  hline(px, 9, 26, 6, 5);  // beam face lit
  // Clapper rope
  vline(px, 18, 6, 11, 9);
  // Bell body
  fillRect(px, 13, 11, 10, 8, 29); // gold bell
  fillRect(px, 14, 12, 8, 6, 30); // candle highlight face
  // Bell lip
  fillRect(px, 12, 18, 12, 2, 28); // gold-dark lip
  hline(px, 12, 23, 18, 29); // lip highlight
  // Clapper
  fillRect(px, 17, 16, 2, 3, 3); // slate clapper
}

const SIGN_BUILDERS = {
  sign_hall: px => signHall(px),
  sign_greta: px => signGreta(px),
  sign_review: px => signReview(px),
  sign_temple: px => signTemple(px),
  sign_spark: px => signSpark(px),
  sign_goose: px => signGoose(px),
  sign_hart: px => signHart(px),
  sign_tannery: px => signTannery(px),
  sign_belltower: px => signBelltower(px),
};

// ---- INTERIOR scene builder (96×72) ----------------------------------------
// Layout:
//   y=0..5:   ceiling band (dark)
//   y=6..47:  wall area (stone background, decorations, NPC)
//   y=48..55: counter-back / NPC waist area
//   y=56..63: counter front face
//   y=64..71: floor strip
//
// NPC: head (8×8) at ~(cx-4, y=26), torso (14×18) at (cx-7, y=34)
// visible above counter top (y=48)

function makeInterior({ wallC, wallShadow, floorC, ceilC,
                         counterFace, counterTop, counterShadow,
                         npc, drawProps }) {
  const W = 96, H = 72;
  const px = make(W, H);

  // Ceiling
  fillRect(px, 0, 0, W, 6, ceilC);
  hline(px, 0, W - 1, 6, wallShadow); // ceiling/wall junction shadow

  // Wall (stone base)
  fillRect(px, 0, 7, W, 41, wallC);

  // Stone coursing hint (subtle horizontal lines at every 8px)
  for (let y = 7; y < 48; y += 8) hline(px, 0, W - 1, y, wallShadow);
  // Vertical joints (every 16px, offset every other course)
  for (let row = 0; row < 6; row++) {
    const yBase = 7 + row * 8;
    const off = (row % 2) * 8;
    for (let x = off; x < W; x += 16) vline(px, x, yBase, yBase + 7, wallShadow);
  }

  // Counter back panel (darker zone behind counter)
  fillRect(px, 0, 48, W, 8, counterShadow);
  hline(px, 0, W - 1, 48, counterTop); // top of counter back = top edge

  // Counter front face
  fillRect(px, 0, 56, W, 6, counterFace);
  hline(px, 0, W - 1, 56, counterTop);  // top edge lit
  hline(px, 0, W - 1, 61, counterShadow); // bottom shadow

  // Counter top surface (2px)
  fillRect(px, 0, 54, W, 2, counterTop);

  // Floor
  fillRect(px, 0, 62, W, 10, floorC);
  hline(px, 0, W - 1, 62, counterShadow); // floor/counter junction

  // NPC centred at cx=48
  const cx = 48;
  drawNPC(px, cx, npc);

  // Props
  if (drawProps) drawProps(px);

  return encode(px);
}

// Draw an NPC: head at (cx-4, hy), visible from waist up (above counter)
// npc: {skin, hair, robe, robe2}
function drawNPC(px, cx, { skin, hair, robe, robe2 }) {
  const hy = 27; // head top y

  // Robe/shoulders (torso visible above counter)
  fillRect(px, cx - 8, 34, 16, 14, robe);
  fillRect(px, cx - 7, 35, 14, 12, robe);
  // Robe highlight left side
  vline(px, cx - 7, 35, 46, robe2 !== undefined ? robe2 : robe);
  // Neck
  fillRect(px, cx - 2, 31, 4, 4, skin);

  // Head
  fillRect(px, cx - 4, hy, 8, 9, skin);
  // Hair
  hline(px, cx - 4, cx + 3, hy, hair);
  hline(px, cx - 4, cx + 3, hy + 1, hair);
  pset(px, cx - 4, hy + 2, hair); pset(px, cx + 3, hy + 2, hair);
  // Eyes
  pset(px, cx - 2, hy + 4, 0); pset(px, cx + 1, hy + 4, 0);
  // Mouth
  pset(px, cx - 1, hy + 6, hair); pset(px, cx, hy + 6, hair);
  // Ear suggestion
  pset(px, cx - 5, hy + 3, skin); pset(px, cx + 4, hy + 3, skin);
}

// ---- prop helpers ----------------------------------------------------------

// Candle (2px wide, flame on top)
function candle(px, x, y) {
  fillRect(px, x, y + 4, 2, 6, 7);    // chalk candle body
  pset(px, x, y + 4, 6);              // wax top-left
  pset(px, x, y + 3, 30);             // flame base
  pset(px, x, y + 2, 27);             // flame mid
  pset(px, x, y + 1, 30);             // flame tip
  pset(px, x + 1, y + 4, 13);         // wax hi
}

// Bookshelf row: N books of alternating colors on shelf at y
function bookshelf(px, x0, y, n, colors) {
  hline(px, x0, x0 + n * 5 - 1, y + 8, 9); // shelf umber
  for (let i = 0; i < n; i++) {
    const bx = x0 + i * 5;
    const c = colors[i % colors.length];
    fillRect(px, bx, y, 4, 8, c);
    pset(px, bx, y, c > 10 ? c - 1 : c); // slight spine shadow
    pset(px, bx + 3, y, c - 1 >= 0 ? c - 1 : c);
  }
}

// Torch on wall at (x, y)
function wallTorch(px, x, y) {
  fillRect(px, x, y + 4, 3, 5, 9);   // umber bracket
  pset(px, x + 1, y + 3, 26);        // ember
  pset(px, x + 1, y + 2, 27);        // flame
  pset(px, x, y + 2, 26); pset(px, x + 2, y + 2, 26);
  pset(px, x + 1, y + 1, 30);        // tip
}

// Banner/cloth strip at top of wall
function banner(px, x, y, w, c, symbol) {
  fillRect(px, x, y, w, 14, c);
  if (symbol === 'swords') {
    // simple X in lighter color
    for (let i = 2; i < 12; i++) pset(px, x + i, y + i, c - 1 >= 0 ? c - 1 : c + 1);
    for (let i = 2; i < 12; i++) pset(px, x + w - 2 - (i - 2), y + i, c - 1 >= 0 ? c - 1 : c + 1);
  }
  if (symbol === 'scales') {
    pset(px, x + w / 2, y + 3, 29); pset(px, x + w / 2 + 1, y + 3, 29);
  }
}

// Fireplace: 16px wide at (x, y=bottom), h tall
function fireplace(px, x, yTop, h = 18) {
  const w = 14;
  // Stone surround
  fillRect(px, x, yTop, w, h, 4);
  // Arch opening
  fillRect(px, x + 2, yTop + 2, w - 4, h - 3, 0);
  // Fire (stacked colors low→hi)
  fillRect(px, x + 3, yTop + h - 6, w - 6, 4, 24); // blood-dark base
  fillRect(px, x + 3, yTop + h - 9, w - 6, 3, 26); // ember
  fillRect(px, x + 4, yTop + h - 12, w - 8, 3, 27); // flame
  pset(px, x + w / 2, yTop + h - 14, 30); // tip
  // Mantle
  hline(px, x, x + w - 1, yTop, 5);
}

// ---- INTERIOR DEFINITIONS --------------------------------------------------

function intHall(px) {
  // Tavern-hall feel: banner, two wall torches, table top with mug
  banner(px, 34, 8, 28, 25, 'swords'); // blood-red banner
  wallTorch(px, 12, 14); wallTorch(px, 80, 14);
  // Book ledger on counter
  fillRect(px, 36, 50, 12, 4, 20);  // deep-blue book
  pset(px, 36, 50, 21); pset(px, 47, 50, 19); // book highlights
  // Candle on counter left + right
  candle(px, 20, 46); candle(px, 72, 46);
  // Wall scroll/notice board
  fillRect(px, 58, 14, 18, 16, 13); // parchment board
  fillRect(px, 59, 15, 16, 14, 13);
  hline(px, 58, 75, 14, 9); hline(px, 58, 75, 29, 9);
  // Scroll pin marks
  pset(px, 58, 14, 9); pset(px, 75, 14, 9); pset(px, 58, 29, 9); pset(px, 75, 29, 9);
  // Lines of text suggestion
  for (let ly = 17; ly < 28; ly += 3) hline(px, 61, 73, ly, 10);
}

function intGreta(px) {
  // Cobbler shop: shelves with boots/shoes left and right, workbench
  bookshelf(px, 6, 12, 6, [9, 10, 11, 9, 10, 11]);   // shoe shelves
  bookshelf(px, 66, 12, 6, [10, 11, 9, 10, 11, 9]);
  // Work lamp
  fillRect(px, 44, 11, 8, 6, 9); // lamp body
  pset(px, 48, 11, 11); pset(px, 47, 9, 30); pset(px, 48, 8, 27);
  // Leather piece on counter
  fillRect(px, 30, 49, 16, 3, 10);
  fillRect(px, 31, 49, 14, 2, 11);
  // Awl tool
  vline(px, 50, 47, 53, 3); pset(px, 50, 47, 5);
  // Candle
  candle(px, 68, 46);
}

function intReview(px) {
  // Review hall / magistrate: formal, scales symbol, dark blue curtain
  fillRect(px, 0, 8, 96, 30, 20); // abyss-blue back wall
  hline(px, 0, 95, 8, 19); // top edge
  hline(px, 0, 95, 37, 19); // bottom edge
  // Stone wall re-stamp over the blue (the blue is curtain only in centre)
  fillRect(px, 0, 8, 16, 30, 4); // left stone pillar
  fillRect(px, 80, 8, 16, 30, 4); // right stone pillar
  // Scales on wall
  // Post
  vline(px, 48, 13, 30, 5);
  // Beam
  hline(px, 38, 58, 16, 5);
  // Pans
  for (const bx of [34, 50]) {
    vline(px, bx + 2, 17, 22, 4);
    vline(px, bx, 18, 22, 4); vline(px, bx + 4, 18, 22, 4);
    hline(px, bx, bx + 4, 22, 5);
  }
  // Candles flanking
  candle(px, 22, 26); candle(px, 70, 26);
  // Parchment on desk
  fillRect(px, 34, 49, 18, 4, 13);
  hline(px, 34, 51, 49, 12); // parchment highlight
}

function intTemple(px) {
  // Temple: central altar-flame, arched stone, candelabra
  // Stone arch suggestion (two pillars)
  fillRect(px, 28, 8, 6, 32, 3); // left pillar
  fillRect(px, 62, 8, 6, 32, 4);
  hline(px, 28, 67, 8, 5); // lintel
  // Altar flame behind NPC / on counter
  // (NPC is at cx=48; altar slightly left)
  // Large flame on pedestal at centre
  fillRect(px, 42, 31, 12, 12, 3); // stone pedestal
  fillRect(px, 43, 32, 10, 10, 4);
  // Flame on pedestal
  fillRect(px, 44, 26, 8, 6, 24); // blood-dark base
  fillRect(px, 45, 23, 6, 4, 26); // ember
  fillRect(px, 46, 19, 4, 5, 27); // flame
  pset(px, 48, 17, 30); pset(px, 47, 18, 30); // tip
  // Candelabra on counter
  fillRect(px, 22, 49, 2, 4, 9); candle(px, 22, 43);
  fillRect(px, 70, 49, 2, 4, 9); candle(px, 70, 43);
  // Offering bowl on counter
  fillRect(px, 40, 50, 8, 3, 3);
  fillRect(px, 41, 50, 6, 2, 4);
}

function intSpark(px) {
  // Magic shop: dark blue-night walls, rune symbols, glowing reagent jars
  fillRect(px, 0, 7, 96, 41, 19); // abyss-blue night wall
  // Stone courses re-applied over blue
  for (let y = 7; y < 48; y += 8) hline(px, 0, 95, y, 20);
  // Shelves with glowing vials (violet, mist-blue, gold)
  fillRect(px, 4, 11, 24, 2, 3); // shelf board left
  for (const [sx, sc] of [[5,31],[8,21],[11,27],[14,31],[17,21],[20,27],[23,31]]) {
    fillRect(px, sx, 8, 2, 4, sc); // vial
    pset(px, sx, 8, 23); // mist-blue glow top
  }
  fillRect(px, 68, 11, 24, 2, 3); // shelf right
  for (const [sx, sc] of [[69,27],[72,31],[75,21],[78,27],[81,31],[84,21],[87,27]]) {
    fillRect(px, sx, 8, 2, 4, sc);
    pset(px, sx, 8, 23);
  }
  // Rune circle on wall (centre)
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const rx = Math.round(48 + 12 * Math.cos(ang));
    const ry = Math.round(22 + 8 * Math.sin(ang));
    pset(px, rx, ry, 31); // violet rune marks
  }
  pset(px, 48, 22, 23); // centre glow
  // Large tome on counter
  fillRect(px, 34, 49, 18, 5, 20);
  fillRect(px, 35, 49, 16, 4, 21);
  hline(px, 34, 51, 49, 23); // tome highlight
  // Candle (magical blue-tinted)
  candle(px, 18, 44); candle(px, 74, 44);
}

function intGoose(px) {
  // Tavern / Grey Goose: fireplace right, barrel left, mugs on counter
  fireplace(px, 70, 10, 32); // right-side fireplace
  // Barrel left
  fillRect(px, 6, 22, 14, 20, 9);  // barrel umber
  fillRect(px, 7, 23, 12, 18, 10); // barrel face
  hline(px, 6, 19, 26, 3);  // iron band
  hline(px, 6, 19, 34, 3);  // iron band
  hline(px, 7, 18, 22, 11); // barrel head highlight
  // Mugs on counter
  for (const mx of [28, 40, 60]) {
    fillRect(px, mx, 49, 5, 5, 10); // mug leather
    fillRect(px, mx + 1, 49, 3, 4, 11); // mug hi
    pset(px, mx + 5, 50, 9); pset(px, mx + 5, 52, 9); // handle
  }
  // Candle
  candle(px, 48, 44);
}

function intHart(px) {
  // Tanner/Hart: fireplace left, pelts on wall, workbench tool
  fireplace(px, 6, 10, 28);
  fillRect(px, 28, 10, 14, 14, 10); fillRect(px, 29, 11, 12, 12, 11);
  fillRect(px, 48, 10, 14, 14, 10); fillRect(px, 49, 11, 12, 12, 11);
  fillRect(px, 68, 10, 14, 14, 9); fillRect(px, 69, 11, 12, 12, 10);
  // Antler on wall (the hart)
  vline(px, 78, 10, 18, 9); hline(px, 76, 79, 13, 9); hline(px, 76, 79, 16, 9);
  vline(px, 82, 10, 18, 9); hline(px, 82, 85, 13, 9); hline(px, 82, 85, 16, 9);
  // Scraping tool on counter
  fillRect(px, 32, 50, 16, 3, 3);
  hline(px, 32, 47, 50, 4);
}

function intTannery(px) {
  // Tannery interior: more industrial, dye vats on wall, leather goods
  // Shelf with leather rolls
  fillRect(px, 6, 11, 22, 2, 9); // shelf
  for (let rx = 7; rx < 28; rx += 6) {
    fillRect(px, rx, 8, 4, 4, 10); // roll end
    fillRect(px, rx + 1, 8, 2, 3, 11); // roll highlight
  }
  // Right shelf — tools and pouches
  fillRect(px, 68, 11, 22, 2, 9);
  for (let rx = 69; rx < 89; rx += 6) {
    fillRect(px, rx, 8, 4, 4, 8); // pouch peat
    fillRect(px, rx, 8, 2, 2, 9); // pouch hi
  }
  // Measuring cord on wall
  hline(px, 30, 65, 18, 10);
  for (let mx = 34; mx < 65; mx += 8) pset(px, mx, 17, 11); // measurement marks
  // Leather sheet on counter
  fillRect(px, 28, 49, 30, 4, 10);
  fillRect(px, 29, 49, 28, 3, 11);
  // Bone needle on counter
  fillRect(px, 60, 51, 8, 1, 6); pset(px, 60, 51, 7);
}

function intBelltower(px) {
  // Bell tower guild: large bell visible on wall/background, dark blue stone
  fillRect(px, 0, 7, 96, 41, 19); // abyss-blue back
  for (let y = 7; y < 48; y += 8) hline(px, 0, 95, y, 20);
  // Large stone arch framing the bell
  fillRect(px, 24, 8, 6, 30, 4); // left pillar
  fillRect(px, 66, 8, 6, 30, 4); // right pillar
  hline(px, 24, 71, 8, 5);
  // Bell (large — central)
  fillRect(px, 37, 14, 22, 18, 29); // gold bell
  fillRect(px, 38, 15, 20, 16, 30); // candle face
  hline(px, 36, 59, 30, 28); // lip
  fillRect(px, 36, 30, 24, 2, 28); // gold-dark lip
  // Bell support
  fillRect(px, 46, 11, 4, 3, 3); hline(px, 42, 53, 11, 4);
  // Rope
  vline(px, 48, 32, 47, 9); vline(px, 49, 32, 47, 9);
  // Clapper
  fillRect(px, 47, 24, 2, 5, 3); pset(px, 47, 28, 4); pset(px, 48, 29, 4);
  // Ledger / record book on counter
  fillRect(px, 34, 50, 20, 4, 20); fillRect(px, 35, 50, 18, 3, 21);
  candle(px, 22, 45); candle(px, 70, 45);
}

const INT_DEFS = {
  int_hall: {
    wallC: 3, wallShadow: 2, floorC: 8, ceilC: 2,
    counterFace: 9, counterTop: 10, counterShadow: 8,
    npc: { skin: 12, hair: 8, robe: 25, robe2: 24 },
    drawProps: intHall,
  },
  int_greta: {
    wallC: 4, wallShadow: 3, floorC: 9, ceilC: 3,
    counterFace: 9, counterTop: 10, counterShadow: 8,
    npc: { skin: 13, hair: 9, robe: 15, robe2: 16 },
    drawProps: intGreta,
  },
  int_review: {
    wallC: 3, wallShadow: 2, floorC: 3, ceilC: 2,
    counterFace: 3, counterTop: 4, counterShadow: 2,
    npc: { skin: 12, hair: 3, robe: 20, robe2: 21 },
    drawProps: intReview,
  },
  int_temple: {
    wallC: 4, wallShadow: 3, floorC: 4, ceilC: 3,
    counterFace: 3, counterTop: 4, counterShadow: 2,
    npc: { skin: 13, hair: 6, robe: 30, robe2: 29 },
    drawProps: intTemple,
  },
  int_spark: {
    wallC: 19, wallShadow: 20, floorC: 2, ceilC: 1,
    counterFace: 3, counterTop: 4, counterShadow: 2,
    npc: { skin: 13, hair: 31, robe: 31, robe2: 20 },
    drawProps: intSpark,
  },
  int_goose: {
    wallC: 8, wallShadow: 9, floorC: 9, ceilC: 8,
    counterFace: 9, counterTop: 10, counterShadow: 8,
    npc: { skin: 12, hair: 11, robe: 10, robe2: 11 },
    drawProps: intGoose,
  },
  int_hart: {
    wallC: 4, wallShadow: 3, floorC: 9, ceilC: 3,
    counterFace: 9, counterTop: 10, counterShadow: 8,
    npc: { skin: 12, hair: 9, robe: 10, robe2: 11 },
    drawProps: intHart,
  },
  int_tannery: {
    wallC: 3, wallShadow: 2, floorC: 8, ceilC: 2,
    counterFace: 9, counterTop: 10, counterShadow: 8,
    npc: { skin: 13, hair: 8, robe: 8, robe2: 9 },
    drawProps: intTannery,
  },
  int_belltower: {
    wallC: 19, wallShadow: 20, floorC: 2, ceilC: 1,
    counterFace: 3, counterTop: 4, counterShadow: 2,
    npc: { skin: 12, hair: 3, robe: 3, robe2: 4 },
    drawProps: intBelltower,
  },
};

// ---- assemble and write -------------------------------------------------------
const sprites = {};

for (const [name, drawFn] of Object.entries(SIGN_BUILDERS)) {
  sprites[name] = makeSign(drawFn);
}

for (const [name, def] of Object.entries(INT_DEFS)) {
  sprites[name] = makeInterior(def);
}

const doc = {
  comment: 'Signboards (36×28) and interior scenes (96×72). ' +
            'Generated by tools/gen_signs.js — do not hand-edit.',
  sprites
};

writeFileSync(
  join(ROOT, 'data', 'art', 'signs.json'),
  JSON.stringify(doc, null, 2)
);
console.log('wrote data/art/signs.json');
console.log('sprites:', Object.keys(sprites).join(', '));

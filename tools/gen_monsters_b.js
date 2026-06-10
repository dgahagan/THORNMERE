// Generates monster set B — 9 families × 2 frames at 96×80 into data/art/monsters2.json
// Run: node tools/gen_monsters_b.js
// Families: sorcerer, ghost, bird, hag, knight, choir, gargoyle, golem, moth

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = 96, H = 80;

function make() { return Array.from({length: H}, () => new Array(W).fill(-1)); }
function pset(px, x, y, c) { if (x >= 0 && x < W && y >= 0 && y < H) px[y][x] = c; }
function hline(px, x0, x1, y, c) { for (let x = x0; x <= x1; x++) pset(px, x, y, c); }
function vline(px, x, y0, y1, c) { for (let y = y0; y <= y1; y++) pset(px, x, y, c); }
function fillRect(px, x, y, w, h, c) { for (let dy = 0; dy < h; dy++) hline(px, x, x + w - 1, y + dy, c); }
function fillEllipse(px, cx, cy, rx, ry, c) {
  for (let y = cy - ry; y <= cy + ry; y++)
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x - cx) / (rx + 0.5), dy = (y - cy) / (ry + 0.5);
      if (dx * dx + dy * dy <= 1.0) pset(px, x, y, c);
    }
}
function outlineEllipse(px, cx, cy, rx, ry, c) {
  for (let y = cy - ry; y <= cy + ry; y++)
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x - cx) / (rx + 0.5), dy = (y - cy) / (ry + 0.5);
      const d = dx * dx + dy * dy;
      if (d <= 1.0 && d >= 0.64) pset(px, x, y, c);
    }
}
function encode(px) {
  const used = new Set();
  for (const row of px) for (const c of row) if (c !== -1) used.add(c);
  const palette = [...used].sort((a, b) => a - b);
  const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*+-=[]{}|;:,<>?/~`_';
  const legend = { '.': -1 };
  palette.forEach((c, i) => { legend[CHARS[i]] = c; });
  const inv = {};
  palette.forEach((c, i) => { inv[c] = CHARS[i]; });
  const rows = px.map(row => row.map(c => c === -1 ? '.' : inv[c]).join(''));
  return { w: W, h: H, legend, rows };
}

// ============================================================================
// Palette reference (indices into 32-colour Thornmere palette)
// 0=black 1=night 2=shadow 3=slate-dark 4=slate 5=stone 6=bone 7=chalk
// 8=peat 9=umber 10=leather 11=amberwood 12=honey 13=parchment
// 14=moss-deep 15=moss 16=fen-green 17=leaf 19=abyss-blue 20=deep-blue
// 21=sky-blue 22=day-sky 23=mist-blue 24=blood-dark 25=blood
// 26=ember 27=flame 28=gold-dark 29=gold 30=candle 31=violet
// ============================================================================

// ============================================================================
// SORCERER — robed cult mage, pointed cowl, staff, raised hand
// ============================================================================
function sorcerer(frame) {
  const px = make();
  const cx = 48;

  // Robe — peat/umber cult robe, widening triangle
  for (let y = 20; y < 76; y++) {
    const spread = Math.floor((y - 20) * 0.6);
    const x0 = Math.max(18, cx - 14 - spread);
    const x1 = Math.min(78, cx + 14 + spread);
    hline(px, x0, x1, y, 8);         // peat fill
    pset(px, x0, y, 0);
    pset(px, x1, y, 0);
    hline(px, x0 + 1, x0 + 4, y, 9); // umber lit left edge
  }
  hline(px, 20, 76, 76, 9);
  hline(px, 22, 74, 77, 8);

  // Blood-dark collar trim
  hline(px, cx - 10, cx + 10, 22, 24);
  hline(px, cx - 9, cx + 9, 23, 25);
  // Rune marks down robe front
  for (let y = 34; y < 68; y += 11) {
    pset(px, cx - 1, y, 31); pset(px, cx, y, 31); pset(px, cx + 1, y, 31);
    pset(px, cx, y - 1, 29); pset(px, cx, y + 1, 29);
  }

  // Pointed cowl — triangular hood
  for (let y = 2; y < 20; y++) {
    const hw = Math.floor((y - 2) * 1.3);
    hline(px, cx - hw, cx + hw, y, 8);
    pset(px, cx - hw - 1, y, 0); pset(px, cx + hw + 1, y, 0);
    if (hw >= 2) pset(px, cx - hw, y, 9); // lit left edge
  }

  // Face under cowl
  fillEllipse(px, cx, 15, 7, 6, 8);   // peat shadow
  fillEllipse(px, cx, 15, 5, 5, 13);  // parchment face
  fillEllipse(px, cx - 2, 13, 3, 2, 2);
  pset(px, cx - 4, 13, 25); pset(px, cx - 3, 13, 24); // left blood eye
  pset(px, cx + 3, 13, 25); pset(px, cx + 4, 13, 24); // right blood eye
  pset(px, cx + 1, 16, 9);  // hooked nose
  hline(px, cx - 2, cx + 3, 18, 0);   // grimace

  // Staff right side — vertical, full height
  vline(px, cx + 22, 6, 70, 11);
  vline(px, cx + 23, 6, 70, 12);
  // Orb atop staff
  fillEllipse(px, cx + 22, 7, 6, 6, 20);  // deep-blue outer
  fillEllipse(px, cx + 22, 7, 4, 4, 21);  // sky-blue
  fillEllipse(px, cx + 22, 7, 2, 2, 7);   // chalk core
  // Staff hand (right arm sleeve + hand)
  fillRect(px, cx + 18, 28, 8, 30, 8);
  fillRect(px, cx + 19, 29, 6, 28, 9);
  fillEllipse(px, cx + 22, 58, 5, 4, 13);

  if (frame === 0) {
    // Left hand faintly visible at robe hem
    fillEllipse(px, cx - 20, 58, 5, 4, 13);
    pset(px, cx - 23, 57, 12); pset(px, cx - 22, 56, 12);
  } else {
    // Left arm raised — casting violet sphere
    fillRect(px, cx - 32, 14, 8, 28, 8);
    fillRect(px, cx - 31, 15, 6, 26, 9);
    fillEllipse(px, cx - 28, 16, 5, 5, 13);
    fillEllipse(px, cx - 28, 8, 9, 9, 31);
    fillEllipse(px, cx - 28, 8, 7, 7, 20);
    fillEllipse(px, cx - 28, 8, 4, 4, 23);
    pset(px, cx - 28, 8, 7);
    for (const [ox, oy, c] of [[-5,-4,31],[5,-5,31],[-6,1,31],[6,-1,20],[-3,-8,31],[4,-7,29]])
      pset(px, cx - 28 + ox, 8 + oy, c);
  }

  hline(px, 24, 72, 77, 2); hline(px, 28, 68, 78, 0);
  return encode(px);
}

// ============================================================================
// GHOST — ragged shroud-wight, hollow eyes, howling mouth
// ============================================================================
function ghost(frame) {
  const px = make();
  const cx = 48;

  // Outer wispy shroud
  for (let y = 4; y < 72; y++) {
    let spread;
    if (y < 22) spread = Math.floor((y - 4) * 1.1);
    else if (y < 52) spread = Math.min(24, 19 + Math.floor((y - 22) * 0.15));
    else spread = Math.max(4, 24 - Math.floor((y - 52) * 0.7));
    hline(px, cx - spread, cx + spread, y, 23); // mist-blue
    pset(px, cx - spread, y, 5); pset(px, cx + spread, y, 5); // stone edge
  }
  // Bright inner shroud
  for (let y = 6; y < 66; y++) {
    let spread;
    if (y < 22) spread = Math.floor((y - 6) * 0.8);
    else if (y < 48) spread = Math.min(16, 12 + Math.floor((y - 22) * 0.15));
    else spread = Math.max(2, 16 - Math.floor((y - 48) * 0.6));
    if (spread > 0) hline(px, cx - spread, cx + spread, y, 7); // chalk
  }
  // Bone-white core (chest glow)
  fillEllipse(px, cx, 38, 9, 11, 6); // bone
  fillEllipse(px, cx, 36, 5, 7, 7);  // chalk

  // Ragged bottom tears
  for (let ty = 60; ty < 76; ty++) {
    const m = ty % 5;
    if (m < 2) { pset(px, cx - 14 + m, ty, 23); pset(px, cx - 15 + m, ty, 5); }
    if (m > 3) { pset(px, cx + 11 + (m-4)*2, ty, 23); }
    pset(px, cx - 3, ty, ty % 3 === 0 ? 7 : 23);
    pset(px, cx + 4, ty, ty % 3 === 1 ? 7 : 23);
  }

  // Head
  fillEllipse(px, cx, 14, 10, 10, 7); // chalk
  fillEllipse(px, cx, 14, 8, 8, 6);   // bone
  fillEllipse(px, cx - 3, 13, 5, 5, 23); // mist tint shadow

  // Hollow dark eyes
  fillEllipse(px, cx - 5, 12, 4, 3, 0);
  pset(px, cx - 5, 12, 20); // deep-blue inner glow
  fillEllipse(px, cx + 5, 12, 4, 3, 0);
  pset(px, cx + 5, 12, 20);

  // Howling O mouth
  const mw = frame === 1 ? 7 : 5, mh = frame === 1 ? 5 : 4;
  fillEllipse(px, cx, 19, mw, mh, 0);
  fillEllipse(px, cx, 20, mw - 2, mh - 1, 1);
  if (frame === 1) {
    // Teeth at rim when wailing
    hline(px, cx - 4, cx + 4, 15, 6);
    hline(px, cx - 4, cx + 4, 23, 6);
  }

  // Hair wisps at crown
  for (const [hx, hy] of [[cx-6,2],[cx-4,1],[cx+4,2],[cx+6,1],[cx,0]])
    { pset(px, hx, hy, 7); pset(px, hx+1, hy+1, 5); }

  if (frame === 0) {
    // Arms drooping
    for (let y = 30; y < 58; y++) {
      pset(px, cx - 22, y, 23); pset(px, cx - 23, y, 7); pset(px, cx - 24, y, 5);
      pset(px, cx + 22, y, 23); pset(px, cx + 23, y, 7); pset(px, cx + 24, y, 5);
    }
    fillEllipse(px, cx - 22, 58, 5, 4, 7); fillEllipse(px, cx - 22, 58, 3, 3, 6);
    fillEllipse(px, cx + 22, 58, 5, 4, 7); fillEllipse(px, cx + 22, 58, 3, 3, 6);
  } else {
    // Arms raised wailing
    for (let i = 0; i < 16; i++) {
      pset(px, cx - 22 - i, 34 - i, 23); pset(px, cx - 23 - i, 34 - i, 7);
      pset(px, cx + 22 + i, 34 - i, 23); pset(px, cx + 23 + i, 34 - i, 7);
    }
    fillEllipse(px, cx - 36, 20, 5, 4, 7); fillEllipse(px, cx + 36, 20, 5, 4, 7);
  }
  return encode(px);
}

// ============================================================================
// BIRD — gaunt carrion storm-bird, wings half-spread, open beak
// ============================================================================
function bird(frame) {
  const px = make();
  const cx = 48;

  // Body
  fillEllipse(px, cx, 38, 10, 13, 3);
  fillEllipse(px, cx, 38, 7, 9, 4);
  fillEllipse(px, cx - 3, 36, 4, 5, 5);

  // Neck
  fillRect(px, cx - 4, 22, 8, 14, 3);
  fillRect(px, cx - 3, 23, 6, 12, 4);

  // Head
  fillEllipse(px, cx + 1, 14, 10, 9, 3);
  fillEllipse(px, cx, 14, 7, 7, 4);
  fillEllipse(px, cx - 3, 12, 4, 4, 5);

  // Glowing eye
  fillEllipse(px, cx + 4, 11, 3, 3, 26);
  fillEllipse(px, cx + 4, 11, 2, 2, 27);
  pset(px, cx + 4, 11, 30);

  // Upper beak (hooked)
  fillRect(px, cx - 1, 18, 14, 5, 12);
  fillRect(px, cx, 19, 12, 3, 13);
  fillRect(px, cx + 9, 22, 4, 4, 11); // hook tip
  pset(px, cx + 12, 25, 0);

  if (frame === 1) {
    // Open beak
    fillRect(px, cx - 1, 24, 10, 5, 11);
    fillRect(px, cx, 25, 8, 3, 12);
    fillRect(px, cx - 1, 23, 12, 5, 0); // black throat
    pset(px, cx + 3, 26, 25); pset(px, cx + 4, 27, 25); // tongue
  } else {
    hline(px, cx - 1, cx + 11, 23, 0); // beak seam
  }

  // Tail feathers
  for (let i = 0; i < 6; i++) {
    vline(px, cx - 5 + i * 2, 50, 58 + i % 3, 3);
    vline(px, cx - 4 + i * 2, 51, 56 + i % 3, 4);
  }

  // Wings
  const wSpread = frame === 0 ? 30 : 42;
  for (const side of [-1, 1]) {
    for (let i = 0; i < wSpread; i++) {
      const wx = cx + side * (14 + i);
      const wyTop = 26 + Math.floor(i * (i < 20 ? 0.4 : 0.8));
      const wyBot = 50 - Math.floor(i * 0.15);
      if (wx >= 0 && wx < W && wyTop < wyBot) {
        vline(px, wx, wyTop, wyBot, i < 8 ? 3 : 2);
        pset(px, wx, wyTop, 4);
        if (i % 6 === 0 && i > 5) { pset(px, wx, wyTop, 0); pset(px, wx, wyBot, 0); }
      }
    }
    // Wing covert at base
    fillEllipse(px, cx + side * 14, 34, 5, 7, 3);
  }

  // Legs + talons
  for (const side of [-1, 1]) {
    const lx = cx + side * 4;
    vline(px, lx, 50, 66, 3); vline(px, lx + side, 51, 66, 4);
    // Three talons
    for (let t = -1; t <= 1; t++) {
      hline(px, lx + side * 2, lx + side * 8 + t * 2, 66, 3);
      pset(px, lx + side * 8 + t * 2, 67, 0);
    }
  }
  return encode(px);
}

// ============================================================================
// HAG — wild hair, hooked nose, clawed fingers raised
// ============================================================================
function hag(frame) {
  const px = make();
  const cx = 48;

  // Body torso (hunched fen-green)
  fillEllipse(px, cx, 44, 14, 18, 16);
  fillEllipse(px, cx - 2, 42, 10, 13, 15);
  fillEllipse(px, cx + 4, 48, 8, 9, 14);
  // Hunchback
  fillEllipse(px, cx + 11, 30, 9, 7, 14);
  fillEllipse(px, cx + 9, 28, 7, 5, 15);

  // Neck
  fillRect(px, cx - 3, 20, 7, 10, 16);
  fillRect(px, cx - 2, 21, 5, 8, 15);

  // Head
  fillEllipse(px, cx - 2, 12, 11, 10, 16);
  fillEllipse(px, cx - 4, 11, 8, 8, 15);
  fillEllipse(px, cx - 6, 10, 5, 5, 17);

  // Sunken gold eyes
  fillEllipse(px, cx - 7, 10, 3, 2, 29); pset(px, cx - 7, 10, 0);
  fillEllipse(px, cx + 1, 10, 3, 2, 29); pset(px, cx + 1, 10, 0);

  // Hooked nose (prominent)
  fillRect(px, cx - 2, 12, 5, 4, 14);
  fillEllipse(px, cx + 4, 18, 4, 3, 14);
  fillEllipse(px, cx + 5, 19, 3, 3, 16);
  pset(px, cx + 8, 20, 0);
  // Wart
  pset(px, cx - 3, 18, 9); pset(px, cx - 4, 18, 8);

  // Grimace
  hline(px, cx - 5, cx + 3, 22, 0);
  pset(px, cx - 5, 22, 8); pset(px, cx + 3, 22, 8); // tooth nubs

  // Wild hair (honey/umber spreading outward)
  const hColors = [12, 13, 9, 11];
  for (let i = 0; i < 7; i++) {
    const hx = cx - 14 - i * 3, hy0 = 4 + i * 2;
    vline(px, hx, hy0, hy0 + 8 + (i%3)*2, hColors[i%4]);
    vline(px, hx + 1, hy0 + 1, hy0 + 9 + (i%3)*2, hColors[(i+1)%4]);
    pset(px, hx - 1, hy0 + 9 + (i%3)*2, 13);
  }
  for (let i = 0; i < 7; i++) {
    const hx = cx + 8 + i * 3, hy0 = 4 + i * 2;
    vline(px, hx, hy0, hy0 + 8 + (i%3)*2, hColors[i%4]);
    pset(px, hx + 1, hy0 + 9 + (i%3)*2, 13);
  }
  hline(px, cx - 14, cx + 10, 4, 11);
  hline(px, cx - 16, cx + 12, 5, 9);
  hline(px, cx - 12, cx + 8, 3, 12);

  // Skirt/robe bottom
  for (let y = 58; y < 78; y++) {
    const spread = Math.min(18, 10 + (y - 58));
    hline(px, cx - spread, cx + spread, y, 16);
    hline(px, cx - spread + 1, cx - spread + 3, y, 15);
  }

  if (frame === 0) {
    // Arms low, clawed
    for (let y = 36; y < 62; y++) {
      const ax = cx - 18 - Math.floor((y-36)*0.3);
      pset(px, ax, y, 16); pset(px, ax+1, y, 15);
    }
    fillEllipse(px, cx - 28, 62, 5, 4, 16);
    for (let c = 0; c < 4; c++) { vline(px, cx - 32 + c*2, 62, 70, 8); pset(px, cx-32+c*2, 70, 0); }
    for (let y = 36; y < 62; y++) {
      const ax = cx + 18 + Math.floor((y-36)*0.3);
      pset(px, ax, y, 16); pset(px, ax-1, y, 15);
    }
    fillEllipse(px, cx + 28, 62, 5, 4, 16);
    for (let c = 0; c < 4; c++) { vline(px, cx + 24 + c*2, 62, 70, 8); pset(px, cx+24+c*2, 70, 0); }
  } else {
    // Arms raised, claws splayed
    for (let i = 0; i < 18; i++) {
      pset(px, cx - 18 - i, 40 - i, 16); pset(px, cx - 17 - i, 40 - i, 15);
      pset(px, cx + 18 + i, 40 - i, 16); pset(px, cx + 17 + i, 40 - i, 15);
    }
    fillEllipse(px, cx - 34, 24, 6, 5, 16);
    fillEllipse(px, cx + 34, 24, 6, 5, 16);
    // Claws pointing up-outward
    for (let c = 0; c < 4; c++) {
      const ang = (c - 1.5) * 0.35;
      for (let r = 1; r < 8; r++)
        pset(px, cx - 34 + Math.round(r * Math.cos(ang - 1.1)), 24 + Math.round(r * Math.sin(ang - 1.1)), 8);
    }
    for (let c = 0; c < 4; c++) {
      const ang = (c - 1.5) * 0.35;
      for (let r = 1; r < 8; r++)
        pset(px, cx + 34 + Math.round(r * Math.cos(ang + 2.0)), 24 + Math.round(r * Math.sin(ang + 2.0)), 8);
    }
  }

  hline(px, 20, 76, 77, 2); hline(px, 26, 70, 78, 0);
  return encode(px);
}

// ============================================================================
// KNIGHT — armored revenant, closed helm, notched sword, kite shield
// ============================================================================
function knight(frame) {
  const px = make();
  const cx = 48;

  // Sabatons + greaves
  for (const [lx] of [[cx-12],[cx+1]]) {
    fillRect(px, lx, 60, 10, 18, 3); fillRect(px, lx+1, 61, 8, 16, 4); fillRect(px, lx+2, 62, 4, 14, 5);
    fillRect(px, lx-2, 76, 13, 4, 3); fillRect(px, lx-1, 77, 11, 3, 4);
  }
  // Knee cops
  fillEllipse(px, cx - 7, 60, 5, 4, 5); fillEllipse(px, cx + 7, 60, 5, 4, 5);

  // Hip + waist
  fillRect(px, cx - 13, 50, 26, 11, 3); fillRect(px, cx - 12, 51, 24, 9, 4);
  fillRect(px, cx - 11, 52, 8, 7, 5);
  hline(px, cx - 13, cx + 12, 50, 2);

  // Breastplate
  fillRect(px, cx - 15, 24, 30, 28, 4);
  fillRect(px, cx - 14, 25, 28, 26, 5);
  fillRect(px, cx - 13, 25, 10, 24, 5);
  hline(px, cx - 10, cx - 1, 28, 6); hline(px, cx + 1, cx + 10, 28, 6); // chest shine
  vline(px, cx, 26, 50, 3);
  fillEllipse(px, cx - 15, 24, 8, 6, 3); fillEllipse(px, cx - 14, 23, 6, 5, 5); // L pauldron
  fillEllipse(px, cx + 15, 24, 8, 6, 3); fillEllipse(px, cx + 16, 23, 6, 5, 4); // R pauldron

  // Gorget
  fillRect(px, cx - 5, 18, 10, 8, 3); fillRect(px, cx - 4, 19, 8, 6, 4);

  // Helmet
  fillEllipse(px, cx, 10, 14, 12, 3);
  fillEllipse(px, cx - 1, 9, 11, 10, 4);
  fillEllipse(px, cx - 4, 8, 8, 7, 5);
  fillRect(px, cx - 9, 10, 18, 4, 0); // visor slit
  hline(px, cx - 8, cx + 8, 11, 24); hline(px, cx - 6, cx + 6, 11, 25); // blood glow visor
  fillRect(px, cx - 2, 0, 4, 6, 5); fillRect(px, cx - 1, 1, 2, 4, 6); // crest
  pset(px, cx, 10, 3); pset(px, cx, 11, 3); pset(px, cx, 12, 3); // nasal

  const drawShield = () => {
    // Left arm
    fillRect(px, cx - 26, 26, 9, 24, 4); fillRect(px, cx - 25, 27, 7, 22, 5);
    // Kite shield
    for (let y = 22; y < 54; y++) {
      const hw = y < 28 ? Math.floor((y - 22) * 2) : Math.max(2, 10 - Math.floor((y - 28) * 0.55));
      const sx = cx - 38;
      hline(px, sx - hw, sx + hw, y, 4); pset(px, sx - hw, y, 3); pset(px, sx + hw, y, 5);
    }
    fillEllipse(px, cx - 38, 36, 4, 4, 29); fillEllipse(px, cx - 38, 36, 2, 2, 30);
    vline(px, cx - 38, 24, 52, 5); hline(px, cx - 44, cx - 32, 36, 5);
  };

  if (frame === 0) {
    drawShield();
    // Sword arm right, sword down
    fillRect(px, cx + 17, 26, 9, 28, 4); fillRect(px, cx + 18, 27, 7, 26, 5);
    fillEllipse(px, cx + 21, 52, 6, 5, 3); fillEllipse(px, cx + 22, 51, 4, 4, 4);
    fillRect(px, cx + 19, 56, 4, 22, 29); fillRect(px, cx + 20, 57, 2, 20, 30);
    fillRect(px, cx + 15, 54, 12, 3, 28);
    pset(px, cx + 19, 64, 0); pset(px, cx + 22, 70, 0);
  } else {
    drawShield();
    // Sword arm right, sword raised
    fillRect(px, cx + 17, 6, 9, 22, 4); fillRect(px, cx + 18, 7, 7, 20, 5);
    fillEllipse(px, cx + 21, 26, 6, 5, 3);
    fillRect(px, cx + 18, 0, 4, 8, 29); fillRect(px, cx + 19, 1, 2, 6, 30);
    fillRect(px, cx + 13, 8, 12, 3, 28);
    pset(px, cx + 18, 3, 0); pset(px, cx + 21, 6, 0);
  }

  hline(px, 28, 68, 78, 2); hline(px, 32, 64, 79, 0);
  return encode(px);
}

// ============================================================================
// CHOIR — three hooded singers, open black mouths, taller center
// ============================================================================
function choir(frame) {
  const px = make();

  const drawSinger = (scx, tall, open) => {
    const topY = tall ? 4 : 12;
    // Robe
    for (let y = topY + 14; y < 76; y++) {
      const spread = Math.floor((y - (topY + 14)) * 0.38);
      const x0 = scx - 10 - spread, x1 = scx + 10 + spread;
      hline(px, x0, x1, y, 8); pset(px, x0, y, 0); pset(px, x1, y, 0);
      pset(px, x0 + 1, y, 9);
    }
    // Hood
    fillEllipse(px, scx, topY + 6, 8, 7, 8);
    fillEllipse(px, scx - 2, topY + 5, 6, 5, 9);
    // Face in shadow
    fillEllipse(px, scx, topY + 9, 6, 5, 2);
    // Hollow eyes
    pset(px, scx - 3, topY + 8, 0); pset(px, scx - 2, topY + 8, 0);
    pset(px, scx + 2, topY + 8, 0); pset(px, scx + 3, topY + 8, 0);
    pset(px, scx - 3, topY + 9, 1); pset(px, scx + 2, topY + 9, 1);
    // O mouth
    const mw = open ? 4 : 2, mh = open ? 4 : 2;
    fillEllipse(px, scx, topY + 11, mw, mh, 0);
    fillEllipse(px, scx, topY + 12, mw - 1, mh - 1, 1);
    if (open) {
      hline(px, scx - 3, scx + 3, topY + 8, 6);  // upper teeth
      hline(px, scx - 3, scx + 3, topY + 14, 6); // lower teeth
    }
    // Cowl rim
    hline(px, scx - 7, scx + 7, topY + 13, 9);
    hline(px, scx - 6, scx + 6, topY + 14, 8);
  };

  const open = frame === 1;
  drawSinger(20, false, open);
  drawSinger(48, true, open);
  drawSinger(76, false, open);

  // Hands at robe hem
  fillEllipse(px, 11, 58, 4, 3, 10); fillEllipse(px, 29, 58, 4, 3, 10);
  fillEllipse(px, 67, 58, 4, 3, 10); fillEllipse(px, 85, 58, 4, 3, 10);
  if (frame === 0) {
    fillEllipse(px, 39, 64, 4, 3, 10); fillEllipse(px, 57, 64, 4, 3, 10);
  } else {
    // Center arms raised
    fillEllipse(px, 37, 54, 4, 3, 10); fillEllipse(px, 59, 54, 4, 3, 10);
    // Sound wave marks from center
    for (const [ox, oy, c] of [[-16,-4,20],[16,-4,20],[-20,-2,19],[20,-2,19],[-12,-8,20],[12,-8,20]])
      pset(px, 48 + ox, 4 + oy, c);
  }
  return encode(px);
}

// ============================================================================
// GARGOYLE — horned stone gargoyle, folded wings, fanged grin
// ============================================================================
function gargoyle(frame) {
  const px = make();
  const cx = 48;

  // Crouched legs
  for (const [lx] of [[cx-14],[cx+4]]) {
    fillRect(px, lx, 52, 10, 24, 3); fillRect(px, lx+1, 53, 8, 22, 4);
    fillRect(px, lx+2, 54, 4, 18, 5);
  }
  // Talons
  for (let t = 0; t < 3; t++) {
    vline(px, cx - 16 + t*3, 74, 79, 3); pset(px, cx - 16 + t*3, 79, 0);
    vline(px, cx + 6 + t*3, 74, 79, 3);  pset(px, cx + 6 + t*3, 79, 0);
  }

  // Squat body
  fillEllipse(px, cx, 40, 18, 14, 3);
  fillEllipse(px, cx - 2, 38, 14, 11, 4);
  fillEllipse(px, cx - 5, 36, 8, 7, 5);

  // Short neck
  fillRect(px, cx - 6, 24, 12, 12, 3); fillRect(px, cx - 5, 25, 10, 10, 4);

  // Head (broad, gargoyle)
  fillEllipse(px, cx, 16, 16, 12, 3);
  fillEllipse(px, cx - 2, 15, 13, 10, 4);
  fillEllipse(px, cx - 5, 13, 9, 7, 5);

  // Horns (TWO prominent)
  for (let i = 0; i < 9; i++) {
    pset(px, cx - 12 - i, 4 + i*2, 3); pset(px, cx - 11 - i, 5 + i*2, 5);
    pset(px, cx + 12 + i, 4 + i*2, 3); pset(px, cx + 11 + i, 5 + i*2, 4);
  }

  // Ember eyes
  fillEllipse(px, cx - 7, 14, 4, 3, 26); fillEllipse(px, cx - 7, 14, 2, 2, 27); pset(px, cx-7, 14, 30);
  fillEllipse(px, cx + 7, 14, 4, 3, 26); fillEllipse(px, cx + 7, 14, 2, 2, 27); pset(px, cx+7, 14, 30);

  // FANGED GRIN (wide open mouth)
  hline(px, cx - 10, cx + 10, 20, 0);
  for (let y = 21; y < 25; y++) hline(px, cx - 10, cx + 10, y, 0);
  hline(px, cx - 10, cx + 10, 25, 0);
  // Fangs (alternating up/down)
  for (let t = 0; t < 5; t++) {
    const tx = cx - 9 + t*4;
    pset(px, tx, 20, 6); pset(px, tx+1, 20, 7);
    pset(px, tx, 25, 6); pset(px, tx+1, 24, 7);
  }
  fillEllipse(px, cx + 2, 23, 4, 2, 25); // tongue

  // Wings (bat-style)
  const wOut = frame === 0 ? 16 : 26;
  for (const side of [-1, 1]) {
    for (let i = 0; i < wOut; i++) {
      const wx = cx + side * (18 + i);
      const wyTop = 28 + Math.floor(i * 0.7);
      const wyBot = 56 - Math.floor(i * 0.2);
      if (wx >= 0 && wx < W && wyTop < wyBot) {
        vline(px, wx, wyTop, wyBot, i < 5 ? 3 : 2);
        pset(px, wx, wyTop, 4);
        if (i % 8 === 0) hline(px, wx - side*6, wx, wyTop + 3, 4);
      }
    }
  }

  // Arms
  if (frame === 0) {
    for (const [ax, side] of [[cx-22,-1],[cx+14,1]]) {
      fillRect(px, ax, 38, 8, 16, 3); fillRect(px, ax+1, 39, 6, 14, 4);
      fillEllipse(px, ax+4, 54, 6, 5, 4);
      for (let t = 0; t < 3; t++) { vline(px, ax+t*3, 58, 64, 3); pset(px, ax+t*3, 64, 0); }
    }
  } else {
    // Arms raised
    for (let i = 0; i < 14; i++) {
      pset(px, cx - 18 - i, 40 - i, 3); pset(px, cx - 17 - i, 40 - i, 4);
      pset(px, cx + 18 + i, 40 - i, 3); pset(px, cx + 17 + i, 40 - i, 4);
    }
    fillEllipse(px, cx - 30, 28, 6, 5, 4); fillEllipse(px, cx + 30, 28, 6, 5, 4);
    for (let t = 0; t < 3; t++) {
      pset(px, cx - 32 + t*3, 24, 3); pset(px, cx + 30 - t*3, 24, 3);
      pset(px, cx - 34 + t*3, 22, 0); pset(px, cx + 32 - t*3, 22, 0);
    }
  }
  return encode(px);
}

// ============================================================================
// GOLEM — blocky rune golem, glowing chest rune
// ============================================================================
function golem(frame) {
  const px = make();
  const cx = 48;
  const runeC = frame === 1 ? 22 : 21; // day-sky when arms raised

  // Feet
  for (const [lx] of [[cx-14],[cx+3]]) {
    fillRect(px, lx, 72, 11, 8, 3); fillRect(px, lx+1, 73, 9, 7, 4);
  }
  // Legs (thick columns)
  for (const [lx] of [[cx-14],[cx+3]]) {
    fillRect(px, lx, 50, 11, 22, 3); fillRect(px, lx+1, 51, 9, 20, 4);
    fillRect(px, lx+2, 52, 4, 18, 5);
  }
  // Hip slab
  fillRect(px, cx - 16, 42, 32, 10, 3); fillRect(px, cx - 15, 43, 30, 8, 4);
  fillRect(px, cx - 14, 43, 8, 6, 5);
  hline(px, cx - 12, cx + 12, 49, 31);

  // Torso (massive block)
  fillRect(px, cx - 18, 16, 36, 28, 3);
  fillRect(px, cx - 17, 17, 34, 26, 4);
  fillRect(px, cx - 16, 17, 8, 24, 5);
  hline(px, cx - 17, cx + 17, 16, 5);
  // Chest rune glyph
  fillEllipse(px, cx, 28, 8, 8, 20);
  fillEllipse(px, cx, 28, 6, 6, runeC);
  fillEllipse(px, cx, 28, 3, 3, 7);
  vline(px, cx, 20, 36, 20); hline(px, cx - 7, cx + 7, 28, 20);
  for (const [ox, oy] of [[0,-7],[0,7],[-7,0],[7,0]])
    pset(px, cx+ox, 28+oy, runeC);

  // Shoulders
  for (const [sx] of [[cx-24],[cx+14]]) {
    fillRect(px, sx, 12, 10, 8, 3); fillRect(px, sx+1, 13, 8, 6, 4); fillRect(px, sx+2, 13, 4, 5, 5);
  }

  // Head (rectangular block — no neck!)
  fillRect(px, cx - 12, 0, 24, 14, 3);
  fillRect(px, cx - 11, 1, 22, 12, 4);
  fillRect(px, cx - 10, 1, 8, 10, 5);
  hline(px, cx - 11, cx + 11, 0, 5);
  // Rectangular eyes
  fillRect(px, cx - 8, 3, 6, 3, runeC); fillRect(px, cx - 7, 4, 4, 2, 7);
  fillRect(px, cx + 2, 3, 6, 3, runeC); fillRect(px, cx + 3, 4, 4, 2, 7);
  // Mouth slit
  hline(px, cx - 6, cx + 6, 9, 0); hline(px, cx - 5, cx + 5, 10, 3);

  if (frame === 0) {
    // Arms at sides
    for (const [ax, side] of [[cx-32,-1],[cx+18,1]]) {
      fillRect(px, ax, 16, 14, 26, 3); fillRect(px, ax+1, 17, 12, 24, 4);
      fillRect(px, ax + (side==-1?2:2), 17, 6, 22, 5);
      fillRect(px, ax - (side==-1?2:0), 40, 16, 12, 3);
      fillRect(px, ax + (side==-1?1:1), 41, 14, 10, 4);
      hline(px, ax-(side==-1?2:0), ax+(side==-1?14:14), 40, 5);
    }
  } else {
    // Arms raised, rune glows brighter (runeC = day-sky)
    for (const [ax] of [[cx-32],[cx+18]]) {
      fillRect(px, ax, 0, 14, 18, 3); fillRect(px, ax+1, 1, 12, 16, 4);
      fillRect(px, ax+2, 1, 6, 14, 5);
      fillRect(px, ax, 0, 16, 10, 3); fillRect(px, ax+1, 1, 14, 8, 4);
    }
    // Extra glow particles
    for (const [ox, oy] of [[-14,-2],[14,-2],[-10,-4],[10,-4],[-6,-6],[6,-6]])
      pset(px, cx+ox, 28+oy, runeC);
  }

  hline(px, 16, 80, 78, 2); hline(px, 20, 76, 79, 0);
  return encode(px);
}

// ============================================================================
// MOTH — basilisk moth, huge wings with eye-spots
// ============================================================================
function moth(frame) {
  const px = make();
  const cx = 48;

  // Thin body
  fillEllipse(px, cx, 38, 5, 18, 9);
  fillEllipse(px, cx, 38, 3, 14, 10);
  fillEllipse(px, cx - 1, 36, 2, 10, 11);
  // Head
  fillEllipse(px, cx, 18, 6, 5, 9);
  fillEllipse(px, cx - 1, 17, 4, 4, 10);
  pset(px, cx - 4, 16, 29); pset(px, cx - 3, 15, 30);
  pset(px, cx + 4, 16, 29); pset(px, cx + 5, 15, 30);
  // Antennae (feathery)
  for (let i = 0; i < 10; i++) {
    pset(px, cx - 4 - i, 12 - i, 9); pset(px, cx - 3 - i, 11 - i, 10);
    pset(px, cx + 4 + i, 12 - i, 9); pset(px, cx + 5 + i, 11 - i, 10);
    if (i % 2 === 0 && i < 8) {
      pset(px, cx - 4 - i - 1, 12 - i + 1, 11); // lateral branch
      pset(px, cx + 4 + i + 1, 12 - i + 1, 11);
    }
  }
  // Antennae knobs
  fillEllipse(px, cx - 13, 3, 2, 2, 11); fillEllipse(px, cx + 13, 3, 2, 2, 11);

  // WINGS — dominant, filling the frame
  // Upper wings (cover most of frame)
  for (let x = 0; x < cx - 5; x++) {
    const relX = cx - 5 - x;
    const topY = Math.max(0, Math.floor(8 + relX * 0.25));
    const botY = Math.floor(44 + relX * 0.08);
    if (topY < botY) {
      vline(px, x, topY, botY, 9);
      pset(px, x, topY, 11); pset(px, x, botY, 8);
      if (((x) % 12) < 2) pset(px, x, topY + 2, 10); // leading edge detail
    }
  }
  for (let x = cx + 5; x < W; x++) {
    const relX = x - (cx + 5);
    const topY = Math.max(0, Math.floor(8 + relX * 0.25));
    const botY = Math.floor(44 + relX * 0.08);
    if (topY < botY) {
      vline(px, x, topY, botY, 9);
      pset(px, x, topY, 11); pset(px, x, botY, 8);
      if ((x % 12) < 2) pset(px, x, topY + 2, 10);
    }
  }
  // Wing inner highlight band
  for (let x = 10; x < cx - 10; x++) {
    pset(px, x, Math.floor(10 + (cx-10-x)*0.25) + 1, 10);
    pset(px, x, Math.floor(10 + (cx-10-x)*0.25) + 2, 10);
  }
  for (let x = cx + 10; x < W - 10; x++) {
    pset(px, x, Math.floor(10 + (x-cx-10)*0.25) + 1, 10);
    pset(px, x, Math.floor(10 + (x-cx-10)*0.25) + 2, 10);
  }

  // Lower wings
  for (const side of [-1, 1]) {
    for (let i = 0; i < cx - 8; i++) {
      const wx = cx + side * (8 + i);
      const topY = Math.floor(48 + i * 0.18);
      const botY = Math.floor(70 - i * 0.08);
      if (wx >= 0 && wx < W && topY < botY) {
        vline(px, wx, topY, botY, 9);
        pset(px, wx, topY, 10);
      }
    }
  }

  // EYE-SPOTS — the defining visual (concentric rings)
  const eyeFrameInner = frame === 1 ? 27 : 26; // flame vs ember
  for (const [ex, ey] of [[22, 26],[W-22, 26]]) {
    fillEllipse(px, ex, ey, 12, 10, 0);
    fillEllipse(px, ex, ey, 10, 8, 3);
    fillEllipse(px, ex, ey, 8, 6, eyeFrameInner);
    fillEllipse(px, ex, ey, 6, 4, 29);
    fillEllipse(px, ex, ey, 4, 3, 30);
    fillEllipse(px, ex, ey, 2, 2, 7);
    pset(px, ex, ey, 0);
  }

  // Legs (6 thin legs from body)
  for (let l = 0; l < 3; l++) {
    for (let i = 0; i < 8; i++) {
      pset(px, cx - 5 - i, 34 + l*6 + Math.floor(i*0.5), 8);
      pset(px, cx + 5 + i, 34 + l*6 + Math.floor(i*0.5), 8);
    }
  }
  return encode(px);
}

// ============================================================================
// Build and write
// ============================================================================
const families = { sorcerer, ghost, bird, hag, knight, choir, gargoyle, golem, moth };

const sprites = {};
for (const [name, fn] of Object.entries(families)) {
  sprites[`mon_${name}_a`] = fn(0);
  sprites[`mon_${name}_b`] = fn(1);
}

const anims = {};
for (const name of Object.keys(families)) {
  anims[`mon_${name}`] = { frames: [
    { sprite: `mon_${name}_a`, ms: 400 },
    { sprite: `mon_${name}_b`, ms: 400 },
  ]};
}

writeFileSync(
  join(ROOT, 'data', 'art', 'monsters2.json'),
  JSON.stringify({ comment: 'Monster set B, 9 families × 2 frames, 96×80. Generated by tools/gen_monsters_b.js', sprites, anims }, null, 2)
);
console.log('wrote data/art/monsters2.json');
console.log('sprites:', Object.keys(sprites).join(', '));

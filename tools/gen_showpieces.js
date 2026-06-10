// Generates 4 boss showpieces × 3 frames at 96×80 into data/art/monsters3.json
// Run: node tools/gen_showpieces.js
// Bosses: candleking, choir_eldest, mock_king, maldrec

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const W = 96, H = 80;

// ---- canvas helpers ---------------------------------------------------------
function make() { return Array.from({ length: H }, () => new Array(W).fill(-1)); }

function pset(px, x, y, c) {
  if (x >= 0 && x < W && y >= 0 && y < H) px[y][x] = c;
}
function hline(px, x0, x1, y, c) { for (let x = x0; x <= x1; x++) pset(px, x, y, c); }
function vline(px, x, y0, y1, c) { for (let y = y0; y <= y1; y++) pset(px, x, y, c); }
function fillRect(px, x, y, w, h, c) {
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) pset(px, x + dx, y + dy, c);
}

// ellipse fill (axis-aligned)
function fillEllipse(px, cx, cy, rx, ry, c) {
  for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
    if (dx * dx * ry * ry + dy * dy * rx * rx <= rx * rx * ry * ry) pset(px, cx + dx, cy + dy, c);
  }
}

// encode to {w, h, legend, rows} with transparent = -1 → '.'
function encode(px) {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*+~';
  const used = [...new Set(px.flat())].sort((a, b) => a - b);
  const legend = {};
  const idx2ch = {};
  let ci = 0;
  for (const v of used) {
    if (v === -1) { legend['.'] = -1; idx2ch[-1] = '.'; }
    else { const ch = CHARS[ci++]; legend[ch] = v; idx2ch[v] = ch; }
  }
  const rows = px.map(row => row.map(v => idx2ch[v]).join(''));
  return { w: W, h: H, legend, rows };
}

// ---- Shared sub-components ---------------------------------------------------

// Draw a single pillar candle at (cx, top y, height, flameOn)
function drawCandle(px, cx, topY, candleH, flameOn = true) {
  const cw = 5; // candle width
  fillRect(px, cx - 2, topY, cw, candleH, 6);           // bone wax body
  fillRect(px, cx - 1, topY, cw - 2, candleH, 7);       // chalk hi face
  fillRect(px, cx + 2, topY, 1, candleH, 5);            // stone shadow right
  hline(px, cx - 2, cx + 2, topY + candleH - 1, 5);     // bottom shadow
  // Wick
  pset(px, cx, topY - 1, 0);
  if (flameOn) {
    // Flame: 3 layers
    pset(px, cx, topY - 2, 26);    // ember base
    pset(px, cx - 1, topY - 3, 27); pset(px, cx, topY - 3, 30); pset(px, cx + 1, topY - 3, 27);
    pset(px, cx, topY - 4, 30);    // tip
    pset(px, cx - 1, topY - 2, 26); pset(px, cx + 1, topY - 2, 26);
  }
}

// Draw a wax drip at (x, y) going down h pixels
function waxDrip(px, x, y, h, c = 6) {
  for (let dy = 0; dy < h; dy++) pset(px, x, y + dy, c);
  pset(px, x, y + h, 5); // tip shadow
}

// Draw a humanoid face (10×8) centred at (cx, cy)
// skin=palette idx for face, eye=eye colour, hair=hair colour
function drawFace(px, cx, cy, skin, eye, hair, mouth = 2) {
  // Hair / top of head
  hline(px, cx - 4, cx + 4, cy - 4, hair);
  hline(px, cx - 5, cx + 5, cy - 3, hair);
  // Forehead
  hline(px, cx - 5, cx + 5, cy - 2, skin);
  hline(px, cx - 5, cx + 5, cy - 1, skin);
  // Eyes row
  hline(px, cx - 5, cx + 5, cy, skin);
  pset(px, cx - 3, cy, eye); pset(px, cx - 2, cy, eye);
  pset(px, cx + 2, cy, eye); pset(px, cx + 3, cy, eye);
  // Nose / cheeks
  hline(px, cx - 5, cx + 5, cy + 1, skin);
  pset(px, cx, cy + 1, skin - 1 >= 0 ? skin - 1 : skin); // nose shadow
  // Mouth
  hline(px, cx - 5, cx + 5, cy + 2, skin);
  pset(px, cx - 2, cy + 2, mouth); pset(px, cx - 1, cy + 2, mouth);
  pset(px, cx + 1, cy + 2, mouth); pset(px, cx + 2, cy + 2, mouth);
  // Chin
  hline(px, cx - 4, cx + 4, cy + 3, skin);
}

// ============================================================================
// BOSS 1: CANDLEKING — tallow wax creature enthroned in candles
// ============================================================================

function candleking(frameIdx) {
  const px = make();

  // --- Background candle forest (8 candles, varying heights) ---
  const candlePositions = [
    [6,  10, 55],  // far left, tall
    [14, 18, 50],
    [24, 12, 52],
    [34, 22, 48],  // inner left
    [62, 22, 48],  // inner right
    [72, 12, 52],
    [82, 18, 50],
    [90, 10, 55],  // far right, tall
  ];
  for (const [cx, topY, h] of candlePositions) {
    const animated = frameIdx === 1 && (cx === 34 || cx === 62);
    drawCandle(px, cx, topY, h, !animated);
    if (animated) {
      // Frame b: side candles flicker (flame displaced)
      pset(px, cx - 1, topY - 4, 30); pset(px, cx, topY - 3, 27);
    }
  }

  // --- King body (wax figure) ---
  const kx = 48; // body center x

  // Throne / wax pool at base
  fillRect(px, 22, 68, 52, 8, 5);   // stone throne seat
  fillRect(px, 23, 69, 50, 6, 6);   // bone wax pool
  hline(px, 24, 70, 69, 7);         // pool highlight

  // Torso — fat wax column
  fillRect(px, 34, 44, 28, 24, 9);   // umber base (darker wax)
  fillRect(px, 35, 44, 26, 23, 10);  // leather mid wax
  fillRect(px, 36, 44, 24, 22, 11);  // amberwood bright face
  fillRect(px, 37, 45, 22, 20, 12);  // honey highlight centre
  // Body shadow sides
  vline(px, 34, 44, 66, 8);  vline(px, 61, 44, 66, 8); // peat outer shadow
  // Wax drips on torso
  waxDrip(px, 38, 44, 6); waxDrip(px, 44, 44, 4); waxDrip(px, 52, 44, 7); waxDrip(px, 59, 44, 5);
  // Body ribs / layered wax rings (horizontal shading lines)
  for (let ry = 48; ry < 66; ry += 5) hline(px, 35, 60, ry, 9);

  // Neck
  fillRect(px, 42, 38, 12, 7, 10);
  fillRect(px, 43, 38, 10, 6, 11);

  // HEAD — large round wax skull
  fillEllipse(px, kx, 26, 13, 12, 9);  // umber outer
  fillEllipse(px, kx, 26, 12, 11, 10); // leather mid
  fillEllipse(px, kx, 26, 10, 9, 11);  // amberwood face
  fillEllipse(px, kx, 25, 8, 7, 12);   // honey bright centre

  // Eyes — glowing ember/blood
  const eyeGlow = frameIdx === 2 ? 27 : (frameIdx === 1 ? 26 : 25); // brighter on hit
  fillRect(px, kx - 7, 22, 5, 4, eyeGlow);  // left eye socket
  fillRect(px, kx + 2, 22, 5, 4, eyeGlow);
  pset(px, kx - 5, 23, 30); pset(px, kx + 4, 23, 30); // eye glow centre

  // Mouth — gaping, dark with ember glow
  fillRect(px, kx - 6, 30, 12, 4, 8);    // peat dark mouth
  fillRect(px, kx - 5, 31, 10, 2, 24);   // blood-dark throat
  hline(px, kx - 5, kx + 4, 30, 11);    // upper lip
  hline(px, kx - 5, kx + 4, 33, 9);     // lower lip shadow
  // Teeth (upper)
  for (let tx = kx - 4; tx <= kx + 3; tx += 3) pset(px, tx, 30, 7);

  // CROWN — row of lit blue candles atop head
  const crownBase = 14;
  hline(px, 32, 64, crownBase, 9);      // crown band umber
  hline(px, 32, 64, crownBase + 1, 10); // crown band lit
  for (const [cx2, height] of [[34, 8],[38, 11],[42, 9],[46, 12],[50, 12],[54, 9],[58, 11],[62, 8]]) {
    fillRect(px, cx2 - 1, crownBase - height, 3, height, 6); // bone candle
    pset(px, cx2, crownBase - height - 1, 0); // wick
    // Blue flame (mage-candles are blue)
    pset(px, cx2 - 1, crownBase - height - 2, 20);
    pset(px, cx2, crownBase - height - 3, 21);
    pset(px, cx2 + 1, crownBase - height - 2, 20);
    pset(px, cx2, crownBase - height - 2, 22);
  }

  // ARMS
  // Left arm (holding candle sceptre in frame b)
  if (frameIdx === 1) {
    // Frame b: left arm raised, holding orb of fire
    fillRect(px, 20, 36, 14, 8, 10); // upper arm
    fillRect(px, 14, 28, 8, 10, 10); // forearm raised
    fillRect(px, 13, 26, 10, 4, 11); // hand
    // Fireball in hand
    fillEllipse(px, 18, 22, 5, 5, 27);
    fillEllipse(px, 18, 22, 3, 3, 30);
    pset(px, 18, 20, 7); // highlight
  } else {
    // Frames a and c: left arm resting
    fillRect(px, 20, 44, 14, 8, 10); // upper arm
    fillRect(px, 14, 48, 10, 8, 10); // forearm resting
    fillRect(px, 13, 55, 12, 5, 11); // hand resting
    if (frameIdx === 2) {
      // Frame c: arm recoils slightly (hit)
      fillRect(px, 20, 42, 14, 8, 10);
      fillRect(px, 15, 46, 10, 8, 10);
    }
  }

  // Right arm (always at side, slight variation)
  const armYOff = frameIdx === 2 ? -2 : 0;
  fillRect(px, 62, 44 + armYOff, 14, 8, 10); // upper arm
  fillRect(px, 74, 50 + armYOff, 10, 8, 10); // forearm
  fillRect(px, 73, 57 + armYOff, 12, 5, 11); // hand

  // Wax drips down arms
  waxDrip(px, 22, 52, 6); waxDrip(px, 78, 52, 5);

  return encode(px);
}

// ============================================================================
// BOSS 2: CHOIR'S ELDEST — vast dark-robed entity, one huge eye, trapped faces
// ============================================================================

function choirEldest(frameIdx) {
  const px = make();

  // Massive triangular robe silhouette
  // Bottom: x=0..95, y=75. Apex: x=48, y=0
  // Fill as a large dark triangle
  for (let y = 0; y < H; y++) {
    const spread = Math.round((y / 75) * 48);
    const x0 = Math.max(0, 48 - spread - 4);
    const x1 = Math.min(W - 1, 48 + spread + 4);
    hline(px, x0, x1, y, 2);       // shadow base
    hline(px, x0 + 1, x1 - 1, y, 3); // slate-dark mid
  }
  // Brighten near-centre column (UL light)
  for (let y = 10; y < 70; y++) {
    const spread = Math.round((y / 75) * 48);
    const x0 = Math.max(0, 48 - spread - 4);
    const cx2 = x0 + 4;
    if (cx2 < W) vline(px, cx2, y, y, 4); // slate hi on left face
  }

  // Robe hem — fringe of tiny trapped faces along bottom
  for (let fx = 4; fx < W; fx += 10) {
    const fy = 70 + ((fx / 10 | 0) % 2) * 2; // slight vertical stagger
    pset(px, fx, fy, 5);     // bone eyes
    pset(px, fx + 2, fy, 5);
    pset(px, fx + 1, fy + 1, 2); // open mouth
    pset(px, fx, fy + 2, 3); pset(px, fx + 2, fy + 2, 3); // chin
  }

  // Embedded trapped faces in robe body (two rows)
  const facePositions = [
    [18, 36], [32, 40], [48, 44], [64, 40], [78, 36],
    [12, 52], [28, 56], [44, 58], [60, 56], [76, 52],
  ];
  for (const [fx, fy] of facePositions) {
    // Mini face: 6×4
    hline(px, fx, fx + 5, fy, 5);     // bone forehead
    pset(px, fx + 1, fy + 1, 14);     // moss-deep eye L (dead)
    pset(px, fx + 3, fy + 1, 14);     // moss-deep eye R
    hline(px, fx + 1, fx + 4, fy + 2, 2); // mouth
    hline(px, fx, fx + 5, fy + 3, 3); // chin
  }

  // Hood opening — dark void
  fillEllipse(px, 48, 18, 18, 14, 1); // night void inside hood
  fillEllipse(px, 48, 18, 16, 12, 0); // black at centre

  // THE EYE — huge single eye inside hood void
  const eyeFrame = [22, 23, 21][frameIdx]; // mist-blue a, sky-blue b, deep-blue c
  fillEllipse(px, 48, 18, 9, 7, eyeFrame);  // iris glow
  fillEllipse(px, 48, 18, 5, 4, 22);        // bright iris
  fillEllipse(px, 48, 18, 3, 2, 0);         // pupil
  pset(px, 46, 16, 7);                       // iris highlight specular
  // Eye glow halo
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    const gx = Math.round(48 + 12 * Math.cos(ang));
    const gy = Math.round(18 + 9 * Math.sin(ang));
    pset(px, gx, gy, frameIdx === 1 ? 21 : 20); // brighter halo on frame b
  }

  // Hanging amulet / pendant (green gem at chest)
  vline(px, 48, 28, 34, 3);          // chain
  fillRect(px, 46, 34, 4, 4, 15);   // moss gem
  pset(px, 47, 35, 17);              // gem highlight

  // HANDS emerging from robe sides
  // Left hand (always showing, varies by frame)
  const leftHandY = frameIdx === 1 ? 38 : 44;
  const leftHandX = frameIdx === 1 ? 8 : 12;
  // Palm
  fillRect(px, leftHandX, leftHandY, 10, 8, 5); // bone hand
  fillRect(px, leftHandX + 1, leftHandY + 1, 8, 6, 6); // lighter
  // Clawed fingers
  for (let fi = 0; fi < 5; fi++) {
    pset(px, leftHandX + fi * 2, leftHandY - 2, 6);   // finger
    pset(px, leftHandX + fi * 2, leftHandY - 3, 5);   // claw
    pset(px, leftHandX + fi * 2, leftHandY - 4, 7);   // claw tip
  }

  // On frame c (all eyes open): additional glow overlay
  if (frameIdx === 2) {
    for (const [fx, fy] of facePositions) {
      pset(px, fx + 1, fy + 1, 16); // fen-green eye glow
      pset(px, fx + 3, fy + 1, 16);
    }
    // Extra glow around the eye
    fillEllipse(px, 48, 18, 13, 10, 20); // outer eye ring brightens
    fillEllipse(px, 48, 18, 11, 8, 22);
    fillEllipse(px, 48, 18, 9, 7, 21);
    fillEllipse(px, 48, 18, 5, 4, 22);
    fillEllipse(px, 48, 18, 3, 2, 0);
    pset(px, 46, 16, 7);
  }

  return encode(px);
}

// ============================================================================
// BOSS 3: MOCK KING — animate blue-tile golem with gold crown, branch arms
// ============================================================================

function mockKing(frameIdx) {
  const px = make();

  // Body color scheme: deep-blue(20) base, sky-blue(21) hi, gold trim(29)
  const BASE = 20, MID = 21, HI = 22, GOLD = 29, GOLDD = 28;

  // CROWN — 3 prongs, wide base
  const crownBase = 12;
  fillRect(px, 30, crownBase, 36, 4, GOLD);   // crown band
  hline(px, 30, 65, crownBase, 30);           // crown highlight top
  // Three prongs
  for (const [cx2, h] of [[36, 10], [46, 14], [56, 10]]) {
    fillRect(px, cx2, crownBase - h, 6, h, GOLD);
    hline(px, cx2, cx2 + 5, crownBase - h, 30); // prong tip hi
    vline(px, cx2, crownBase - h, crownBase - 1, 28); // prong shadow left
  }

  // HEAD — rectangular stone-tile block
  fillRect(px, 28, crownBase + 4, 40, 22, BASE);
  fillRect(px, 29, crownBase + 5, 38, 20, MID);
  fillRect(px, 30, crownBase + 6, 36, 18, HI);
  // Tile grid on head (gold grout lines)
  for (let gy = crownBase + 10; gy < crownBase + 24; gy += 5) hline(px, 28, 67, gy, GOLDD);
  for (let gx = 36; gx < 68; gx += 8) vline(px, gx, crownBase + 4, crownBase + 25, GOLDD);
  // Eyes — wide rectangular
  fillRect(px, 34, crownBase + 10, 8, 5, 0);
  fillRect(px, 54, crownBase + 10, 8, 5, 0);
  fillRect(px, 35, crownBase + 11, 6, 3, HI);   // eye glow
  fillRect(px, 55, crownBase + 11, 6, 3, HI);
  pset(px, 38, crownBase + 12, 7); pset(px, 58, crownBase + 12, 7); // eye spec
  // Mouth — straight line, grim
  hline(px, 36, 60, crownBase + 21, 0);
  hline(px, 36, 60, crownBase + 22, BASE);

  // TORSO — large tile block body
  fillRect(px, 24, 38, 48, 26, BASE);
  fillRect(px, 25, 39, 46, 24, MID);
  fillRect(px, 26, 40, 44, 22, HI);
  // Gold tile grid on torso
  for (let gy = 42; gy < 64; gy += 6) hline(px, 24, 71, gy, GOLDD);
  for (let gx = 32; gx < 72; gx += 8) vline(px, gx, 38, 63, GOLDD);
  // Belly emblem (gold square)
  fillRect(px, 40, 46, 16, 10, GOLD);
  fillRect(px, 41, 47, 14, 8, 30);  // candle bright inner
  hline(px, 41, 54, 47, 7);         // emblem highlight

  // LEGS — two block legs
  fillRect(px, 30, 64, 14, 14, BASE);
  fillRect(px, 52, 64, 14, 14, BASE);
  fillRect(px, 31, 65, 12, 12, MID);
  fillRect(px, 53, 65, 12, 12, MID);
  hline(px, 30, 43, 64, HI); hline(px, 52, 65, 64, HI); // leg top edge
  // Feet
  fillRect(px, 28, 75, 18, 5, GOLDD);
  fillRect(px, 50, 75, 18, 5, GOLDD);
  hline(px, 28, 45, 75, GOLD); hline(px, 50, 67, 75, GOLD); // foot highlight

  // BRANCH ARMS — mist-blue stick arms
  const ARM = 23; // mist-blue
  if (frameIdx === 0) {
    // Frame a: arms at sides
    // Left arm
    fillRect(px, 8, 40, 16, 4, ARM);
    fillRect(px, 4, 44, 8, 4, ARM);
    // Branch fingers
    for (const [bx, by] of [[4, 42],[6, 40],[3, 46],[8, 46]]) { pset(px, bx, by, ARM); pset(px, bx-1, by-2, ARM); }
    // Right arm
    fillRect(px, 72, 40, 16, 4, ARM);
    fillRect(px, 84, 44, 8, 4, ARM);
    for (const [bx, by] of [[88, 42],[86, 40],[89, 46],[84, 46]]) { pset(px, bx, by, ARM); pset(px, bx+1, by-2, ARM); }
  } else if (frameIdx === 1) {
    // Frame b: arms spread wide
    fillRect(px, 4, 36, 20, 4, ARM);
    fillRect(px, 0, 30, 6, 8, ARM);
    for (const [bx, by] of [[0, 28],[2, 26],[4, 28],[1, 32]]) { pset(px, bx, by, ARM); pset(px, bx-1, by-2, ARM); }
    fillRect(px, 72, 36, 20, 4, ARM);
    fillRect(px, 90, 30, 6, 8, ARM);
    for (const [bx, by] of [[92, 28],[94, 26],[90, 28],[93, 32]]) { pset(px, bx, by, ARM); pset(px, bx+1, by-2, ARM); }
  } else {
    // Frame c: arms raised high (crown pieces hovering)
    fillRect(px, 8, 34, 16, 4, ARM);
    fillRect(px, 4, 26, 6, 10, ARM);
    fillRect(px, 72, 34, 16, 4, ARM);
    fillRect(px, 86, 26, 6, 10, ARM);
    // Crown pieces lifted (small copies of prongs floating higher)
    for (const cx2 of [36, 46, 56]) {
      fillRect(px, cx2, crownBase - 18, 6, 6, GOLD); // floating prong
      hline(px, cx2, cx2 + 5, crownBase - 18, 30);
    }
  }

  return encode(px);
}

// ============================================================================
// BOSS 4: MALDREC — dark wizard, grey robes, staff, violet eyes, evil grin
// ============================================================================

function maldrec(frameIdx) {
  const px = make();

  // Colors
  const ROBE = 2, ROBE_MID = 3, ROBE_HI = 4; // shadow/slate-dark/slate robes
  const SKIN = 12, SKIN_HI = 13; // honey/parchment skin
  const HAIR = 5;  // stone grey hair
  const EYE = 31;  // violet eyes (evil)
  const STAFF_BODY = 4, STAFF_HI = 5;
  const ORB = [21, 22, 23][frameIdx]; // orb brightness by frame

  // ROBE body — wide dark mass
  // Base triangle shape
  for (let y = 25; y < H; y++) {
    const w = Math.min(W - 1, 14 + ((y - 25) * 58 / 55 | 0));
    const x0 = (W - w) / 2 | 0;
    hline(px, x0, x0 + w - 1, y, ROBE);
    hline(px, x0 + 2, x0 + w - 3, y, ROBE_MID);
  }
  // Robe centre highlight (light hits left of centre)
  for (let y = 30; y < 72; y++) {
    const x0 = (W - (14 + ((y - 25) * 58 / 55 | 0))) / 2 | 0;
    vline(px, x0 + 4, y, y, ROBE_HI);
  }

  // Robe hem detail — scalloped shadow along bottom
  for (let x = 10; x < 86; x += 8) hline(px, x, x + 6, 74, ROBE);

  // Left sleeve / hand
  if (frameIdx === 0) {
    // Frame a: left hand lowered, holding staff
    // Sleeve
    fillRect(px, 12, 40, 16, 20, ROBE_MID);
    fillRect(px, 13, 40, 14, 19, ROBE_HI);
    // Hand (holding staff)
    fillRect(px, 12, 58, 10, 8, SKIN);
    hline(px, 12, 21, 58, SKIN_HI);
    // Staff in left hand, running diagonally
    for (let i = 0; i < 55; i++) {
      pset(px, 16 + (i * 0.3 | 0), 10 + i, STAFF_BODY);
      pset(px, 15 + (i * 0.3 | 0), 10 + i, STAFF_HI);
    }
  } else if (frameIdx === 1) {
    // Frame b: left arm raised, casting
    fillRect(px, 8, 30, 16, 16, ROBE_MID);
    fillRect(px, 9, 30, 14, 15, ROBE_HI);
    fillRect(px, 8, 28, 12, 6, SKIN);
    hline(px, 8, 19, 28, SKIN_HI);
    // Staff angled up
    for (let i = 0; i < 60; i++) {
      pset(px, 12 + (i * 0.5 | 0), 75 - i, STAFF_BODY);
      pset(px, 11 + (i * 0.5 | 0), 75 - i, STAFF_HI);
    }
  } else {
    // Frame c: both arms slightly raised
    fillRect(px, 10, 34, 16, 20, ROBE_MID);
    fillRect(px, 11, 34, 14, 19, ROBE_HI);
    fillRect(px, 10, 34, 10, 6, SKIN);
    // Staff upright
    vline(px, 20, 8, 70, STAFF_BODY);
    vline(px, 19, 8, 70, STAFF_HI);
  }

  // Right hand (gesturing, always)
  const rhx = 68, rhy = [46, 34, 40][frameIdx];
  fillRect(px, rhx, rhy, 12, 8, SKIN);
  hline(px, rhx, rhx + 11, rhy, SKIN_HI);
  // Fingers
  for (let fi = 0; fi < 4; fi++) {
    pset(px, rhx + fi * 3, rhy - 2, SKIN);
    pset(px, rhx + fi * 3, rhy - 3, SKIN_HI);
  }

  // ORB on staff top
  const orbX = frameIdx === 0 ? 21 : (frameIdx === 1 ? 42 : 20);
  const orbY = frameIdx === 0 ? 8 : (frameIdx === 1 ? 14 : 6);
  fillEllipse(px, orbX, orbY, 7, 7, ROBE_MID);   // orb shadow
  fillEllipse(px, orbX, orbY, 6, 6, ORB);        // orb glow
  fillEllipse(px, orbX, orbY, 3, 3, 22);         // bright core
  pset(px, orbX - 2, orbY - 2, 7);               // specular hi
  // Orb rays
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const rx2 = Math.round(orbX + 9 * Math.cos(ang));
    const ry2 = Math.round(orbY + 9 * Math.sin(ang));
    pset(px, rx2, ry2, frameIdx === 1 ? 22 : ORB);
  }

  // HOOD and HEAD
  // Hood — dark triangle pointing down
  fillRect(px, 32, 4, 32, 26, ROBE);
  fillRect(px, 33, 5, 30, 24, ROBE_MID);
  // Hood fold lines
  hline(px, 35, 60, 8, ROBE);
  hline(px, 37, 58, 12, ROBE);
  // Hood point at top
  for (let i = 0; i < 8; i++) {
    hline(px, 48 - i, 48 + i, 4 + i, ROBE_MID);
  }
  hline(px, 32, 63, 28, ROBE); // collar shadow

  // FACE inside hood
  const faceX = 48, faceY = 20;
  // Face shape
  fillRect(px, faceX - 8, faceY - 6, 16, 14, SKIN);
  fillRect(px, faceX - 7, faceY - 5, 14, 12, SKIN_HI);
  // Hair at temples
  hline(px, faceX - 8, faceX - 5, faceY - 5, HAIR);
  hline(px, faceX + 4, faceX + 7, faceY - 5, HAIR);
  // Goatee
  fillRect(px, faceX - 3, faceY + 4, 6, 4, HAIR);
  // Eyes — violet, glowing
  fillRect(px, faceX - 6, faceY - 2, 4, 3, EYE);
  fillRect(px, faceX + 2, faceY - 2, 4, 3, EYE);
  pset(px, faceX - 4, faceY - 1, 23); // mist-blue glow L
  pset(px, faceX + 4, faceY - 1, 23); // mist-blue glow R
  // Nose
  fillRect(px, faceX - 1, faceY + 1, 2, 2, SKIN);
  pset(px, faceX - 2, faceY + 2, SKIN - 1 >= 0 ? SKIN - 1 : 8); // nostril L
  pset(px, faceX + 1, faceY + 2, SKIN - 1 >= 0 ? SKIN - 1 : 8);
  // Evil grin — upturned corners
  hline(px, faceX - 4, faceX + 3, faceY + 5, 8); // mouth dark
  pset(px, faceX - 5, faceY + 4, SKIN); pset(px, faceX + 4, faceY + 4, SKIN);
  pset(px, faceX - 5, faceY + 5, 8); pset(px, faceX + 4, faceY + 5, 8); // upturned
  // Teeth
  for (const tx of [faceX - 3, faceX - 1, faceX + 1, faceX + 3]) pset(px, tx, faceY + 5, 7);

  // On frame b (casting): violet energy tendrils from hand
  if (frameIdx === 1) {
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      for (let r = 1; r < 6; r++) {
        const tx2 = Math.round(rhx + 6 + r * 5 * Math.cos(ang));
        const ty2 = Math.round(rhy + 4 + r * 5 * Math.sin(ang));
        pset(px, tx2, ty2, i % 2 === 0 ? 31 : 20);
      }
    }
  }

  return encode(px);
}

// ============================================================================
// Build and write
// ============================================================================

const sprites = {};

for (let f = 0; f < 3; f++) {
  sprites[`mon_candleking_${String.fromCharCode(97 + f)}`]   = candleking(f);
  sprites[`mon_choir_eldest_${String.fromCharCode(97 + f)}`] = choirEldest(f);
  sprites[`mon_mock_king_${String.fromCharCode(97 + f)}`]    = mockKing(f);
  sprites[`mon_maldrec_${String.fromCharCode(97 + f)}`]      = maldrec(f);
}

writeFileSync(
  join(ROOT, 'data', 'art', 'monsters3.json'),
  JSON.stringify({ comment: 'Boss showpieces 96×80 × 3 frames. Generated by tools/gen_showpieces.js', sprites }, null, 2)
);
console.log('wrote data/art/monsters3.json');
console.log('sprites:', Object.keys(sprites).join(', '));

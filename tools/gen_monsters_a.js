// Generates monster set A — 11 families × 2 frames at 96×80
// Run: node tools/gen_monsters_a.js

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
function fillEllipse(px, cx, cy, rx, ry, c) {
  for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++)
    if (dx * dx * ry * ry + dy * dy * rx * rx <= rx * rx * ry * ry) pset(px, cx + dx, cy + dy, c);
}
function outlineEllipse(px, cx, cy, rx, ry, c) {
  for (let a = 0; a < 360; a++) {
    const rad = a * Math.PI / 180;
    pset(px, Math.round(cx + rx * Math.cos(rad)), Math.round(cy + ry * Math.sin(rad)), c);
  }
}
function encode(px) {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*+~<>?';
  const used = [...new Set(px.flat())].sort((a, b) => a - b);
  const legend = {}; const idx2ch = {}; let ci = 0;
  for (const v of used) {
    if (v === -1) { legend['.'] = -1; idx2ch[-1] = '.'; }
    else { const ch = CHARS[ci++]; legend[ch] = v; idx2ch[v] = ch; }
  }
  const rows = px.map(row => row.map(v => idx2ch[v]).join(''));
  return { w: W, h: H, legend, rows };
}

// Palette shorthand
// 0=black 1=night 2=shadow 3=slate-dark 4=slate 5=stone 6=bone 7=chalk
// 8=peat  9=umber 10=leather 11=amberwood 12=honey 13=parchment
// 14=moss-deep 15=moss 16=fen-green 17=leaf 18=pale-leaf
// 19=abyss-blue 20=deep-blue 21=sky-blue 22=day-sky 23=mist-blue
// 24=blood-dark 25=blood 26=ember 27=flame 28=gold-dark 29=gold 30=candle 31=violet

// ---- Common sub-components --------------------------------------------------

// Simple leg: from (x0,y0) to (x1,y1), 2px wide, colour c
function leg(px, x0, y0, x1, y1, c, hi) {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + i * dx / steps);
    const y = Math.round(y0 + i * dy / steps);
    pset(px, x, y, c);
    pset(px, x + 1, y, hi !== undefined ? hi : c); // 2px wide
  }
}

// Eye: filled ellipse, glow dot, pupil
function eye(px, cx, cy, col, glow = 7) {
  fillEllipse(px, cx, cy, 3, 2, col);
  pset(px, cx - 1, cy - 1, glow);
}

// Claw/foot at end of leg
function claw(px, x, y, c) {
  pset(px, x, y, c); pset(px, x - 1, y + 1, c); pset(px, x + 1, y + 1, c);
}

// ============================================================================
// 1. RAT — brown quadruped, large ears, buck teeth, long tail
// ============================================================================
function rat(frame) {
  const px = make();
  // Palette: umber(9) body, leather(10) belly, amberwood(11) hi, peat(8) shadow, blood(25) eye
  const body = 10, bodyHi = 11, bodySh = 9, bodyDk = 8;

  // Tail (long, curling) — drawn first so body overlaps
  if (frame === 0) {
    // a: tail curves behind
    leg(px, 54, 60, 70, 70, bodySh, body);
    leg(px, 70, 70, 80, 65, bodySh, body);
    leg(px, 80, 65, 86, 58, bodySh, body);
    leg(px, 86, 58, 88, 50, 8, bodySh);
  } else {
    // b: tail lashes up
    leg(px, 54, 58, 68, 44, bodySh, body);
    leg(px, 68, 44, 78, 38, bodySh, body);
    leg(px, 78, 38, 84, 34, 8, bodySh);
  }

  // Body — large oval
  fillEllipse(px, 42, 56, 26, 16, bodyDk); // outer shadow
  fillEllipse(px, 42, 56, 24, 14, bodySh); // umber mid
  fillEllipse(px, 42, 56, 22, 12, body);   // leather face
  fillEllipse(px, 40, 54, 18, 9, bodyHi);  // amberwood highlight
  // Belly (lighter oval lower)
  fillEllipse(px, 42, 62, 14, 6, 12);      // honey belly

  // Head — rounder, shifted forward
  fillEllipse(px, 22, 44, 16, 13, bodyDk);
  fillEllipse(px, 22, 44, 14, 11, bodySh);
  fillEllipse(px, 22, 44, 12, 9, body);
  fillEllipse(px, 20, 42, 8, 6, bodyHi);

  // Snout — protruding
  fillRect(px, 6, 44, 12, 8, bodySh);
  fillRect(px, 7, 45, 10, 6, body);
  hline(px, 7, 16, 45, bodyHi); // snout top hi
  // Nose
  fillRect(px, 6, 48, 6, 3, 24); // blood-dark nose
  pset(px, 7, 48, 25); pset(px, 8, 48, 25); // nose hi

  // Buck teeth
  fillRect(px, 10, 52, 4, 5, 7); // chalk tooth L
  fillRect(px, 15, 52, 4, 5, 7); // chalk tooth R
  hline(px, 10, 13, 52, 6); hline(px, 15, 18, 52, 6); // tooth top shade

  // Eyes
  eye(px, 16, 36, 25); // left eye blood-red

  // Ears — large round
  fillEllipse(px, 24, 28, 10, 8, bodySh);
  fillEllipse(px, 24, 28, 8, 6, body);
  fillEllipse(px, 24, 28, 5, 4, 24); // blood-dark inner ear
  fillEllipse(px, 36, 26, 9, 7, bodySh);
  fillEllipse(px, 36, 26, 7, 5, body);
  fillEllipse(px, 36, 26, 4, 3, 24);

  // Forelegs
  leg(px, 24, 66, 14, 76, bodySh, body); leg(px, 30, 66, 22, 76, bodySh, body);
  claw(px, 14, 76, 8); claw(px, 22, 76, 8);
  // Hindlegs
  leg(px, 54, 68, 44, 76, bodySh, body); leg(px, 60, 68, 52, 76, bodySh, body);
  claw(px, 44, 76, 8); claw(px, 52, 76, 8);

  if (frame === 1) {
    // b: forelegs raised/lunging — shift rat body slightly forward
    fillEllipse(px, 36, 52, 26, 16, bodyDk);
    fillEllipse(px, 36, 52, 24, 14, bodySh);
    fillEllipse(px, 36, 52, 22, 12, body);
    fillEllipse(px, 34, 50, 18, 9, bodyHi);
    fillEllipse(px, 36, 58, 14, 6, 12);
    // forelegs up
    leg(px, 24, 56, 14, 44, bodySh, body);
    leg(px, 30, 56, 22, 44, bodySh, body);
    claw(px, 14, 44, 8); claw(px, 22, 44, 8);
    // open mouth
    hline(px, 10, 17, 53, 8);
  }

  return encode(px);
}

// ============================================================================
// 2. BEETLE — silver dome carapace, red eyes, mandibles, 6 legs
// ============================================================================
function beetle(frame) {
  const px = make();
  // stone(5) hi, slate(4) mid, slate-dark(3) sh, shadow(2) dk, blood(25) eye

  // Carapace dome
  fillEllipse(px, 48, 44, 36, 28, 2);   // outer dark
  fillEllipse(px, 48, 44, 34, 26, 3);   // slate-dark base
  fillEllipse(px, 48, 44, 32, 24, 4);   // slate mid
  fillEllipse(px, 46, 40, 26, 18, 5);   // stone highlight zone
  fillEllipse(px, 44, 36, 14, 10, 6);   // bone specular

  // Carapace division line (elytra seam)
  vline(px, 48, 18, 68, 3); vline(px, 49, 18, 68, 3);
  // Carapace ridge lines
  for (let rx = 0; rx < 3; rx++) {
    outlineEllipse(px, 48, 44, 26 - rx * 6, 20 - rx * 4, 3);
  }

  // Head — smaller, forward-projecting
  fillEllipse(px, 48, 18, 14, 10, 3);
  fillEllipse(px, 48, 18, 12, 8, 4);
  fillEllipse(px, 48, 18, 10, 6, 5);

  // Eyes — two large red compound eyes flanking head
  fillEllipse(px, 38, 14, 7, 5, 24);
  fillEllipse(px, 38, 14, 5, 3, 25);
  pset(px, 36, 12, 27);
  fillEllipse(px, 58, 14, 7, 5, 24);
  fillEllipse(px, 58, 14, 5, 3, 25);
  pset(px, 60, 12, 27);

  // Mandibles
  leg(px, 40, 22, 30, 32, 3, 4);
  leg(px, 30, 32, 22, 28, 3, 4);
  leg(px, 56, 22, 66, 32, 3, 4);
  leg(px, 66, 32, 74, 28, 3, 4);

  // 6 legs (3 each side), emerging from carapace underside
  const legPairs = [[28, 44], [16, 52], [26, 62]]; // left x, y
  for (const [lx, ly] of legPairs) {
    leg(px, lx + 14, ly - 2, lx, ly + 6, 3, 4);
    leg(px, lx, ly + 6, lx - 6, ly + 4, 3, 4);
    claw(px, lx - 6, ly + 4, 2);
  }
  const legPairsR = [[54, 44], [66, 52], [56, 62]];
  for (const [lx, ly] of legPairsR) {
    leg(px, lx + 4, ly - 2, lx + 18, ly + 6, 3, 4);
    leg(px, lx + 18, ly + 6, lx + 24, ly + 4, 3, 4);
    claw(px, lx + 24, ly + 4, 2);
  }

  if (frame === 1) {
    // b: elytra raised, showing darker wings beneath, charging posture (head lower)
    fillEllipse(px, 48, 38, 34, 20, 19); // abyss-blue wing hint under carapace
    fillEllipse(px, 48, 38, 30, 16, 20); // deep-blue inner wing
    // Elytra halves tilted up
    fillEllipse(px, 36, 32, 24, 16, 3);
    fillEllipse(px, 36, 32, 22, 14, 4);
    fillEllipse(px, 34, 28, 14, 8, 5);
    fillEllipse(px, 60, 32, 24, 16, 3);
    fillEllipse(px, 60, 32, 22, 14, 4);
    fillEllipse(px, 62, 28, 14, 8, 5);
    vline(px, 48, 28, 58, 3);
    // Head lower/forward
    fillEllipse(px, 48, 24, 14, 10, 3);
    fillEllipse(px, 48, 24, 12, 8, 5);
    fillEllipse(px, 38, 20, 7, 5, 24);
    fillEllipse(px, 38, 20, 5, 3, 25);
    fillEllipse(px, 58, 20, 7, 5, 24);
    fillEllipse(px, 58, 20, 5, 3, 25);
  }

  return encode(px);
}

// ============================================================================
// 3. HOUND — shadow wolf, upright threatening stance, large head, red eyes
// ============================================================================
function hound(frame) {
  const px = make();
  // night(1) outer, shadow(2) body, slate-dark(3) mid, slate(4) hi, bone(6) fang, blood(25) eye

  // TAIL — thick, curves upward behind body (drawn first)
  fillRect(px, 76, 26, 8, 30, 2);
  fillRect(px, 77, 27, 6, 28, 3);
  // Tail curl at tip
  fillRect(px, 78, 18, 10, 10, 2); fillRect(px, 79, 19, 8, 8, 3);
  fillRect(px, 80, 14, 8, 6, 2);   fillRect(px, 81, 15, 6, 4, 3);

  // BODY — large rounded rectangle, centred
  fillRect(px, 28, 32, 50, 36, 1);
  fillRect(px, 29, 33, 48, 34, 2);
  fillRect(px, 30, 34, 46, 32, 3);
  fillRect(px, 32, 35, 42, 28, 4); // broad lit face
  // Body rounding (corner cutouts)
  for (const [cx2, cy2] of [[30,34],[76,34],[30,64],[76,64]]) fillEllipse(px, cx2, cy2, 2, 2, -1);
  // Fur texture — vertical stroke marks across back
  for (let fx = 34; fx < 74; fx += 6) {
    pset(px, fx, 34, 3); pset(px, fx + 1, 33, 3); pset(px, fx + 2, 34, 2);
  }

  // NECK — wide slab connecting torso to head
  fillRect(px, 18, 30, 24, 18, 2);
  fillRect(px, 19, 31, 22, 16, 3);
  fillRect(px, 20, 32, 20, 14, 4);

  // HEAD — large, dominant, forward of body
  fillEllipse(px, 22, 24, 22, 18, 1); // outer night
  fillEllipse(px, 22, 24, 20, 16, 2); // shadow base
  fillEllipse(px, 22, 24, 18, 14, 3); // mid
  fillEllipse(px, 18, 20, 14, 10, 4); // lit front face

  // EARS — tall pointed, flanking top of head
  for (const [ex] of [[8],[22]]) {
    // Ear triangle using vline + shrink
    for (let i = 0; i < 10; i++) vline(px, ex + i, 4 + i, 18 + i, i < 2 ? 2 : 3);
    pset(px, ex + 2, 4, 4); // ear tip hi
  }

  // SNOUT — wide jaw projecting forward-left
  fillRect(px, 0, 26, 20, 14, 2); // upper jaw outer
  fillRect(px, 1, 27, 18, 12, 3);
  fillRect(px, 2, 28, 16, 8, 4);  // lit top of snout
  fillRect(px, 0, 36, 18, 10, 1); // lower jaw darker
  fillRect(px, 1, 37, 16, 8, 2);
  // Nose — dark wet
  fillRect(px, 0, 26, 8, 6, 0);
  pset(px, 1, 27, 2); pset(px, 2, 27, 3);
  // Fangs — long white
  fillRect(px, 4, 36, 4, 8, 7);  // chalk fang L
  fillRect(px, 10, 36, 4, 8, 7); // chalk fang R
  hline(px, 1, 17, 36, 0);       // mouth gap
  // Tongue (frame b — snarling)
  if (frame === 1) { fillRect(px, 6, 44, 6, 4, 25); hline(px, 7, 10, 47, 24); }

  // EYES — large glowing red, set under brow
  fillEllipse(px, 10, 18, 6, 5, 1);
  fillEllipse(px, 10, 18, 5, 4, 25);
  fillEllipse(px, 10, 18, 3, 2, 27);
  pset(px, 8, 16, 30); // specular

  // LEGS — 4 thick pillars going straight down
  const legY0 = 66;
  if (frame === 0) {
    // a: standing, legs vertical
    for (const lx of [30, 44, 58, 70]) {
      fillRect(px, lx, legY0, 8, 14, 2);
      fillRect(px, lx + 1, legY0, 6, 13, 3);
      hline(px, lx, lx + 7, legY0, 4); // knee hi
      // Paw
      fillRect(px, lx - 2, legY0 + 13, 12, 4, 2);
      hline(px, lx - 2, lx + 8, legY0 + 13, 3);
      for (const tx of [lx - 1, lx + 2, lx + 5]) pset(px, tx, legY0 + 16, 1); // toes
    }
  } else {
    // b: crouched lunge — front legs forward, rear swept back
    for (const [lx, lx2, ly] of [[28, 14, legY0],[40, 28, legY0],[58, 70, legY0],[70, 84, legY0 - 4]]) {
      leg(px, lx, legY0 - 4, lx2, ly + 10, 2, 3);
      fillRect(px, lx2 - 2, ly + 8, 10, 4, 2);
      hline(px, lx2 - 2, lx2 + 6, ly + 8, 3);
    }
  }

  return encode(px);
}

// ============================================================================
// 4. SPIDER — cave spider, 8 legs, hairy abdomen, fangs
// ============================================================================
function spider(frame) {
  const px = make();
  // umber(9) body, leather(10) hi, peat(8) sh, amberwood(11) spots, blood(25) eyes

  // Abdomen (large back segment)
  fillEllipse(px, 58, 52, 26, 22, 8);
  fillEllipse(px, 58, 52, 24, 20, 9);
  fillEllipse(px, 58, 52, 22, 18, 10);
  fillEllipse(px, 55, 48, 16, 12, 11); // highlight
  // Abdomen markings (hourglass)
  fillEllipse(px, 58, 48, 6, 4, 8);
  fillEllipse(px, 58, 56, 6, 4, 8);
  pset(px, 58, 44, 11); pset(px, 58, 60, 11); // marking dots

  // Cephalothorax (head+thorax segment)
  fillEllipse(px, 38, 44, 18, 14, 8);
  fillEllipse(px, 38, 44, 16, 12, 9);
  fillEllipse(px, 38, 44, 14, 10, 10);
  fillEllipse(px, 36, 41, 8, 6, 11);

  // Eyes — 8 eyes (4 pairs) on head
  for (const [ex, ey] of [[28,38],[34,36],[42,36],[48,38]]) {
    fillEllipse(px, ex, ey, 3, 2, 25);
    pset(px, ex - 1, ey - 1, 30);
  }

  // Chelicerae / fangs
  leg(px, 26, 50, 16, 60, 8, 9);
  leg(px, 16, 60, 10, 56, 8, 9);
  leg(px, 32, 50, 22, 62, 8, 9);
  leg(px, 22, 62, 16, 58, 8, 9);
  pset(px, 10, 56, 7); pset(px, 16, 58, 7); // fang tips chalk

  // 8 legs (4 each side) — spreading wide
  const legData = frame === 0
    ? [
        // left legs: [x0,y0, x1,y1, x2,y2] - two segments
        [[28,44, 14,30, 4,22],[28,46, 10,42, 2,38],[28,50, 8,56, 0,60],[28,54, 8,66, 2,72]],
        // right legs
        [[48,44, 62,30, 72,22],[48,46, 66,42, 74,38],[48,50, 68,56, 76,60],[48,54, 68,66, 74,72]]
      ]
    : [
        // frame b: front legs raised
        [[28,44, 12,26, 2,16],[28,46, 8,34, 0,26],[28,50, 8,58, 0,64],[28,54, 10,68, 4,74]],
        [[48,44, 64,26, 74,16],[48,46, 68,34, 76,26],[48,50, 68,58, 76,64],[48,54, 66,68, 72,74]]
      ];

  for (const [leftLegs, rightLegs] of [legData]) {
    for (const [x0,y0, x1,y1, x2,y2] of leftLegs) {
      leg(px, x0, y0, x1, y1, 8, 9); leg(px, x1, y1, x2, y2, 8, 9);
      claw(px, x2, y2, 8);
    }
    for (const [x0,y0, x1,y1, x2,y2] of rightLegs) {
      leg(px, x0, y0, x1, y1, 8, 9); leg(px, x1, y1, x2, y2, 8, 9);
      claw(px, x2, y2, 8);
    }
  }

  // Hair bristles on abdomen (short vlines)
  for (const [hx, hy] of [[54,30],[62,30],[50,38],[66,38],[48,48],[70,48],[58,34],[58,68]]) {
    vline(px, hx, hy - 2, hy, 8);
  }

  return encode(px);
}

// ============================================================================
// 5. SNAKE — green viper, scales, fangs, coiled or striking
// ============================================================================
function snake(frame) {
  const px = make();
  // moss-deep(14) base, moss(15) hi, fen-green(16) bright, leaf(17) belly, peat(8) sh, blood(25) eye

  if (frame === 0) {
    // a: coiled S-shape body
    // Tail coil (lower)
    fillEllipse(px, 62, 68, 18, 8, 14);
    fillEllipse(px, 62, 68, 16, 6, 15);
    fillEllipse(px, 62, 68, 12, 4, 16);
    // Body loop (upper)
    fillEllipse(px, 36, 52, 22, 12, 14);
    fillEllipse(px, 36, 52, 20, 10, 15);
    fillEllipse(px, 36, 52, 16, 7, 16);
    // Hollow out centres
    fillEllipse(px, 62, 68, 10, 3, -1);
    fillEllipse(px, 36, 52, 14, 5, -1);
    // Neck + head
    fillRect(px, 14, 22, 14, 30, 14);
    fillRect(px, 15, 23, 12, 28, 15);
    fillRect(px, 16, 24, 10, 24, 16);
    hline(px, 16, 25, 24, 17); // belly stripe
    // Scale pattern on body
    for (let sy = 26; sy < 50; sy += 4) hline(px, 15, 26, sy, 14);
  } else {
    // b: rearing S-curve strike — body drawn as chain of overlapping ellipses
    // Path: tail bottom-right → mid-body curves left → neck rises up-left to head
    const bodyPath = [
      [70, 74, 8, 6], [66, 68, 9, 7], [62, 62, 9, 7], [58, 56, 9, 7],
      [56, 50, 8, 7], [54, 44, 8, 7], [52, 38, 8, 7], [48, 32, 8, 7],
      [42, 26, 8, 7], [34, 22, 8, 6], [26, 20, 7, 6],
    ];
    for (const [cx2, cy2, rx2, ry2] of bodyPath) {
      fillEllipse(px, cx2, cy2, rx2 + 1, ry2 + 1, 8);  // dark outline
      fillEllipse(px, cx2, cy2, rx2, ry2, 14);           // base body
      fillEllipse(px, cx2 - 2, cy2 - 2, rx2 - 3, ry2 - 2, 15); // highlight
    }
    // Belly stripe along body path (lighter colour, inner side)
    for (const [cx2, cy2] of bodyPath) pset(px, cx2, cy2 + 2, 17);
    // Scale rows — dark hline across each body segment
    for (const [cx2, cy2, rx2, ry2] of bodyPath.filter((_, i) => i % 2 === 0)) {
      hline(px, cx2 - rx2 + 2, cx2 + rx2 - 2, cy2 + ry2 - 1, 14);
    }
  }

  // Head (always) — triangular, wider at jaw
  const headX = frame === 0 ? 14 : 6;
  const headY = frame === 0 ? 14 : 22;
  fillRect(px, headX, headY, 30, 18, 14);
  fillRect(px, headX + 1, headY + 1, 28, 16, 15);
  fillRect(px, headX + 4, headY + 2, 22, 10, 16);
  hline(px, headX + 4, headX + 25, headY + 2, 17); // belly head stripe

  // Scales (diamond rows on head)
  for (const [sx, sy] of [[headX+6,headY+3],[headX+12,headY+3],[headX+18,headY+3],[headX+9,headY+6],[headX+15,headY+6]])
    pset(px, sx, sy, 14);

  // Eyes (slit pupils, yellow iris)
  fillEllipse(px, headX + 8, headY + 6, 3, 3, 29);  // gold iris L
  fillEllipse(px, headX + 8, headY + 6, 1, 2, 0);   // slit pupil
  fillEllipse(px, headX + 20, headY + 6, 3, 3, 29);
  fillEllipse(px, headX + 20, headY + 6, 1, 2, 0);

  // Forked tongue
  if (frame === 1) {
    hline(px, headX - 4, headX + 2, headY + 12, 25); // tongue blood
    pset(px, headX - 5, headY + 11, 25); pset(px, headX - 5, headY + 13, 25); // fork
  } else {
    pset(px, headX - 2, headY + 12, 25); // tongue tip
  }

  // Open fang jaw (frame b)
  if (frame === 1) {
    fillRect(px, headX, headY + 14, 28, 6, 0);     // dark mouth
    fillRect(px, headX + 2, headY + 15, 24, 4, 24); // throat
    pset(px, headX + 6, headY + 14, 7); pset(px, headX + 20, headY + 14, 7); // fangs
  }

  return encode(px);
}

// ============================================================================
// 6. ZOMBIE — rotting undead, green-grey flesh, arms outstretched
// ============================================================================
function zombie(frame) {
  const px = make();
  // moss-deep(14) flesh, moss(15) hi, fen-green(16) decay, peat(8) sh, blood(25) wound

  // Legs — shambling gait
  const legOff = frame === 1 ? 4 : 0;
  fillRect(px, 32, 58, 12, 20, 14); // left leg
  fillRect(px, 33, 59, 10, 18, 15);
  fillRect(px, 52, 58 - legOff, 12, 20, 14); // right leg (raised)
  fillRect(px, 53, 59 - legOff, 10, 18, 15);
  // Feet
  fillRect(px, 28, 76, 16, 4, 8);
  fillRect(px, 52, 76 - legOff, 16, 4, 8);

  // Torso — ragged
  fillRect(px, 28, 32, 40, 28, 14);
  fillRect(px, 29, 33, 38, 26, 15);
  fillRect(px, 30, 34, 36, 22, 16);
  // Torn cloth strips
  hline(px, 28, 67, 46, 14); // ragged tear line
  hline(px, 28, 67, 47, 8);  // tear shadow
  hline(px, 30, 50, 52, 14); hline(px, 58, 65, 52, 14);
  // Wounds / decay patches
  for (const [wx, wy] of [[34,38],[48,42],[60,36],[36,50]]) {
    fillRect(px, wx, wy, 4, 4, 25); // blood wound
    pset(px, wx + 1, wy + 1, 24);
  }

  // Arms — outstretched
  if (frame === 0) {
    // a: both arms forward
    fillRect(px, 4, 34, 24, 10, 14); fillRect(px, 5, 35, 22, 8, 15);
    fillRect(px, 68, 34, 24, 10, 14); fillRect(px, 69, 35, 22, 8, 15);
    // Hands with visible bone knuckles
    fillRect(px, 0, 36, 8, 8, 15); fillRect(px, 88, 36, 8, 8, 15);
    for (const hx of [1, 3, 5]) pset(px, hx, 36, 6);
    for (const hx of [89, 91, 93]) pset(px, hx, 36, 6);
  } else {
    // b: one arm higher (grabbing)
    fillRect(px, 4, 24, 24, 10, 14); fillRect(px, 5, 25, 22, 8, 15);
    fillRect(px, 68, 38, 24, 10, 14); fillRect(px, 69, 39, 22, 8, 15);
    fillRect(px, 0, 26, 8, 8, 15); fillRect(px, 88, 40, 8, 8, 15);
    for (const hx of [1, 3, 5]) pset(px, hx, 26, 6);
    for (const hx of [89, 91, 93]) pset(px, hx, 40, 6);
  }

  // Head
  fillRect(px, 30, 6, 36, 28, 14);
  fillRect(px, 31, 7, 34, 26, 15);
  fillRect(px, 32, 8, 32, 20, 16);
  // Decay on head
  fillRect(px, 42, 8, 8, 6, 8); // dark rot patch
  pset(px, 44, 9, 25); // wound

  // Eyes — blank/dead, one missing
  fillEllipse(px, 40, 18, 4, 3, 5);  // stone dead eye L
  pset(px, 39, 17, 7);                // eye hi
  fillRect(px, 54, 16, 8, 5, 0);      // empty socket R (missing eye)
  pset(px, 55, 17, 25);               // blood socket

  // Mouth — slack
  hline(px, 36, 60, 26, 8);
  hline(px, 38, 58, 27, 0);
  // Teeth (patchy)
  pset(px, 38, 26, 7); pset(px, 44, 26, 7); pset(px, 54, 26, 7);

  // Hair (matted, patchy)
  hline(px, 32, 64, 6, 8);
  hline(px, 34, 62, 7, 14);
  for (const hx of [34, 40, 52, 58, 62]) pset(px, hx, 5, 8);

  return encode(px);
}

// ============================================================================
// 7. SKELETON — undead warrior, white bones, ribcage, scythe/sword
// ============================================================================
function skeleton(frame) {
  const px = make();
  // bone(6) base, chalk(7) hi, shadow(2) sh, gold(29) weapon

  // Legs — visible bones
  for (const [lx, raised] of [[32, false], [52, frame === 1]]) {
    const ly = raised ? 0 : 0;
    fillRect(px, lx, 58 - ly, 8, 16, 2); // shadow femur
    fillRect(px, lx + 1, 59 - ly, 6, 14, 6);
    fillRect(px, lx + 2, 60 - ly, 4, 12, 7);
    // Knee joint
    fillEllipse(px, lx + 4, 66 - ly, 4, 4, 6);
    fillEllipse(px, lx + 4, 66 - ly, 2, 2, 7);
    // Tibia
    fillRect(px, lx + 2, 70 - ly, 4, 8, 6);
    // Foot
    fillRect(px, lx - 2, 76, 12, 4, 6);
    hline(px, lx - 2, lx + 8, 76, 7);
  }

  // Pelvis
  fillRect(px, 30, 52, 36, 8, 2);
  fillRect(px, 31, 53, 34, 6, 6);
  hline(px, 31, 64, 53, 7); // pelvis hi
  // Hip joint circles
  fillEllipse(px, 36, 56, 5, 5, 6); fillEllipse(px, 36, 56, 3, 3, 7);
  fillEllipse(px, 60, 56, 5, 5, 6); fillEllipse(px, 60, 56, 3, 3, 7);

  // Spine
  for (let sv = 22; sv < 54; sv += 4) {
    fillRect(px, 44, sv, 8, 3, 6);
    hline(px, 44, 51, sv, 7);
    pset(px, 47, sv + 1, 2); // vertebra shadow
  }

  // Ribcage
  for (const [rx, ry, rw, flip] of [
    [24, 26, 14, false],[22, 32, 16, false],[22, 38, 16, false],[24, 44, 14, false],
    [58, 26, 14, true],[60, 32, 16, true],[60, 38, 16, true],[58, 44, 14, true]
  ]) {
    const x0 = flip ? rx : rx, x1 = flip ? rx + rw : rx + rw;
    hline(px, x0, x1, ry, 6); hline(px, x0 + 1, x1 - 1, ry + 1, 7);
    pset(px, x0, ry + 1, 2);
  }

  // Clavicles
  hline(px, 32, 48, 22, 6); hline(px, 48, 64, 22, 6);
  hline(px, 33, 48, 23, 7); hline(px, 48, 63, 23, 7);

  // Arms + weapon
  if (frame === 0) {
    // a: sword arm at side, shield arm forward
    // Right arm (sword)
    fillRect(px, 68, 24, 6, 24, 6); fillRect(px, 69, 25, 4, 22, 7);
    fillEllipse(px, 71, 46, 4, 4, 6); fillEllipse(px, 71, 46, 2, 2, 7);
    // Sword (pointing down)
    fillRect(px, 72, 46, 4, 26, 29);
    fillRect(px, 73, 47, 2, 24, 30);
    fillRect(px, 68, 50, 12, 3, 28); // crossguard
    // Left arm (raised)
    fillRect(px, 22, 24, 6, 20, 6); fillRect(px, 23, 25, 4, 18, 7);
    fillEllipse(px, 25, 42, 4, 4, 6); fillEllipse(px, 25, 42, 2, 2, 7);
    fillRect(px, 10, 42, 14, 6, 6);
    // Hand bones
    for (const hx of [10, 13, 16, 19]) vline(px, hx, 42, 46, 7);
  } else {
    // b: sword raised high
    fillRect(px, 68, 14, 6, 30, 6); fillRect(px, 69, 15, 4, 28, 7);
    fillEllipse(px, 71, 42, 4, 4, 6);
    // Sword raised
    fillRect(px, 68, 0, 4, 18, 29); fillRect(px, 69, 1, 2, 16, 30);
    fillRect(px, 62, 14, 14, 3, 28); // crossguard
    // Left arm forward
    fillRect(px, 10, 28, 20, 6, 6); fillRect(px, 11, 29, 18, 4, 7);
    fillEllipse(px, 10, 31, 4, 4, 6);
    for (const hx of [2, 5, 8, 11]) vline(px, hx, 28, 34, 7);
  }

  // Skull
  fillEllipse(px, 48, 14, 16, 14, 2);
  fillEllipse(px, 48, 14, 14, 12, 6);
  fillEllipse(px, 46, 11, 10, 8, 7);
  // Eye sockets
  fillEllipse(px, 40, 14, 5, 4, 0);
  fillEllipse(px, 56, 14, 5, 4, 0);
  pset(px, 40, 14, 25); pset(px, 56, 14, 25); // blood glow in sockets
  // Teeth
  for (const [tx, th] of [[38,5],[42,6],[46,5],[50,6],[54,5],[58,5]]) {
    fillRect(px, tx, 22, 3, th, 7);
    pset(px, tx, 22, 6); pset(px, tx + 2, 22, 6);
  }
  // Nasal cavity
  fillRect(px, 45, 17, 6, 4, 0);
  // Cranium crack
  hline(px, 46, 52, 8, 2);

  return encode(px);
}

// ============================================================================
// 8. BLOB — amorphous ooze, yellow-tan, face, pseudopods
// ============================================================================
function blob(frame) {
  const px = make();
  // honey(12) base, parchment(13) hi, amberwood(11) sh, umber(9) dk, gold(29) eyes

  // Blob body — flattened pyramid/mound shape
  if (frame === 0) {
    // a: mound shape
    for (let y = 28; y < 72; y++) {
      const spread = Math.round(((y - 28) / 44) * 44 + 4);
      const x0 = 48 - spread; const x1 = 48 + spread;
      hline(px, x0, x1, y, 9);     // umber outer
      hline(px, x0 + 2, x1 - 2, y, 11); // amberwood mid
      hline(px, x0 + 4, x1 - 4, y, 12); // honey face
      if (y > 30 && y < 68) hline(px, x0 + 8, x1 - 8, y, 13); // parchment hi
    }
    // Pseudopod bumps on sides
    fillEllipse(px, 10, 55, 8, 10, 9);
    fillEllipse(px, 10, 55, 6, 8, 11);
    fillEllipse(px, 86, 55, 8, 10, 9);
    fillEllipse(px, 86, 55, 6, 8, 11);
    // Top pseudopod
    fillEllipse(px, 48, 22, 10, 8, 9);
    fillEllipse(px, 48, 22, 8, 6, 11);
    fillEllipse(px, 48, 22, 6, 4, 12);
  } else {
    // b: spreading/lunging — asymmetrical, wider
    for (let y = 22; y < 72; y++) {
      const t = (y - 22) / 50;
      const spread = Math.round(t * 50 + 2);
      const x0 = 48 - spread - 4; const x1 = 48 + spread + 8; // asymm
      hline(px, Math.max(0, x0), Math.min(W-1, x1), y, 9);
      hline(px, Math.max(2, x0 + 2), Math.min(W-3, x1 - 2), y, 11);
      hline(px, Math.max(4, x0 + 4), Math.min(W-5, x1 - 4), y, 12);
      if (y > 26 && y < 66) hline(px, Math.max(8, x0 + 8), Math.min(W-9, x1 - 6), y, 13);
    }
    // Reaching pseudopod left
    fillEllipse(px, 6, 42, 10, 8, 9);
    fillEllipse(px, 6, 42, 8, 6, 11);
    fillEllipse(px, 6, 42, 5, 4, 12);
    // Drip tendrils
    for (const [dx, dy] of [[20,74],[34,76],[62,76],[76,74]]) vline(px, dx, dy, dy + 4, 9);
  }

  // Face — two large eyes and grinning mouth
  const faceY = frame === 0 ? 44 : 40;
  // Eyes
  fillEllipse(px, 36, faceY, 6, 5, 29); // gold eye L
  fillEllipse(px, 36, faceY, 4, 3, 30);
  fillEllipse(px, 36, faceY, 2, 2, 0);  // pupil
  pset(px, 34, faceY - 2, 7);
  fillEllipse(px, 60, faceY, 6, 5, 29); // gold eye R
  fillEllipse(px, 60, faceY, 4, 3, 30);
  fillEllipse(px, 60, faceY, 2, 2, 0);
  pset(px, 62, faceY - 2, 7);
  // Mouth — wide grin
  hline(px, 28, 68, faceY + 10, 9);
  hline(px, 30, 66, faceY + 11, 8);
  // Teeth
  for (const tx of [32, 38, 44, 50, 56, 62]) fillRect(px, tx, faceY + 10, 4, 6, 13);

  return encode(px);
}

// ============================================================================
// 9. WISP — glowing energy orb, trail of sparks, small spidery feet
// ============================================================================
function wisp(frame) {
  const px = make();
  // gold(29)/candle(30) orb, ember(26)/flame(27) glow, honey(12) trail

  const intensity = frame === 1 ? 1 : 0; // brighter on frame b

  // Outer glow corona
  fillEllipse(px, 48, 38, 28, 26, intensity ? 26 : 12);
  fillEllipse(px, 48, 38, 22, 20, intensity ? 27 : 26);
  // Mid glow
  fillEllipse(px, 48, 38, 16, 14, intensity ? 29 : 27);
  // Inner bright orb
  fillEllipse(px, 48, 38, 10, 9, 29);
  fillEllipse(px, 48, 38, 7, 6, 30);
  fillEllipse(px, 48, 38, 4, 4, 7); // chalk core
  pset(px, 45, 35, 7); pset(px, 46, 34, 7); // specular

  // Orbiting sparks
  const sparks = frame === 0
    ? [[20,22],[76,22],[14,44],[82,44],[24,60],[72,60]]
    : [[14,22],[82,22],[10,48],[86,48],[20,64],[76,64]];
  for (const [sx, sy] of sparks) {
    fillEllipse(px, sx, sy, 4, 4, intensity ? 27 : 26);
    fillEllipse(px, sx, sy, 2, 2, 30);
    pset(px, sx - 1, sy - 1, 7);
  }

  // Trails between orb and sparks
  for (const [sx, sy] of sparks) {
    const dx = 48 - sx, dy = 38 - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    for (let t = 0.3; t < 0.7; t += 0.15) {
      pset(px, Math.round(sx + dx * t), Math.round(sy + dy * t), 26);
    }
  }

  // Spindly legs (4) hanging below
  const legBaseY = 50;
  for (const [lx, ldy, ldy2] of [
    [36, 12, 20], [42, 14, 22], [54, 14, 22], [60, 12, 20]
  ]) {
    vline(px, lx, legBaseY, legBaseY + ldy, 12);
    vline(px, lx + (lx < 48 ? -1 : 1), legBaseY + ldy, legBaseY + ldy2, 12);
    pset(px, lx + (lx < 48 ? -2 : 2), legBaseY + ldy2, 11); // claw
  }

  // Extra burst rays on frame b
  if (frame === 1) {
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      for (let r = 18; r < 28; r++) {
        pset(px, Math.round(48 + r * Math.cos(ang)), Math.round(38 + r * Math.sin(ang)), 27);
      }
    }
  }

  return encode(px);
}

// ============================================================================
// 10. BRUTE — large green ogre, hunched, fists, thick neck
// ============================================================================
function brute(frame) {
  const px = make();
  // moss-deep(14) base, moss(15) mid, fen-green(16) hi, leaf(17) bright, peat(8) sh

  // Legs — very thick
  fillRect(px, 26, 54, 18, 26, 14);
  fillRect(px, 27, 55, 16, 24, 15);
  fillRect(px, 52, 54, 18, 26, 14);
  fillRect(px, 53, 55, 16, 24, 15);
  // Knee caps
  fillEllipse(px, 35, 66, 7, 6, 15); fillEllipse(px, 35, 66, 4, 4, 16);
  fillEllipse(px, 61, 66, 7, 6, 15); fillEllipse(px, 61, 66, 4, 4, 16);
  // Feet — huge
  fillRect(px, 18, 76, 26, 4, 14);
  fillRect(px, 54, 76, 26, 4, 14);
  for (const [tx, tn] of [[20,3],[26,3],[32,3],[56,3],[62,3],[68,3]])
    fillRect(px, tx, 74, 4, 3, 8);

  // Torso — massive, hunched
  fillRect(px, 20, 22, 56, 34, 8);    // outer shadow
  fillRect(px, 21, 23, 54, 32, 14);
  fillRect(px, 22, 24, 52, 30, 15);
  fillRect(px, 24, 25, 48, 26, 16);
  fillRect(px, 28, 26, 40, 20, 17);   // bright front panel
  // Torso musculature
  vline(px, 48, 26, 54, 15);  // spine hint
  for (const my of [30, 36, 42]) hline(px, 28, 67, my, 15); // muscle bands

  // Arms — huge, dangling
  if (frame === 0) {
    // a: hanging at sides
    fillRect(px, 4, 26, 18, 36, 14);
    fillRect(px, 5, 27, 16, 34, 15);
    fillRect(px, 74, 26, 18, 36, 14);
    fillRect(px, 75, 27, 16, 34, 15);
    // Fists
    fillEllipse(px, 12, 64, 10, 8, 14);
    fillEllipse(px, 12, 64, 8, 6, 15);
    fillEllipse(px, 84, 64, 10, 8, 14);
    fillEllipse(px, 84, 64, 8, 6, 15);
    for (const [kx, ky] of [[6,62],[10,60],[14,60],[18,62]]) pset(px, kx, ky, 16);
    for (const [kx, ky] of [[78,62],[82,60],[86,60],[90,62]]) pset(px, kx, ky, 16);
  } else {
    // b: arms raised to smash
    fillRect(px, 4, 8, 18, 36, 14);
    fillRect(px, 5, 9, 16, 34, 15);
    fillRect(px, 74, 8, 18, 36, 14);
    fillRect(px, 75, 9, 16, 34, 15);
    fillEllipse(px, 12, 8, 10, 8, 14);
    fillEllipse(px, 12, 8, 8, 6, 15);
    fillEllipse(px, 84, 8, 10, 8, 14);
    fillEllipse(px, 84, 8, 8, 6, 15);
    for (const [kx, ky] of [[6,6],[10,4],[14,4],[18,6]]) pset(px, kx, ky, 16);
    for (const [kx, ky] of [[78,6],[82,4],[86,4],[90,6]]) pset(px, kx, ky, 16);
  }

  // Head — low on shoulders, brutish
  fillEllipse(px, 48, 16, 22, 16, 8);
  fillEllipse(px, 48, 16, 20, 14, 14);
  fillEllipse(px, 48, 16, 18, 12, 15);
  fillEllipse(px, 46, 13, 12, 8, 16);

  // Brow ridge
  hline(px, 30, 66, 10, 8); hline(px, 30, 66, 11, 14);

  // Eyes — mean, small, deep-set under brow
  fillEllipse(px, 38, 14, 5, 4, 0);
  fillEllipse(px, 38, 14, 3, 3, 25);
  pset(px, 37, 13, 27);
  fillEllipse(px, 58, 14, 5, 4, 0);
  fillEllipse(px, 58, 14, 3, 3, 25);
  pset(px, 59, 13, 27);

  // Nose — wide, flat
  fillRect(px, 42, 16, 12, 8, 14);
  fillRect(px, 43, 17, 10, 6, 15);
  fillRect(px, 43, 20, 4, 4, 0); // left nostril
  fillRect(px, 49, 20, 4, 4, 0); // right nostril

  // Mouth — grimace
  hline(px, 34, 62, 22, 8);
  hline(px, 36, 60, 23, 0);
  // Tusks
  fillRect(px, 36, 22, 5, 8, 7); // chalk tusk L
  fillRect(px, 55, 22, 5, 8, 7);
  hline(px, 36, 40, 22, 6); hline(px, 55, 59, 22, 6); // tusk shadow

  return encode(px);
}

// ============================================================================
// 11. HUMANOID — hooded cultist/thief, dagger, crouching
// ============================================================================
function humanoid(frame) {
  const px = make();
  // slate-dark(3) robe, slate(4) hi, shadow(2) sh, leather(10) skin, gold(29) dagger

  // Robe body — layered
  for (let y = 22; y < H; y++) {
    const w = Math.min(W - 4, 18 + ((y - 22) * 52 / 58 | 0));
    const x0 = (W - w) / 2 | 0;
    hline(px, x0, x0 + w - 1, y, 2);
    hline(px, x0 + 2, x0 + w - 3, y, 3);
    if (y > 28) hline(px, x0 + 4, x0 + w - 5, y, 4);
  }
  // Robe left edge highlight
  for (let y = 28; y < 70; y++) {
    const w = 18 + ((y - 22) * 52 / 58 | 0);
    const x0 = (W - w) / 2 | 0;
    pset(px, x0 + 3, y, 4);
  }
  // Robe hem
  hline(px, 14, 82, 72, 2); hline(px, 16, 80, 73, 3);

  // Hood — pointed
  fillRect(px, 34, 4, 28, 22, 2);
  fillRect(px, 35, 5, 26, 20, 3);
  fillRect(px, 36, 6, 24, 16, 4);
  // Hood folds
  for (let f = 0; f < 4; f++) hline(px, 36 + f, 64 - f, 8 + f * 3, 3);
  // Hood point
  for (let i = 0; i < 8; i++) hline(px, 48 - i, 48 + i, 4 + i, 3);
  hline(px, 34, 61, 24, 2); // shadow collar

  // Face in hood shadow
  fillRect(px, 36, 14, 24, 12, 10); // leather skin
  fillRect(px, 37, 15, 22, 10, 10);
  // Eyes — one visible, glinting
  fillEllipse(px, 42, 18, 3, 3, 29);  // gold eye L (glint)
  fillEllipse(px, 42, 18, 2, 2, 30);
  pset(px, 41, 17, 7);
  fillRect(px, 53, 16, 6, 5, 2);     // eye R in shadow

  // Arm with dagger
  if (frame === 0) {
    // a: dagger low, ready
    fillRect(px, 62, 32, 14, 22, 3); // arm
    fillRect(px, 63, 33, 12, 20, 4);
    fillRect(px, 64, 50, 10, 6, 10); // hand
    // Dagger pointing right
    fillRect(px, 72, 52, 20, 4, 29);  // gold blade
    fillRect(px, 73, 52, 18, 2, 30);  // blade hi
    fillRect(px, 72, 51, 4, 6, 28);   // guard
    fillRect(px, 66, 52, 8, 4, 9);    // handle
  } else {
    // b: dagger thrust forward/up
    fillRect(px, 62, 24, 14, 22, 3);
    fillRect(px, 63, 25, 12, 20, 4);
    fillRect(px, 64, 30, 10, 6, 10);
    // Dagger thrust upward
    vline(px, 74, 4, 32, 29); vline(px, 75, 4, 32, 30);
    fillRect(px, 70, 28, 8, 4, 28); // guard
    fillRect(px, 68, 32, 6, 8, 9);  // handle
  }

  // Second hand (left, holding something/open)
  const lhY = frame === 0 ? 42 : 36;
  fillRect(px, 20, lhY, 12, 8, 3);
  fillRect(px, 21, lhY + 1, 10, 6, 4);
  fillRect(px, 20, lhY, 10, 6, 10);
  for (const fy of [lhY, lhY + 2, lhY + 4]) pset(px, 20, fy, 10);

  return encode(px);
}

// ============================================================================
// Build and write
// ============================================================================
const monsters = {
  rat, beetle, hound, spider, snake, zombie, skeleton, blob, wisp, brute, humanoid
};

const sprites = {};
for (const [name, fn] of Object.entries(monsters)) {
  sprites[`mon_${name}_a`] = fn(0);
  sprites[`mon_${name}_b`] = fn(1);
}

writeFileSync(
  join(ROOT, 'data', 'art', 'monsters.json'),
  JSON.stringify({ comment: 'Monster set A, 11 families × 2 frames, 96×80. Generated by tools/gen_monsters_a.js', sprites }, null, 2)
);
console.log('wrote data/art/monsters.json');
console.log('sprites:', Object.keys(sprites).join(', '));

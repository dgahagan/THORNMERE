// Generates 32×32 tileable wall/door textures and writes data/art/textures.json
// Run: node tools/gen_textures.js
//
// Design: running-bond brickwork (16px period × 8px per course).
// Each brick face is lit upper-left; 4-5 shade levels per surface.
// Moss/rune accents are clustered (2×2+ pixels) not scattered single pixels.

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Build a 32×32 pixel array (row-major), then convert to legend + rows.
// pixel = palette index (number) or -1 for transparent.

function make32(fn) {
  const px = Array.from({ length: 32 }, () => new Array(32).fill(0));
  fn(px);
  return px;
}

// Build legend from pixel data and return {legend, rows, w, h}
function encode(px, transparent = null) {
  const flat = px.flat();
  const used = [...new Set(flat)].sort((a, b) => a - b);
  const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*';
  const legend = {};
  const idx2ch = {};
  let ci = 0;
  for (const v of used) {
    if (transparent !== null && v === transparent) {
      legend['.'] = -1;
      idx2ch[v] = '.';
    } else {
      const ch = CHARS[ci++];
      legend[ch] = v;
      idx2ch[v] = ch;
    }
  }
  const rows = px.map(row => row.map(v => idx2ch[v]).join(''));
  return { w: 32, h: 32, legend, rows };
}

// ---- helpers ----------------------------------------------------------------
// Set a rectangular region
function fillRect(px, x, y, w, h, c) {
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    const py2 = y + dy, px2 = x + dx;
    if (py2 >= 0 && py2 < 32 && px2 >= 0 && px2 < 32) px[py2][px2] = c;
  }
}

function pset(px, x, y, c) {
  if (x >= 0 && x < 32 && y >= 0 && y < 32) px[y][x] = c;
}

// Running-bond stone wall generator.
// brickW=16, brickH=8 (7px face + 1px mortar)
// shadeLevels: [mortar, shadow, mid, lit, highlight] = 5 palette indices
// moss: array of {x,y,c} cluster centers (2×3 patches)
function runningBond(px, mortar, shadow, mid, lit, hi, mossClusters = []) {
  const BW = 16, BH = 8; // brick period × height
  for (let row = 0; row < 32; row++) {
    const course = Math.floor(row / BH);
    const ry = row % BH;         // row within brick course (0=mortar)
    const offsetX = (course % 2) * (BW / 2); // running bond offset

    if (ry === 0) {
      // horizontal mortar line
      px[row].fill(mortar);
      continue;
    }
    const faceRow = ry - 1; // 0..6 within brick face
    for (let col = 0; col < 32; col++) {
      // which brick column, accounting for offset
      const adjCol = (col + offsetX) % 32;
      const bx = adjCol % BW; // position within brick period
      if (bx === 0) {
        // vertical head joint
        px[row][col] = mortar;
        continue;
      }
      const fx = bx - 1; // 0..14 = 15-px brick face column

      // shade by column (UL light: left = bright, right = shadow)
      let cShade;
      if (fx <= 1) cShade = hi;
      else if (fx <= 4) cShade = lit;
      else if (fx <= 9) cShade = mid;
      else cShade = shadow;

      // darken bottom rows of face
      if (faceRow >= 6) cShade = (cShade === hi || cShade === lit) ? mid : shadow;
      else if (faceRow >= 5) cShade = (cShade === hi) ? lit : cShade;

      px[row][col] = cShade;
    }
  }

  // Place moss/accent clusters (2×3 each)
  for (const { x, y, c, w = 2, h = 3 } of mossClusters) {
    fillRect(px, x, y, w, h, c);
    // darker center
    if (w >= 2 && h >= 2) pset(px, x + 1, y + 1, Math.max(0, c - 1));
  }
}

// ---- door/plank pattern -----------------------------------------------------
function woodPlanks(px, gap, hi, face, shadow, railColor, railRows = []) {
  const PW = 4; // plank period: gap + hi + face + shadow
  for (let row = 0; row < 32; row++) {
    if (railRows.includes(row) || railRows.includes(row - 1)) {
      // iron rail row
      for (let col = 0; col < 32; col++) {
        const bx = col % PW;
        px[row][col] = bx === 0 ? gap : railColor;
      }
      continue;
    }
    for (let col = 0; col < 32; col++) {
      const bx = col % PW;
      if (bx === 0) px[row][col] = gap;
      else if (bx === 1) px[row][col] = hi;
      else if (bx === 2) px[row][col] = face;
      else px[row][col] = shadow;
    }
  }
}

// ---- TEXTURE DEFINITIONS ---------------------------------------------------

const sprites = {};

// TEX_TOWN_WALL — dressed grey stone, running bond
// Palette: shadow(2)=mortar, slate-dark(3)=shadow, slate(4)=mid, stone(5)=lit, bone(6)=hi
sprites.tex_town_wall = encode(make32(px => {
  runningBond(px, 2, 3, 4, 5, 6, []);
}));

// TEX_TOWN_DOOR — stone wall surround with inset wooden door, 3-panel design
// Stone: shadow(2)=mortar/jamb, slate-dark(3), slate(4), stone(5), bone(6)
// Wood planks: peat(8)=gap, umber(9), leather(10), amberwood(11)=hi
sprites.tex_town_door = encode(make32(px => {
  // Stone surround matching the town wall
  runningBond(px, 2, 3, 4, 5, 6, []);
  // Door jamb reveal: shadow strip at cols 10 and 21, from lintel (row 8) to floor
  fillRect(px, 10, 8, 1, 24, 2);
  fillRect(px, 21, 8, 1, 24, 2);
  // Vertical wood planks: cols 11-20, rows 9-31
  // 5-col repeating period (2 full planks): peat | umber | leather | leather | amberwood
  for (let y = 9; y < 32; y++) {
    for (let x = 11; x <= 20; x++) {
      px[y][x] = [8, 9, 10, 10, 11][(x - 11) % 5];
    }
  }
  // Horizontal cross-rails (three-panel door): rows 15-16 and 24-25
  fillRect(px, 11, 15, 10, 2, 8);
  fillRect(px, 11, 24, 10, 2, 8);
  // Door handle: amberwood knob on right side, mid-height
  pset(px, 20, 20, 11);
  pset(px, 20, 21, 11);
}));

// TEX_UNDER_WALL — dark warm stone with clumped moss patches
// Mortar: peat(8), stone shadow: umber(9), mid: leather(10), lit: amberwood(11), hi: none
// Moss-deep(14), moss(15)
sprites.tex_under_wall = encode(make32(px => {
  runningBond(px, 8, 9, 10, 11, 11, [
    { x: 3, y: 10, c: 15, w: 3, h: 3 },
    { x: 19, y: 3, c: 15, w: 2, h: 2 },
    { x: 26, y: 18, c: 15, w: 3, h: 3 },
    { x: 10, y: 26, c: 15, w: 2, h: 3 },
    { x: 5, y: 3, c: 14, w: 2, h: 2 },
    { x: 23, y: 27, c: 14, w: 2, h: 2 },
  ]);
}));

// TEX_UNDER_DOOR — dark stone arch + iron-bar gate
// Stone: peat(8) mortar, umber(9) shadow, leather(10) mid, amberwood(11) lit
// Iron bars: slate-dark(3); bar gap: night(1)
sprites.tex_under_door = encode(make32(px => {
  // Base: stone surround (same as under_wall without moss)
  runningBond(px, 8, 9, 10, 11, 11, []);
  // Gate opening: columns 4–27, rows 2–29 → dark interior
  fillRect(px, 4, 2, 24, 28, 1); // night/black interior
  // Horizontal iron frame top and bottom
  fillRect(px, 4, 2, 24, 2, 3);   // top frame bar
  fillRect(px, 4, 28, 24, 2, 3);  // bottom frame bar
  // Vertical bars every 4 cols inside the opening (cols 6,10,14,18,22)
  for (const bx of [6, 10, 14, 18, 22]) {
    fillRect(px, bx, 4, 2, 24, 3); // slate-dark bar
    // bar highlight left edge
    for (let y = 4; y < 28; y++) pset(px, bx, y, 4); // slate highlight
  }
  // horizontal mid-rail
  fillRect(px, 4, 15, 24, 2, 3);
}));

// TEX_BARROW_WALL — rough earth, bone fragments, no clean brick
// Earthy: peat(8)=base, umber(9)=earth light, bone(6)=bone fragment, moss-deep(14)=mold
sprites.tex_barrow_wall = encode(make32(px => {
  // Earth base — irregular, not clean running bond. Use modified bond with uneven lit face.
  runningBond(px, 8, 8, 9, 9, 10, []); // very subtle differentiation (earthy)
  // Smear the mortar lines (barrow earth has no clean joints)
  for (let row = 0; row < 32; row++) {
    if (row % 8 === 0) {
      // Rough up the mortar line — every 3rd pixel is earth not mortar
      for (let col = 0; col < 32; col++) {
        if ((col * 7 + row * 3) % 5 !== 0) px[row][col] = 9; // umber shows through
      }
    }
  }
  // Bone fragments (2×2 clusters at 5 positions)
  const bones = [{ x: 6, y: 6 }, { x: 22, y: 12 }, { x: 14, y: 20 }, { x: 3, y: 26 }, { x: 28, y: 3 }];
  for (const { x, y } of bones) {
    fillRect(px, x, y, 2, 2, 6); // bone(6)
    pset(px, x, y, 7); // chalk highlight corner
  }
  // Mold patches (dark green smears)
  fillRect(px, 17, 7, 3, 2, 14);
  fillRect(px, 8, 22, 2, 3, 14);
  fillRect(px, 25, 26, 3, 2, 14);
}));

// TEX_BARROW_DOOR — arched stone doorway cut into earth, dark interior
// Earth: peat(8), umber(9), bone(6) for keystone
// Stone arch: slate-dark(3), slate(4), stone(5)
sprites.tex_barrow_door = encode(make32(px => {
  // Earth base same as barrow wall but simpler
  runningBond(px, 8, 8, 9, 9, 10, []);
  // Dark opening: rectangular with rounded top suggestion
  fillRect(px, 8, 3, 16, 26, 1); // night interior
  // Stone arch — each arch stone is ~4px wide, 3px tall
  const archStones = [
    [7, 2, 3, 3], [11, 1, 4, 3], [15, 0, 2, 3], [17, 0, 2, 3], [19, 1, 4, 3], [23, 2, 3, 3]
  ];
  for (const [x, y, w, h] of archStones) {
    fillRect(px, x, y, w, h, 4); // slate mid
    // highlight top edge
    for (let dx = 0; dx < w; dx++) pset(px, x + dx, y, 5);
    // shadow right edge
    for (let dy = 0; dy < h; dy++) pset(px, x + w - 1, y + dy, 3);
  }
  // Keystone (center top of arch)
  fillRect(px, 15, 0, 2, 2, 6); // bone keystone
  // Stone jambs on sides
  fillRect(px, 5, 3, 3, 26, 4);  // left jamb
  fillRect(px, 24, 3, 3, 26, 4); // right jamb
  for (let y = 3; y < 29; y++) {
    pset(px, 5, y, 5);  // left jamb highlight
    pset(px, 26, y, 3); // right jamb shadow
  }
  // Threshold stone at bottom
  fillRect(px, 5, 29, 22, 3, 4);
  for (let x = 5; x < 27; x++) pset(px, x, 29, 5); // threshold highlight
}));

// TEX_NEEDLE_WALL — dark blue-slate dressed stone, violet rune accent clusters
// Night(1)=mortar, abyss-blue(19)=shadow, deep-blue(20)=mid, sky-blue(21)=lit, violet(31)=rune
sprites.tex_needle_wall = encode(make32(px => {
  runningBond(px, 1, 19, 20, 21, 21, []);
  // Rune clusters: 2×3 violet marks at 4 positions (one per brick cell)
  // Positioned in middle of brick faces, not at joints
  const runes = [
    { x: 6, y: 2 }, { x: 22, y: 10 }, { x: 12, y: 18 }, { x: 28, y: 26 },
  ];
  for (const { x, y } of runes) {
    // Small carved rune: 2×3 mark
    pset(px, x, y, 31);
    pset(px, x + 1, y, 31);
    pset(px, x, y + 1, 20); // mid (engraved depth)
    pset(px, x + 1, y + 1, 31);
    pset(px, x, y + 2, 31);
    pset(px, x + 1, y + 2, 20);
  }
}));

// TEX_NEEDLE_DOOR — dark blue with glowing rune gate pattern
// Same stone as needle_wall, but with glowing portal/gate overlay
sprites.tex_needle_door = encode(make32(px => {
  runningBond(px, 1, 19, 20, 21, 21, []);
  // Dark gate interior
  fillRect(px, 5, 2, 22, 28, 19); // abyss-blue interior
  // Gate frame (stone, lit)
  fillRect(px, 5, 2, 22, 2, 21);   // top bar
  fillRect(px, 5, 28, 22, 2, 21);  // bottom bar
  fillRect(px, 5, 2, 2, 28, 21);   // left bar
  fillRect(px, 25, 2, 2, 28, 21);  // right bar
  // Inner glow: rune sigils scattered on the gate face
  const sigils = [
    [8, 5], [14, 8], [20, 5], [10, 13], [17, 13], [13, 19], [20, 19], [9, 23], [21, 24]
  ];
  for (const [x, y] of sigils) {
    pset(px, x, y, 31);      // violet centre
    pset(px, x + 1, y, 23);  // mist-blue glow
    pset(px, x, y + 1, 23);
  }
  // Corner glows
  for (const [cx, cy] of [[6, 3], [25, 3], [6, 28], [25, 28]]) {
    pset(px, cx, cy, 31);
  }
}));

// TEX_RIDDLE_DOOR — stone with large carved gold ? in centre
// Stone: shadow(2)=mortar, slate-dark(3)=shadow, slate(4)=mid, stone(5)=lit
// Gold: gold-dark(28), gold(29), candle(30)
sprites.tex_riddle_door = encode(make32(px => {
  runningBond(px, 2, 3, 4, 5, 6, []);
  // Stone panel framing the ?
  fillRect(px, 4, 2, 24, 28, 3);   // dark recessed panel
  fillRect(px, 5, 3, 22, 26, 4);   // mid panel face
  // Carved ? glyph — centred at (16, 16), about 8×12 pixels
  // Top arc of ?
  for (let dx = -3; dx <= 3; dx++) pset(px, 16 + dx, 8, 29);  // top bar
  for (const [x, y] of [[12, 9], [11, 10], [11, 11], [12, 12], [13, 13],
                          [20, 9], [21, 10], [21, 11], [20, 12], [19, 13]]) {
    pset(px, x, y, 29);
  }
  // Stem of ?
  for (let dy = 13; dy <= 17; dy++) pset(px, 16, dy, 29);
  // Dot
  fillRect(px, 15, 20, 3, 3, 29);
  // Highlight edges of glyph
  for (let dx = -3; dx <= 3; dx++) pset(px, 16 + dx, 8, 30); // candle highlight on top
  pset(px, 15, 20, 30); pset(px, 16, 20, 30); // dot highlight
}));

// TEX_FACADE — warm sandstone building front, central window
// Sandstone: peat(8) mortar, umber(9) shadow, honey(12) mid, parchment(13) lit
// Window: abyss-blue(19) inside, deep-blue(20) frame
sprites.tex_facade = encode(make32(px => {
  runningBond(px, 8, 11, 12, 13, 13, []); // warm sandstone bond
  // Window opening centred at (16,16), 10×8
  fillRect(px, 11, 11, 10, 8, 19); // interior
  fillRect(px, 10, 10, 12, 10, 11); // stone frame (amberwood)
  fillRect(px, 11, 11, 10, 8, 19); // interior (re-punch)
  // Window sill (lighter)
  fillRect(px, 10, 18, 12, 2, 13);
  // Window lintel (lighter top)
  fillRect(px, 10, 10, 12, 1, 13);
  // Window highlights (left inner edge)
  for (let y = 11; y < 19; y++) pset(px, 11, y, 20);
  // Cross-pane (medieval look)
  for (let y = 11; y < 19; y++) pset(px, 16, y, 20); // vertical divider
  for (let x = 11; x < 21; x++) pset(px, x, 15, 20); // horizontal divider
}));

// TEX_BOARDS — horizontal planks (boarded-up building), nails visible
// Wood: peat(8)=gap/shadow, umber(9)=plank dark, leather(10)=plank mid, amberwood(11)=plank hi
// Nail heads: slate-dark(3)
sprites.tex_boards = encode(make32(px => {
  // Horizontal plank period: 4 rows (1 gap + 3 face = 4px)
  const PLANK_H = 4;
  for (let row = 0; row < 32; row++) {
    const py2 = row % PLANK_H;
    for (let col = 0; col < 32; col++) {
      if (py2 === 0) px[row][col] = 8;      // gap between planks (peat)
      else if (py2 === 1) px[row][col] = 11; // top of plank (highlight)
      else if (py2 === 2) px[row][col] = 10; // plank face
      else px[row][col] = 9;                 // bottom shadow of plank
    }
  }
  // Nail heads: every 8 cols at y=2 of each plank
  for (let row = 0; row < 32; row += PLANK_H) {
    for (let col = 4; col < 32; col += 8) {
      pset(px, col, row + 2, 3); // slate-dark nail head
      pset(px, col + 1, row + 2, 4); // slight highlight
    }
  }
  // Weathering: occasional darker patch (3 per tile)
  fillRect(px, 3, 5, 3, 2, 9);
  fillRect(px, 20, 13, 4, 2, 9);
  fillRect(px, 12, 25, 3, 2, 9);
}));

// ---- assemble and write ----------------------------------------------------
const doc = {
  comment: 'Wall/door/ceiling/floor tileable 32×32 textures. ' +
            'Generated by tools/gen_textures.js — do not hand-edit.',
  sprites
};

writeFileSync(
  join(ROOT, 'data', 'art', 'textures.json'),
  JSON.stringify(doc, null, 2)
);
console.log('wrote data/art/textures.json');
console.log('sprites:', Object.keys(sprites).join(', '));

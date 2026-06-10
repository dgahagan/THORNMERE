// genmaps.js — deterministic map generator for Thornmere.
// Layouts are generated from fixed seeds; quest content (stairs, bosses,
// riddles, mouths, secret rooms) is hand-authored below. Output is committed
// to data/maps/*.json so the game itself never generates anything at runtime.
//
// Edge model: hw has h+1 rows of w chars; hw[k][x] is the edge between cell
// (x,k-1) and (x,k) — so south edge of (x,y) is hw[y][x], north is hw[y+1][x].
// vw has h rows of w+1 chars; west edge of (x,y) is vw[y][x], east vw[y][x+1].
// Codes: '0' open, '1' wall, 'd' door, 's' secret door, 'r' riddle door.
// y increases northward. Facing: 0=N 1=E 2=S 3=W.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'maps');
mkdirSync(OUT, { recursive: true });

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ri = (rng, n) => Math.floor(rng() * n);
const pick = (rng, arr) => arr[ri(rng, arr.length)];
const DX = [0, 1, 0, -1], DY = [1, 0, -1, 0];

class Grid {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.hw = Array.from({ length: h + 1 }, () => Array(w).fill('1'));
    this.vw = Array.from({ length: h }, () => Array(w + 1).fill('1'));
  }
  edge(x, y, dir) {
    if (dir === 0) return this.hw[y + 1][x];
    if (dir === 2) return this.hw[y][x];
    if (dir === 1) return this.vw[y][x + 1];
    return this.vw[y][x];
  }
  setEdge(x, y, dir, v) {
    if (dir === 0) this.hw[y + 1][x] = v;
    else if (dir === 2) this.hw[y][x] = v;
    else if (dir === 1) this.vw[y][x + 1] = v;
    else this.vw[y][x] = v;
  }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
}

function carveMaze(grid, cells, rng) {
  // recursive backtracker constrained to a set of cells ("x,y")
  const inR = (x, y) => cells.has(x + ',' + y);
  const startKey = [...cells][0];
  const [sx, sy] = startKey.split(',').map(Number);
  const visited = new Set([startKey]);
  const stack = [[sx, sy]];
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const opts = [];
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d], ny = cy + DY[d];
      if (grid.inside(nx, ny) && inR(nx, ny) && !visited.has(nx + ',' + ny)) opts.push(d);
    }
    if (!opts.length) { stack.pop(); continue; }
    const d = pick(rng, opts);
    const nx = cx + DX[d], ny = cy + DY[d];
    grid.setEdge(cx, cy, d, '0');
    visited.add(nx + ',' + ny);
    stack.push([nx, ny]);
  }
}

function reachable(grid, sx, sy, passable) {
  const seen = new Set([sx + ',' + sy]);
  const q = [[sx, sy]];
  while (q.length) {
    const [cx, cy] = q.shift();
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d], ny = cy + DY[d];
      if (!grid.inside(nx, ny) || seen.has(nx + ',' + ny)) continue;
      if (passable.includes(grid.edge(cx, cy, d))) { seen.add(nx + ',' + ny); q.push([nx, ny]); }
    }
  }
  return seen;
}

function buildDungeon(spec) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const m = tryBuildDungeon(spec, spec.seed + attempt * 7919);
    if (m) return m;
  }
  throw new Error('could not build ' + spec.id);
}

function tryBuildDungeon(spec, seed) {
  const rng = mulberry32(seed);
  const W = 22, H = 22;
  const g = new Grid(W, H);
  const split = spec.split; // {x0, y0} or null — riddle door on vw column x0 at row y0
  const sideOf = (x) => (split ? (x < split.x0 ? 0 : 1) : 0);

  // 1) maze per region
  if (split) {
    const a = new Set(), b = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) (x < split.x0 ? a : b).add(x + ',' + y);
    carveMaze(g, a, rng); carveMaze(g, b, rng);
    g.vw[split.y0][split.x0] = 'r';
  } else {
    const all = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) all.add(x + ',' + y);
    carveMaze(g, all, rng);
  }

  // 2) extra loops (don't cross the split column)
  const loops = Math.floor(W * H * 0.10);
  for (let i = 0; i < loops; i++) {
    const x = ri(rng, W), y = ri(rng, H), d = ri(rng, 4);
    const nx = x + DX[d], ny = y + DY[d];
    if (!g.inside(nx, ny)) continue;
    if (split && sideOf(x) !== sideOf(nx)) continue;
    if (g.edge(x, y, d) === '1') g.setEdge(x, y, d, '0');
  }

  // 3) open rooms
  for (let i = 0; i < (spec.rooms ?? 3); i++) {
    const rw = 2 + ri(rng, 2), rh = 2 + ri(rng, 2);
    const rx = 1 + ri(rng, W - rw - 2), ry = 1 + ri(rng, H - rh - 2);
    if (split && (rx < split.x0) !== (rx + rw - 1 < split.x0)) continue; // don't straddle
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) {
      if (x + 1 < rx + rw) g.setEdge(x, y, 1, '0');
      if (y + 1 < ry + rh) g.setEdge(x, y, 0, '0');
    }
  }

  // 4) doors on some openings, secret doors on some walls
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    for (const d of [0, 1]) { // each interior edge visited once via N/E
      const nx = x + DX[d], ny = y + DY[d];
      if (!g.inside(nx, ny)) continue;
      const e = g.edge(x, y, d);
      if (e === '0' && rng() < 0.10) g.setEdge(x, y, d, 'd');
    }
  }
  let secrets = spec.secretDoors ?? 6;
  let guard = 0;
  while (secrets > 0 && guard++ < 500) {
    const x = ri(rng, W), y = ri(rng, H), d = ri(rng, 4);
    const nx = x + DX[d], ny = y + DY[d];
    if (!g.inside(nx, ny)) continue;
    if (split && sideOf(x) !== sideOf(nx)) continue;
    if (g.edge(x, y, d) === '1') { g.setEdge(x, y, d, 's'); secrets--; }
  }

  // 5) hand-authored secret room: solid walls, one secret-door entrance
  const reserved = new Set();
  const cells = {};
  if (spec.secretRoom) {
    const r = spec.secretRoom;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d];
        const inRoom = nx >= r.x && nx < r.x + r.w && ny >= r.y && ny < r.y + r.h;
        if (!g.inside(nx, ny)) continue;
        g.setEdge(x, y, d, inRoom ? '0' : '1');
      }
      reserved.add(x + ',' + y);
    }
    g.setEdge(r.doorAt[0], r.doorAt[1], r.doorDir, 's');
    cells[r.x + ',' + r.y] = {
      t: 'treasure', id: spec.id + '_secret', once: true,
      items: r.items ?? [], gold: r.gold ?? 0,
      text: r.text ?? 'A hidden cache, undisturbed for an age.'
    };
  }

  // 6) connectivity repair (never across the split column)
  for (let i = 0; i < 200; i++) {
    const seen = reachable(g, spec.entry.x, spec.entry.y, ['0', 'd', 's', 'r']);
    if (seen.size === W * H) break;
    let fixed = false;
    outer: for (let y = 0; y < H && !fixed; y++) for (let x = 0; x < W; x++) {
      if (seen.has(x + ',' + y)) continue;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d];
        if (!g.inside(nx, ny) || !seen.has(nx + ',' + ny)) continue;
        if (split && sideOf(x) !== sideOf(nx)) continue;
        g.setEdge(x, y, d, '0'); fixed = true; break outer;
      }
    }
    if (!fixed) return null; // isolated pocket only joinable across split — regen
  }
  if (reachable(g, spec.entry.x, spec.entry.y, ['0', 'd', 's', 'r']).size !== W * H) return null;

  // 7) gating assertion: riddle door must be the only route to the far side
  if (split) {
    const noR = reachable(g, spec.entry.x, spec.entry.y, ['0', 'd', 's']);
    const k = spec.stairsDown ? spec.stairsDown.x + ',' + spec.stairsDown.y
      : spec.boss ? spec.boss.x + ',' + spec.boss.y : null;
    if (k && noR.has(k)) return null;
    if (sideOf(spec.entry.x) === sideOf(Number(k.split(',')[0]))) return null;
  }

  // 8) fixed cells: stairs, boss, mouths, then random specials
  const reserve = (x, y) => reserved.add(x + ',' + y);
  reserve(spec.entry.x, spec.entry.y);
  if (spec.stairsUp) {
    cells[spec.stairsUp.x + ',' + spec.stairsUp.y] = { t: 'stairs', dir: 'up', to: spec.stairsUp.to };
    reserve(spec.stairsUp.x, spec.stairsUp.y);
  }
  if (spec.stairsDown) {
    cells[spec.stairsDown.x + ',' + spec.stairsDown.y] = { t: 'stairs', dir: 'down', to: spec.stairsDown.to };
    reserve(spec.stairsDown.x, spec.stairsDown.y);
  }
  if (spec.boss) {
    cells[spec.boss.x + ',' + spec.boss.y] = {
      t: 'encounter', id: spec.boss.id, once: true, text: spec.boss.text,
      groups: spec.boss.groups, reward: spec.boss.reward, victoryText: spec.boss.victoryText
    };
    reserve(spec.boss.x, spec.boss.y);
  }
  if (spec.seal) {
    cells[spec.seal.x + ',' + spec.seal.y] = { t: 'seal', text: spec.seal.text, passText: spec.seal.passText };
    reserve(spec.seal.x, spec.seal.y);
  }

  const free = (sidePref) => {
    for (let tries = 0; tries < 800; tries++) {
      const x = ri(rng, W), y = ri(rng, H);
      if (reserved.has(x + ',' + y) || cells[x + ',' + y]) continue;
      if (sidePref != null && split && sideOf(x) !== sidePref) continue;
      return [x, y];
    }
    return null;
  };

  for (const mo of spec.mouths ?? []) {
    let x, y;
    if (mo.nearRiddle && split) { x = split.x0 - 1; y = split.y0; if (cells[x + ',' + y]) { const f = free(null); [x, y] = f; } }
    else { const f = free(null); if (!f) continue; [x, y] = f; }
    cells[x + ',' + y] = { t: 'mouth', text: mo.text };
    reserve(x, y);
  }
  const TRAPS = ['spikes', 'gas', 'pit', 'crumble'];
  for (let i = 0; i < (spec.traps ?? 4); i++) {
    const f = free(null); if (!f) break;
    cells[f[0] + ',' + f[1]] = { t: 'trap', trap: TRAPS[ri(rng, TRAPS.length)], dc: spec.trapDC ?? 12 };
    reserve(f[0], f[1]);
  }
  for (let i = 0; i < (spec.spinners ?? 2); i++) {
    const f = free(null); if (!f) break;
    cells[f[0] + ',' + f[1]] = { t: 'spinner' };
    reserve(f[0], f[1]);
  }
  for (let i = 0; i < (spec.teleports ?? 1); i++) {
    const f = free(null); if (!f) break;
    const side = split ? sideOf(f[0]) : null;
    const dst = free(side); if (!dst) break;
    cells[f[0] + ',' + f[1]] = { t: 'teleport', to: { x: dst[0], y: dst[1] } };
    reserve(f[0], f[1]);
  }

  return {
    id: spec.id, name: spec.name, kind: 'dungeon', dungeon: spec.dungeon, depth: spec.depth,
    w: W, h: H, dark: true, seed,
    hw: g.hw.map(r => r.join('')), vw: g.vw.map(r => r.join('')),
    cells, zones: spec.zones ?? {}, riddle: spec.riddle ?? null,
    entry: spec.entry, encounters: spec.encounters
  };
}

// ---------------------------------------------------------------- town
function buildTown() {
  const W = 24, H = 24;
  const g = new Grid(W, H);
  // open streets everywhere inside the wall
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x + 1 < W) g.setEdge(x, y, 1, '0');
    if (y + 1 < H) g.setEdge(x, y, 0, '0');
  }
  const cells = {};
  const buildings = [
    { id: 'hall', name: "Adventurers' Hall", x: 2, y: 17, w: 5, h: 4, door: [4, 17], dd: 2 },
    { id: 'greta', name: "Greta's Provisioner", x: 9, y: 17, w: 5, h: 4, door: [11, 17], dd: 2 },
    { id: 'review', name: 'The Magistrate\'s Court', x: 16, y: 17, w: 6, h: 4, door: [18, 17], dd: 2 },
    { id: 'temple', name: 'Temple of the Quiet Flame', x: 2, y: 11, w: 5, h: 4, door: [4, 11], dd: 2 },
    { id: 'belltower', name: 'The Bell Tower', x: 10, y: 11, w: 3, h: 3, door: [11, 11], dd: 2 },
    { id: 'spark', name: "Roskva's Spark House", x: 16, y: 11, w: 5, h: 4, door: [18, 11], dd: 2 },
    { id: 'goose', name: 'The Drowned Goose', x: 2, y: 4, w: 5, h: 4, door: [4, 7], dd: 0 },
    { id: 'tannery', name: 'The Boarded Tannery', x: 9, y: 4, w: 5, h: 4, door: [11, 7], dd: 0 },
    { id: 'hart', name: 'The Hart & Hollow', x: 16, y: 4, w: 5, h: 4, door: [18, 7], dd: 0 },
    { id: 'empty1', name: 'A Boarded House', x: 8, y: 13, w: 1, h: 1, door: [8, 13], dd: 2 },
    { id: 'empty2', name: 'A Boarded House', x: 14, y: 13, w: 1, h: 1, door: [14, 13], dd: 2 },
    { id: 'empty3', name: 'A Shuttered Stall', x: 8, y: 9, w: 1, h: 1, door: [8, 9], dd: 2 },
    { id: 'empty4', name: 'A Collapsed Granary', x: 14, y: 9, w: 1, h: 1, door: [14, 9], dd: 2 }
  ];
  for (const b of buildings) {
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d];
        const inB = nx >= b.x && nx < b.x + b.w && ny >= b.y && ny < b.y + b.h;
        if (g.inside(nx, ny) && !inB) g.setEdge(x, y, d, '1');
      }
      cells[x + ',' + y] = { t: 'building', id: b.id, name: b.name };
    }
    g.setEdge(b.door[0], b.door[1], b.dd, 'd');
  }
  // gates
  cells['22,9'] = { t: 'gate', id: 'east_gate', name: 'The East Gate', to: { map: 'barrow1', x: 2, y: 11, facing: 1 } };
  cells['11,22'] = { t: 'gate', id: 'north_gate', name: 'The North Gate' };
  return {
    id: 'town', name: 'Thornmere', kind: 'town', w: W, h: H, dark: false, seed: 0,
    hw: g.hw.map(r => r.join('')), vw: g.vw.map(r => r.join('')),
    cells, zones: {}, riddle: null,
    entry: { x: 4, y: 16, facing: 0 },
    encounters: {
      day: { rate: 1, groups: '1', table: [{ monster: 'fen_stray', weight: 2 }, { monster: 'footpad', weight: 1 }] },
      night: {
        rate: 6, groups: '1d2', table: [
          { monster: 'footpad', weight: 3 }, { monster: 'fen_stray', weight: 2 },
          { monster: 'tavern_tough', weight: 2 }, { monster: 'gate_wight', weight: 1 }]
      }
    }
  };
}

// ---------------------------------------------------------------- dungeon specs
const SPECS = [
  {
    id: 'undercroft1', name: 'The Sunken Undercroft — Drowned Cellars', dungeon: 'The Sunken Undercroft', depth: 1, seed: 101,
    entry: { x: 2, y: 2, facing: 0 },
    stairsUp: { x: 2, y: 2, to: { map: 'town', x: 11, y: 8, facing: 2 } },
    stairsDown: { x: 19, y: 19, to: { map: 'undercroft2', x: 19, y: 19, facing: 2 } },
    split: { x0: 14, y0: 10 },
    riddle: {
      question: 'Each night I die to light the hall, and my king wears seven of me for a crown. Name me.',
      answers: ['candle', 'a candle', 'the candle', 'candles', 'flame', 'a flame'],
      hint: 'Answer as a chandler would.'
    },
    rooms: 3, secretDoors: 6, traps: 4, spinners: 1, teleports: 1, trapDC: 11,
    zones: { dark: [{ x: 16, y: 14, w: 4, h: 4 }] },
    mouths: [
      { text: 'A mouth of cracked plaster grinds: "The wax remembers what the river forgot. Below, the King of Candles holds the First Verse in molten hands."' },
      { text: 'The stone mouth whispers: "The split door asks what the King wears for a crown. Answer as a chandler would."', nearRiddle: true },
      { text: 'A drowned voice gurgles from the wall: "The tanners sealed the cellar. The cellar did not agree to stay sealed."' }
    ],
    secretRoom: {
      x: 17, y: 2, w: 2, h: 2, doorAt: [17, 2], doorDir: 3,
      items: ['greatcandle', 'healing_draught', 'healing_draught'], gold: 120,
      text: 'A smuggler\'s nook behind the wall: candles, draughts, and a purse of old coin.'
    },
    encounters: {
      rate: 7, groups: '1d2', table: [
        { monster: 'fen_rat', weight: 3 }, { monster: 'grave_mite', weight: 2 },
        { monster: 'mirefang', weight: 3 }, { monster: 'cellar_creep', weight: 2 },
        { monster: 'fen_adder', weight: 1 }, { monster: 'rust_grub', weight: 2 },
        { monster: 'crypt_thief', weight: 2 }, { monster: 'sodden_dead', weight: 1 }]
    }
  },
  {
    id: 'undercroft2', name: 'The Sunken Undercroft — The Old Crypts', dungeon: 'The Sunken Undercroft', depth: 2, seed: 202,
    entry: { x: 19, y: 19, facing: 2 },
    stairsUp: { x: 19, y: 19, to: { map: 'undercroft1', x: 19, y: 19, facing: 0 } },
    boss: {
      x: 3, y: 17, id: 'tallow_king',
      text: 'A vaulted hall ankle-deep in warm wax. Ten thousand candle-stubs burn blue. On a throne of wicks sits the TALLOW KING, and the First Verse hums in his molten fist.',
      groups: [
        { monster: 'tallow_king', count: '1' },
        { monster: 'tallow_acolyte', count: '1d2' },
        { monster: 'tallow_crawler', count: '1d3' }],
      reward: { items: ['verse_first'], gold: 500 },
      victoryText: 'The Tallow King slumps into a spreading pool of wax. From the ruin you lift a sheet of hammered tin, pierced with note-holes: THE FIRST VERSE. As it cools, a whisper: "The second sleeps east, under the singing mounds."'
    },
    rooms: 4, secretDoors: 7, traps: 5, spinners: 2, teleports: 2, trapDC: 12,
    zones: { dark: [{ x: 8, y: 8, w: 4, h: 4 }] },
    mouths: [
      { text: 'A wax-clogged mouth hums: "He renders all his subjects in the end. Bring a light he cannot eat."' },
      { text: 'The mouth recites, bored: "Crypt seven, row two. Reserved. Do not tarry."' }
    ],
    secretRoom: {
      x: 17, y: 3, w: 2, h: 2, doorAt: [17, 3], doorDir: 3,
      items: ['tallowbrand'], gold: 200,
      text: 'Behind the false wall, a blade quenched in royal wax: TALLOWBRAND, burning without heat.'
    },
    encounters: {
      rate: 8, groups: '1d2', table: [
        { monster: 'sodden_dead', weight: 3 }, { monster: 'bonechatter', weight: 3 },
        { monster: 'tallow_crawler', weight: 2 }, { monster: 'wisplight', weight: 2 },
        { monster: 'mire_spawn', weight: 2 }, { monster: 'tallow_acolyte', weight: 2 },
        { monster: 'fen_adder', weight: 1 }]
    }
  },
  {
    id: 'barrow1', name: 'The Howling Barrow — Outer Mounds', dungeon: 'The Howling Barrow', depth: 1, seed: 303,
    entry: { x: 2, y: 11, facing: 1 },
    stairsUp: { x: 2, y: 11, to: { map: 'town', x: 21, y: 9, facing: 3 } },
    stairsDown: { x: 19, y: 3, to: { map: 'barrow2', x: 19, y: 3, facing: 3 } },
    rooms: 4, secretDoors: 7, traps: 4, spinners: 3, teleports: 1, trapDC: 13,
    zones: { dark: [{ x: 6, y: 16, w: 4, h: 3 }, { x: 14, y: 8, w: 3, h: 3 }] },
    mouths: [
      { text: 'Wind hisses through a stone flute: "The mounds sing in rounds. The deepest verse is hollow, and the hollow verse is deep."' },
      { text: 'A mouth of knotted roots: "Walk widdershins where the wind turns you, or be turned for good."' },
      { text: 'The flute-stone sighs: "The Choir keeps what it stole. The Eldest keeps the Choir."' }
    ],
    secretRoom: {
      x: 18, y: 17, w: 2, h: 2, doorAt: [18, 17], doorDir: 3,
      items: ['wardshield'], gold: 300,
      text: 'A war-grave unrobbed: upon the bier rests THE WARDSHIELD, its rim ringed with a verse of the Founding Song.'
    },
    encounters: {
      rate: 8, groups: '1d3', table: [
        { monster: 'moor_hound', weight: 3 }, { monster: 'fen_lurker', weight: 3 },
        { monster: 'hollow_man', weight: 2 }, { monster: 'tomb_spider', weight: 2 },
        { monster: 'wind_shrieker', weight: 2 }, { monster: 'barrow_wight', weight: 1 }]
    }
  },
  {
    id: 'barrow2', name: 'The Howling Barrow — The Wind Galleries', dungeon: 'The Howling Barrow', depth: 2, seed: 404,
    entry: { x: 19, y: 3, facing: 3 },
    stairsUp: { x: 19, y: 3, to: { map: 'barrow1', x: 19, y: 3, facing: 1 } },
    stairsDown: { x: 3, y: 19, to: { map: 'barrow3', x: 3, y: 19, facing: 1 } },
    split: { x0: 8, y0: 12 },
    riddle: {
      question: 'I sing through every mound yet own no mouth; I touch all faces and hold no shape. What am I?',
      answers: ['wind', 'the wind', 'a wind', 'air', 'the air'],
      hint: 'It is howling at you now.'
    },
    rooms: 4, secretDoors: 8, traps: 5, spinners: 3, teleports: 2, trapDC: 14,
    zones: {
      dark: [{ x: 2, y: 2, w: 5, h: 4 }, { x: 10, y: 14, w: 4, h: 4 }],
      antimagic: [{ x: 12, y: 5, w: 3, h: 3 }]
    },
    mouths: [
      { text: 'The gallery itself speaks with a hundred small holes: "What sings without a mouth opens doors without a key."', nearRiddle: true },
      { text: 'A mouth full of dust: "The sorcerers were buried with their books. The books did the digging out."' }
    ],
    secretRoom: {
      x: 16, y: 16, w: 2, h: 2, doorAt: [16, 16], doorDir: 2,
      items: ['thunder_flask', 'thunder_flask', 'strong_draught'], gold: 350,
      text: 'A priest-hole from the wight-wars: bottled thunder and a strong draught, still corked.'
    },
    encounters: {
      rate: 9, groups: '1d3', table: [
        { monster: 'barrow_wight', weight: 3 }, { monster: 'hollow_man', weight: 3 },
        { monster: 'wind_shrieker', weight: 2 }, { monster: 'grave_worm', weight: 2 },
        { monster: 'fen_hag', weight: 2 }, { monster: 'tomb_spider', weight: 2 }]
    }
  },
  {
    id: 'barrow3', name: 'The Howling Barrow — Hall of the Choir', dungeon: 'The Howling Barrow', depth: 3, seed: 505,
    entry: { x: 3, y: 19, facing: 1 },
    stairsUp: { x: 3, y: 19, to: { map: 'barrow2', x: 3, y: 19, facing: 0 } },
    boss: {
      x: 18, y: 4, id: 'choir_fight',
      text: 'A round hall of standing stones, each carved with an open mouth. The CHOIR OF HOLLOW MEN stands in ranks, and at the centre, vast and patient, THE CHOIR\'S ELDEST raises one hand. The grave-silk cord of the Second Verse hangs at its throat.',
      groups: [
        { monster: 'choir_eldest', count: '1' },
        { monster: 'hollow_cantor', count: '1d2+1' },
        { monster: 'hollow_man', count: '2d3' },
        { monster: 'hollow_man', count: '2d3' }],
      reward: { items: ['verse_second'], gold: 1200 },
      victoryText: 'The Eldest folds like an emptied robe. The knotted cord slides free: THE SECOND VERSE. In the silence, every stone mouth says together: "The third is in the Needle. The Needle\'s door is your own bell tower, and it will not open to the unriddled."'
    },
    rooms: 5, secretDoors: 8, traps: 5, spinners: 4, teleports: 3, trapDC: 14,
    zones: {
      dark: [{ x: 8, y: 2, w: 4, h: 5 }],
      antimagic: [{ x: 4, y: 8, w: 3, h: 3 }]
    },
    mouths: [
      { text: 'A stone mouth sings one pure note, then: "Stand not in the front rank when the Eldest draws breath."' },
      { text: 'The mouth murmurs: "A black fork tunes the dead. Whoever holds it tunes the living too."' }
    ],
    secretRoom: {
      x: 17, y: 17, w: 2, h: 2, doorAt: [17, 17], doorDir: 3,
      items: ['cantors_fork'], gold: 400,
      text: 'A rehearsal cell, soundproofed with grave-wool. On a velvet rag: THE CANTOR\'S FORK, black bone, still humming.'
    },
    encounters: {
      rate: 9, groups: '1d3', table: [
        { monster: 'barrow_wight', weight: 2 }, { monster: 'wight_lord', weight: 1 },
        { monster: 'barrow_sorcerer', weight: 2 }, { monster: 'mistcaller', weight: 2 },
        { monster: 'peat_troll', weight: 2 }, { monster: 'grave_worm', weight: 2 },
        { monster: 'hollow_cantor', weight: 1 }]
    }
  },
  {
    id: 'needle1', name: 'Maldrec\'s Needle — The Threshold', dungeon: 'Maldrec\'s Needle', depth: 1, seed: 606,
    entry: { x: 11, y: 2, facing: 0 },
    stairsUp: { x: 11, y: 2, to: { map: 'town', x: 11, y: 10, facing: 2 } },
    stairsDown: { x: 19, y: 19, to: { map: 'needle2', x: 19, y: 19, facing: 3 } },
    rooms: 4, secretDoors: 8, traps: 5, spinners: 3, teleports: 4, trapDC: 15,
    zones: { antimagic: [{ x: 4, y: 10, w: 4, h: 3 }, { x: 15, y: 4, w: 3, h: 4 }] },
    mouths: [
      { text: 'A mouth of green glass: "You climb by going in. The Needle is taller on the inside, and deeper than tall."' },
      { text: 'It titters: "The master copies the Verses over and over. He cannot make them sing. It has made him worse."' }
    ],
    secretRoom: null,
    encounters: {
      rate: 9, groups: '1d3', table: [
        { monster: 'spirelash', weight: 3 }, { monster: 'glass_revenant', weight: 2 },
        { monster: 'needle_scribe', weight: 2 }, { monster: 'basilisk_moth', weight: 2 },
        { monster: 'storm_sentinel', weight: 2 }]
    }
  },
  {
    id: 'needle2', name: 'Maldrec\'s Needle — The Copying Floors', dungeon: 'Maldrec\'s Needle', depth: 2, seed: 707,
    entry: { x: 19, y: 19, facing: 3 },
    stairsUp: { x: 19, y: 19, to: { map: 'needle1', x: 19, y: 19, facing: 1 } },
    stairsDown: { x: 3, y: 3, to: { map: 'needle3', x: 3, y: 3, facing: 0 } },
    rooms: 5, secretDoors: 9, traps: 5, spinners: 3, teleports: 5, trapDC: 15,
    zones: {
      antimagic: [{ x: 8, y: 8, w: 4, h: 4 }, { x: 16, y: 12, w: 3, h: 3 }],
      dark: [{ x: 2, y: 12, w: 3, h: 4 }]
    },
    mouths: [
      { text: 'A mouth shaped like an inkwell: "Every copy is a little wronger. The wrongness has to live somewhere."' },
      { text: 'It whispers: "The captain of the east gate never came home. Her mail hangs where the scribes dare not write."' }
    ],
    secretRoom: {
      x: 17, y: 4, w: 2, h: 2, doorAt: [17, 4], doorDir: 3,
      items: ['fenwarden_mail'], gold: 500,
      text: 'A trophy alcove, lovingly dusted: THE FEN-WARDEN\'S MAIL, taken from the east gate\'s last captain.'
    },
    encounters: {
      rate: 10, groups: '1d3', table: [
        { monster: 'glass_revenant', weight: 3 }, { monster: 'needle_scribe', weight: 3 },
        { monster: 'rune_golem', weight: 2 }, { monster: 'illusion_weaver', weight: 2 },
        { monster: 'basilisk_moth', weight: 2 }, { monster: 'storm_sentinel', weight: 2 }]
    }
  },
  {
    id: 'needle3', name: 'Maldrec\'s Needle — The Gauntlet', dungeon: 'Maldrec\'s Needle', depth: 3, seed: 808,
    entry: { x: 3, y: 3, facing: 0 },
    stairsUp: { x: 3, y: 3, to: { map: 'needle2', x: 3, y: 3, facing: 2 } },
    stairsDown: { x: 19, y: 3, to: { map: 'needle4', x: 11, y: 2, facing: 0 } },
    split: { x0: 12, y0: 8 },
    riddle: {
      question: 'I answer in your own voice, yet I never speak first. What am I?',
      answers: ['echo', 'an echo', 'the echo', 'echoes'],
      hint: 'Shout into the stairwell and listen.'
    },
    rooms: 5, secretDoors: 9, traps: 6, spinners: 4, teleports: 5, trapDC: 16,
    zones: {
      antimagic: [{ x: 13, y: 13, w: 4, h: 4 }, { x: 5, y: 15, w: 3, h: 3 }],
      dark: [{ x: 8, y: 17, w: 4, h: 3 }]
    },
    mouths: [
      { text: 'A mouth with too many teeth: "Ask the stairwell what it says when you say nothing."', nearRiddle: true },
      { text: 'It recites: "Above this floor, only one door, and the door is a question, and the question has eaten every answer but one."' }
    ],
    secretRoom: {
      x: 18, y: 18, w: 2, h: 2, doorAt: [18, 18], doorDir: 2,
      items: ['stormpike'], gold: 700,
      text: 'A lightning-scarred vault. Bolted to the floor, still humming: THE STORMPIKE.'
    },
    encounters: {
      rate: 10, groups: '1d3', table: [
        { monster: 'rune_golem', weight: 2 }, { monster: 'illusion_weaver', weight: 2 },
        { monster: 'pit_horror', weight: 2 }, { monster: 'fell_chorister', weight: 2 },
        { monster: 'maldrec_hand', weight: 2 }, { monster: 'glass_revenant', weight: 1 }]
    }
  },
  {
    id: 'needle4', name: 'Maldrec\'s Needle — The Unsung Sanctum', dungeon: 'Maldrec\'s Needle', depth: 4, seed: 909,
    entry: { x: 11, y: 2, facing: 0 },
    stairsUp: { x: 11, y: 2, to: { map: 'needle3', x: 19, y: 3, facing: 2 } },
    seal: {
      x: 11, y: 17,
      text: 'A door of grey glass, graven with seven interlocking riddles. It does not ask them aloud; it asks them all at once, in the bone. Only a RIDDLEMASTER could hold seven answers in one breath.',
      passText: 'Your Riddlemaster lays a hand on the glass and answers all seven riddles in a single exhaled word. The seal unwinds like thread.'
    },
    boss: {
      x: 11, y: 19, id: 'maldrec_fight',
      text: 'The top of the Needle is open to a sky that is wrong. At a lectern of black glass stands MALDREC THE UNSUNG, three hundred years of rejection in his eyes, the Third Verse chained to his wrist. "At last," he says. "An audience."',
      groups: [{ monster: 'maldrec', count: '1' }],
      reward: { items: ['verse_third'], gold: 2000 },
      victoryText: 'Maldrec falls, and for one moment his Unsinging inverts: every stone in the Needle sounds a true note. The bronze sliver unchains itself and settles in your hand: THE THIRD VERSE. Take the three Verses to the bell tower of Thornmere, and sing the gates whole.'
    },
    rooms: 4, secretDoors: 8, traps: 6, spinners: 4, teleports: 6, trapDC: 16,
    zones: {
      antimagic: [{ x: 2, y: 8, w: 4, h: 4 }, { x: 16, y: 8, w: 4, h: 4 }, { x: 9, y: 12, w: 5, h: 3 }]
    },
    mouths: [
      { text: 'A mouth like a keyhole: "He will greet you in his numbers. Trust only what survives being seen."' },
      { text: 'It says, very quietly: "When he begins to unsing, stop being polite."' }
    ],
    secretRoom: {
      x: 2, y: 18, w: 2, h: 2, doorAt: [2, 18], doorDir: 2,
      items: ['needle_shard', 'strong_draught', 'strong_draught'], gold: 800,
      text: 'Maldrec\'s first workshop, walled over in shame. Among the failures: a NEEDLE SHARD, sharper than his grudge.'
    },
    encounters: {
      rate: 10, groups: '1d4', table: [
        { monster: 'maldrec_hand', weight: 3 }, { monster: 'fell_chorister', weight: 2 },
        { monster: 'illusion_weaver', weight: 2 }, { monster: 'rune_golem', weight: 2 },
        { monster: 'pit_horror', weight: 2 }]
    }
  }
];

const town = buildTown();
writeFileSync(join(OUT, 'town.json'), JSON.stringify(town, null, 1));
console.log('wrote town.json');
for (const spec of SPECS) {
  const m = buildDungeon(spec);
  writeFileSync(join(OUT, m.id + '.json'), JSON.stringify(m, null, 1));
  console.log(`wrote ${m.id}.json (seed ${m.seed})`);
}
console.log('done.');

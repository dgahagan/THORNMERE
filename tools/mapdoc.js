#!/usr/bin/env node
// mapdoc.js — regenerate dev/maps.md from data/maps/*.json (the source of truth).
//
// Emits a derived difficulty summary (computed from the maps + monsters.json)
// followed by an ASCII floor-grid per map plus tables (connections, riddle,
// mouths, traps, teleports, boss/fixed encounters, secret rooms, zones,
// wandering encounter table). Re-run whenever a map changes: node tools/mapdoc.js
//
// Edge encoding (data/maps/*.json hw/vw):  0 open · 1 wall · d door · r riddle · s secret
//   hw[y][x] = wall on the SOUTH edge of cell (x,y)   (h+1 rows)
//   vw[y][x] = wall on the WEST  edge of cell (x,y)   (w+1 cols)
// Facing: 0 NORTH (+y), 1 EAST (+x), 2 SOUTH (-y), 3 WEST (-x). North is UP here.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAPDIR = path.join(ROOT, 'data', 'maps');
const OUT = path.join(ROOT, 'dev', 'maps.md');

// Average roll of a dice spec like "2d6+1", "1d8", "60d1".  XdY(+Z) → X·(Y+1)/2 + Z
function diceAvg(spec) {
  if (spec == null) return 0;
  if (typeof spec === 'number') return spec;
  const m = String(spec).match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!m) { const n = Number(spec); return Number.isFinite(n) ? n : 0; }
  const [, n, sides, bonus] = m;
  return Number(n) * (Number(sides) + 1) / 2 + (bonus ? Number(bonus) : 0);
}

const round1 = n => Math.round(n * 10) / 10;

// Render order: town hub first, then the three dungeons in quest order.
const ORDER = [
  'town',
  'undercroft1', 'undercroft2',
  'barrow1', 'barrow2', 'barrow3',
  'needle1', 'needle2', 'needle3', 'needle4',
];

const FACING = ['N', 'E', 'S', 'W'];

// Glyph for a cell's interior (3 chars wide, centred). Highest-priority wins.
function cellGlyph(map, x, y, special) {
  const key = x + ',' + y;
  if (map.entry && map.entry.x === x && map.entry.y === y) return ' @ ';
  if (!special) return null;
  switch (special.t) {
    case 'building': return '▓▓▓'; // ▓▓▓ solid block
    case 'stairs':   return special.dir === 'up' ? ' ▲ ' : ' ▼ '; // ▲ ▼
    case 'gate':     return ' G ';
    case 'statue':   return ' I ';
    case 'mouth':    return ' m ';
    case 'trap':     return ' ^ ';
    case 'spinner':  return ' * ';
    case 'teleport': return ' ~ ';
    case 'seal':     return ' ☒ '; // ☒
    case 'encounter':return ' B '; // fixed encounter / boss
    case 'treasure': return ' $ ';
    default:         return ' ? ';
  }
  // (key unused but kept for clarity of intent)
  void key;
}

// Is (x,y) inside any rectangle of the named zone?
function inZone(map, zone, x, y) {
  const rects = map.zones?.[zone];
  if (!rects) return false;
  return rects.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

const HSEG = { '0': '   ', '1': '───', d: '─D─', r: '─R─', s: '─s─' };
const VEDGE = { '0': ' ', '1': '│', d: 'D', r: 'R', s: 's' };

function renderGrid(map) {
  const { w, h } = map;
  const lines = [];
  // North is up: iterate y from h-1 (top) down to 0 (bottom).
  for (let y = h - 1; y >= 0; y--) {
    // horizontal wall line ABOVE this row = north edge of (x,y) = hw[y+1][x]
    let top = '   +';
    for (let x = 0; x < w; x++) top += HSEG[map.hw[y + 1][x]] + '+';
    lines.push(top);
    // cell content line, with west/east vertical edges
    let row = String(y).padStart(2, ' ') + ' ';
    for (let x = 0; x < w; x++) {
      row += VEDGE[map.vw[y][x]];
      const sp = map.cells?.[x + ',' + y];
      let g = cellGlyph(map, x, y, sp);
      if (g === null) {
        // empty floor: overlay zone footprint so difficulty reads at a glance
        if (inZone(map, 'antimagic', x, y)) g = ' ÷ '; // ÷ anti-magic
        else if (inZone(map, 'dark', x, y)) g = ' · '; // · extra-dark
        else g = '   ';
      }
      row += g;
    }
    row += VEDGE[map.vw[y][w]]; // east border of last column
    lines.push(row);
  }
  // bottom border = south edge of row 0 = hw[0][x]
  let bot = '   +';
  for (let x = 0; x < w; x++) bot += HSEG[map.hw[0][x]] + '+';
  lines.push(bot);
  // x-axis labels under the grid
  let xl = '   ';
  for (let x = 0; x < w; x++) xl += ' ' + String(x).padStart(2, ' ');
  lines.push(xl);
  return lines.join('\n');
}

function mapLink(id) { return id; }

// GitHub-style heading anchor (lowercase, strip punctuation, spaces→hyphens).
function anchor(s) {
  return s.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s/g, '-');
}

function section(map) {
  const out = [];
  out.push(`## ${map.name}`);
  out.push('');
  const props = [`\`${map.id}\``, `${map.w}×${map.h}`, map.kind];
  if (map.dark) props.push('**dark** (needs light)');
  out.push('- ' + props.join(' · '));
  if (map.entry) out.push(`- Entry: (${map.entry.x},${map.entry.y}) facing ${FACING[map.entry.facing]}`);
  // zones
  if (map.zones) {
    for (const [z, rects] of Object.entries(map.zones)) {
      const desc = rects.map(r => `(${r.x},${r.y}) ${r.w}×${r.h}`).join(', ');
      out.push(`- Zone **${z}**: ${desc}`);
    }
  }
  out.push('');
  out.push('```');
  out.push(renderGrid(map));
  out.push('```');
  out.push('');

  // ---- cell tables, grouped by type ----
  const cells = Object.entries(map.cells || {}).map(([k, v]) => {
    const [x, y] = k.split(',').map(Number);
    return { x, y, k, ...v };
  });
  const by = t => cells.filter(c => c.t === t).sort((a, b) => a.y - b.y || a.x - b.x);

  const connections = [...by('stairs'), ...by('gate')];
  if (connections.length) {
    out.push('**Connections**');
    out.push('');
    out.push('| Cell | Kind | Leads to |');
    out.push('|---|---|---|');
    for (const c of connections) {
      const kind = c.t === 'gate' ? `gate — ${c.name}` : `stairs ${c.dir}`;
      const to = c.to ? `${mapLink(c.to.map)} (${c.to.x},${c.to.y}) facing ${FACING[c.to.facing]}` : '—';
      out.push(`| (${c.x},${c.y}) | ${kind} | ${to} |`);
    }
    out.push('');
  }

  if (map.riddle && map.riddle.question) {
    out.push('**Riddle door** (`R` on grid)');
    out.push('');
    out.push(`- *"${map.riddle.question}"*`);
    out.push(`- Hint: *${map.riddle.hint}*`);
    out.push(`- Answers: ${map.riddle.answers.map(a => '`' + a + '`').join(', ')}`);
    out.push('');
  }

  const seals = by('seal');
  if (seals.length) {
    out.push('**Seal door** (`☒` on grid — Riddlemaster only)');
    out.push('');
    for (const c of seals) out.push(`- (${c.x},${c.y}): *"${c.text}"*`);
    out.push('');
  }

  const bosses = by('encounter');
  if (bosses.length) {
    out.push('**Fixed encounters** (`B` on grid)');
    out.push('');
    for (const c of bosses) {
      const who = (c.groups || []).map(g => `${g.count}× ${g.monster}`).join(', ');
      const rw = c.reward ? ` — drops ${(c.reward.items || []).join(', ')}${c.reward.gold ? ` + ${c.reward.gold}g` : ''}` : '';
      out.push(`- (${c.x},${c.y}): ${who}${rw}`);
    }
    out.push('');
  }

  const treasures = by('treasure');
  if (treasures.length) {
    out.push('**Secret rooms / caches** (`$` on grid)');
    out.push('');
    for (const c of treasures) {
      const loot = [...(c.items || [])];
      if (c.gold) loot.push(`${c.gold}g`);
      out.push(`- (${c.x},${c.y}): ${loot.join(', ')}${c.text ? ` — *${c.text}*` : ''}`);
    }
    out.push('');
  }

  const hazards = [...by('trap'), ...by('spinner'), ...by('teleport')];
  if (hazards.length) {
    out.push('**Hazards** (`^` trap · `*` spinner · `~` teleport)');
    out.push('');
    out.push('| Cell | Type | Detail |');
    out.push('|---|---|---|');
    for (const c of hazards) {
      let detail = '—';
      if (c.t === 'trap') detail = `${c.trap} (DC ${c.dc})`;
      if (c.t === 'teleport') detail = `→ (${c.to.x},${c.to.y})`;
      out.push(`| (${c.x},${c.y}) | ${c.t} | ${detail} |`);
    }
    out.push('');
  }

  const mouths = by('mouth');
  if (mouths.length) {
    out.push('**Magic mouths** (`m` on grid)');
    out.push('');
    for (const c of mouths) out.push(`- (${c.x},${c.y}): *${c.text}*`);
    out.push('');
  }

  const statues = by('statue');
  if (statues.length) {
    out.push('**Statues** (`I` on grid)');
    out.push('');
    for (const c of statues) out.push(`- (${c.x},${c.y}): ${c.name || c.id}`);
    out.push('');
  }

  const buildings = by('building');
  if (buildings.length) {
    // collapse to unique building ids with their bounding-box footprint
    const groups = new Map();
    for (const c of buildings) {
      if (!groups.has(c.id)) groups.set(c.id, { name: c.name, xs: [], ys: [] });
      const g = groups.get(c.id);
      g.xs.push(c.x); g.ys.push(c.y);
    }
    out.push(`**Buildings** (▓ on grid — ${groups.size} structures)`);
    out.push('');
    out.push('| Building | Footprint (x,y range) | Cells |');
    out.push('|---|---|---|');
    for (const [, g] of groups) {
      const bx = `(${Math.min(...g.xs)}–${Math.max(...g.xs)}, ${Math.min(...g.ys)}–${Math.max(...g.ys)})`;
      out.push(`| ${g.name} | ${bx} | ${g.xs.length} |`);
    }
    out.push('');
  }

  // wandering encounters
  const enc = map.encounters;
  if (enc) {
    if (map.kind === 'town' && (enc.day || enc.night)) {
      for (const phase of ['day', 'night']) {
        const e = enc[phase];
        if (!e) continue;
        out.push(`**Wandering encounters — ${phase}** (rate ${e.rate}%, groups ${e.groups})`);
        out.push('');
        out.push(e.table.map(t => `${t.monster} (${t.weight})`).join(' · '));
        out.push('');
      }
    } else if (enc.table) {
      out.push(`**Wandering encounters** (rate ${enc.rate}%, groups ${enc.groups})`);
      out.push('');
      out.push(enc.table.map(t => `${t.monster} (${t.weight})`).join(' · '));
      out.push('');
    }
  }

  out.push('---');
  out.push('');
  return out.join('\n');
}

// Best single-hit damage a monster can land in a round: its hardest melee/ranged
// attack or single-target damage spell (party/all-group spells handled separately).
function bestHit(mon) {
  let best = 0;
  for (const a of mon.attacks || []) best = Math.max(best, diceAvg(a.dmg));
  for (const s of mon.spells || []) {
    if (s.kind === 'damage' && (s.target === 'char' || s.target === 'foe')) best = Math.max(best, diceAvg(s.dice));
  }
  return best;
}

// Count an edge char across both wall grids (each edge appears once).
function countEdges(map, ch) {
  let n = 0;
  for (const row of map.hw) for (const c of row) if (c === ch) n++;
  for (const row of map.vw) for (const c of row) if (c === ch) n++;
  return n;
}

function zoneCells(map, zone) {
  return (map.zones?.[zone] || []).reduce((a, r) => a + r.w * r.h, 0);
}

function difficulty(map, mon) {
  const cells = Object.values(map.cells || {});
  const traps = cells.filter(c => c.t === 'trap');
  const d = {
    id: map.id, name: map.name, kind: map.kind,
    dark: !!map.dark,
    antimagic: zoneCells(map, 'antimagic'),
    extraDark: zoneCells(map, 'dark'),
    doors: countEdges(map, 'd'),
    secrets: countEdges(map, 's'),
    riddle: !!(map.riddle && map.riddle.question),
    seals: cells.filter(c => c.t === 'seal').length,
    spinners: cells.filter(c => c.t === 'spinner').length,
    teleports: cells.filter(c => c.t === 'teleport').length,
    traps: traps.length,
    trapDC: traps.length ? round1(traps.reduce((a, t) => a + (t.dc || 0), 0) / traps.length) : 0,
    enc: null, bosses: [],
  };

  // wandering-encounter expectations (rough, weighted over the roster)
  const tables = [];
  const e = map.encounters;
  if (e) {
    if (map.kind === 'town') { if (e.night) tables.push(['night', e.night]); }
    else if (e.table) tables.push(['', e]);
  }
  if (tables.length) {
    const [, enc] = tables[0];
    const W = enc.table.reduce((a, t) => a + t.weight, 0);
    let perMon = 0, perHP = 0, perDmg = 0, tmin = 99, tmax = 0;
    for (const row of enc.table) {
      const m = mon[row.monster]; if (!m) continue;
      const p = row.weight / W, gsz = diceAvg(m.group);
      perMon += p * gsz;
      perHP += p * gsz * diceAvg(m.hp);
      perDmg += p * gsz * bestHit(m);
      tmin = Math.min(tmin, m.tier); tmax = Math.max(tmax, m.tier);
    }
    const eGroups = Math.min(4, diceAvg(enc.groups));
    d.enc = {
      rate: enc.rate, groups: enc.groups,
      eEnemies: round1(eGroups * perMon),
      eHP: Math.round(eGroups * perHP),
      eDmg: Math.round(eGroups * perDmg),
      tierMin: tmin === 99 ? '—' : tmin, tierMax: tmax,
    };
  }

  // fixed-encounter bosses on this level
  for (const c of cells.filter(c => c.t === 'encounter')) {
    for (const g of c.groups || []) {
      const m = mon[g.monster]; if (!m) continue;
      let aoe = 0;
      for (const s of m.spells || []) if (s.kind === 'damage' && (s.target === 'party' || s.target === 'allgroups')) aoe = Math.max(aoe, diceAvg(s.dice));
      d.bosses.push({ name: m.name, tier: m.tier, hp: Math.round(diceAvg(m.hp)), ac: m.ac, hit: round1(bestHit(m)), aoe: Math.round(aoe) });
    }
  }
  return d;
}

function difficultySection(ids, maps, mon) {
  const rows = ids.map(id => difficulty(maps.get(id), mon));
  const out = [];
  out.push('## Difficulty Summary (derived)');
  out.push('');
  out.push('Computed by `tools/mapdoc.js` from the maps + `data/monsters.json`.');
  out.push('Encounter figures are **expected values per wandering fight** (weighted');
  out.push('over the roster, group-count averaged and capped at 4) — coarse but');
  out.push('comparable across levels. *E[foes]* = expected enemies; *E[HP]* = their');
  out.push('combined health; *E[dmg/rd]* = their combined output if each lands its');
  out.push('best single hit in a round (party-wide boss AOE is in the boss table).');
  out.push('');

  // navigation / hazard friction
  out.push('### Navigation & hazards');
  out.push('');
  out.push('| Level | Dark | Anti-magic cells | Traps (avg DC) | Spinners | Teleports | Secret doors | Locked gate |');
  out.push('|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    if (r.kind === 'town') continue;
    const dark = r.dark ? (r.extraDark ? `yes +${r.extraDark}z` : 'yes') : '—';
    const gate = r.seals ? 'seal (Riddlemaster)' : r.riddle ? 'riddle' : '—';
    const trap = r.traps ? `${r.traps} (${r.trapDC})` : '—';
    out.push(`| ${r.name} | ${dark} | ${r.antimagic || '—'} | ${trap} | ${r.spinners || '—'} | ${r.teleports || '—'} | ${r.secrets || '—'} | ${gate} |`);
  }
  out.push('');

  // encounter pressure
  out.push('### Encounter pressure');
  out.push('');
  out.push('| Level | Rate % | Groups | Tier range | E[foes] | E[HP] | E[dmg/rd] |');
  out.push('|---|---|---|---|---|---|---|');
  for (const r of rows) {
    if (!r.enc) continue;
    const label = r.kind === 'town' ? `${r.name} (night)` : r.name;
    out.push(`| ${label} | ${r.enc.rate} | ${r.enc.groups} | ${r.enc.tierMin}–${r.enc.tierMax} | ${r.enc.eEnemies} | ${r.enc.eHP} | ${r.enc.eDmg} |`);
  }
  out.push('');

  // bosses
  const bossRows = rows.flatMap(r => r.bosses.map(b => ({ level: r.name, ...b })));
  if (bossRows.length) {
    out.push('### Bosses & fixed encounters');
    out.push('');
    out.push('| Boss | Level | Tier | HP | AC | Best hit | Party AOE |');
    out.push('|---|---|---|---|---|---|---|');
    for (const b of bossRows) out.push(`| ${b.name} | ${b.level} | ${b.tier} | ${b.hp} | ${b.ac} | ${b.hit} | ${b.aoe || '—'} |`);
    out.push('');
  }
  out.push('---');
  out.push('');
  return out.join('\n');
}

function main() {
  const files = fs.readdirSync(MAPDIR).filter(f => f.endsWith('.json'));
  const maps = new Map();
  for (const f of files) {
    const m = JSON.parse(fs.readFileSync(path.join(MAPDIR, f), 'utf8'));
    maps.set(m.id, m);
  }
  const ids = [...ORDER.filter(id => maps.has(id)), ...[...maps.keys()].filter(id => !ORDER.includes(id))];
  const mon = Object.fromEntries(
    JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'monsters.json'), 'utf8')).map(m => [m.id, m])
  );

  const doc = [];
  doc.push('# The Lay of Thornmere — Map Atlas');
  doc.push('');
  doc.push('> **Generated** by `tools/mapdoc.js` from `data/maps/*.json` (the source of');
  doc.push('> truth). Do not hand-edit — re-run `node tools/mapdoc.js` after any map');
  doc.push('> change. Companion to `dev/designer-guide.md` (which links here per dungeon).');
  doc.push('');
  doc.push('North is **up**. Coordinates are `(x,y)`; the grid prints `y` down the left');
  doc.push('and `x` along the bottom, matching the data and in-game automap.');
  doc.push('');
  doc.push('### Legend');
  doc.push('');
  doc.push('| Walls / edges | | Cell contents | | Zone overlay |  |');
  doc.push('|---|---|---|---|---|---|');
  doc.push('| `│ ─` wall | `D` door | `@` party entry | `B` fixed encounter / boss | `÷` anti-magic | (on empty floor) |');
  doc.push('| `R` riddle door | `s` secret door | `▲`/`▼` stairs up/down | `$` secret room / cache | `·` extra-dark zone | |');
  doc.push('| (blank) open | | `m` magic mouth | `^` trap | | |');
  doc.push('| | | `*` spinner | `~` teleporter | | |');
  doc.push('| | | `☒` seal door | `G` gate · `I` statue | | |');
  doc.push('| | | `▓` building | | | |');
  doc.push('');
  doc.push('Map-level **dark** (whole floor needs a torch/light) is noted per map; the');
  doc.push('`·` overlay marks *additional* dark-zone rectangles layered on top.');
  doc.push('');
  doc.push('## Contents');
  doc.push('');
  doc.push('- [Difficulty Summary (derived)](#difficulty-summary-derived)');
  for (const id of ids) {
    const m = maps.get(id);
    doc.push(`- [${m.name}](#${anchor(m.name)})`);
  }
  doc.push('');
  doc.push('---');
  doc.push('');
  doc.push(difficultySection(ids, maps, mon));
  for (const id of ids) doc.push(section(maps.get(id)));

  fs.writeFileSync(OUT, doc.join('\n'));
  console.log(`Wrote ${OUT} (${ids.length} maps: ${ids.join(', ')})`);
}

main();

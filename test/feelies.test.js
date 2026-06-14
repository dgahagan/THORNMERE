// Feelies build tests:
//   1. Map legend entries validate against town data (each pub building id exists as a cell)
//   2. Streets in town.json streets array are referenced in STREET_LABELS
//   3. Spoiler lint: no forbidden strings in generated text
//   4. Spell SP cost propagation: mutating DB reflects in collectManualText
//   5. Class primeStat data integrity: all starting classes have primeStat

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
}

// Load data files directly (no DB init required for structural checks)
const town    = loadJson('data/maps/town.json');
const classes = loadJson('data/classes.json');
const spells  = loadJson('data/spells.json');

// ---- 1. Map legend entries validate against town.json cells ----------------------
describe('map legend vs town data', () => {
  // Building ids that the map marks as public (pub: true in pdf-map.js BUILDINGS)
  const PUB_BUILDING_IDS = [
    'hall', 'greta', 'temple', 'spark', 'goose', 'hart', 'belltower'
  ];

  it('every public building id appears in at least one town cell', () => {
    const cells = town.cells || {};
    for (const id of PUB_BUILDING_IDS) {
      const found = Object.values(cells).some(c => c.id === id);
      assert.ok(found, `building id "${id}" not found in any town.json cell`);
    }
  });

  it('guardian statues exist at (8,22) and (14,22)', () => {
    const c1 = town.cells['8,22'];
    const c2 = town.cells['14,22'];
    assert.ok(c1 && c1.t === 'statue', 'guardian statue missing at 8,22');
    assert.ok(c2 && c2.t === 'statue', 'guardian statue missing at 14,22');
  });
});

// ---- 2. Streets array is present and well-formed --------------------------------
describe('town.json streets array', () => {
  const EXPECTED_STREET_IDS = [
    'gran_mere', 'tallow_row', 'bellward', 'cobbles',
    'wickfen', 'cinder', 'wardwell', 'heron', 'standings'
  ];

  it('streets array exists in town.json', () => {
    assert.ok(Array.isArray(town.streets), 'town.json missing streets array');
  });

  it('all expected street ids are present', () => {
    const ids = new Set(town.streets.map(s => s.id));
    for (const id of EXPECTED_STREET_IDS) {
      assert.ok(ids.has(id), `street id "${id}" missing from town.json streets`);
    }
  });

  it('every street has a non-empty name and at least one rect', () => {
    for (const s of town.streets) {
      assert.ok(s.name && s.name.length > 0, `street ${s.id} has empty name`);
      assert.ok(Array.isArray(s.rects) && s.rects.length > 0, `street ${s.id} has no rects`);
      for (const r of s.rects) {
        assert.equal(r.length, 4, `street ${s.id} rect has wrong length`);
      }
    }
  });
});

// ---- 3. Spoiler lint ------------------------------------------------------------
describe('spoiler lint', async () => {
  // Dynamically import generators so we can call collect* functions.
  // These imports need the DB to be initialised, so we use data-loader.
  let collectManualText, collectMapText, collectCardText, DB;

  before(async () => {
    const loader = await import('../scripts/lib/data-loader.js');
    await loader.loadGameData();
    DB = loader.DB;
    ({ collectManualText } = await import('../scripts/lib/pdf-manual.js'));
    ({ collectMapText }    = await import('../scripts/lib/pdf-map.js'));
    ({ collectCardText }   = await import('../scripts/lib/pdf-command-card.js'));
  });

  // Forbidden strings: secret locations, boss names, riddle answers, unique items
  // Derived from game data + known spoiler list; never include common words.
  const FORBIDDEN = [
    // Secret location identifiers
    'undercroft_entrance', 'tannery_entrance',
    'review_board', 'review board',
    // Riddle answers (if any were to leak into generated text)
    // Quest structure beyond "the Verses ward the gates"
    'barrow path', 'barrow_path',
  ];

  it('manual text contains no forbidden spoiler strings', () => {
    const texts = collectManualText(DB).map(s => String(s).toLowerCase());
    const all   = texts.join('\n');
    for (const f of FORBIDDEN) {
      assert.ok(!all.includes(f.toLowerCase()), `Manual text contains forbidden string: "${f}"`);
    }
  });

  it('map text contains no forbidden spoiler strings', () => {
    const texts = collectMapText(DB).map(s => String(s).toLowerCase());
    const all   = texts.join('\n');
    for (const f of FORBIDDEN) {
      assert.ok(!all.includes(f.toLowerCase()), `Map text contains forbidden string: "${f}"`);
    }
  });

  // ---- 4. SP cost propagation: mutate DB, check collectManualText ---------------
  it('collectManualText reflects mutated spell SP costs', () => {
    // Find any spell with a known sp value and temporarily change it
    const testSpell = DB.spells.find(s => s.sp > 0);
    assert.ok(testSpell, 'no spells found in DB');

    const original = testSpell.sp;
    const sentinel = 997;
    testSpell.sp = sentinel;

    try {
      const texts = collectManualText(DB).map(String);
      assert.ok(
        texts.some(t => t.includes(String(sentinel))),
        `collectManualText did not reflect mutated SP cost ${sentinel} for ${testSpell.code}`
      );
    } finally {
      testSpell.sp = original;
    }
  });
});

// ---- 5. Class primeStat data integrity ------------------------------------------
describe('class primeStat fields', () => {
  const starting = classes.filter(c => c.starting);

  it('all starting classes have a primeStat field', () => {
    for (const c of starting) {
      assert.ok(c.primeStat && c.primeStat.length > 0,
        `class "${c.id}" is missing primeStat`);
    }
  });

  it('all starting classes have a primeHint field', () => {
    for (const c of starting) {
      assert.ok(c.primeHint && c.primeHint.length > 0,
        `class "${c.id}" is missing primeHint`);
    }
  });

  it('primeStat values are one of ST IQ DX CN LK', () => {
    const valid = new Set(['ST', 'IQ', 'DX', 'CN', 'LK']);
    for (const c of starting) {
      assert.ok(valid.has(c.primeStat),
        `class "${c.id}" has invalid primeStat "${c.primeStat}"`);
    }
  });
});

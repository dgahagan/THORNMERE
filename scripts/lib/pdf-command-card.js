// Command Summary Card PDF generator.
// One-page landscape A5 (or A4), two columns, dense reference layout.

import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';

const PARCHMENT = '#F5EDD0';
const INK       = '#1A0A04';
const BORDER    = '#5A3818';
const HEADER_BG = '#3A2010';
const HEADER_TXT= '#F5EDD0';
const DIVIDER   = '#A87840';
const HILIGHT   = '#7A1A1A';

// All text content (for spoiler lint)
export function collectCardText(db) {
  return KEYBINDINGS.flatMap(s => [s.section, ...s.keys.map(k => `${k.key} — ${k.desc}`)]).concat([
    'THORNMERE COMMAND CARD',
    'Exploration', 'Hall & Menus', 'Combat', 'Character Sheet',
    'New Game Flow', 'Party Roster Columns', 'Mode Select'
  ]);
}

const KEYBINDINGS = [
  {
    section: 'Exploration',
    keys: [
      { key: '↑ / W',        desc: 'Move forward' },
      { key: '← / A',        desc: 'Turn left' },
      { key: '→ / D',        desc: 'Turn right' },
      { key: '↓ / S',        desc: 'About-face (180°)' },
      { key: 'E',            desc: 'Search for secrets' },
      { key: 'C',            desc: 'Cast a spell' },
      { key: 'P',            desc: 'Start / stop a song (Skald)' },
      { key: 'U',            desc: 'Use an item from inventory' },
      { key: 'T',            desc: 'Light / swap torch' },
      { key: 'L',            desc: 'Look (describe current cell)' },
      { key: 'M',            desc: 'Cycle automap (Remastered only)' },
      { key: 'V',            desc: 'Save anywhere (Remastered only)' },
      { key: 'O',            desc: 'Options (sound & feature toggles)' },
      { key: 'Q',            desc: 'Quit to town / Adventurers\' Hall' },
      { key: '?',            desc: 'In-game help' },
      { key: '1–6',          desc: 'Open character sheet (party slot)' },
      { key: '7',            desc: 'Summon sheet (Remastered 7th-slot)' },
    ]
  },
  {
    section: 'Hall & Menus',
    keys: [
      { key: 'C',      desc: 'Create a character' },
      { key: 'P',      desc: 'Load the Fen-Pact (empty roster only)' },
      { key: 'A',      desc: 'Add to party from benches' },
      { key: 'R',      desc: 'Remove from party' },
      { key: 'O',      desc: 'Set marching order' },
      { key: 'X',      desc: 'Delete a character permanently' },
      { key: 'S',      desc: 'Save the game' },
      { key: 'L / Esc','desc': 'Leave building' },
      { key: '1–5',    desc: 'Select menu item (race, class, etc.)' },
      { key: 'Esc',    desc: 'Back / cancel current menu' },
    ]
  },
  {
    section: 'Combat',
    keys: [
      { key: 'F',     desc: 'Fight (attack current target group)' },
      { key: 'C',     desc: 'Cast a spell' },
      { key: 'P',     desc: 'Play a song (Skald)' },
      { key: 'U',     desc: 'Use item' },
      { key: 'D',     desc: 'Defend (lower AC, pass turn)' },
      { key: 'R',     desc: 'Run (attempt retreat)' },
      { key: '←→',   desc: 'Cycle target group' },
      { key: '1–6',   desc: 'Select party member for action' },
      { key: 'Esc',   desc: 'Cancel / back in combat menus' },
    ]
  },
];

const NEW_GAME_STEPS = [
  '1. Title screen → (N)ew Game',
  '2. Mode Select: Remastered / Legacy / Custom',
  '3. Adventurers\' Hall — (P) Load Fen-Pact  or  (C) Create characters',
  '4. Add up to 6 to party; set marching order (O)',
  '5. Leave Hall — explore town; enter Undercroft when ready',
  '6. Save at Hall (S) or anywhere in Remastered (V)',
];

const ROSTER_COLS = [
  { col: '#',   desc: 'Party slot (1 = front-left)' },
  { col: 'AC',  desc: 'Armour Class — lower is better' },
  { col: 'HP',  desc: 'Hit points  /  maximum' },
  { col: 'SP',  desc: 'Spell points  /  maximum' },
  { col: 'LVL', desc: 'Character level' },
  { col: '♪N',  desc: 'Songs remaining today (Skald)' },
  { col: 'PSN', desc: 'Poisoned' },
  { col: 'FEAR','desc': 'Feared (−2 to hit)' },
  { col: 'STONE','desc': 'Petrified (cannot act)' },
  { col: 'DRAIN','desc': 'Level-drained by undead' },
];

const MODE_TABLE = [
  { toggle: 'Automap',           rem: 'On (M cycles overlay/full)', leg: 'Off (paper map required)' },
  { toggle: 'Save Anywhere',     rem: '3 slots + autosave mid-dungeon', leg: 'Hall save only' },
  { toggle: 'Shared Inventory',  rem: '40-slot party pool †', leg: '8-slot individual packs †' },
  { toggle: 'Reduced XP',        rem: '~40% lower thresholds †', leg: 'Full XP curve †' },
  { toggle: 'Item Charges',      rem: 'Exact charges shown', leg: 'Random consumption' },
  { toggle: 'Summons: 7th Slot', rem: 'Dedicated slot (press 7)', leg: 'Occupies party slot' },
];

export async function generateCard(outPath) {
  const PAGE_W = 842;
  const PAGE_H = 595;
  const M      = 22;
  const COL_W  = (PAGE_W - 2*M - 10) / 2;

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0,
    info: { Title: 'Thornmere Command Card', Author: 'Tales of the Fen, Volume I' } });
  const _stream = createWriteStream(outPath);
  doc.pipe(_stream);

  // Background
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(PARCHMENT);

  // Border
  doc.strokeColor(BORDER).lineWidth(3).rect(M-8, M-8, PAGE_W-2*(M-8), PAGE_H-2*(M-8)).stroke();
  doc.strokeColor(BORDER).lineWidth(0.5).rect(M-3, M-3, PAGE_W-2*(M-3), PAGE_H-2*(M-3)).stroke();

  // Title bar
  doc.rect(M, M, PAGE_W-2*M, 24).fill(HEADER_BG);
  doc.font('Times-Bold').fontSize(11).fillColor(HEADER_TXT);
  doc.text('THORNMERE  —  COMMAND SUMMARY CARD', M, M+6, { width: PAGE_W-2*M, align: 'center' });

  const COL1_X = M;
  const COL2_X = M + COL_W + 10;
  let y1 = M + 32;
  let y2 = M + 32;

  function sectionHeader(doc, title, x, y, w) {
    doc.rect(x, y, w, 13).fill('#7A5030');
    doc.font('Times-Bold').fontSize(8).fillColor(HEADER_TXT);
    doc.text(title, x + 4, y + 2, { width: w - 8, lineBreak: false });
    return y + 16;
  }

  function keyLine(doc, key, desc, x, y, w) {
    doc.font('Courier').fontSize(7).fillColor(HILIGHT);
    doc.text(key, x + 2, y, { width: 58, lineBreak: false });
    doc.font('Times-Roman').fontSize(7.5).fillColor(INK);
    doc.text(desc, x + 62, y, { width: w - 64, lineBreak: false });
    return y + 9.5;
  }

  // ---- Column 1: Exploration + Hall & Menus ------------------------------------
  for (const section of KEYBINDINGS.slice(0, 2)) {
    y1 = sectionHeader(doc, section.section.toUpperCase(), COL1_X, y1, COL_W);
    for (const { key, desc } of section.keys) {
      y1 = keyLine(doc, key, desc, COL1_X, y1, COL_W);
    }
    y1 += 4;
  }

  // New Game flow
  y1 = sectionHeader(doc, 'NEW GAME FLOW', COL1_X, y1, COL_W);
  doc.font('Times-Roman').fontSize(7.5).fillColor(INK);
  for (const step of NEW_GAME_STEPS) {
    doc.text(step, COL1_X + 4, y1, { width: COL_W - 8, lineBreak: false });
    y1 += 9.5;
  }

  // ---- Column 2: Combat + Roster columns + Mode table -------------------------
  y2 = sectionHeader(doc, 'COMBAT', COL2_X, y2, COL_W);
  for (const { key, desc } of KEYBINDINGS[2].keys) {
    y2 = keyLine(doc, key, desc, COL2_X, y2, COL_W);
  }
  y2 += 4;

  // Roster columns
  y2 = sectionHeader(doc, 'ROSTER COLUMN ABBREVIATIONS', COL2_X, y2, COL_W);
  for (const { col, desc } of ROSTER_COLS) {
    doc.font('Courier').fontSize(7).fillColor(HILIGHT);
    doc.text(col.padEnd(6), COL2_X + 2, y2, { width: 40, lineBreak: false });
    doc.font('Times-Roman').fontSize(7.5).fillColor(INK);
    doc.text(desc, COL2_X + 44, y2, { width: COL_W - 46, lineBreak: false });
    y2 += 9.5;
  }
  y2 += 4;

  // Mode select table
  y2 = sectionHeader(doc, 'REMASTERED vs LEGACY', COL2_X, y2, COL_W);
  const tColW = Math.floor((COL_W - 8) / 3);
  // Table header
  doc.font('Times-Bold').fontSize(6.5).fillColor('#7A5030');
  doc.text('Toggle',       COL2_X + 2,            y2, { width: tColW, lineBreak: false });
  doc.text('Remastered',   COL2_X + 2 + tColW,    y2, { width: tColW, lineBreak: false });
  doc.text('Legacy',       COL2_X + 2 + tColW*2,  y2, { width: tColW, lineBreak: false });
  y2 += 9;
  doc.strokeColor(DIVIDER).lineWidth(0.5).moveTo(COL2_X, y2).lineTo(COL2_X + COL_W, y2).stroke();
  y2 += 2;

  for (const row of MODE_TABLE) {
    doc.font('Times-Roman').fontSize(6.5).fillColor(INK);
    doc.text(row.toggle,  COL2_X + 2,           y2, { width: tColW - 2,   lineBreak: false });
    doc.text(row.rem,     COL2_X + 2 + tColW,   y2, { width: tColW - 2,   lineBreak: false });
    doc.text(row.leg,     COL2_X + 2 + tColW*2, y2, { width: tColW,       lineBreak: false });
    y2 += 8.5;
  }
  doc.font('Times-Italic').fontSize(6).fillColor('#7A5030');
  doc.text('† Locked at character creation — affects progression balance.', COL2_X + 2, y2, { width: COL_W - 4 });

  // Footer
  doc.font('Times-Italic').fontSize(7).fillColor(DIVIDER);
  doc.text('All art and music made of text.  The Lay of Thornmere — Tales of the Fen, Volume I.',
    M, PAGE_H - M - 8, { width: PAGE_W - 2*M, align: 'center' });

  doc.end();
  return new Promise(r => _stream.on('finish', r));
}

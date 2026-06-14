// Town map PDF generator.
// Produces a landscape A4 "cloth map" of Thornmere.

import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';

// ---- Palette -------------------------------------------------------------------
const PARCHMENT  = '#F2E0A8';
const STREET     = '#E0C888';
const BLD_FLOOR  = '#C4A068';
const BLD_ROOF   = '#7A5030';
const BLD_ANON   = '#A88860'; // unlabeled / anonymous buildings
const OUTER_WALL = '#3A2010';
const BORDER     = '#5A3818';
const INK        = '#1E0E04';
const GOLD       = '#8B6914';
const NEEDLE_CLR = '#1A0808';
const FEN_GREEN  = '#6A7A50';
const LEGEND_BG  = '#F8EBC4';
const GATE_CLR   = '#5A1A1A';

// ---- Building definitions (from town.json cells) --------------------------------
const BUILDINGS = [
  { id: 'hall',      label: "Adventurers' Hall",       x1: 2, y1: 17, x2: 6,  y2: 20, pub: true  },
  { id: 'greta',     label: "Greta's Provisioner",      x1: 9, y1: 17, x2: 13, y2: 20, pub: true  },
  { id: 'review',    label: null,                        x1: 16, y1: 17, x2: 21, y2: 20, pub: false },
  { id: 'temple',    label: "Temple of the Quiet Flame", x1: 2, y1: 11, x2: 6,  y2: 14, pub: true  },
  { id: 'belltower', label: "The Bell Tower",            x1: 10, y1: 11, x2: 12, y2: 13, pub: true  },
  { id: 'spark',     label: "Roskva's Spark House",      x1: 16, y1: 11, x2: 20, y2: 14, pub: true  },
  { id: 'goose',     label: "The Drowned Goose",         x1: 2, y1: 4,  x2: 6,  y2: 7,  pub: true  },
  { id: 'tannery',   label: null,                        x1: 9, y1: 4,  x2: 13, y2: 7,  pub: false },
  { id: 'hart',      label: "The Hart & Hollow",         x1: 16, y1: 4, x2: 20, y2: 7,  pub: true  },
  { id: 'empty1',    label: null, x1: 8,  y1: 13, x2: 8,  y2: 13, pub: false },
  { id: 'empty2',    label: null, x1: 14, y1: 13, x2: 14, y2: 13, pub: false },
  { id: 'empty3',    label: null, x1: 8,  y1: 9,  x2: 8,  y2: 9,  pub: false },
  { id: 'empty4',    label: null, x1: 14, y1: 9,  x2: 14, y2: 9,  pub: false },
];

const GATES = [
  { id: 'east_gate',  label: 'East Gate',  x: 22, y: 9  },
  { id: 'north_gate', label: 'North Gate', x: 11, y: 22 },
];

const STATUES = [
  { x: 8, y: 22 }, { x: 14, y: 22 }
];

// ---- Streets (for map labeling) ------------------------------------------------
const STREET_LABELS = [
  { name: 'Gran Mere Way',  x: 11, y: 2   },
  { name: 'Tallow Row',     x: 11, y: 9   },
  { name: 'Bellward',       x: 11, y: 15.5 },
  { name: 'The Cobbles',    x: 11, y: 21.5 },
  { name: 'Wickfen Lane',   x: 7.5, y: 14  },
  { name: 'Cinder Street',  x: 14.5, y: 14 },
];

// ---- Helper: convert grid coords to page points ----------------------------------
function cellPt(gridCoord, origin, cellSz) {
  return origin + gridCoord * cellSz;
}

// ---- Text strings collected for spoiler lint ------------------------------------
const _textStrings = [];
function record(str) { _textStrings.push(str); return str; }

export function collectMapText(db) {
  const texts = [];
  for (const b of BUILDINGS) { if (b.label) texts.push(b.label); }
  for (const g of GATES)     texts.push(g.label);
  for (const s of STREET_LABELS) texts.push(s.name);
  texts.push('THORNMERE');
  texts.push('as surveyed for the Magistrate, in the year of the Quiet Flame');
  texts.push('Maldrec\'s Needle');
  texts.push('the fen — travellers do not linger');
  texts.push('Guardian Statues');
  texts.push('the Needle — draw your own conclusions');
  return texts;
}

// ---- Main generator ------------------------------------------------------------
export function generateMap(outPath) {
  const CELL  = 17;          // points per grid cell
  const GRID  = 24;
  const MAP_W = GRID * CELL; // 408
  const MAP_H = GRID * CELL; // 408

  const PAGE_W = 842;
  const PAGE_H = 595;
  const M      = 22;         // margin

  const MAP_X  = M;
  const MAP_Y  = 80;         // below title cartouche

  const LEG_X  = MAP_X + MAP_W + 18;
  const LEG_Y  = MAP_Y;
  const LEG_W  = PAGE_W - LEG_X - M;
  const LEG_H  = MAP_H;

  // helper: grid (x,y) → page point (top-left of cell)
  const gx = x => MAP_X + x * CELL;
  const gy = y => MAP_Y + y * CELL;

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0,
    info: { Title: 'Thornmere — The Town Map', Author: 'Tales of the Fen, Volume I' } });
  const _stream = createWriteStream(outPath);
  doc.pipe(_stream);

  // ---- Background ---------------------------------------------------------------
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(PARCHMENT);

  // Subtle aged-texture: faint vertical bands
  doc.save();
  for (let i = 0; i < PAGE_W; i += 32) {
    doc.rect(i, 0, 16, PAGE_H).fillOpacity(0.03).fill('#7A5030');
  }
  doc.fillOpacity(1);
  doc.restore();

  // ---- Outer decorative border --------------------------------------------------
  const BORD = 10;
  doc.lineWidth(4).strokeColor(BORDER)
    .rect(M - BORD, M - BORD, PAGE_W - 2*(M-BORD), PAGE_H - 2*(M-BORD)).stroke();
  doc.lineWidth(1).strokeColor(BORDER)
    .rect(M - BORD + 5, M - BORD + 5, PAGE_W - 2*(M-BORD) - 10, PAGE_H - 2*(M-BORD) - 10).stroke();

  // Corner ornaments
  for (const [cx, cy] of [[M-BORD, M-BORD], [PAGE_W-(M-BORD), M-BORD],
                           [M-BORD, PAGE_H-(M-BORD)], [PAGE_W-(M-BORD), PAGE_H-(M-BORD)]]) {
    doc.fillColor(BORDER).circle(cx, cy, 5).fill();
  }

  // ---- Title cartouche ----------------------------------------------------------
  doc.save();
  const CART_X = MAP_X;
  const CART_W = MAP_W;
  doc.lineWidth(1).roundedRect(CART_X, M, CART_W, 52, 4).fillAndStroke(LEGEND_BG, BORDER);
  doc.font('Times-Bold').fontSize(15).fillColor(INK);
  doc.text('THORNMERE', CART_X, M + 8, { width: CART_W, align: 'center' });
  doc.font('Times-Roman').fontSize(8).fillColor(GOLD);
  doc.text('as surveyed for the Magistrate, in the year of the Quiet Flame', CART_X, M + 28, { width: CART_W, align: 'center' });
  doc.font('Times-Italic').fontSize(7).fillColor(INK);
  doc.text('For the use of bona-fide residents and those who seek to become them.', CART_X, M + 42, { width: CART_W, align: 'center' });
  doc.restore();

  // ---- Map area background (street paving) + outer town wall --------------------
  doc.lineWidth(3).rect(MAP_X, MAP_Y, MAP_W, MAP_H).fillAndStroke(STREET, OUTER_WALL);

  // ---- Draw buildings -----------------------------------------------------------
  for (const b of BUILDINGS) {
    const px = gx(b.x1);
    const py = gy(b.y1);
    const pw = (b.x2 - b.x1 + 1) * CELL;
    const ph = (b.y2 - b.y1 + 1) * CELL;

    const isAnon  = !b.pub;
    const floorCl = isAnon ? BLD_ANON : BLD_FLOOR;
    const roofCl  = isAnon ? '#6A4828' : BLD_ROOF;

    // Floor (fill and outline in one call)
    doc.lineWidth(0.5).rect(px, py, pw, ph).fillAndStroke(floorCl, OUTER_WALL);

    // Roof stripe (top 30% of building)
    const roofH = Math.max(4, Math.floor(ph * 0.3));
    doc.rect(px, py, pw, roofH).fill(roofCl);
  }

  // ---- Gate openings (drawn over the wall) -------------------------------------
  for (const g of GATES) {
    const px = gx(g.x);
    const py = gy(g.y);
    // Clear a gate opening in the wall color
    doc.rect(px + 2, py + 2, CELL - 4, CELL - 4).fill(STREET);
    // Gate arch symbol
    doc.lineWidth(1).circle(px + CELL/2, py + CELL/2, 4).fillAndStroke(GATE_CLR, OUTER_WALL);
  }

  // ---- Guardian statues --------------------------------------------------------
  for (const s of STATUES) {
    const px = gx(s.x) + CELL/2;
    const py = gy(s.y) + CELL/2;
    doc.fillColor(INK).circle(px, py, 3.5).fill();
    doc.fillColor(INK).moveTo(px, py - 3).lineTo(px - 4, py + 6).lineTo(px + 4, py + 6).closePath().fill();
  }

  // ---- Maldrec's Needle (east edge, looming beyond town) -----------------------
  const needleX = MAP_X + MAP_W + 8;
  const needleBaseY = MAP_Y + MAP_H * 0.55;
  const needleTipY  = MAP_Y + MAP_H * 0.05;
  const needleW     = 14;
  // Spire body
  doc.polygon(
    [needleX + needleW/2, needleTipY],
    [needleX, needleBaseY - 20],
    [needleX + needleW, needleBaseY - 20]
  ).fill(NEEDLE_CLR);
  doc.rect(needleX, needleBaseY - 20, needleW, 30).fill(NEEDLE_CLR);
  // Label
  doc.save();
  doc.translate(needleX + needleW + 4, (needleTipY + needleBaseY)/2);
  doc.rotate(-90);
  doc.font('Times-Italic').fontSize(7).fillColor(NEEDLE_CLR);
  doc.text("Maldrec's Needle", -40, 0, { width: 80, align: 'center' });
  doc.restore();

  // ---- Fen note at far east -----------------------------------------------------
  const fenNoteX = MAP_X + MAP_W + 6;
  const fenNoteY = MAP_Y + MAP_H * 0.62;
  doc.font('Times-Italic').fontSize(6).fillColor(FEN_GREEN);
  doc.text('the fen —', fenNoteX - 2, fenNoteY, { width: LEG_X - fenNoteX - 4 });
  doc.text('travellers do not linger', fenNoteX - 2, fenNoteY + 9, { width: LEG_X - fenNoteX - 4 });

  // ---- Building labels ---------------------------------------------------------
  doc.font('Times-Italic').fontSize(6.5).fillColor(INK);
  for (const b of BUILDINGS) {
    if (!b.pub || !b.label) continue;
    const px = gx(b.x1);
    const py = gy(b.y1);
    const pw = (b.x2 - b.x1 + 1) * CELL;
    const ph = (b.y2 - b.y1 + 1) * CELL;
    const roofH = Math.max(4, Math.floor(ph * 0.3));
    // Center label in the floor area below the roof
    doc.text(b.label, px + 1, py + roofH + 3, { width: pw - 2, align: 'center' });
  }

  // Gate labels
  doc.font('Times-Roman').fontSize(6).fillColor(GATE_CLR);
  for (const g of GATES) {
    const lx = gx(g.x) - 10;
    const ly = gy(g.y) + CELL + 1;
    doc.text(g.label, lx, ly, { width: CELL + 20, align: 'center' });
  }

  // ---- Street labels -----------------------------------------------------------
  doc.save();
  doc.font('Times-Italic').fontSize(5.5).fillColor('#5A4020');
  for (const s of STREET_LABELS) {
    const isVertical = s.name === 'Wickfen Lane' || s.name === 'Cinder Street';
    if (isVertical) {
      const px = gx(s.x);
      const py = gy(s.y);
      doc.save();
      doc.translate(px, py);
      doc.rotate(-90);
      doc.text(s.name, -30, 0, { width: 60, align: 'center' });
      doc.restore();
    } else {
      doc.text(s.name, gx(s.x) - 40, gy(s.y) - 3, { width: 80, align: 'center' });
    }
  }
  doc.restore();

  // ---- Legend box --------------------------------------------------------------
  doc.lineWidth(1).roundedRect(LEG_X, LEG_Y, LEG_W, LEG_H, 4).fillAndStroke(LEGEND_BG, BORDER);

  let ly = LEG_Y + 10;
  const LX1 = LEG_X + 8;
  const LX2 = LEG_X + 26;
  const LW  = LEG_W - 36;

  doc.font('Times-Bold').fontSize(9).fillColor(INK);
  doc.text('LEGEND', LX1, ly, { width: LEG_W - 16, align: 'center' }); ly += 14;
  doc.strokeColor(BORDER).lineWidth(1).moveTo(LX1, ly).lineTo(LEG_X + LEG_W - 8, ly).stroke(); ly += 6;

  const LEGEND_ENTRIES = [
    { label: "Adventurers' Hall",       color: BLD_FLOOR  },
    { label: "Greta's Provisioner",      color: BLD_FLOOR  },
    { label: "Temple of the Quiet Flame",color: BLD_FLOOR  },
    { label: "Roskva's Spark House",     color: BLD_FLOOR  },
    { label: "The Drowned Goose (tavern)",color: BLD_FLOOR },
    { label: "The Hart & Hollow (tavern)",color: BLD_FLOOR },
    { label: "The Bell Tower",           color: BLD_FLOOR  },
    { label: "East Gate",                color: GATE_CLR   },
    { label: "North Gate",               color: GATE_CLR   },
    { label: "Guardian Statues",         color: INK        },
    { label: "Street names",            color: '#5A4020'   },
    { label: null, divider: true },
    { label: "Other buildings not listed here", color: BLD_ANON },
    { label: "The Needle — draw your own conclusions", color: NEEDLE_CLR },
    { label: "The Magistrate's Court keeps no signboard — seek it out.", color: '#7A3020', italic: true },
    { label: null, divider: true },
    { label: 'East: the fen — travellers do not linger', color: FEN_GREEN, italic: true },
  ];

  doc.font('Times-Roman').fontSize(7.5).fillColor(INK);
  for (const e of LEGEND_ENTRIES) {
    if (e.divider) { doc.strokeColor(BORDER).lineWidth(0.5).moveTo(LX1, ly).lineTo(LEG_X + LEG_W - 8, ly).stroke(); ly += 5; continue; }
    if (!e.label) { ly += 3; continue; }
    // Color swatch
    doc.fillColor(e.color).rect(LX1, ly, 10, 8).fill();
    // Label text
    const fnt = e.italic ? 'Times-Italic' : 'Times-Roman';
    doc.font(fnt).fontSize(7).fillColor(INK);
    doc.text(e.label, LX2, ly, { width: LW, lineBreak: false });
    ly += 11;
    if (ly > LEG_Y + LEG_H - 20) break;
  }

  // ---- Compass rose (bottom of legend) ----------------------------------------
  const compX = LEG_X + LEG_W/2;
  const compY  = LEG_Y + LEG_H - 28;
  doc.strokeColor(BORDER).lineWidth(0.5).circle(compX, compY, 14).stroke();
  doc.font('Times-Bold').fontSize(7).fillColor(INK);
  const dirs = [['N', 0, -16], ['S', 0, 10], ['E', 15, -3], ['W', -20, -3]];
  for (const [d, dx, dy] of dirs) {
    doc.text(d, compX + dx - 3, compY + dy, { width: 10, align: 'center', lineBreak: false });
  }
  // Cardinal arms
  doc.strokeColor(BORDER).lineWidth(1);
  for (const [dx, dy] of [[0,-12],[0,12],[12,0],[-12,0]]) {
    doc.moveTo(compX, compY).lineTo(compX+dx, compY+dy).stroke();
  }

  // ---- Finish ------------------------------------------------------------------
  doc.end();
  return new Promise(r => _stream.on('finish', r));
}

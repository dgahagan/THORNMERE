// Manual PDF generator (~20–28 pages).
// Modeled on the original Bard's Tale manual: friendly, in-universe-adjacent,
// reference-grade accuracy with dry humor.
// All numeric tables are generated from game data; flavor prose is hard-written.

import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';

// ---- Palette -------------------------------------------------------------------
const PARCHMENT = '#FAF0D8';
const INK       = '#1A0A04';
const BORDER    = '#5A3818';
const CHAPTER   = '#3A2010';
const HEADING2  = '#5A3010';
const ACCENT    = '#7A1A1A';
const TABLE_HDR = '#D4B880';
const TABLE_ALT = '#F2E4C0';
const SCHOOL_H  = { hexen: '#3A1050', lorist: '#0A3010', storm: '#0A1840' };
const SCHOOL_TXT= { hexen: '#ECD4FC', lorist: '#D4F0DC', storm: '#C8D4F0' };

// ---- Page geometry -------------------------------------------------------------
const PAGE_W  = 595;
const PAGE_H  = 842;
const ML      = 55;   // left margin
const MR      = 55;   // right margin
const MT      = 55;   // top margin
const MB      = 50;   // bottom margin
const BODY_W  = PAGE_W - ML - MR;
const BODY_H  = PAGE_H - MT - MB;
const BODY_R  = ML + BODY_W;

// ---- Helpers ------------------------------------------------------------------
function modStr(v) {
  if (v > 0) return `+${v}`;
  if (v < 0) return `${v}`;
  return '—';
}

function effectDesc(spell) {
  const e = spell.effect;
  switch (e.kind) {
    case 'damage':    return `${e.dice} damage${e.undeadDouble ? '; ×2 vs undead' : ''}${e.stun ? '; may stun' : ''}`;
    case 'heal':      return e.full ? 'full heal' : `${e.dice} healing`;
    case 'debuff':    return `−${e.amount} to ${e.what === 'hit' ? 'attack' : e.what}`;
    case 'fear':      return 'causes fear';
    case 'silence':   return 'silences casters';
    case 'stun':      return 'stuns target';
    case 'light':     return `light radius ${e.radius}, ${e.duration} steps`;
    case 'shield':    return `AC +${e.ac}, ${e.duration} steps`;
    case 'summon':    return `summons ${e.monster.replace(/_/g,' ')}`;
    case 'instakill': return 'instant kill (save allowed)';
    case 'trapzap':   return 'disarms adjacent trap';
    case 'compass':   return 'shows coordinates';
    case 'trueseeing':return 'reveals illusions';
    case 'secrets':   return 'reveals secret doors';
    case 'phase':     return 'passes through one wall';
    case 'recall':    return 'teleport to town entrance';
    case 'resurrect': return 'restores the dead (out of combat)';
    case 'cure':      return `cures ${(e.flags||[]).join(', ')}`;
    case 'battlecry': return `+${e.dmg} damage to all party attacks`;
    case 'levitate':  return 'negates floor traps';
    default: return e.kind;
  }
}

function songEffectStr(effect) {
  switch (effect.kind) {
    case 'ac':          return `+${effect.amount} AC`;
    case 'dmg':         return `+${effect.amount} damage`;
    case 'light':       return `+${effect.radius} light radius`;
    case 'trapward':    return `+${effect.amount} trap-resist`;
    case 'saves':       return `+${effect.amount} saving throws`;
    case 'regen':       return effect.every ? `+${effect.amount} HP / ${effect.every} steps` : `+${effect.amount} HP/round`;
    case 'evade':       return `+${effect.amount}% evade random encounter`;
    case 'foehit':      return `−${effect.amount} enemy to-hit`;
    case 'repel_undead':return `+${effect.amount}% undead repel`;
    case 'undead_dmg':  return `+${effect.dice} vs undead`;
    default: return effect.kind;
  }
}

// ---- Text collector for spoiler lint ------------------------------------------
const _collectedText = [];

export function collectManualText(db) {
  const texts = [];
  // Gather all text strings the manual would emit
  // (prose headings, generated table content)
  const schools = ['hexen', 'lorist', 'storm'];
  for (const sc of schools) {
    for (let tier = 1; tier <= 7; tier++) {
      for (const sp of db.spellsFor(sc, tier)) {
        texts.push(sp.name, sp.code, sp.flavor, effectDesc(sp), String(sp.sp));
      }
    }
  }
  for (const song of db.songs) {
    texts.push(song.name, song.flavor);
    texts.push(songEffectStr(song.explore));
    texts.push(songEffectStr(song.combat));
  }
  for (const race of db.races) {
    texts.push(race.name, race.desc);
    for (const [k, v] of Object.entries(race.mods)) texts.push(`${modStr(v)} ${k}`);
  }
  for (const cls of db.classes.filter(c => c.starting)) {
    texts.push(cls.name, cls.desc, cls.primeStat, cls.primeHint);
  }
  // shop items
  const shopItems = db.items.filter(i => i.shop)
    .sort((a,b) => ['weapon','armor','shield','helm','gauntlets','instrument','light','potion']
      .indexOf(a.type) - ['weapon','armor','shield','helm','gauntlets','instrument','light','potion'].indexOf(b.type) || a.price - b.price);
  for (const it of shopItems) {
    texts.push(it.name, String(it.price));
  }
  // static prose chunks
  texts.push(
    'THORNMERE', 'The Lay of Thornmere', 'Tales of the Fen',
    'Adventurers\' Hall', "Greta's Provisioner", 'Temple of the Quiet Flame',
    "Roskva's Spark House", 'The Drowned Goose', 'The Hart & Hollow',
    'Hexen', 'Lorist', 'Stormcaller', 'Riddlemaster',
    'Verses', 'Maldrec',
  );
  return texts;
}

// ---- Document state -----------------------------------------------------------
let doc, pageNum, footerEnabled;

function newPage(title) {
  if (doc.bufferedPageRange().count > 0) doc.addPage();
  pageNum++;
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(PARCHMENT);
  // Running header
  if (footerEnabled) {
    doc.font('Times-Italic').fontSize(7).fillColor(BORDER);
    doc.text('The Lay of Thornmere', ML, 28, { width: BODY_W, align: 'left', lineBreak: false });
    doc.text(`${pageNum}`, ML, 28, { width: BODY_W, align: 'right', lineBreak: false });
    doc.moveTo(ML, 38).lineTo(BODY_R, 38); doc.strokeColor(BORDER).lineWidth(0.5).stroke();
    // Footer
    doc.moveTo(ML, PAGE_H - MB + 8).lineTo(BODY_R, PAGE_H - MB + 8); doc.strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.font('Times-Italic').fontSize(7).fillColor(BORDER);
    doc.text(title, ML, PAGE_H - MB + 12, { width: BODY_W, align: 'center', lineBreak: false });
  }
  return MT + 10;
}

function h1(title, y) {
  doc.rect(ML - 5, y - 2, BODY_W + 10, 20).fill(CHAPTER);
  doc.font('Times-Bold').fontSize(14).fillColor(PARCHMENT);
  doc.text(title, ML, y + 1, { width: BODY_W, lineBreak: false });
  return y + 26;
}

function h2(title, y) {
  doc.font('Times-Bold').fontSize(11).fillColor(HEADING2);
  doc.text(title, ML, y, { width: BODY_W });
  y += 14;
  doc.moveTo(ML, y - 2).lineTo(BODY_R, y - 2); doc.strokeColor(BORDER).lineWidth(0.5).stroke();
  return y + 2;
}

function body(text, y, opts = {}) {
  doc.font('Times-Roman').fontSize(9.5).fillColor(INK);
  doc.text(text, ML, y, { width: BODY_W, align: 'justify', ...opts });
  return y + doc.heightOfString(text, { width: BODY_W, ...opts }) + 4;
}

function italic(text, y, opts = {}) {
  doc.font('Times-Italic').fontSize(9).fillColor('#3A2010');
  doc.text(text, ML, y, { width: BODY_W, align: 'left', ...opts });
  return y + doc.heightOfString(text, { width: BODY_W, ...opts }) + 3;
}

function tableRow(cells, widths, x, y, isHdr = false, altRow = false) {
  const rowH = 11;
  if (isHdr) {
    doc.rect(x, y - 1, widths.reduce((a,b) => a+b, 0), rowH + 1).fill(TABLE_HDR);
  } else if (altRow) {
    doc.rect(x, y - 1, widths.reduce((a,b) => a+b, 0), rowH + 1).fill(TABLE_ALT);
  }
  let cx = x;
  const fnt = isHdr ? 'Times-Bold' : 'Times-Roman';
  const sz  = isHdr ? 8 : 8;
  doc.font(fnt).fontSize(sz).fillColor(INK);
  for (let i = 0; i < cells.length; i++) {
    doc.text(String(cells[i]), cx + 2, y, { width: widths[i] - 4, lineBreak: false });
    cx += widths[i];
  }
  return y + rowH;
}

// ---- Generate -----------------------------------------------------------------
export async function generateManual(outPath, db) {
  doc      = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 0, autoFirstPage: false,
    info: { Title: 'The Lay of Thornmere', Author: 'Tales of the Fen, Volume I' } });
  const _stream = createWriteStream(outPath);
  doc.pipe(_stream);
  pageNum      = 0;
  footerEnabled = false;

  // ================================================================== COVER
  doc.addPage();
  doc.rect(0, 0, PAGE_W, PAGE_H).fill('#1A0A04');
  // Title
  doc.font('Times-Bold').fontSize(36).fillColor('#D4A830');
  doc.text('THE LAY OF', ML, 140, { width: BODY_W, align: 'center' });
  doc.fontSize(52).fillColor('#F0C840');
  doc.text('THORNMERE', ML, 180, { width: BODY_W, align: 'center' });
  doc.font('Times-Roman').fontSize(14).fillColor('#C8A058');
  doc.text('Tales of the Fen, Volume I', ML, 250, { width: BODY_W, align: 'center' });
  // Decorative rule
  doc.strokeColor('#8B6914').lineWidth(1.5).moveTo(ML, 275).lineTo(BODY_R, 275).stroke();
  doc.strokeColor('#8B6914').lineWidth(0.5).moveTo(ML, 279).lineTo(BODY_R, 279).stroke();
  // Subtitle
  doc.font('Times-Italic').fontSize(11).fillColor('#A08050');
  doc.text('A first-person dungeon crawler in the tradition of the original Bard\'s Tale.', ML, 290, { width: BODY_W, align: 'center' });
  // Bottom credits
  doc.font('Times-Roman').fontSize(8).fillColor('#6A5030');
  doc.text('All art and music made of text.\nThe Bard\'s Tale (1985) copyright Interplay Productions. Thornmere is an original work.',
    ML, PAGE_H - 90, { width: BODY_W, align: 'center' });

  footerEnabled = true;

  // ================================================================ ABOUT
  let y = newPage('About This Game');
  y = h1('I. About This Game', y);
  y = body(`Thornmere is a first-person dungeon crawler in the tradition of the 1985 classic. You assemble a party of adventurers at the Adventurers\' Hall, lead them through the streets of a fog-bound fen town, and eventually descend into places the Magistrate would rather you did not.`, y);
  y = body(`The town of Thornmere is in trouble. The Founding Verses — three fragments of the song that first called the gate-wards into being — have been stolen. Without them, the wards fail a little more each season. Something has been humming in the east since the bell fell silent. The Magistrate has posted a notice.`, y);
  y = body(`You answered it.`, y) + 6;

  y = h2('The Three Goals', y);
  y = body(`1. Complete the quest. Recover the Verses before the last ward fails. The quest is long and the path is not straight. Finding the way is half the work.`, y);
  y = body(`2. Build characters who can survive it. The first dungeon is forgiving. The last is not. Plan ahead: classes that seem weak at level 1 may be essential at level 7.`, y);
  y = body(`3. Explore everything. There is loot in corners the quest does not require you to visit, lore in rumors you should probably write down, and at least two things in this game that have no obvious purpose until suddenly they do.`, y);

  // ================================================================ OVERVIEW
  y = newPage('A Quick Overview');
  y = h1('II. A Quick Overview', y);

  y = h2('For Players New to the Genre', y);
  y = body(`The game is played from the first-person view. You navigate corridors one step at a time: arrow keys or WASD to move and turn, E to search for hidden doors, and the rest of the alphabet for everything else. The Command Card lists every key. Paste it to the monitor.`, y);
  y = body(`Your party of up to six characters occupies two ranks: the front three engage in melee, the rear three cast spells, sing, and throw things. Characters in the back row cannot reach enemies unless they have a ranged weapon or a spell.`, y);

  y = h2('For Genre Veterans', y);
  y = body(`The game uses the 1985 system with light modernisation. The dungeon grids are 22 × 22. There are three spell schools and seven tiers each. One class requires two schools at tier 6 to unlock. The automap is optional.`, y);
  y = italic(`See section VI for dungeon mapping details, and section IX for the complete spell lists.`, y) + 4;

  y = h2('The Pre-Built Party', y);
  y = body(`If you wish to be in the first dungeon in two minutes, the Adventurers\' Hall offers “Load the Fen-Pact” when the roster is empty. The Fen-Pact are a sensibly equipped level-1 party: Hroth (Blade), Aldwyn (Warden), Pip (Knave), Tamsin (Skald), Morrigan (Hexen), and Elspeth (Lorist). They cost you nothing; they arrived on this morning\'s barge and took the notice off the board.`, y);

  y = h2('Remastered and Legacy Mode', y);
  y = body(`At New Game, you choose Remastered or Legacy (or Custom, to toggle features individually). Remastered adds the automap, save-anywhere, a shared 40-item party pool, reduced XP requirements, exact item charges, and a dedicated summon slot. Legacy is the 1985 experience. Two of the toggles — shared inventory and reduced XP — are locked once you create your first character, as they affect balance throughout the campaign. The rest can be changed any time in Options.`, y);

  // ================================================================ CHARACTERS
  y = newPage('Characters');
  y = h1('III. Characters', y);

  // Races
  y = h2('The Five Races', y);
  y = body(`Choose your race when you create a character. Race determines starting stat bonuses and a few flavor sentences the game will never ask you to read again. Pick based on the numbers.`, y) + 4;

  // Race table
  const raceColW = [90, 30, 30, 30, 30, 30, BODY_W - 90-150];
  y = tableRow(['Race', 'ST', 'IQ', 'DX', 'CN', 'LK', 'Description'], raceColW, ML, y, true);
  for (const [i, race] of db.races.entries()) {
    const mods = ['ST','IQ','DX','CN','LK'].map(s => modStr(race.mods[s] || 0));
    y = tableRow([race.name, ...mods, race.desc], raceColW, ML, y, false, i%2===1);
  }
  y += 8;

  // Stats
  y = h2('The Five Stats', y);
  const statDescs = [
    ['ST', 'Strength',   'Melee attack bonus and damage. Prime stat for Blades, Wardens, Fistwrights.'],
    ['IQ', 'Intellect',  'Spell points at creation and per level. Prime stat for Hexen, Lorist, Stormcaller, Riddlemaster.'],
    ['DX', 'Dexterity',  'Armour class, missile attack bonus. Prime stat for Knaves, Striders, Skalds.'],
    ['CN', 'Constitution','Hit points per level. All classes benefit; especially important for tanks.'],
    ['LK', 'Luck',       'Saving throw bonus. Affects random outcomes in subtle ways.'],
  ];
  const statColW = [30, 100, BODY_W-130];
  y = tableRow(['Stat', 'Name', 'Governs'], statColW, ML, y, true);
  for (const [i, [abbr, name, desc]] of statDescs.entries()) {
    y = tableRow([abbr, name, desc], statColW, ML, y, false, i%2===1);
  }
  y += 8;

  // Classes
  y = h2('The Eight Starting Classes', y);
  y = body(`All classes level at roughly similar rates. The XP factor is close enough to ignore until tier 6 unlocks matter. What differs is who they are in a fight and what they can do in a corridor.`, y) + 4;

  const clsColW = [70, 45, BODY_W - 70 - 45];
  y = tableRow(['Class', 'Prime Stat', 'Description'], clsColW, ML, y, true);
  for (const [i, cls] of db.classes.filter(c => c.starting).entries()) {
    const primeLbl = `${cls.primeStat} — ${cls.primeHint.split(';')[0].replace(/determines.*$/, '').trim()}`;
    y = tableRow([cls.name, cls.primeStat, cls.desc], clsColW, ML, y, false, i%2===1);
    if (y > PAGE_H - MB - 20) { y = newPage('Characters — Classes'); }
  }
  y += 6;

  y = body(`The Fistwright is the odd one out: unarmed damage scales with level and Strength, and they receive an AC bonus when wearing no armour — making them good tanks who want to stay naked. They cannot use weapons, which is precisely the point.`, y);
  y = body(`The Skald\'s songs require an instrument equipped in the instrument slot. Without one, they are a competent light fighter with no special tricks. Buy a reed pipe at Greta\'s before you leave town.`, y);

  y = h2('Advanced Classes', y);
  y = body(`Two classes cannot be chosen at character creation. The Stormcaller opens when a character reaches tier 5 in either Hexen or Lorist school (gained at the Magistrate\'s Court, which keeps no signboard in the market — the Magistrate prefers her clients to ask). The Riddlemaster requires tier 6 in two schools, and is the only class that may access all three. The Needle will not open without one.`, y);
  y = body(`Class change preserves all learned spell tiers and resets the level counter. A level-6 Hexen who changes to Stormcaller begins at level 1 as a Stormcaller but retains all Hexen spells known. SP rolls improve with the new class.`, y);

  // ================================================================ PLACES
  y = newPage('Places in Thornmere');
  y = h1('IV. Places in Thornmere', y);
  y = body(`Thornmere is a market town on the eastern fen-edge. It has a Magistrate, a founding-era bell that no longer rings, three taverns’ worth of rumours, and a disgraced hedge-wizard’s spire that leans a little more each year. The map shows the layout. Not every building is labeled.`, y) + 4;

  const places = [
    ["Adventurers' Hall", "The only place to form a party or save your game in Legacy mode. Also the only place to hire characters from the benches. No Magistrate’s notice required; they take anyone with a pulse."],
    ["Greta's Provisioner", "Standard town stock: weapons, armour, shields, instruments, light sources, and potions. Greta identifies items for a fee, cheaper if a Knave is in the party. She does not bargain."],
    ["Temple of the Quiet Flame", "Healing, poison cure, stone cure, drain restoration, and resurrection. Prices scale with damage taken and the dead character’s level. The Temple is also the only place in-game that will resurrect — the Lorist school has a spell for it, but Lorists are in short supply."],
    ["Roskva's Spark House", "Recharges spell points for a gold fee that scales with the character’s level. Expensive but faster than resting. Keep Roskva in mind before a long delve."],
    ["The Drowned Goose", "The west-side tavern. Sells wine for Skalds (restores songs-per-day). Also sells rumours — eight in rotation, worth writing down."],
    ["The Hart & Hollow", "The east-side tavern. Same services as the Goose. Some regulars prefer one; neither keeps a guest book."],
    ["The Bell Tower", "Sealed since the Verses were taken. The Magistrate calls it “pending review.” The founding bell is still inside. Nobody has rung it since."],
    ["The City Gates", "The East Gate leads to the fen road and beyond. Travel at night at your own risk; the wards at that gate are thin. The North Gate is sealed. Travelers who know what is east of the East Gate do not linger discussing it."],
    ["The Magistrate's Court", "The Review Board operates here. Spell tiers are purchased here, class changes are approved here, and level gains are registered here. The Court keeps no signboard — ask a local."],
    ["Maldrec's Needle", "The tower at the east edge of town. Maldrec the Unsung built it, stole the Verses from the bell tower in a single night, and has not been seen in the market since. The tower leans toward town. Some say it is listening."],
  ];
  for (const [name, desc] of places) {
    if (y > PAGE_H - MB - 50) y = newPage('Places in Thornmere');
    doc.font('Times-Bold').fontSize(9.5).fillColor(ACCENT);
    doc.text(name, ML, y); y += 12;
    y = body(desc, y);
    y += 4;
  }

  y = h2('Day and Night', y);
  y = body(`The town clock advances as you explore. After nightfall, random encounters in the streets increase and include more dangerous adversaries. Day returns after a full cycle. Sleeping at the Hall (or any save) passes time. In Legacy mode, watching your step is part of the game.`, y);

  // ================================================================ EXPLORATION
  y = newPage('Exploration');
  y = h1('V. Exploration', y);

  y = h2('Movement and Facing', y);
  y = body(`You move one cell at a time. Arrow keys or WASD: up/W forward, left/A and right/D turn, down/S about-face. The compass in the status strip shows your facing. L (Look) describes what you see at the current cell.`, y);

  y = h2('Light', y);
  y = body(`Dungeons are dark. Without a light source the game reports DARKNESS and you cannot see — or navigate reliably. Torches last 150 steps. Greatcandles last 250. Storm Lamps last 500 and do not go out in magical draughts. Several spells also provide light.`, y);
  y = body(`T lights a torch from inventory if your current source is exhausted, or swaps to a longer-duration source if one is available. Keep a spare.`, y);

  y = h2('Searching', y);
  y = body(`E searches the current cell and all adjacent walls for hidden doors. Not all secrets reveal themselves to one search. Some cells are searched for traps automatically by the Knave. The Lorist spell Seeker’s Sight (SEEK) reveals secret doors for 300 steps; True Needle (CMPS) shows your coordinates.`, y);

  y = h2('The Automap (Remastered)', y);
  y = body(`M cycles the automap through three states: off, corner overlay, and full-screen parchment view. The map marks visited cells, known walls, and special locations you’ve found. In Remastered mode, spinners — floor traps that silently rotate your facing — are detected when the automap disagrees with your step log. You will know something went wrong. Discovering where is your problem.`, y);

  y = h2('Dungeon Mapping (Legacy)', y);
  y = body(`In Legacy mode, the automap is off and the dungeon is your problem. Each maze is a 22 × 22 grid. Buy graph paper, or use the smoke screen: the in-game automap is still there and works — you’ve simply chosen not to use it. No rule stops you from turning it on in Options at any time.`, y);
  y = italic(`Note: spinners, teleporters, and darkness can desynchronise any mental map. Finding dungeon entrances is always part of exploration.`, y);

  y = h2('Time and Survival', y);
  y = body(`Every step, every spell, every torch-tick counts toward the day/night cycle. In deeper levels, random encounters are more frequent and fights drain resources faster. The town is safe. Manage the trip.`, y);

  // ================================================================ COMBAT
  y = newPage('Combat');
  y = h1('VI. Combat', y);

  y = h2('Ranks and Reach', y);
  y = body(`Characters occupy one of six party slots: 1–3 are the front rank (melee range), 4–6 are the rear rank. Enemies appear in up to four groups at varying distances. Front-rank characters fight groups in melee range. Rear-rank characters use ranged weapons or spells.`, y);
  y = body(`Melee reach: front rank attacks any group within 30 feet. Rear rank cannot make melee attacks unless the group is at distance 0 (adjacent, in the corridor). A party without front-line fighters will survive exactly one ambush.`, y);

  y = h2('Combat Commands', y);
  const combatCmds = [
    ['F', 'Fight — attack the targeted group with the current weapon (or fists)'],
    ['C', 'Cast a combat spell from known schools'],
    ['P', 'Play a song (Skald only; requires instrument)'],
    ['U', 'Use an item from inventory'],
    ['D', 'Defend — gain an AC bonus this round, take no action'],
    ['R', 'Run — attempt to retreat. Not always possible.'],
    ['←→', 'Cycle target group; 1–4 to select directly'],
  ];
  const ccW = [30, BODY_W - 30];
  y = tableRow(['Key', 'Action'], ccW, ML, y, true);
  for (const [i, [k, a]] of combatCmds.entries()) {
    y = tableRow([k, a], ccW, ML, y, false, i%2===1);
  }
  y += 6;

  y = body(`Initiative is DX-based. High DX characters act before low DX enemies. Critical hits deal double damage; Striders’ crit chance grows with level.`, y);

  y = h2('Loot and Traps', y);
  y = body(`Defeated groups may leave a chest. Knaves can inspect and disarm traps on chests. Unidentified items show a generic name (“Sword?”) until identified at Greta’s or by the Lorist spell Eye of Truth. Chests’ items are unidentified unless the Knave opened them. Carry a Knave.`, y);

  y = h2('Summons', y);
  y = body(`Several spells summon creatures to fight for the party. In Legacy mode, a summon occupies a party slot — so a six-person party can only summon if someone sits out. In Remastered 7th-Slot mode, summons occupy a dedicated slot and do not crowd the roster. Press 7 to see the summon’s status.`, y);

  // ================================================================ MAGIC
  y = newPage('The Magic System');
  y = h1('VII. The Magic System', y);

  y = h2('Three Schools', y);
  y = body(`Hexen are the school of dread and deception: damage, fear, silence, and illusions that may or may not bite. Lorist are the school of light and restoration: healing, wards, knowledge, and the occasional devastating sunbeam. The Storm school — accessible only through class change — bends weather into weapons: lightning, gales, hail, and the kind of indoor storm that ends arguments.`, y);
  y = body(`A character can learn more than one school. A Hexen who class-changes to Stormcaller retains all Hexen tiers and adds Storm. Only the Riddlemaster can learn all three.`, y);

  y = h2('Spell Points and Regeneration', y);
  y = body(`Spell points (SP) refresh slowly in daylight. A full night’s rest restores them completely. Roskva’s Spark House recharges SP for gold. Carrying a Lorist with Quickening or Well of Light means the party never runs completely dry, but every point they spend on the party is a point they can’t spend on enemies.`, y);

  y = h2('Learning Spells', y);
  y = body(`Spells are not chosen individually. A caster learns a spell “tier” at the Magistrate’s Court: each tier costs gold and XP. Purchasing tier 2 of a school grants access to all four spells in that tier. Tiers must be purchased in order.`, y);
  y = body(`The maximum tier available at a given level increases with level, at a rate steeper than the original game. A dedicated caster can reach tier 7 by the final dungeon. An adventurer who cross-trains in a second school will be slower to the top tier of either.`, y);

  y = h2('Tiers and Class Change', y);
  y = body(`Tier 5 in Hexen or Lorist unlocks the Stormcaller class change at the Magistrate’s Court. Tier 6 in two schools unlocks the Riddlemaster. Class change is permanent and resets the level counter. Choose carefully.`, y);

  // ================================================================ SPELLS — 3 SCHOOLS
  for (const school of ['hexen', 'lorist', 'storm']) {
    const schoolLabel = { hexen: 'VIII. Hexen Spells', lorist: 'IX. Lorist Spells', storm: 'X. Storm Spells' }[school];
    y = newPage(`${school.charAt(0).toUpperCase()+school.slice(1)} Spells`);
    y = h1(schoolLabel, y);

    const desc = {
      hexen: 'The school of dread and false light. Hexen spells deceive, damage, silence, and summon shades that pretend very hard to be dangerous.',
      lorist: 'The school of deep ledgers and honest light. Lorist spells heal, ward, reveal, and occasionally call down the full weight of a noon-bright day.',
      storm: 'The third school. Stormcallers speak thunder fluently. Everything they cast is weather of one kind or another, and they have strong opinions about indoor weather.'
    }[school];
    y = italic(desc, y) + 6;

    const spColW = [32, 130, 22, 36, 55, BODY_W - 32 - 130 - 22 - 36 - 55];
    y = tableRow(['Code', 'Name', 'SP', 'Range', 'Effect', 'Description'], spColW, ML, y, true);

    for (let tier = 1; tier <= 7; tier++) {
      // Tier divider
      if (y > PAGE_H - MB - 20) {
        y = newPage(`${school.charAt(0).toUpperCase()+school.slice(1)} Spells (continued)`);
        y = tableRow(['Code', 'Name', 'SP', 'Range', 'Effect', 'Description'], spColW, ML, y, true);
      }
      doc.rect(ML, y, BODY_W, 10).fill(SCHOOL_H[school]);
      doc.font('Times-Bold').fontSize(7.5).fillColor(SCHOOL_TXT[school]);
      doc.text(`Tier ${tier}`, ML + 4, y + 1, { lineBreak: false });
      y += 12;

      const spells = db.spellsFor(school, tier);
      for (const [i, sp] of spells.entries()) {
        if (y > PAGE_H - MB - 15) {
          y = newPage(`${school.charAt(0).toUpperCase()+school.slice(1)} Spells (continued)`);
          y = tableRow(['Code', 'Name', 'SP', 'Range', 'Effect', 'Description'], spColW, ML, y, true);
        }
        const rng = sp.range ? `${sp.range} ft` : 'self';
        y = tableRow([sp.code, sp.name, sp.sp, rng, effectDesc(sp), sp.flavor], spColW, ML, y, false, i%2===1);
      }
      y += 2;
    }

    // Riddlemaster note on last school
    if (school === 'storm') {
      y += 4;
      y = italic('The Riddlemaster’s capstone abilities — spoken of in no book sold openly — are listed by name only. Discovery is the point.', y);
    }
  }

  // ================================================================ SONGS
  y = newPage("Songs of the Skald");
  y = h1('XI. Songs of the Skald', y);
  y = body(`The Skald sings from the old verses — fragments of the Founding Song that survived in pubs, funeral-barns, and the occasional hedge-school. An instrument equipped is required. Without one, the Skald is an adequately armed light fighter with good saves.`, y);
  y = body(`Songs persist while the Skald is alive and singing. Each use of a song draws from a daily pool that refills with a Skald-grade wine at either tavern (the barkeep knows the good skin on sight). The pool resets completely on a full rest.`, y) + 4;

  const songColW = [110, 110, BODY_W - 220];
  y = tableRow(['Song', 'Explore Effect', 'Combat Effect / Flavor'], songColW, ML, y, true);
  for (const [i, song] of db.songs.entries()) {
    if (y > PAGE_H - MB - 15) { y = newPage("Songs of the Skald"); }
    const expl = songEffectStr(song.explore);
    const comb = songEffectStr(song.combat);
    y = tableRow([song.name, expl, `${comb} — ${song.flavor}`], songColW, ML, y, false, i%2===1);
  }
  y += 6;

  y = italic('Instruments improve the Skald’s song power and thus the potency of each effect. A Reed Pipe is the base. The Fen Fiddle and War Drum add progressively more. Some instruments are not for sale.', y);

  // ================================================================ SPELL KEY GLOSSARY
  y = newPage('Spell Key Glossary');
  y = h1('XII. Spell Key Glossary', y);
  y = body(`All spell codes for quick reference. Useful when you find something in the dungeon that casts one and want to know what it does.`, y) + 4;

  const glW = [38, 130, 22, BODY_W - 190];
  y = tableRow(['Code', 'Name', 'SP', 'School / Tier'], glW, ML, y, true);
  for (const [i, sp] of db.spells.entries()) {
    if (y > PAGE_H - MB - 12) {
      y = newPage('Spell Key Glossary (continued)');
      y = tableRow(['Code', 'Name', 'SP', 'School / Tier'], glW, ML, y, true);
    }
    const tier = `${sp.school.charAt(0).toUpperCase()+sp.school.slice(1)} ${sp.tier}`;
    y = tableRow([sp.code, sp.name, sp.sp, tier], glW, ML, y, false, i%2===1);
  }

  // ================================================================ TIPS
  y = newPage('Tips from the Underground');
  y = h1('XIII. Tips from the Underground', y);
  y = italic('Heard at the Drowned Goose, in no particular order of reliability.', y) + 6;

  const tips = [
    `A party of six should have at least two who can take a hit (front rank), one who finds traps before they find the party (Knave), and at least one who can heal in a crisis (Lorist with Mending Word keeps people alive; the Temple keeps them alive after that). Everything else is luxury.`,
    `The Drowned Goose serves wine that a Skald can use. The Skald’s songs are not cosmetic. Wayfarer’s March and Wardweaver’s Knot in the exploration phase mean fewer traps and better AC; Graveman’s Dirge does serious work in the second dungeon.`,
    `Save before you descend. Save when you find something interesting. Save when everyone is healthy. You are playing a 1985 game; there is no shame in regular saves.`,
    `The Knave’s identify discount at Greta’s is worth keeping a Knave in the party even when you’d rather have someone else. Unidentified items sell for a quarter of their value; identified items sell for half.`,
    `Stat modifiers are not linear. There is a cliff at 17 and another at 18; a character with ST 17 attacks and damages noticeably better than one with ST 15. When rolling, fish for 17+ in the prime stat.`,
    `The second dungeon has undead. Lorist spells do double damage to undead; the Graveman’s Dirge does bonus damage to undead; Wightbane sold at Greta’s is worth the price against wights. In Legacy mode without true-seeing, you cannot tell an illusion from a real enemy until it hits or misses.`,
    `A Hexen’s summons cost SP but occupy the summon slot rather than a party slot (Remastered 7th-slot mode). An illusion with the right stats can absorb a round of hits the party would have taken.`,
    `The Magistrate’s Court does not advertise. Ask at the taverns if you cannot find it. Nobody admits where the Review Board sits.`,
  ];

  for (const tip of tips) {
    if (y > PAGE_H - MB - 60) { y = newPage('Tips from the Underground'); }
    doc.rect(ML - 5, y, 4, 12).fill(ACCENT);
    y = body(tip, y, { indent: 8 });
    y += 6;
  }

  // ================================================================ ITEMS
  y = newPage("Greta's Stock");
  y = h1("XIV. Items — Greta's Standard Stock", y);
  y = body(`Greta sells everything a level-1 party needs and several things a level-5 party would pay for. The following list covers everything available at New Game. Rare, unique, and dungeon-found items are not listed here — those must be discovered.`, y);
  y = body(`Prices listed are purchase price. Sell price is half for identified items, one quarter for unidentified. Greta does not haggle.`, y) + 4;

  const shopItems = db.items.filter(i => i.shop)
    .sort((a, b) => ['weapon','armor','shield','helm','gauntlets','instrument','light','potion']
      .indexOf(a.type) - ['weapon','armor','shield','helm','gauntlets','instrument','light','potion'].indexOf(b.type) || a.price - b.price);

  let lastType = '';
  const itemColW = [140, 40, 80, BODY_W - 260];
  y = tableRow(['Item', 'Price', 'Stats', 'Who Can Use'], itemColW, ML, y, true);

  for (const [i, it] of shopItems.entries()) {
    if (y > PAGE_H - MB - 14) {
      y = newPage("Greta's Stock (continued)");
      y = tableRow(['Item', 'Price', 'Stats', 'Who Can Use'], itemColW, ML, y, true);
    }
    if (it.type !== lastType) {
      doc.rect(ML, y, BODY_W, 9).fill('#D4B870');
      doc.font('Times-Bold').fontSize(7).fillColor('#3A2010');
      const typeLabel = { weapon:'Weapons', armor:'Armour', shield:'Shields', helm:'Helms', gauntlets:'Gauntlets', instrument:'Instruments', light:'Light Sources', potion:'Potions & Consumables' }[it.type] || it.type;
      doc.text(typeLabel, ML + 4, y + 1, { lineBreak: false });
      y += 11;
      lastType = it.type;
    }
    let stats = '';
    if (it.dmg)    stats = `${it.dmg} dmg`;
    if (it.ac)     stats = `AC +${it.ac}`;
    if (it.radius) stats = `radius ${it.radius}`;
    if (it.burn)   stats = (stats ? stats + ' ' : '') + `${it.burn} steps`;
    if (it.bonus?.hit) stats += ` +${it.bonus.hit} hit`;
    const who = it.classes ? it.classes.join(', ') : 'all';
    y = tableRow([it.name, `${it.price}g`, stats, who], itemColW, ML, y, false, i%2===1);
  }

  // ================================================================ BACK PAGE
  y = newPage('Reference');
  y = h1('XV. Quick Reference', y);

  // Keys in two columns
  y = h2('Keybindings', y);
  const kbSection = [
    ['Movement', '↑/W fwd  ←/A left  →/D right  ↓/S about-face'],
    ['Explore', 'E search  C cast  P song  U use  T torch  L look'],
    ['View', 'M automap (Rem.)  V save (Rem.)  O options  ? help'],
    ['Party', '1–6 char sheet  7 summon (Rem.)  Q quit/return'],
    ['Hall', 'P Fen-Pact  C create  A add  R remove  O order  S save'],
    ['Combat', 'F fight  C cast  P song  U use  D defend  R run  ←→ target'],
  ];
  const kbW = [80, BODY_W - 80];
  for (const [i, [label, keys]] of kbSection.entries()) {
    y = tableRow([label, keys], kbW, ML, y, false, i%2===0);
  }
  y += 12;

  y = h2('Credits', y);
  y = body(`Thornmere: The Founding Song is an original work inspired by The Bard’s Tale (1985, Interplay Productions). All art is generated pixel-by-pixel from text-grid source files. All music is synthesized in-browser from pattern definitions. No pre-recorded audio, no external image files. The source code and data are plain text and will outlast any format.`, y);
  y = italic('All art and music made of text.', y);

  doc.end();
  return new Promise(r => _stream.on('finish', r));
}

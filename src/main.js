// Thornmere — main UI: keyboard-driven state machine over the pure core.

import { loadAll, DB } from './core/db.js';
import { Rng, rollDice } from './core/rng.js';
import {
  newGame, gameToJSON, gameFromJSON, currentMap, partyChars, realParty,
  aliveParty, charById, mapStateFor, partyHasItem, isNight, partySlotsFree
} from './core/gamestate.js';
import {
  createCharacter, rollStats, statMod, clsOf, isAlive, equipItem, unequipSlot,
  equipped, addToInventory, removeFromInventory, invItem, effectiveAC,
  classAllowed, healChar, SLOTS, STATS
} from './core/character.js';
import {
  xpForLevel, canLevelUp, levelUp, maxTierAtLevel, tierCost, schoolsAvailable,
  nextTierFor, canBuyTier, buyTier, classChangeOptions, changeClass
} from './core/leveling.js';
import { step, turn, searchSecrets, answerRiddle, FACING_NAMES } from './core/maze.js';
import { addEffect, hasEffect, lightRadius } from './core/effects.js';
import { castExplore, canCastNow } from './core/spells.js';
import { startExploreSong, stopSong, canSing } from './core/songs.js';
import {
  makeCombat, setOrder, setPartyOrder, resolveRound, livingGroups, ableParty,
  groupLabel
} from './core/combat.js';
import { makeChest, inspectChest, disarmChest, openChest } from './core/loot.js';
import {
  shopStock, buyItem, sellItem, sellPrice, identifyCost, identifyItem,
  templePrices, templeService, sparkCost, sparkRecharge, nextRumor, wineCost,
  buyWine, addToParty, removeFromParty, moveInOrder, deleteCharacter
} from './core/services.js';
import { Renderer } from './ui/renderer.js';
import { renderStatus, renderRoster } from './ui/panels.js';

const SAVE_KEY = 'thornmere.save';
const AUTO_KEY = 'thornmere.autosave';

const $ = id => document.getElementById(id);
const els = {};
let renderer, game = null, rng = new Rng((Date.now() & 0xffffffff) >>> 0);
let mode = null;
let highlightId = null;
let narrating = false;

// ------------------------------------------------------------------ helpers
function msg(text, cls = '') {
  const p = document.createElement('p');
  if (cls) p.className = cls;
  p.textContent = text;
  els.log.appendChild(p);
  while (els.log.children.length > 250) els.log.removeChild(els.log.firstChild);
  els.log.scrollTop = els.log.scrollHeight;
}
function setMenu(html) { els.menu.innerHTML = html; els.menu.scrollTop = 0; }
function setHint(t) { els.hint.textContent = t; }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

function render() {
  if (!game) { renderer.splash('THORNMERE', 'The Founding Song'); els.status.textContent = ''; els.roster.innerHTML = ''; els.loc.textContent = ''; return; }
  if (mode?.draw) mode.draw();
  else renderer.draw(game);
  renderStatus(game, els.status);
  renderRoster(game, els.roster, highlightId);
  els.loc.textContent = game.debugMap ? `(${game.pos.x},${game.pos.y}) ${FACING_NAMES[game.pos.facing]}` : '';
}

function setMode(m) {
  mode = m;
  highlightId = null;
  if (m.menu !== undefined) setMenu(m.menu);
  setHint(m.hint || '');
  m.enter?.();
  render();
}

// generic list menu: options = [{k,label,fn,dim?}]
function menuMode({ title, body = '', options, view, hint, onEsc, draw }) {
  const lines = options.filter(o => !o.hidden).map(o => ` (${o.k.toUpperCase()}) ${o.label}`).join('\n');
  return {
    menu: `<span class="title">${esc(title)}</span>\n${body ? esc(body) + '\n' : ''}${lines}`,
    hint: hint ?? 'Choose an option. Esc backs out.',
    draw,
    onKey(e) {
      const k = e.key.toLowerCase();
      if (k === 'escape' && onEsc) { onEsc(); return; }
      const opt = options.find(o => o.k.toLowerCase() === k && !o.hidden);
      if (opt && !opt.dim) opt.fn();
    }
  };
}

// pick one of the real party members
function pickChar(title, filter, cb, onEsc, includeDead = false) {
  const chars = realParty(game);
  const opts = chars.map((ch, i) => ({
    k: String(i + 1),
    label: `${ch.name} (${clsOf(ch).name} ${ch.level})`,
    fn: () => cb(ch),
    dim: !(includeDead || isAlive(ch)) || (filter && !filter(ch)),
    hidden: filter && !filter(ch) && !includeDead && false
  }));
  if (!opts.some(o => !o.dim)) { msg('No one fit for that.'); onEsc(); return; }
  setMode(menuMode({ title, options: opts.filter(o => !o.dim), onEsc, draw: mode?.draw }));
}

function pickFromList(title, items, labelFn, cb, onEsc, page = 0) {
  const PER = 9;
  const pages = Math.max(1, Math.ceil(items.length / PER));
  const slice = items.slice(page * PER, page * PER + PER);
  const opts = slice.map((it, i) => ({ k: String(i + 1), label: labelFn(it), fn: () => cb(it) }));
  if (pages > 1) {
    opts.push({ k: '+', label: `next page (${page + 1}/${pages})`, fn: () => pickFromList(title, items, labelFn, cb, onEsc, (page + 1) % pages) });
    opts.push({ k: '-', label: 'previous page', fn: () => pickFromList(title, items, labelFn, cb, onEsc, (page + pages - 1) % pages) });
  }
  setMode(menuMode({ title, options: opts, onEsc, draw: mode?.draw }));
}

function textPrompt(label, cb, onEsc) {
  let buf = '';
  const show = () => setMenu(`<span class="title">${esc(label)}</span>\n&gt; ${esc(buf)}_`);
  setMode({
    hint: 'Type your answer. Enter to speak it, Esc to stay silent.',
    draw: mode?.draw,
    onKey(e) {
      if (e.key === 'Enter') { cb(buf); return; }
      if (e.key === 'Escape') { onEsc(); return; }
      if (e.key === 'Backspace') buf = buf.slice(0, -1);
      else if (e.key.length === 1 && buf.length < 24) buf += e.key;
      show();
    }
  });
  show();
}

function confirm(question, yes, no) {
  setMode(menuMode({
    title: question,
    options: [{ k: 'y', label: 'Yes', fn: yes }, { k: 'n', label: 'No', fn: no }],
    onEsc: no, draw: mode?.draw
  }));
}

function saveTo(key) { localStorage.setItem(key, gameToJSON(game)); }
function loadFrom(key) {
  const s = localStorage.getItem(key);
  if (!s) return false;
  game = gameFromJSON(s);
  return true;
}

window.addEventListener('beforeunload', () => { if (game) saveTo(AUTO_KEY); });

// ------------------------------------------------------------------ narration
function narrate(lines, then) {
  narrating = true;
  setMenu('');
  let i = 0;
  const tick = () => {
    if (i >= lines.length) { narrating = false; then?.(); return; }
    const e = lines[i++];
    if (e.type === 'msg' || e.text) msg(e.text, e.mouth ? 'mouth' : /falls!|succumbs|dies|drained|poisoned|stone/i.test(e.text || '') ? 'hurt' : '');
    render();
    timer = setTimeout(tick, 240);
  };
  let timer = setTimeout(tick, 10);
  narrateFlush = () => {
    clearTimeout(timer);
    while (i < lines.length) {
      const e = lines[i++];
      if (e.text) msg(e.text, e.mouth ? 'mouth' : '');
    }
    narrating = false;
    render();
    then?.();
  };
}
let narrateFlush = null;

// ================================================================== EXPLORE
const exploreMode = {
  menu: '',
  hint: '↑/W forward  ←→/A·D turn  ↓/S about-face  E search  C cast  P song  U use  T torch  L look  1-6 party  Q quit  ? help',
  onKey(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') return doStep(false);
    if (k === 'arrowdown' || k === 's') { turn(game, 2); return render(); }
    if (k === 'arrowleft' || k === 'a') { turn(game, -1); return render(); }
    if (k === 'arrowright' || k === 'd') { turn(game, 1); return render(); }
    if (k === 'e') return handleEvents(searchSecrets(game, rng));
    if (k === 'c') return castFlow();
    if (k === 'p') return songFlow();
    if (k === 'u') return useFlow();
    if (k === 't') return torchFlow();
    if (k === 'l') return lookHere();
    if (k === 'm') { if (debugAllowed()) { game.debugMap = !game.debugMap; render(); } return; }
    if (k === 'q') return quitFlow();
    if (k === '?') return helpMode();
    if (/^[1-6]$/.test(k)) return sheetFlow(parseInt(k, 10) - 1);
  }
};

function debugAllowed() { return new URLSearchParams(location.search).has('debug'); }

function doStep(backward) {
  const events = step(game, rng, { backward });
  handleEvents(events);
}

function lookHere() {
  const map = currentMap(game);
  msg(`You stand in ${map.name}, facing ${FACING_NAMES[game.pos.facing]}.`);
  const sp = map.cells?.[game.pos.x + ',' + game.pos.y];
  if (sp?.t === 'stairs') handleEvents([{ type: 'stairsPrompt', cell: sp }]);
  if (sp?.t === 'mouth') msg(sp.text, 'mouth');
  render();
}

function handleEvents(events) {
  let interrupt = null;
  for (const e of events) {
    if (['msg', 'treasure'].includes(e.type) || e.text) {
      if (e.text) msg(e.text, e.mouth ? 'mouth' : '');
      if (e.type === 'treasure') {
        const extra = [];
        grantTreasure(e, extra);
        for (const x of extra) msg(x.text, 'good');
      }
    } else if (e.type === 'bump') {
      msg('You walk into the wall. The wall wins.');
    } else if (!interrupt) interrupt = e;
  }
  {
    render();
    if (!interrupt) { setMode(exploreMode); return; }
    switch (interrupt.type) {
      case 'building': return openBuilding(interrupt.id, interrupt.name);
      case 'gate': return gateFlow(interrupt.cell);
      case 'riddlePrompt': return riddleFlow();
      case 'stairsPrompt': return stairsFlow(interrupt.cell);
      case 'combat': return startCombat(interrupt.fixed
        ? { groups: interrupt.fixed.groups, fixed: interrupt.fixed }
        : { groups: interrupt.groups });
      case 'mapchange': return setMode(exploreMode);
      default: return setMode(exploreMode);
    }
  }
}

function grantTreasure(e, pending) {
  game.gold += e.gold || 0;
  for (const itemId of e.items || []) {
    const item = DB.item(itemId);
    let holder = realParty(game).find(ch => isAlive(ch) && addToInventory(ch, itemId, true));
    if (!holder) {
      holder = realParty(game).find(ch => isAlive(ch));
      holder?.inventory.push({ id: itemId, ident: true });
    }
    if (holder) pending.push({ text: `${holder.name} takes ${item.name}.`, type: 'msg' });
  }
  if (e.gold) pending.push({ text: `You pocket ${e.gold} gold.`, type: 'msg' });
}

function travel(to, announce = true) {
  game.pos = { map: to.map, x: to.x, y: to.y, facing: to.facing ?? game.pos.facing };
  stopSong(game);
  if (announce) msg(`— ${currentMap(game).name} —`, 'mouth');
  setMode(exploreMode);
}

function riddleFlow() {
  const map = currentMap(game);
  msg('A voice from the door: ' + map.riddle.question, 'mouth');
  textPrompt(map.riddle.question, (answer) => {
    if (answerRiddle(game, answer)) {
      msg('A long sigh of hinges — the door swings wide.', 'good');
      setMode(exploreMode);
    } else {
      msg(`The door is silent. (${map.riddle.hint})`);
      setMode(exploreMode);
    }
  }, () => setMode(exploreMode));
}

function stairsFlow(cell) {
  confirm(`Take the stairs ${cell.dir}?`, () => {
    msg(cell.dir === 'down' ? 'You descend into the waiting dark.' : 'You climb toward better air.');
    travel(cell.to);
  }, () => setMode(exploreMode));
}

function gateFlow(cell) {
  if (cell.id === 'north_gate') {
    msg('The North Gate is sealed with three centuries of rust. Beyond lies only the drowning fen.');
    return setMode(exploreMode);
  }
  if (isNight(game)) {
    msg('The East Gate is barred until dawn. The watchman does not meet your eye.');
    return setMode(exploreMode);
  }
  confirm('Pass the East Gate, out onto the fen and into the Howling Barrow?', () => {
    msg('The gate groans open. The fen smells of old rain and older graves.');
    travel(cell.to);
  }, () => setMode(exploreMode));
}

// ---- explore actions --------------------------------------------------------
function castFlow() {
  pickChar('Who casts?', ch => ch.knownSpells.length > 0 && isAlive(ch), (ch) => {
    const spells = ch.knownSpells.map(c => DB.spell(c)).filter(s => s.explore);
    pickFromList(`${ch.name} casts — SP ${ch.sp}/${ch.maxSp}`, spells,
      s => `${s.code} ${s.name} [${s.sp} SP, t${s.tier}]`,
      (s) => {
        if (s.target === 'ally') {
          pickChar('On whom?', null, (t) => finishCast(ch, s, t), () => setMode(exploreMode), s.effect.kind === 'resurrect');
        } else finishCast(ch, s, null);
      }, () => setMode(exploreMode));
  }, () => setMode(exploreMode));
}
function finishCast(ch, spell, target) {
  narrate(castExplore(game, rng, ch, spell, target), () => setMode(exploreMode));
}

function songFlow() {
  pickChar('Who plays?', ch => ch.cls === 'skald', (ch) => {
    const opts = DB.songs.map(s => ({
      k: String(s.key),
      label: `${s.name} — ${s.flavor.split('.')[0]}.`,
      fn: () => { const r = startExploreSong(game, ch, s.id); msg(r.msg, r.ok ? 'good' : ''); setMode(exploreMode); }
    }));
    opts.push({ k: '0', label: 'Let the song end', fn: () => { stopSong(game); msg('The music fades into drips and dark.'); setMode(exploreMode); } });
    setMode(menuMode({ title: `${ch.name}'s songbook (${ch.songsLeft} left today)`, options: opts, onEsc: () => setMode(exploreMode) }));
  }, () => setMode(exploreMode));
}

function torchFlow() {
  for (const ch of realParty(game)) {
    if (!isAlive(ch)) continue;
    const idx = ch.inventory.findIndex(en => DB.item(en.id).type === 'light');
    if (idx >= 0) return lightItem(ch, idx);
  }
  msg('No torch nor candle among you. The dark takes note.');
  render();
}
function lightItem(ch, idx) {
  const item = invItem(ch, idx);
  addEffect(game, { kind: 'light', radius: item.radius, until: game.clock + item.burn, fire: true });
  removeFromInventory(ch, idx);
  msg(`${ch.name} lights a ${item.name.toLowerCase()}. The dark steps back ${item.radius} paces.`, 'good');
  render();
}

function useFlow() {
  pickChar('Who rummages?', ch => isAlive(ch) && ch.inventory.length > 0, (ch) => {
    pickFromList(`${ch.name}'s pack`, ch.inventory.map((en, i) => ({ en, i })),
      ({ en }) => (en.ident ? DB.item(en.id).name : DB.item(en.id).generic),
      ({ en, i }) => useItemExplore(ch, i),
      () => setMode(exploreMode));
  }, () => setMode(exploreMode));
}

function useItemExplore(ch, idx) {
  const entry = ch.inventory[idx];
  const item = DB.item(entry.id);
  if (item.type === 'light') return lightItem(ch, idx);
  const use = item.use;
  if (!use) { msg(`The ${entry.ident ? item.name : item.generic} does nothing obvious here.`); return setMode(exploreMode); }
  const done = (text, consume = true) => {
    if (consume) removeFromInventory(ch, idx);
    if (text) msg(text, 'good');
    setMode(exploreMode);
  };
  switch (use.kind) {
    case 'heal':
      return pickChar('Heal whom?', null, (t) => {
        done(`${t.name} is healed ${healChar(t, rollDice(rng, use.dice))}.`);
      }, () => setMode(exploreMode));
    case 'cure':
      return pickChar('Cure whom?', null, (t) => {
        let any = false;
        for (const f of use.flags) if (t.status[f]) { delete t.status[f]; any = true; }
        done(any ? `${t.name} is cured.` : 'Nothing to cure — a waste.');
      }, () => setMode(exploreMode));
    case 'song_restore':
      return pickChar('Whose throat?', t => t.cls === 'skald', (t) => {
        t.songsLeft = Math.min(t.level, t.songsLeft + use.amount);
        done(`${t.name} hums, restored.`);
      }, () => setMode(exploreMode));
    case 'trueseeing':
      addEffect(game, { kind: 'trueseeing', until: game.clock + use.duration });
      return done('The world stops lying, briefly.');
    case 'recall': {
      removeFromInventory(ch, idx);
      const t = DB.map('town');
      travel({ map: 'town', x: t.entry.x, y: t.entry.y, facing: t.entry.facing });
      msg('One word, and you are home.', 'good');
      return;
    }
    case 'phase':
      addEffect(game, { kind: 'phase', until: game.clock + 2 });
      return done('Chalk dust hangs in the air. The wall ahead looks unsure of itself. Walk now.');
    case 'damage':
      return done('Better saved for battle.', false);
    default:
      return done('Nothing happens.', false);
  }
}

// ---- character sheet --------------------------------------------------------
function sheetFlow(slot) {
  const chars = partyChars(game);
  const ch = chars[slot];
  if (!ch || ch.summon) { render(); return; }
  highlightId = ch.id;
  const cls = clsOf(ch);
  const lines = [];
  lines.push(`${ch.name} — ${DB.race(ch.race).name} ${cls.name}, level ${ch.level}`);
  lines.push(STATS.map(s => `${s} ${ch.stats[s]}`).join('  '));
  lines.push(`HP ${ch.hp}/${ch.maxHp}  SP ${ch.sp}/${ch.maxSp}  AC ${effectiveAC(ch)}  XP ${ch.xp} (next: ${xpForLevel(ch.cls, ch.level + 1)})`);
  if (ch.drained) lines.push(`Drained ${ch.drained} level(s) — the Temple can restore them.`);
  const tiers = Object.entries(ch.schoolTiers).map(([s, t]) => `${s}:${t}`).join(' ');
  if (tiers) lines.push(`Spell tiers — ${tiers}`);
  if (ch.cls === 'skald') lines.push(`Songs left today: ${ch.songsLeft}`);
  lines.push('');
  ch.inventory.forEach((en, i) => {
    const item = DB.item(en.id);
    const eq = Object.values(ch.equip).includes(i) ? '*' : ' ';
    const ok = classAllowed(ch, item) ? '' : ' (not your trade)';
    lines.push(` ${i + 1}${eq} ${en.ident ? item.name : item.generic}${ok}`);
  });
  if (!ch.inventory.length) lines.push(' (empty pack)');
  lines.push('', '* = equipped.  1-8 equip/unequip, (T)rade, (D)rop, Esc done');

  setMode({
    menu: esc(lines.join('\n')),
    hint: 'Number keys equip/unequip. T trade, D drop, Esc back.',
    onKey(e) {
      const k = e.key.toLowerCase();
      if (k === 'escape') { highlightId = null; return setMode(exploreModeOrCurrent()); }
      if (/^[1-8]$/.test(k)) {
        const i = parseInt(k, 10) - 1;
        if (!ch.inventory[i]) return;
        const slotName = DB.item(ch.inventory[i].id).type;
        if (Object.values(ch.equip).includes(i)) {
          for (const s of SLOTS) if (ch.equip[s] === i) unequipSlot(ch, s);
          msg(`${ch.name} puts away the ${invItem(ch, i).name}.`);
        } else {
          const err = equipItem(ch, i);
          msg(err ? err : `${ch.name} readies the ${invItem(ch, i).name}.`);
        }
        return sheetFlow(slot);
      }
      if (k === 't') {
        return pickFromList('Trade which?', ch.inventory.map((en, i) => ({ en, i })),
          ({ en }) => (en.ident ? DB.item(en.id).name : DB.item(en.id).generic),
          ({ i }) => pickChar('To whom?', t => t.id !== ch.id, (t) => {
            const en = ch.inventory[i];
            if (!addToInventory(t, en.id, en.ident)) { msg(`${t.name}'s pack is full.`); return sheetFlow(slot); }
            removeFromInventory(ch, i);
            msg(`${ch.name} hands it to ${t.name}.`);
            sheetFlow(slot);
          }, () => sheetFlow(slot)), () => sheetFlow(slot));
      }
      if (k === 'd') {
        return pickFromList('Drop which?', ch.inventory.map((en, i) => ({ en, i })),
          ({ en }) => (en.ident ? DB.item(en.id).name : DB.item(en.id).generic),
          ({ i }) => { msg(`${invItem(ch, i).name || 'It'} is left in the dust.`); removeFromInventory(ch, i); sheetFlow(slot); },
          () => sheetFlow(slot));
      }
    }
  });
}
function exploreModeOrCurrent() { return exploreMode; }

function quitFlow() {
  confirm('Quit to the main menu? (An autosave will be made — a modern mercy.)', () => {
    saveTo(AUTO_KEY);
    msg('Autosaved.');
    game = null;
    setMode(mainMenu());
  }, () => setMode(exploreMode));
}

function helpMode() {
  setMode({
    menu: esc([
      'THORNMERE — keys',
      '  ↑/W forward · ←→/A·D turn · ↓/S about-face',
      '  E search walls · L look (re-read the cell, use stairs)',
      '  C cast · P play/stop song · U use item · T light a torch',
      '  1-6 character sheet (equip/trade/drop)',
      '  Q quit+autosave · ?debug=1 in URL, then M = automap',
      '',
      'In combat: A attack · D defend · C cast · S sing · H hide (Knave)',
      '  U use · V party advance · R run. Space hurries the narration.',
      '',
      'Save properly at the Adventurers\' Hall. Heal at the Temple.',
      'SP recharges at the Spark House (or slowly, outdoors by day).',
      'A Skald\'s songs come back with tavern wine.',
      'Esc returns.'
    ].join('\n')),
    hint: 'Esc to return.',
    onKey(e) { if (e.key === 'Escape') setMode(exploreMode); }
  });
}

// ================================================================== BUILDINGS
function openBuilding(id, name) {
  if (id.startsWith('empty')) {
    msg(`${name}: boarded fast. Dust, rot, and rat-droppings within.`);
    return setMode(exploreMode);
  }
  const draws = { draw: () => renderer.interior(name, id) };
  switch (id) {
    case 'hall': return hallMode(name, draws);
    case 'greta': return shopMode(name, draws);
    case 'review': return reviewMode(name, draws);
    case 'temple': return templeMode(name, draws);
    case 'spark': return sparkMode(name, draws);
    case 'goose': case 'hart': return tavernMode(name, id, draws);
    case 'tannery': return tanneryMode(name, draws);
    case 'belltower': return belltowerMode(name, draws);
    default: return setMode(exploreMode);
  }
}

function hallMode(name, draws) {
  setMode(menuMode({
    title: `${name} — the roster ledger lies open.`,
    body: `Roster: ${game.roster.length} souls. Party: ${game.partyIds.length}/6.`,
    options: [
      { k: 'c', label: 'Create a character', fn: () => createFlow(name, draws) },
      { k: 'a', label: 'Add to party', fn: () => addFlow(name, draws) },
      { k: 'r', label: 'Remove from party', fn: () => removeFlow(name, draws) },
      { k: 'o', label: 'Marching order', fn: () => orderFlow(name, draws) },
      { k: 'x', label: 'Strike a name from the ledger (delete)', fn: () => deleteFlow(name, draws) },
      { k: 's', label: 'SAVE the game', fn: () => { saveTo(SAVE_KEY); msg('The clerk records everything in a fair hand. Game saved.', 'good'); hallMode(name, draws); } },
      { k: 'l', label: 'Leave', fn: () => leaveBuilding() }
    ],
    onEsc: () => leaveBuilding(),
    ...draws
  }));
}

function leaveBuilding() {
  if (!game.partyIds.length) msg('The street is no place to be alone. (Muster a party at the Hall.)');
  setMode(exploreMode);
}

function createFlow(hall, draws) {
  if (game.roster.length >= 20) { msg('The ledger is full (20 souls).'); return hallMode(hall, draws); }
  textPrompt('Name the newcomer:', (nm) => {
    const nameTrim = nm.trim();
    if (!nameTrim) return hallMode(hall, draws);
    const raceOpts = DB.races.map((r, i) => ({
      k: String(i + 1),
      label: `${r.name} — ${r.desc}`,
      fn: () => pickClass(r)
    }));
    setMode(menuMode({ title: `${nameTrim}, of what folk?`, options: raceOpts, onEsc: () => hallMode(hall, draws), ...draws }));

    const pickClass = (race) => {
      const clsOpts = DB.classes.filter(c => c.starting).map((c, i) => ({
        k: String(i + 1),
        label: `${c.name} — ${c.desc}`,
        fn: () => rollLoop(race, c)
      }));
      setMode(menuMode({ title: `${nameTrim} the ${race.name} — what trade?`, options: clsOpts, onEsc: () => hallMode(hall, draws), ...draws }));
    };

    const rollLoop = (race, cls) => {
      const stats = rollStats(rng, race.id);
      const statLine = STATS.map(s => `${s} ${String(stats[s]).padStart(2)}`).join('   ');
      setMode(menuMode({
        title: `${nameTrim} — ${race.name} ${cls.name}`,
        body: `${statLine}\n(ST melee · IQ spell points · DX armour & aim · CN health · LK fate)`,
        options: [
          { k: 'a', label: 'Accept these bones', fn: () => finish(race, cls, stats) },
          { k: 'r', label: 'Roll again', fn: () => rollLoop(race, cls) }
        ],
        onEsc: () => hallMode(hall, draws), ...draws
      }));
    };

    const finish = (race, cls, stats) => {
      const ch = createCharacter(rng, { name: nameTrim, raceId: race.id, classId: cls.id, stats });
      addToInventory(ch, 'torch');
      game.roster.push(ch);
      const purse = 90 + rng.range(0, 60);
      game.gold += purse;
      msg(`${ch.name} signs the ledger and tips ${purse} gold into the party purse.`, 'good');
      if (game.partyIds.length < 6) addToParty(game, ch.id);
      hallMode(hall, draws);
    };
  }, () => hallMode(hall, draws));
}

function addFlow(hall, draws) {
  const avail = game.roster.filter(c => !game.partyIds.includes(c.id));
  if (!avail.length) { msg('No one waits on the benches.'); return hallMode(hall, draws); }
  pickFromList('Who joins?', avail, c => `${c.name} (${clsOf(c).name} ${c.level})`, (c) => {
    const r = addToParty(game, c.id); msg(r.msg);
    hallMode(hall, draws);
  }, () => hallMode(hall, draws));
}

function removeFlow(hall, draws) {
  if (!game.partyIds.length) { msg('The party is no one.'); return hallMode(hall, draws); }
  pickFromList('Who stays behind?', realParty(game), c => c.name, (c) => {
    const r = removeFromParty(game, c.id); msg(r.msg);
    hallMode(hall, draws);
  }, () => hallMode(hall, draws));
}

function orderFlow(hall, draws) {
  const list = realParty(game).map((c, i) => `${i + 1}. ${c.name}`).join('\n');
  setMode(menuMode({
    title: 'Marching order — front three meet the blades.',
    body: list + '\nPress a number, then U (up) or D (down).',
    options: realParty(game).map((c, i) => ({
      k: String(i + 1), label: `move ${c.name}`,
      fn: () => setMode(menuMode({
        title: `Move ${c.name}`,
        options: [
          { k: 'u', label: 'up (toward the front)', fn: () => { moveInOrder(game, i, -1); orderFlow(hall, draws); } },
          { k: 'd', label: 'down (toward the back)', fn: () => { moveInOrder(game, i, 1); orderFlow(hall, draws); } }
        ], onEsc: () => orderFlow(hall, draws), ...draws
      }))
    })),
    onEsc: () => hallMode(hall, draws), ...draws
  }));
}

function deleteFlow(hall, draws) {
  pickFromList('Strike whom from the ledger?', game.roster, c => `${c.name} (${clsOf(c).name} ${c.level})`, (c) => {
    confirm(`${c.name} will be gone forever. Certain?`, () => {
      deleteCharacter(game, c.id);
      msg(`${c.name}'s page is torn out.`);
      hallMode(hall, draws);
    }, () => hallMode(hall, draws));
  }, () => hallMode(hall, draws));
}

// ---- Greta's ---------------------------------------------------------------
function shopMode(name, draws) {
  setMode(menuMode({
    title: `${name}. Greta looks up: "Buying or wasting my time?"`,
    body: `Party gold: ${game.gold}`,
    options: [
      { k: 'b', label: 'Buy', fn: () => pickChar('Who buys?', null, ch => buyFlow(ch, name, draws), () => shopMode(name, draws)) },
      { k: 's', label: 'Sell', fn: () => pickChar('Who sells?', ch => ch.inventory.length > 0, ch => sellFlow(ch, name, draws), () => shopMode(name, draws)) },
      { k: 'i', label: 'Identify', fn: () => pickChar('Whose mystery?', ch => ch.inventory.some(e => !e.ident), ch => identFlow(ch, name, draws), () => shopMode(name, draws)) },
      { k: 'l', label: 'Leave', fn: () => setMode(exploreMode) }
    ],
    onEsc: () => setMode(exploreMode), ...draws
  }));
}
function buyFlow(ch, name, draws) {
  pickFromList(`Greta's stock — gold ${game.gold} — buying for ${ch.name}`, shopStock(),
    it => `${it.name.padEnd(20)} ${String(it.price).padStart(5)}g${classAllowed(ch, it) ? '' : '  (not their trade)'}`,
    (it) => { const r = buyItem(game, ch, it.id); msg(r.msg, r.ok ? 'good' : ''); buyFlow(ch, name, draws); },
    () => shopMode(name, draws));
}
function sellFlow(ch, name, draws) {
  if (!ch.inventory.length) return shopMode(name, draws);
  pickFromList(`${ch.name} sells — Greta squints.`, ch.inventory.map((en, i) => ({ en, i })),
    ({ en }) => `${(en.ident ? DB.item(en.id).name : DB.item(en.id).generic).padEnd(20)} ${String(sellPrice(en)).padStart(4)}g`,
    ({ i }) => { const r = sellItem(game, ch, i); msg(r.msg, r.ok ? 'good' : ''); sellFlow(ch, name, draws); },
    () => shopMode(name, draws));
}
function identFlow(ch, name, draws) {
  const unk = ch.inventory.map((en, i) => ({ en, i })).filter(({ en }) => !en.ident);
  if (!unk.length) return shopMode(name, draws);
  pickFromList(`Identify — gold ${game.gold}`, unk,
    ({ en }) => `${DB.item(en.id).generic.padEnd(16)} fee ${identifyCost(game, en)}g`,
    ({ i }) => { const r = identifyItem(game, ch, i); msg(r.msg, r.ok ? 'good' : ''); identFlow(ch, name, draws); },
    () => shopMode(name, draws));
}

// ---- Review Board ------------------------------------------------------------
function reviewMode(name, draws) {
  pickChar('The Review Board sees whom?', null, (ch) => reviewChar(ch, name, draws), () => setMode(exploreMode));
}
function reviewChar(ch, name, draws) {
  const need = xpForLevel(ch.cls, ch.level + 1) - ch.xp;
  setMode(menuMode({
    title: `${name} — ${ch.name}, ${clsOf(ch).name} ${ch.level}`,
    body: canLevelUp(ch) ? 'The Board nods: advancement is due.' : `XP to next level: ${need}.`,
    options: [
      { k: 't', label: 'Train a level', fn: () => {
          if (!canLevelUp(ch)) { msg(`The Board is unmoved. ${need} more experience.`); return reviewChar(ch, name, draws); }
          const g = levelUp(rng, ch);
          msg(`${ch.name} is now level ${ch.level}! (+${g.hpGain} HP${g.spGain ? `, +${g.spGain} SP` : ''})`, 'good');
          reviewChar(ch, name, draws);
        } },
      { k: 's', label: 'Buy spells', fn: () => spellShop(ch, name, draws) },
      { k: 'c', label: 'Change class', fn: () => classChangeFlow(ch, name, draws) },
      { k: 'w', label: 'Another character', fn: () => reviewMode(name, draws) },
      { k: 'l', label: 'Leave', fn: () => setMode(exploreMode) }
    ],
    onEsc: () => setMode(exploreMode), ...draws
  }));
}
function spellShop(ch, name, draws) {
  const schools = schoolsAvailable(ch);
  if (!schools.length) { msg('"No spark in this one," the archivist sniffs.'); return reviewChar(ch, name, draws); }
  const opts = schools.map((s, i) => {
    const t = nextTierFor(ch, s);
    const res = canBuyTier(ch, s, game.gold);
    return {
      k: String(i + 1),
      label: t == null ? `${s} — all seven tiers known`
        : `${s} tier ${t} (${tierCost(t)}g)${res.ok ? '' : ' — ' + res.why}`,
      fn: () => {
        const r = canBuyTier(ch, s, game.gold);
        if (!r.ok) { msg(r.why); return spellShop(ch, name, draws); }
        game.gold -= r.cost;
        buyTier(ch, s);
        const names = DB.spellsFor(s, r.tier).map(x => `${x.code} ${x.name}`).join(', ');
        msg(`${ch.name} learns ${s} tier ${r.tier}: ${names}.`, 'good');
        spellShop(ch, name, draws);
      }
    };
  });
  setMode(menuMode({
    title: `Spell archive — ${ch.name}, gold ${game.gold}`,
    body: `Known tiers: ${schools.map(s => `${s}:${ch.schoolTiers[s] || 0}`).join('  ')}`,
    options: opts, onEsc: () => reviewChar(ch, name, draws), ...draws
  }));
}
function classChangeFlow(ch, name, draws) {
  const opts = classChangeOptions(ch).map((o, i) => ({
    k: String(i + 1),
    label: `${o.cls.name}${o.ok ? '' : ' — the Board refuses (insufficient mastery)'} — ${o.cls.desc}`,
    fn: () => {
      if (!o.ok) { msg('The Board refuses. Master your school tiers first.'); return classChangeFlow(ch, name, draws); }
      confirm(`${ch.name} starts again at level 1 (spells kept). Proceed?`, () => {
        changeClass(ch, o.cls.id);
        msg(`${ch.name} is reborn as a ${o.cls.name}. The road begins again.`, 'good');
        reviewChar(ch, name, draws);
      }, () => classChangeFlow(ch, name, draws));
    }
  }));
  setMode(menuMode({
    title: 'The further doors: Stormcaller and Riddlemaster.',
    body: 'Stormcaller asks tier 5 in Hexen or Lorist. Riddlemaster asks tier 6 in two schools.',
    options: opts, onEsc: () => reviewChar(ch, name, draws), ...draws
  }));
}

// ---- Temple --------------------------------------------------------------------
function templeMode(name, draws) {
  pickChar('The Quiet Flame warms whom?', null, (ch) => {
    const p = templePrices(ch);
    const opts = [
      { k: 'h', label: `Heal wounds (${p.heal}g)`, fn: () => doTemple(ch, 'heal', name, draws) },
      { k: 'p', label: `Cure poison (${p.poison}g)`, fn: () => doTemple(ch, 'poison', name, draws) },
      { k: 'f', label: `Calm fear (${p.fear}g)`, fn: () => doTemple(ch, 'fear', name, draws) },
      { k: 's', label: `Soften stone (${p.stone}g)`, fn: () => doTemple(ch, 'stone', name, draws) },
      { k: 'd', label: `Restore drained levels (${p.drain}g)`, fn: () => doTemple(ch, 'drain', name, draws) },
      { k: 'r', label: `RESURRECT (${p.resurrect}g)`, fn: () => doTemple(ch, 'resurrect', name, draws) },
      { k: 'w', label: 'Another character', fn: () => templeMode(name, draws) },
      { k: 'l', label: 'Leave', fn: () => setMode(exploreMode) }
    ];
    setMode(menuMode({
      title: `${name} — ${ch.name}. Gold: ${game.gold}`,
      options: opts, onEsc: () => setMode(exploreMode), ...draws
    }));
  }, () => setMode(exploreMode), true);
}
function doTemple(ch, what, name, draws) {
  const r = templeService(game, ch, what);
  msg(r.msg, r.ok ? 'good' : '');
  templeMode(name, draws);
}

// ---- Spark House ----------------------------------------------------------------
function sparkMode(name, draws) {
  pickChar(`Roskva cracks her knuckles. Recharge whom? (gold ${game.gold})`, null, (ch) => {
    const r = sparkRecharge(game, ch);
    msg(r.msg, r.ok ? 'good' : '');
    sparkMode(name, draws);
  }, () => setMode(exploreMode));
}

// ---- Taverns ----------------------------------------------------------------------
function tavernMode(name, id, draws) {
  setMode(menuMode({
    title: `${name}. Smoke, peat-fire, and sidelong looks.`,
    body: `Party gold: ${game.gold}`,
    options: [
      { k: 'r', label: 'Buy a round and listen (2g)', fn: () => {
          if (game.gold < 2) { msg('No coin, no company.'); return tavernMode(name, id, draws); }
          game.gold -= 2;
          msg(nextRumor(game), 'mouth');
          tavernMode(name, id, draws);
        } },
      { k: 'w', label: 'Wine for the Skald', fn: () => pickChar('Whose voice?', ch => ch.cls === 'skald', (ch) => {
          const r = buyWine(game, ch); msg(r.msg, r.ok ? 'good' : '');
          tavernMode(name, id, draws);
        }, () => tavernMode(name, id, draws)) },
      { k: 'd', label: 'Drink (1g)', fn: () => {
          if (game.gold < 1) { msg('The barkeep points at the door.'); return tavernMode(name, id, draws); }
          game.gold -= 1;
          if (rng.chance(8)) {
            msg('A stool scrapes. "Strangers," someone says, in the tone of a thrown glove.', 'hurt');
            startCombat({ groups: [{ monster: 'tavern_tough', count: rollDice(rng, '1d3') }] },
              () => tavernMode(name, id, draws));
          } else {
            msg('The ale is brown and honest. The fen can wait an hour.');
            tavernMode(name, id, draws);
          }
        } },
      { k: 'l', label: 'Leave', fn: () => setMode(exploreMode) }
    ],
    onEsc: () => setMode(exploreMode), ...draws
  }));
}

// ---- Tannery & Bell Tower ------------------------------------------------------------
function tanneryMode(name, draws) {
  setMode(menuMode({
    title: `${name}. The boards over the door have been pried loose — recently.`,
    body: 'Inside: rotted vats, a smell like drowned candles, and a stone stair going DOWN.',
    options: [
      { k: 'd', label: 'Descend into the Sunken Undercroft', fn: () => {
          msg('The stair is slick. The dark below has a texture, like wet wool.');
          travel({ map: 'undercroft1', x: 2, y: 2, facing: 0 });
        } },
      { k: 'l', label: 'Leave', fn: () => setMode(exploreMode) }
    ],
    onEsc: () => setMode(exploreMode), ...draws
  }));
}

function belltowerMode(name, draws) {
  const v1 = partyHasItem(game, 'verse_first');
  const v2 = partyHasItem(game, 'verse_second');
  const v3 = partyHasItem(game, 'verse_third');
  const opts = [];
  let body;
  if (v1 && v2 && v3) {
    body = 'Three sockets. Three Verses. The bell above is holding its breath.';
    opts.push({ k: 'p', label: 'PERFORM THE FOUNDING SONG', fn: () => victoryMode() });
  } else if (v1 && v2 && !game.flags.needleOpen) {
    body = 'The sealed door bears three sockets. Two of your Verses hum in answer.';
    opts.push({ k: 'o', label: 'Set the two Verses in their sockets', fn: () => {
        game.flags.needleOpen = true;
        msg('Tin and silk settle into stone. The seal cracks — beyond, impossibly, a stair rises onto the FEN, into the leaning Needle.', 'mouth');
        belltowerMode(name, draws);
      } });
  } else {
    body = v1
      ? 'A sealed door graven with three sockets. One Verse alone is not a song.'
      : 'A sealed door graven with three empty sockets. It does not move, and never will, until the stolen Verses return.';
  }
  if (game.flags.needleOpen && !(v1 && v2 && v3)) {
    opts.push({ k: 'e', label: 'Climb into Maldrec\'s Needle', fn: () => {
        msg('You step through the bell tower door and out onto a stair of grey glass.');
        travel({ map: 'needle1', x: 11, y: 2, facing: 0 });
      } });
  }
  opts.push({ k: 'l', label: 'Leave', fn: () => setMode(exploreMode) });
  setMode(menuMode({ title: `${name}.`, body, options: opts, onEsc: () => setMode(exploreMode), ...draws }));
}

// ================================================================== COMBAT
function startCombat(spec, onEnd) {
  if (!aliveParty(game).length) { onEnd ? onEnd('skip') : setMode(exploreMode); return; }
  const combat = makeCombat(game, rng, spec);
  combat.onEnd = onEnd || (() => setMode(exploreMode));
  if (combat.songEnded) msg('The song dies on the air — steel is out!');
  if (spec.fixed?.text) msg(spec.fixed.text, 'mouth');
  combatIntro(combat);
}

function combatDraw(combat) {
  const lead = livingGroups(combat)[0];
  return () => lead ? renderer.combatPortrait(game, lead.def) : renderer.draw(game);
}

function combatIntro(combat) {
  const lines = livingGroups(combat).map((g, i) => ` ${i + 1}) ${groupLabel(combat, combat.groups.indexOf(g))}`);
  setMode({
    menu: `<span class="title">BATTLE!</span>\n${esc(lines.join('\n'))}\n\n(any key — to orders)`,
    hint: 'Any key continues.',
    draw: combatDraw(combat),
    onKey() { ordersFlow(combat, 0); }
  });
}

function ordersFlow(combat, idx) {
  const able = ableParty(combat);
  if (idx >= able.length) return resolveFlow(combat);
  const ch = able[idx];
  highlightId = ch.id;
  const gl = livingGroups(combat).map((g) => ` ${combat.groups.indexOf(g) + 1}) ${groupLabel(combat, combat.groups.indexOf(g))}`).join('\n');
  const isKnave = clsOf(ch).canHide;
  const opts = `(A)ttack (D)efend (C)ast${ch.cls === 'skald' ? ' (S)ing' : ''}${isKnave ? ' (H)ide' : ''} (U)se — party: (V)advance (R)un`;
  setMode({
    menu: `<span class="title">Round ${combat.round + 1} — orders for ${esc(ch.name)}</span>\n${esc(gl)}\n${esc(opts)}`,
    hint: 'Esc restarts this round’s orders.',
    draw: combatDraw(combat),
    onKey(e) {
      const k = e.key.toLowerCase();
      if (k === 'escape') { combat.orders = {}; combat.partyOrder = null; return ordersFlow(combat, 0); }
      if (k === 'a') return pickGroup(combat, (gi) => { setOrder(combat, ch.id, { type: 'attack', target: gi }); ordersFlow(combat, idx + 1); }, () => ordersFlow(combat, idx));
      if (k === 'd') { setOrder(combat, ch.id, { type: 'defend' }); return ordersFlow(combat, idx + 1); }
      if (k === 'h' && isKnave) { setOrder(combat, ch.id, { type: 'hide' }); return ordersFlow(combat, idx + 1); }
      if (k === 'c') return combatCastFlow(combat, ch, idx);
      if (k === 's' && ch.cls === 'skald') return combatSingFlow(combat, ch, idx);
      if (k === 'u') return combatUseFlow(combat, ch, idx);
      if (k === 'v') { setPartyOrder(combat, 'advance'); msg('— the party will advance —'); setOrder(combat, ch.id, combat.orders[ch.id] || { type: 'attack', target: 0 }); return ordersFlow(combat, idx + 1); }
      if (k === 'r') { setPartyOrder(combat, 'run'); return resolveFlow(combat); }
    }
  });
}

function pickGroup(combat, cb, onEsc) {
  const gs = livingGroups(combat);
  if (gs.length === 1) return cb(combat.groups.indexOf(gs[0]));
  setMode(menuMode({
    title: 'Against which group?',
    options: gs.map((g) => ({
      k: String(combat.groups.indexOf(g) + 1),
      label: groupLabel(combat, combat.groups.indexOf(g)),
      fn: () => cb(combat.groups.indexOf(g))
    })),
    onEsc, draw: combatDraw(combat)
  }));
}

function combatCastFlow(combat, ch, idx) {
  const spells = ch.knownSpells.map(c => DB.spell(c)).filter(s => s.combat);
  if (!spells.length) { msg(`${ch.name} knows no battle-spells.`); return ordersFlow(combat, idx); }
  pickFromList(`${ch.name} casts — SP ${ch.sp}/${ch.maxSp}`, spells,
    s => `${s.code} ${s.name} [${s.sp}sp t${s.tier} ${s.range ? s.range + "'" : ''}]`,
    (s) => {
      if (['foe', 'group'].includes(s.target)) {
        pickGroup(combat, (gi) => { setOrder(combat, ch.id, { type: 'cast', code: s.code, target: gi }); ordersFlow(combat, idx + 1); }, () => combatCastFlow(combat, ch, idx));
      } else if (s.target === 'ally') {
        pickChar('On whom?', null, (t) => { setOrder(combat, ch.id, { type: 'cast', code: s.code, target: t }); ordersFlow(combat, idx + 1); }, () => combatCastFlow(combat, ch, idx));
      } else {
        setOrder(combat, ch.id, { type: 'cast', code: s.code, target: 0 });
        ordersFlow(combat, idx + 1);
      }
    }, () => ordersFlow(combat, idx));
}

function combatSingFlow(combat, ch, idx) {
  const err = canSing(ch);
  if (err) { msg(err); return ordersFlow(combat, idx); }
  setMode(menuMode({
    title: `${ch.name} — one round of song (${ch.songsLeft} left)`,
    options: DB.songs.map(s => ({
      k: String(s.key), label: s.name,
      fn: () => { setOrder(combat, ch.id, { type: 'sing', songId: s.id }); ordersFlow(combat, idx + 1); }
    })),
    onEsc: () => ordersFlow(combat, idx), draw: combatDraw(combat)
  }));
}

function combatUseFlow(combat, ch, idx) {
  if (!ch.inventory.length) { msg('Empty pockets.'); return ordersFlow(combat, idx); }
  pickFromList(`${ch.name} uses…`, ch.inventory.map((en, i) => ({ en, i })),
    ({ en }) => (en.ident ? DB.item(en.id).name : DB.item(en.id).generic),
    ({ en, i }) => {
      const item = DB.item(en.id);
      if (item.use?.kind === 'damage') {
        pickGroup(combat, (gi) => { setOrder(combat, ch.id, { type: 'use', itemIdx: i, target: gi }); ordersFlow(combat, idx + 1); }, () => combatUseFlow(combat, ch, idx));
      } else if (['heal', 'cure', 'song_restore'].includes(item.use?.kind)) {
        pickChar('On whom?', null, (t) => { setOrder(combat, ch.id, { type: 'use', itemIdx: i, targetChar: t }); ordersFlow(combat, idx + 1); }, () => combatUseFlow(combat, ch, idx));
      } else {
        setOrder(combat, ch.id, { type: 'use', itemIdx: i });
        ordersFlow(combat, idx + 1);
      }
    }, () => ordersFlow(combat, idx));
}

function resolveFlow(combat) {
  highlightId = null;
  const events = resolveRound(combat);
  narrate(events, () => {
    render();
    if (combat.state === 'orders') return ordersFlow(combat, 0);
    if (combat.state === 'victory') {
      if (combat.result?.chest) return chestFlow(combat);
      return combat.onEnd('victory');
    }
    if (combat.state === 'fled') return combat.onEnd('fled');
    if (combat.state === 'defeat') return gameOverMode();
  });
}

// ---- chests -----------------------------------------------------------------
function chestFlow(combat) {
  const chest = makeChest(rng, currentMap(game));
  msg('Among the fallen: a banded chest, locked and waiting.', 'mouth');
  const menu = () => {
    if (!aliveParty(game).filter(c => !c.summon).length) return gameOverMode();
    setMode(menuMode({
      title: `A banded chest.${chest.revealed ? ` (trap: ${chest.revealed})` : chest.inspected ? ' (inspected: unsure)' : ''}`,
      options: [
        { k: 'i', label: 'Inspect the lock', fn: () => pickChar('Whose eyes?', null, (ch) => { msg(inspectChest(rng, chest, ch)); menu(); }, menu) },
        { k: 'd', label: 'Disarm the trap', fn: () => pickChar('Whose fingers?', null, (ch) => {
            const evs = [];
            msg(disarmChest(rng, game, chest, ch, evs));
            for (const e of evs) msg(e.text, 'hurt');
            menu();
          }, menu) },
        { k: 'o', label: 'Open it', fn: () => pickChar('Who lifts the lid?', null, (ch) => {
            narrate(openChest(rng, game, chest, ch), () => {
              if (!aliveParty(game).length) return gameOverMode();
              combat.onEnd('victory');
            });
          }, menu) },
        { k: 'l', label: 'Leave it be', fn: () => { msg('You leave it to the dark. The dark says nothing.'); combat.onEnd('victory'); } }
      ],
      onEsc: () => { msg('You leave it to the dark.'); combat.onEnd('victory'); }
    }));
  };
  menu();
}

// ================================================================== META MODES
function mainMenu() {
  const hasSave = !!localStorage.getItem(SAVE_KEY);
  const hasAuto = !!localStorage.getItem(AUTO_KEY);
  const options = [
    { k: 'n', label: 'New game', fn: newGameFlow },
    ...(hasSave ? [{ k: 'c', label: 'Continue (Hall save)', fn: () => { if (loadFrom(SAVE_KEY)) { msg('The clerk finds your page. Welcome back.'); setMode(exploreMode); } } }] : []),
    ...(hasAuto ? [{ k: 'a', label: 'Continue (autosave — modern mercy)', fn: () => { if (loadFrom(AUTO_KEY)) { msg('You wake where you fell asleep.'); setMode(exploreMode); } } }] : [])
  ];
  return menuMode({
    title: 'THORNMERE — The Founding Song',
    body: 'A walled town on a cold fen. Three Verses stolen. One hedge-wizard, unsung.\n',
    options,
    hint: 'A 1985-style dungeon crawl. Keyboard only.',
    draw: () => renderer.splash('THORNMERE', 'The Founding Song')
  });
}

function newGameFlow() {
  const qseed = parseInt(new URLSearchParams(location.search).get('seed'), 10);
  game = newGame(Number.isFinite(qseed) ? qseed : (Date.now() & 0xffffffff) >>> 0);
  rng = new Rng(game.seed ^ 0x9e3779b9);
  els.log.innerHTML = '';
  msg('THORNMERE, a walled market town on a cold fen. For three hundred years the Founding Song in the bell tower kept the fen-wights from the gates.', 'mouth');
  msg('Last winter the hedge-wizard MALDREC THE UNSUNG stole its Three Verses. The wards are failing. The Magistrate posts notices. The taverns talk.', 'mouth');
  msg('You stand before the ADVENTURERS\' HALL. Walk forward (↑) to enter and muster a party.');
  setMode(exploreMode);
}

function gameOverMode() {
  highlightId = null;
  setMode(menuMode({
    title: 'THE FEN HAS WON.',
    body: 'The party is lost. Somewhere, a bell does not ring.',
    options: [
      ...(localStorage.getItem(SAVE_KEY) ? [{ k: 'c', label: 'Return to the Hall save', fn: () => { loadFrom(SAVE_KEY); msg('The clerk finds your page. It was all a colder dream.'); setMode(exploreMode); } }] : []),
      ...(localStorage.getItem(AUTO_KEY) ? [{ k: 'a', label: 'Load the autosave', fn: () => { loadFrom(AUTO_KEY); setMode(exploreMode); } }] : []),
      { k: 'm', label: 'Main menu', fn: () => { game = null; setMode(mainMenu()); } }
    ],
    hint: 'So passes the company.',
    draw: () => renderer.splash('THE FEN HAS WON', 'so passes the company')
  }));
}

function victoryMode() {
  game.flags.won = true;
  saveTo(SAVE_KEY);
  const lines = realParty(game).map(ch =>
    ` ${ch.name.padEnd(14)} ${DB.race(ch.race).name.padEnd(9)} ${clsOf(ch).name.padEnd(12)} lvl ${String(ch.level).padStart(2)}  ${ch.xp} xp`);
  setMode({
    menu: `<span class="title">THE FOUNDING SONG</span>\n` + esc([
      'You set tin, silk and bronze into their sockets. The Skald raises the first',
      'note — and the bell tower answers, and the walls answer the bell, and the',
      'fen itself goes still to listen.',
      '',
      'The wards close over Thornmere like healed skin. Far out on the marsh, the',
      'Needle straightens, just a little, as if forgiven.',
      '',
      'The Magistrate strikes a medal. Greta extends credit. In two taverns at',
      'once, someone is already singing it wrong.',
      '',
      'THE COMPANY:',
      ...lines,
      '',
      `Gold: ${game.gold} · Days on the road: ${Math.floor(game.clock / 400) + 1}`,
      '',
      '✦ THE END ✦',
      '',
      '(M) main menu · (E) keep walking the streets of a town that owes you everything'
    ].join('\n')),
    hint: 'Victory. Saved.',
    draw: () => renderer.splash('✦ THE FOUNDING SONG ✦', 'Thornmere is whole'),
    onKey(e) {
      const k = e.key.toLowerCase();
      if (k === 'm') { game = null; setMode(mainMenu()); }
      if (k === 'e') setMode(exploreMode);
    }
  });
}

// ================================================================== BOOT
async function boot() {
  for (const id of ['view', 'status', 'menu', 'log', 'roster', 'hint', 'loc']) els[id] = $(id);
  renderer = new Renderer(els.view);
  renderer.splash('THORNMERE', 'loading the fen…');
  await loadAll(async p => (await fetch(new URL('../' + p, import.meta.url))).json());
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (narrating) { if (narrateFlush) narrateFlush(); return; }
    mode?.onKey?.(e);
  });
  setMode(mainMenu());

  // dev/test hook (used by tools/drive.js; harmless in normal play)
  window.__thorn = {
    get game() { return game; },
    travel: (to) => travel(to),
    startCombat: (spec) => startCombat(spec),
    render
  };
}

boot();

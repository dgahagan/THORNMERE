// Town services: Greta's shop, the Temple, the Spark House, taverns,
// and Adventurers' Hall party management.

import { DB } from './db.js';
import { clsOf, isAlive, addToInventory, removeFromInventory } from './character.js';
import { realParty, charById } from './gamestate.js';

// ---- Greta's Provisioner ---------------------------------------------------
export function shopStock() {
  const order = ['weapon', 'armor', 'shield', 'helm', 'gauntlets', 'instrument', 'light', 'potion'];
  return DB.items.filter(i => i.shop)
    .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || a.price - b.price);
}

export function buyItem(game, ch, itemId) {
  const item = DB.item(itemId);
  if (game.gold < item.price) return { ok: false, msg: 'Greta sniffs: "Coin first."' };
  if (!addToInventory(ch, itemId, true)) return { ok: false, msg: `${ch.name}'s pack is full (8 items).` };
  game.gold -= item.price;
  return { ok: true, msg: `${ch.name} buys ${item.name} for ${item.price} gold.` };
}

export function sellPrice(entry) {
  const item = DB.item(entry.id);
  if (item.type === 'quest') return 0;
  return Math.floor(item.price / (entry.ident ? 2 : 4));
}

export function sellItem(game, ch, idx) {
  const entry = ch.inventory[idx];
  if (!entry) return { ok: false, msg: 'No such item.' };
  const item = DB.item(entry.id);
  if (item.type === 'quest') return { ok: false, msg: '"That, I will not touch," says Greta.' };
  const price = sellPrice(entry);
  removeFromInventory(ch, idx);
  game.gold += price;
  return { ok: true, msg: `Greta pays ${price} gold for the ${entry.ident ? item.name : item.generic}.` };
}

export function identifyCost(game, entry) {
  const item = DB.item(entry.id);
  const knave = realParty(game).some(c => c.cls === 'knave' && isAlive(c));
  return Math.max(10, Math.floor((item.price || 200) / (knave ? 8 : 4)));
}

export function identifyItem(game, ch, idx) {
  const entry = ch.inventory[idx];
  if (!entry) return { ok: false, msg: 'No such item.' };
  if (entry.ident) return { ok: false, msg: 'Its nature is already known.' };
  const cost = identifyCost(game, entry);
  if (game.gold < cost) return { ok: false, msg: `Identification costs ${cost} gold.` };
  game.gold -= cost;
  entry.ident = true;
  const item = DB.item(entry.id);
  return { ok: true, msg: `Greta turns it over twice. "${item.name}. ${item.flavor}"` };
}

// ---- Temple of the Quiet Flame ---------------------------------------------
export function templePrices(ch) {
  return {
    heal: Math.max(0, (ch.maxHp - ch.hp)) * 2,
    poison: 30,
    fear: 15,
    stone: 250,
    drain: ch.drained * 120,
    resurrect: 200 + ch.level * 50
  };
}

export function templeService(game, ch, what) {
  const p = templePrices(ch)[what];
  const fail = (msg) => ({ ok: false, msg });
  if (what === 'heal') {
    if (ch.status.dead || ch.status.stone) return fail('The flame cannot warm them as they are.');
    if (ch.hp >= ch.maxHp) return fail(`${ch.name} is whole already.`);
  }
  if (what === 'poison' && !ch.status.poison) return fail('No venom in them.');
  if (what === 'fear' && !ch.status.fear) return fail('Their heart is steady.');
  if (what === 'stone' && !ch.status.stone) return fail('They are flesh already.');
  if (what === 'drain' && !ch.drained) return fail('Nothing has been taken from them.');
  if (what === 'resurrect' && !ch.status.dead) return fail('They live. Do not tempt the Flame.');
  if (game.gold < p) return fail(`The offering is ${p} gold.`);
  game.gold -= p;
  switch (what) {
    case 'heal': ch.hp = ch.maxHp; return { ok: true, msg: `${ch.name} is made whole. (${p} gold)` };
    case 'poison': delete ch.status.poison; return { ok: true, msg: `The venom hisses out of ${ch.name}. (${p} gold)` };
    case 'fear': delete ch.status.fear; return { ok: true, msg: `${ch.name}'s hands stop shaking. (${p} gold)` };
    case 'stone': delete ch.status.stone; return { ok: true, msg: `Stone becomes skin. ${ch.name} gasps. (${p} gold)` };
    case 'drain': {
      ch.level += ch.drained; ch.maxHp += ch.drained * 4; ch.hp = Math.min(ch.maxHp, ch.hp + ch.drained * 4);
      ch.drained = 0;
      return { ok: true, msg: `What was taken returns to ${ch.name}. (${p} gold)` };
    }
    case 'resurrect': delete ch.status.dead; ch.hp = 1;
      return { ok: true, msg: `The Quiet Flame speaks one word, and ${ch.name} answers it. (${p} gold)` };
  }
}

// ---- Roskva's Spark House ----------------------------------------------------
export function sparkCost(ch) { return (ch.maxSp - ch.sp) * (2 + ch.level); }
export function sparkRecharge(game, ch) {
  if (ch.maxSp === 0) return { ok: false, msg: 'Roskva shrugs: "No spark in this one to feed."' };
  if (ch.sp >= ch.maxSp) return { ok: false, msg: `${ch.name} is brimming already.` };
  const cost = sparkCost(ch);
  if (game.gold < cost) return { ok: false, msg: `"That'll be ${cost} gold," says Roskva, hand out.` };
  game.gold -= cost;
  ch.sp = ch.maxSp;
  return { ok: true, msg: `Roskva claps her hands once — ${ch.name} crackles to the fingertips. (${cost} gold)` };
}

// ---- Taverns -----------------------------------------------------------------
export const RUMORS = [
  '"The old tannery on Coppers Row is boarded for a reason. The cellar never flooded, friend — it drowned."',
  '"Maldrec the Unsung, they called him. Took the Three Verses from the bell tower in one night, and the gate-wards have been dying ever since."',
  '"A candle-king squats below the tannery, fat on three hundred years of tallow. He hums something he should not know."',
  '"East over the fen, the mounds sing of an evening. My gran said the Choir keeps what it is given — and keeps what it isn\'t, too."',
  '"The Needle leans a little more each year. Leans toward town, if you\'re asking."',
  '"No one has rung the founding bell since the Verses went. Door\'s sealed. The Magistrate calls it \'pending review.\'"',
  '"Wights at the east gate again last new-moon. The wards are thin as tavern beer."',
  '"They say only a Riddlemaster can open doors that eat wizards whole. Never met one. The Review Board would know how it\'s done."'
];

export function nextRumor(game) {
  const i = (game.flags.rumorIdx || 0) % RUMORS.length;
  game.flags.rumorIdx = i + 1;
  return RUMORS[i];
}

export function wineCost(ch) { return 10 + ch.level * 5; }
export function buyWine(game, ch) {
  if (ch.cls !== 'skald') return { ok: false, msg: `${ch.name} enjoys the wine very much. Nothing else happens.` };
  const cost = wineCost(ch);
  if (game.gold < cost) return { ok: false, msg: `The barkeep wants ${cost} gold for the good skin.` };
  if (ch.songsLeft >= ch.level) return { ok: false, msg: `${ch.name}'s voice is already in fine fettle.` };
  game.gold -= cost;
  ch.songsLeft = ch.level;
  return { ok: true, msg: `${ch.name} drains the skin and hums. The old songs are back. (${cost} gold)` };
}

// ---- Adventurers' Hall --------------------------------------------------------
export function addToParty(game, charId) {
  if (game.partyIds.length + game.summons.length >= 6) return { ok: false, msg: 'The marching order is full.' };
  if (game.partyIds.includes(charId)) return { ok: false, msg: 'Already in the party.' };
  game.partyIds.push(charId);
  return { ok: true, msg: `${charById(game, charId).name} joins the party.` };
}

export function removeFromParty(game, charId) {
  game.partyIds = game.partyIds.filter(id => id !== charId);
  return { ok: true, msg: `${charById(game, charId).name} stays at the Hall.` };
}

export function moveInOrder(game, idx, delta) {
  const j = idx + delta;
  if (idx < 0 || j < 0 || idx >= game.partyIds.length || j >= game.partyIds.length) return;
  const t = game.partyIds[idx];
  game.partyIds[idx] = game.partyIds[j];
  game.partyIds[j] = t;
}

export function deleteCharacter(game, charId) {
  game.partyIds = game.partyIds.filter(id => id !== charId);
  game.roster = game.roster.filter(c => c.id !== charId);
}

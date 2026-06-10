// Chests after victories: tier-scaled gold, an unidentified item, and a trap
// the Knave can inspect and disarm.

import { DB } from './db.js';
import { rollDice } from './rng.js';
import { statMod, savingThrow, applyDamage, isAlive, clsOf, addToInventory } from './character.js';
import { aliveParty, realParty } from './gamestate.js';

export function dungeonTier(map) {
  const base = { 'The Sunken Undercroft': 1, 'The Howling Barrow': 2, 'Maldrec\'s Needle': 4 }[map.dungeon] || 1;
  return Math.min(5, base + (map.depth - 1));
}

const PRICE_CAP = { 1: 130, 2: 350, 3: 700, 4: 1200, 5: 99999 };

export function makeChest(rng, map) {
  const tier = dungeonTier(map);
  const gold = tier * tier * rollDice(rng, '2d10');
  let itemId = null;
  if (rng.chance(60)) {
    const pool = DB.items.filter(i => i.shop && i.price > 0 && i.price <= PRICE_CAP[tier]
      && ['weapon', 'armor', 'shield', 'helm', 'gauntlets', 'potion', 'light', 'instrument'].includes(i.type));
    const weights = pool.map(i => Math.ceil(600 / (i.price + 40)));
    const total = weights.reduce((a, b) => a + b, 0);
    let w = rng.int(total);
    for (let i = 0; i < pool.length; i++) { if (w < weights[i]) { itemId = pool[i].id; break; } w -= weights[i]; }
  }
  const roll = rng.int(100);
  const trap = roll < 35 ? null : roll < 60 ? 'dart' : roll < 80 ? 'gas' : 'blast';
  return { tier, gold, itemId, trap, inspected: false, revealed: null, disarmed: false };
}

export function inspectChest(rng, chest, ch) {
  chest.inspected = true;
  const chance = 40 + statMod(ch.stats.DX) * 10 + (clsOf(ch).disarmBonus ? 40 : 0);
  if (rng.chance(chance)) {
    chest.revealed = chest.trap || 'none';
    return chest.trap ? `${ch.name} finds a ${chest.trap} trap on the lock!`
      : `${ch.name} finds no trap. The lock looks honest.`;
  }
  chest.revealed = null;
  return `${ch.name} squints at the lock and can't be sure.`;
}

export function disarmChest(rng, game, chest, ch, events) {
  if (!chest.trap || chest.disarmed) { chest.disarmed = true; return `${ch.name} finds nothing to disarm.`; }
  const chance = 35 + statMod(ch.stats.DX) * 10 + ch.level * 2 + (clsOf(ch).disarmBonus ? 40 : 0);
  if (rng.chance(chance)) {
    chest.disarmed = true;
    return `${ch.name} defeats the ${chest.trap} trap with a small, smug click.`;
  }
  const kind = chest.trap;
  chest.trap = null; chest.disarmed = true; // it fired
  triggerChestTrap(rng, kind, chest.tier, game, events);
  return `${ch.name}'s fingers slip — the ${kind} trap fires!`;
}

export function triggerChestTrap(rng, kind, tier, game, events) {
  const party = game ? aliveParty(game).filter(c => !c.summon) : [];
  if (!party.length) return;
  const say = t => events.push({ type: 'msg', text: t });
  if (kind === 'dart') {
    const ch = rng.pick(party);
    const dmg = rollDice(rng, `${tier}d6`);
    applyDamage(ch, dmg);
    say(`A needle dart takes ${ch.name} for ${dmg}!${ch.status.dead ? ' They fall!' : ''}`);
  } else if (kind === 'gas') {
    say('Green gas boils out of the lock!');
    for (const ch of party) {
      if (!savingThrow(rng, ch, 10 + tier * 2)) { ch.status.poison = true; say(`${ch.name} is poisoned!`); }
    }
  } else if (kind === 'blast') {
    say('The chest detonates in a flash of stolen lightning!');
    for (const ch of party) {
      const dmg = rollDice(rng, `${tier}d6`);
      if (savingThrow(rng, ch, 10 + tier * 2)) { applyDamage(ch, Math.floor(dmg / 2)); say(`${ch.name} is scorched for ${Math.floor(dmg / 2)}.`); }
      else { applyDamage(ch, dmg); say(`${ch.name} is blasted for ${dmg}!${ch.status.dead ? ' They fall!' : ''}`); }
    }
  }
}

// Open the chest (after any disarm attempts). Returns events; loot goes to opener.
export function openChest(rng, game, chest, ch) {
  const events = [];
  if (chest.trap && !chest.disarmed) {
    events.push({ type: 'msg', text: `The ${chest.trap} trap fires as ${ch.name} lifts the lid!` });
    triggerChestTrap(rng, chest.trap, chest.tier, game, events);
    chest.trap = null;
  }
  game.gold += chest.gold;
  let lootMsg = `Inside: ${chest.gold} gold`;
  if (chest.itemId) {
    const item = DB.item(chest.itemId);
    if (isAlive(ch) && addToInventory(ch, chest.itemId, false)) {
      lootMsg += ` and something — ${item.generic} (${ch.name} takes it, unidentified)`;
    } else {
      const other = realParty(game).find(c => isAlive(c) && addToInventory(c, chest.itemId, false));
      lootMsg += other ? ` and something — ${item.generic} (${other.name} takes it)` : ` and an item no one can carry. It is left behind`;
    }
  }
  events.push({ type: 'msg', text: lootMsg + '.' });
  return events;
}

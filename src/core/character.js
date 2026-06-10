// Character model. Characters are plain serializable objects; all derived
// numbers are computed by functions here.

import { DB } from './db.js';
import { rollDice } from './rng.js';

export const STATS = ['ST', 'IQ', 'DX', 'CN', 'LK'];
export const SLOTS = ['weapon', 'armor', 'shield', 'helm', 'gauntlets', 'instrument'];
export const MAX_INV = 8;

export function statMod(v) {
  if (v >= 20) return 4;
  if (v >= 18) return 3;
  if (v >= 17) return 2;
  if (v >= 15) return 1;
  if (v <= 5) return -2;
  if (v <= 8) return -1;
  return 0;
}

export function rollStats(rng, raceId) {
  const race = DB.race(raceId);
  const stats = {};
  for (const s of STATS) {
    let v = rng.d(6) + rng.d(6) + rng.d(6) + (race.mods[s] || 0);
    stats[s] = Math.max(3, Math.min(20, v));
  }
  return stats;
}

let nextId = 1;
export function setNextCharId(n) { nextId = n; }
export function peekNextCharId() { return nextId; }

export function createCharacter(rng, { name, raceId, classId, stats }) {
  const cls = DB.cls(classId);
  const ch = {
    id: 'c' + (nextId++),
    name, race: raceId, cls: classId,
    stats, level: 1, xp: 0,
    maxHp: 0, hp: 0, maxSp: 0, sp: 0,
    status: {},               // poison, fear, stone, dead (true flags)
    drained: 0,               // levels lost to drain (temple restores)
    inventory: [],            // [{id, ident, charges?}]
    equip: {},                // slot -> inventory index
    knownSpells: [],
    schoolTiers: {},          // school -> highest tier bought
    songsLeft: 0,
    classHistory: [classId]
  };
  ch.maxHp = Math.max(1, cls.hpDie + statMod(stats.CN)); // full hit die at level 1
  ch.hp = ch.maxHp;
  if (cls.spDie) {
    ch.maxSp = Math.max(1, rollDice(rng, `1d${cls.spDie}`) + statMod(stats.IQ) * 2);
    ch.sp = ch.maxSp;
    ch.schoolTiers[cls.school] = 0;
  }
  if (cls.bard) ch.songsLeft = 1;
  return ch;
}

export function clsOf(ch) { return DB.cls(ch.cls); }
export function isCaster(ch) { return !!clsOf(ch).school; }
export function isAlive(ch) { return !ch.status.dead && !ch.status.stone && ch.hp > 0; }
export function canAct(ch) { return isAlive(ch); }

export function invItem(ch, idx) { return ch.inventory[idx] ? DB.item(ch.inventory[idx].id) : null; }
export function equipped(ch, slot) {
  const idx = ch.equip[slot];
  return idx == null || !ch.inventory[idx] ? null : DB.item(ch.inventory[idx].id);
}

export function classAllowed(ch, item) {
  return !item.classes || item.classes.includes(ch.cls);
}

// Equip an inventory item into its slot. Returns error string or null.
export function equipItem(ch, idx) {
  const entry = ch.inventory[idx];
  if (!entry) return 'No such item.';
  const item = DB.item(entry.id);
  const slot = item.type === 'light' ? null
    : SLOTS.includes(item.type) ? item.type : null;
  if (!slot) return 'That cannot be wielded or worn.';
  if (!entry.ident && item.unique) return 'Its nature is unknown.';
  if (!classAllowed(ch, item)) return `A ${clsOf(ch).name} cannot use that.`;
  ch.equip[slot] = idx;
  return null;
}

export function unequipSlot(ch, slot) { delete ch.equip[slot]; }

export function removeFromInventory(ch, idx) {
  ch.inventory.splice(idx, 1);
  for (const slot of Object.keys(ch.equip)) {
    if (ch.equip[slot] === idx) delete ch.equip[slot];
    else if (ch.equip[slot] > idx) ch.equip[slot]--;
  }
}

export function addToInventory(ch, itemId, ident = true) {
  if (ch.inventory.length >= MAX_INV) return false;
  ch.inventory.push({ id: itemId, ident });
  return true;
}

// Armour class counts DOWN from 10. partyAcBonus comes from songs/spells/defend.
export function effectiveAC(ch, partyAcBonus = 0) {
  let ac = 10 - statMod(ch.stats.DX) - partyAcBonus;
  const cls = clsOf(ch);
  let wearingArmor = false;
  for (const slot of ['armor', 'shield', 'helm', 'gauntlets']) {
    const it = equipped(ch, slot);
    if (it) { ac -= it.ac || 0; if (slot === 'armor') wearingArmor = true; }
  }
  if (cls.monk && !wearingArmor) ac -= Math.floor(ch.level / 2) + 1;
  if (ch.cls === 'warden' && equipped(ch, 'shield')) ac -= 1; // best with shields
  return Math.max(-10, ac);
}

export function weaponOf(ch) { return equipped(ch, 'weapon'); }

export function unarmedDice(ch) {
  // Fistwrights improve with level; everyone else punches for 1d2.
  if (!clsOf(ch).monk) return '1d2';
  const n = 1 + Math.floor(ch.level / 5);
  return `${n}d4+${Math.floor(ch.level / 3)}`;
}

export function attackBonus(ch, { missile = false } = {}) {
  const cls = clsOf(ch);
  let b = Math.floor(ch.level * cls.attackBonusPer)
    + statMod(missile ? ch.stats.DX : ch.stats.ST);
  const w = weaponOf(ch);
  if (w?.bonus?.hit) b += w.bonus.hit;
  if (ch.status.fear) b -= 2;
  return b;
}

export function damageBonus(ch) {
  let b = statMod(ch.stats.ST);
  const g = equipped(ch, 'gauntlets');
  if (g?.bonus?.dmg) b += g.bonus.dmg;
  const w = weaponOf(ch);
  if (w?.bonus?.dmg) b += w.bonus.dmg;
  return b;
}

export function attacksPerRound(ch) {
  const every = clsOf(ch).extraAttackEvery;
  if (!every) return 1;
  return Math.min(5, 1 + Math.floor(ch.level / every));
}

export function critChance(ch) {
  const cls = clsOf(ch);
  if (!cls.critPerLevel) return 0;
  return Math.min(50, cls.critBase + cls.critPerLevel * ch.level);
}

export function saveBonus(ch) {
  let b = Math.floor(ch.level / 2) + statMod(ch.stats.LK) + clsOf(ch).saveBonus;
  const sh = equipped(ch, 'shield');
  if (sh?.bonus?.saves) b += sh.bonus.saves;
  return b;
}

export function savingThrow(rng, ch, dc, extra = 0) {
  const roll = rng.d(20);
  if (roll === 20) return true;
  if (roll === 1) return false;
  return roll + saveBonus(ch) + extra >= dc;
}

export function songPower(ch) {
  const inst = equipped(ch, 'instrument');
  return inst ? 1 + (inst.bonus?.songPower || 0) : 0; // 0 = no instrument, can't play
}

export function applyDamage(ch, dmg) {
  ch.hp = Math.max(0, ch.hp - dmg);
  if (ch.hp === 0) ch.status.dead = true;
  return ch.status.dead;
}

export function healChar(ch, amount) {
  if (ch.status.dead || ch.status.stone) return 0;
  const before = ch.hp;
  ch.hp = Math.min(ch.maxHp, ch.hp + amount);
  return ch.hp - before;
}

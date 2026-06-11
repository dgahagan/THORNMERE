// Whole-game state: roster, party, position, clock, per-map state, effects.
// The game object is a plain serializable structure; save/load is a JSON
// round-trip.  Version history:
//   1 — original build
//   2 — Remastered: settings, automap, pool fields added

import { DB } from './db.js';
import { peekNextCharId, setNextCharId } from './character.js';
import { newSettings } from './settings.js';

export const DAY_LEN = 400;
export const NIGHT_AT = 280;

export function newGame(seed = 1) {
  return {
    version: 2,
    seed,
    settings: newSettings('legacy'),  // overwritten by mode selection at new game
    roster: [],
    partyIds: [],
    summons: [],            // transient party members from summon spells
    gold: 0,
    clock: 0,
    pos: { map: 'town', x: 4, y: 16, facing: 0 },
    mapState: {},           // mapId -> {secrets:[], riddle:false, once:{}, zapped:{}}
    automap: {},            // mapId -> {visited:[], walls:{}, specials:{}, cursor:null, synced:true}
    pool: null,             // shared inventory: {items:[{id,ident}]} when sharedInventory on
    effects: [],            // [{kind, until, ...}]
    song: null,             // {id, singerId, power}
    flags: {},              // quest/progress flags
    debugMap: false
  };
}

// Per-map automap state: created on first access.
export function automapFor(game, mapId) {
  if (!game.automap[mapId]) {
    game.automap[mapId] = { visited: [], walls: {}, specials: {}, cursor: null, synced: true };
  }
  return game.automap[mapId];
}

export function mapStateFor(game, mapId) {
  if (!game.mapState[mapId]) {
    game.mapState[mapId] = { secrets: [], riddle: false, once: {}, zapped: {} };
  }
  return game.mapState[mapId];
}

export function charById(game, id) { return game.roster.find(c => c.id === id); }

// Party = roster members in marching order, then summons.
// In Legacy mode: max 6 slots total (summons count).
// In Remastered 7th-slot mode: 6 roster slots + 1 dedicated summon slot.
export function partyChars(game) {
  return [...game.partyIds.map(id => charById(game, id)), ...game.summons];
}
export function partySlotsFree(game) {
  if (game.settings?.seventhSlot) return 6 - game.partyIds.length;
  return 6 - partyChars(game).length;
}
export function summonSlotFree(game) {
  if (game.settings?.seventhSlot) return game.summons.length < 1;
  return partySlotsFree(game) > 0;
}
export function aliveParty(game) {
  return partyChars(game).filter(c => !c.status.dead && !c.status.stone && c.hp > 0);
}
export function realParty(game) { return game.partyIds.map(id => charById(game, id)); }

export function partyHasItem(game, itemId) {
  if (game.pool?.items?.some(e => e.id === itemId)) return true;
  return realParty(game).some(c => c.inventory.some(e => e.id === itemId));
}
export function partyHasClass(game, classId) {
  return realParty(game).some(c => c.cls === classId && !c.status.dead);
}

export function isNight(game) { return game.clock % DAY_LEN >= NIGHT_AT; }
export function timeOfDay(game) { return isNight(game) ? 'NIGHT' : 'DAY'; }

export function currentMap(game) { return DB.map(game.pos.map); }

export function inZone(game, zone, x = game.pos.x, y = game.pos.y) {
  const rects = currentMap(game).zones?.[zone];
  if (!rects) return false;
  return rects.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

// ---- serialization ---------------------------------------------------------
export function gameToJSON(game) {
  return JSON.stringify({ ...game, nextCharId: peekNextCharId() });
}

export function gameFromJSON(str) {
  const obj = JSON.parse(str);
  if (obj.nextCharId) setNextCharId(obj.nextCharId);
  delete obj.nextCharId;
  // Migrate v1 → v2: treat old saves as Legacy with changeable toggles available.
  if (!obj.version || obj.version < 2) {
    obj.version = 2;
    obj.settings = newSettings('legacy');
    obj.automap = {};
    obj.pool = null;
  }
  return obj;
}

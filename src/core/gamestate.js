// Whole-game state: roster, party, position, clock, per-map state, effects.
// The game object is a plain serializable structure; save/load is a JSON
// round-trip (see save.js).

import { DB } from './db.js';
import { peekNextCharId, setNextCharId } from './character.js';

export const DAY_LEN = 400;
export const NIGHT_AT = 280;

export function newGame(seed = 1) {
  return {
    version: 1,
    seed,
    roster: [],
    partyIds: [],
    summons: [],            // transient party members from summon spells
    gold: 0,
    clock: 0,
    pos: { map: 'town', x: 4, y: 16, facing: 0 },
    mapState: {},           // mapId -> {secrets:[], riddle:false, once:{}, zapped:{}}
    effects: [],            // [{kind, until, ...}]
    song: null,             // {id, singerId, power}
    flags: {},              // quest/progress flags
    debugMap: false
  };
}

export function mapStateFor(game, mapId) {
  if (!game.mapState[mapId]) {
    game.mapState[mapId] = { secrets: [], riddle: false, once: {}, zapped: {} };
  }
  return game.mapState[mapId];
}

export function charById(game, id) { return game.roster.find(c => c.id === id); }

// Party = roster members in marching order, then summons. Max 6 slots total.
export function partyChars(game) {
  return [...game.partyIds.map(id => charById(game, id)), ...game.summons];
}
export function partySlotsFree(game) { return 6 - partyChars(game).length; }
export function aliveParty(game) {
  return partyChars(game).filter(c => !c.status.dead && !c.status.stone && c.hp > 0);
}
export function realParty(game) { return game.partyIds.map(id => charById(game, id)); }

export function partyHasItem(game, itemId) {
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
  return obj;
}

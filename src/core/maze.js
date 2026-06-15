// Map runtime: edges, movement, searching, and per-cell specials.
// step()/turn() return a list of events for the UI to narrate and act on:
//   {type:'msg', text}            plain narration
//   {type:'bump'}                 walked into a wall
//   {type:'riddlePrompt'}         walked into the riddle door
//   {type:'stairsPrompt', cell}   standing on stairs
//   {type:'building', id, name}   walked into a town building face
//   {type:'gate', cell}           stepped up to a town gate
//   {type:'combat', groups, fixed} an encounter begins
//   {type:'treasure', ...}        secret cache claimed

import { DB } from './db.js';
import { rollDice } from './rng.js';
import {
  currentMap, mapStateFor, inZone, aliveParty, realParty, partyHasClass,
  isNight
} from './gamestate.js';
import {
  tickEffects, purgeMagic, hasEffect, getEffect, removeEffect, lightRadius
} from './effects.js';
import { savingThrow, applyDamage, healChar, isAlive, statMod } from './character.js';

export const DX = [0, 1, 0, -1];
export const DY = [1, 0, -1, 0];
export const FACING_NAMES = ['NORTH', 'EAST', 'SOUTH', 'WEST'];

export function edgeAt(map, x, y, dir) {
  if (x < 0 || y < 0 || x >= map.w || y >= map.h) return '1';
  if (dir === 0) return map.hw[y + 1][x];
  if (dir === 2) return map.hw[y][x];
  if (dir === 1) return map.vw[y][x + 1];
  return map.vw[y][x];
}

export function edgeKey(x, y, dir) {
  // canonical key for a secret-door edge (shared by both adjoining cells)
  if (dir === 0) return `h${x},${y + 1}`;
  if (dir === 2) return `h${x},${y}`;
  if (dir === 1) return `v${x + 1},${y}`;
  return `v${x},${y}`;
}

export function cellSpecial(map, x, y) { return map.cells?.[x + ',' + y] || null; }

export function secretFound(game, mapId, x, y, dir) {
  return mapStateFor(game, mapId).secrets.includes(edgeKey(x, y, dir));
}

// How an edge appears/behaves right now: 'open' | 'door' | 'wall' | 'riddle'
export function edgeState(game, map, x, y, dir) {
  const e = edgeAt(map, x, y, dir);
  if (e === '0') return 'open';
  if (e === 'd') return 'door';
  if (e === '1') return 'wall';
  if (e === 'r') return mapStateFor(game, map.id).riddle ? 'door' : 'riddle';
  if (e === 's') {
    if (secretFound(game, map.id, x, y, dir)) return 'door';
    if (hasEffect(game, 'secrets')) {
      mapStateFor(game, map.id).secrets.push(edgeKey(x, y, dir)); // seen = found
      return 'door';
    }
    return 'wall';
  }
  return 'wall';
}

export function turn(game, dirDelta) {
  game.pos.facing = (game.pos.facing + dirDelta + 4) % 4;
}

export function step(game, rng, { backward = false } = {}) {
  const events = [];
  const map = currentMap(game);
  const dir = backward ? (game.pos.facing + 2) % 4 : game.pos.facing;
  const { x, y } = game.pos;
  const st = edgeState(game, map, x, y, dir);
  const nx = x + DX[dir], ny = y + DY[dir];

  if (st === 'riddle') { events.push({ type: 'riddlePrompt' }); return events; }
  if (st === 'wall') {
    const phase = getEffect(game, 'phase');
    const inBounds = nx >= 0 && ny >= 0 && nx < map.w && ny < map.h;
    if (phase && inBounds) {
      removeEffect(game, 'phase');
      events.push({ type: 'msg', text: 'For one breath the wall is sand, and you walk through it.' });
    } else {
      events.push({ type: 'bump' });
      return events;
    }
  }

  // town building faces and gates: don't move onto the cell
  const special = cellSpecial(map, nx, ny);
  if (special?.t === 'building') { events.push({ type: 'building', id: special.id, name: special.name }); return events; }
  if (special?.t === 'gate') { events.push({ type: 'gate', cell: special }); return events; }
  if (special?.t === 'seal') {
    if (!game.flags.sealOpen) {
      if (partyHasClass(game, 'riddlemaster')) {
        game.flags.sealOpen = true;
        events.push({ type: 'msg', text: special.passText });
      } else {
        events.push({ type: 'msg', text: special.text });
        return events;
      }
    }
  }

  game.pos.x = nx; game.pos.y = ny;
  advanceClock(game, rng, events);
  processCell(game, rng, events, 0);
  if (!events.some(e => ['combat', 'stairsPrompt', 'treasure'].includes(e.type))) {
    rollEncounter(game, rng, events);
  }
  return events;
}

export function advanceClock(game, rng, events, n = 1) {
  game.clock += n;
  const expired = tickEffects(game);
  for (const e of expired) {
    if (e.kind === 'light') events.push({ type: 'msg', text: e.fire ? 'Your torch gutters and dies.' : 'The light fades.' });
    if (e.kind === 'levitate') events.push({ type: 'msg', text: 'Your feet settle back onto the stone.' });
    if (e.kind === 'shield') events.push({ type: 'msg', text: 'The warding fades.' });
    if (e.kind === 'trueseeing') events.push({ type: 'msg', text: 'The world resumes its lying.' });
    if (e.kind === 'compass') events.push({ type: 'msg', text: 'The true needle wanders off.' });
    if (e.kind === 'secrets') events.push({ type: 'msg', text: 'Hidden things are hidden once more.' });
  }
  // poison gnaws while you walk
  if (game.clock % 4 === 0) {
    for (const ch of realParty(game)) {
      if (ch.status.poison && isAlive(ch)) {
        applyDamage(ch, 1);
        if (ch.status.dead) events.push({ type: 'msg', text: `${ch.name} succumbs to the poison!` });
      }
    }
  }
  // Hearthsong Lull regeneration
  const song = game.song;
  if (song?.effect?.kind === 'regen' && game.clock % song.effect.every === 0) {
    for (const ch of realParty(game)) healChar(ch, song.effect.amount + (song.power >= 3 ? 1 : 0));
  }
  // spell points trickle back under open daylight
  const map = currentMap(game);
  if (map.kind === 'town' && !isNight(game) && game.clock % 3 === 0) {
    for (const ch of realParty(game)) {
      if (ch.maxSp > 0 && ch.sp < ch.maxSp && isAlive(ch)) ch.sp += 1;
    }
  }
}

function processCell(game, rng, events, depth) {
  if (depth > 3) return;
  const map = currentMap(game);
  const ms = mapStateFor(game, map.id);
  const { x, y } = game.pos;

  if (inZone(game, 'antimagic')) {
    if (purgeMagic(game)) events.push({ type: 'msg', text: 'A dead-magic cold: your enchantments gutter out!' });
  }
  if (inZone(game, 'dark') && lightRadius(game) < 0) {
    events.push({ type: 'msg', text: 'Darkness swallows your light whole.' });
  }

  const sp = cellSpecial(map, x, y);
  if (!sp) return;
  switch (sp.t) {
    case 'mouth':
      events.push({ type: 'msg', text: sp.text, mouth: true });
      break;
    case 'spinner': {
      game.pos.facing = rng.int(4); // silent — the classic cruelty
      break;
    }
    case 'teleport': {
      game.pos.x = sp.to.x; game.pos.y = sp.to.y; // also silent
      processCell(game, rng, events, depth + 1);
      break;
    }
    case 'trap':
      triggerTrap(game, rng, events, sp);
      break;
    case 'stairs':
      events.push({ type: 'stairsPrompt', cell: sp });
      break;
    case 'encounter':
      if (!ms.once[sp.id]) events.push({ type: 'combat', fixed: sp });
      break;
    case 'treasure':
      if (!ms.once[sp.id]) {
        ms.once[sp.id] = true;
        events.push({ type: 'treasure', items: sp.items, gold: sp.gold, text: sp.text });
      }
      break;
  }
}

function triggerTrap(game, rng, events, sp) {
  const ms = mapStateFor(game, currentMap(game).id);
  const key = game.pos.x + ',' + game.pos.y;
  if (ms.zapped[key]) return;
  const floorTrap = sp.trap === 'pit' || sp.trap === 'crumble';
  if (floorTrap && hasEffect(game, 'levitate')) {
    events.push({ type: 'msg', text: 'You drift over a yawning ' + sp.trap + ' trap.' });
    return;
  }
  const ward = game.song?.effect?.kind === 'trapward' ? game.song.effect.amount : 0;
  const party = aliveParty(game).filter(c => !c.summon);
  if (!party.length) return;
  const dc = sp.dc;
  switch (sp.trap) {
    case 'spikes': {
      const ch = rng.pick(party);
      if (savingThrow(rng, ch, dc, ward)) events.push({ type: 'msg', text: `${ch.name} twists away from a spear-trap!` });
      else {
        const dmg = rollDice(rng, '1d8') + Math.floor(dc / 4);
        applyDamage(ch, dmg);
        events.push({ type: 'msg', text: `A spear-trap slams out of the wall! ${ch.name} takes ${dmg}.${ch.status.dead ? ' They fall!' : ''}` });
      }
      break;
    }
    case 'gas': {
      events.push({ type: 'msg', text: 'A rotten hiss — green vapour floods the passage!' });
      for (const ch of party) {
        if (!savingThrow(rng, ch, dc, ward)) { ch.status.poison = true; events.push({ type: 'msg', text: `${ch.name} is poisoned!` }); }
      }
      break;
    }
    case 'pit': {
      const ch = rng.pick(party);
      if (savingThrow(rng, ch, dc, ward + statMod(ch.stats.DX))) events.push({ type: 'msg', text: `The floor drops away — ${ch.name} catches the edge!` });
      else {
        const dmg = rollDice(rng, '1d6') + Math.floor(dc / 4);
        applyDamage(ch, dmg);
        events.push({ type: 'msg', text: `The floor drops away! ${ch.name} falls hard for ${dmg}.${ch.status.dead ? ' They do not rise.' : ''}` });
      }
      break;
    }
    case 'crumble': {
      events.push({ type: 'msg', text: 'The ceiling lets go with a roar of old mortar!' });
      for (const ch of party) {
        if (!savingThrow(rng, ch, dc, ward)) {
          const dmg = rollDice(rng, '1d6');
          applyDamage(ch, dmg);
          events.push({ type: 'msg', text: `${ch.name} is battered for ${dmg}.${ch.status.dead ? ' They fall!' : ''}` });
        }
      }
      break;
    }
  }
}

// Destroy the trap on the cell AHEAD (Trap-Sayer / phase chalk style).
export function zapTrapAhead(game) {
  const map = currentMap(game);
  const { x, y, facing } = game.pos;
  const nx = x + DX[facing], ny = y + DY[facing];
  const sp = cellSpecial(map, nx, ny);
  const ms = mapStateFor(game, map.id);
  if (sp?.t === 'trap' && !ms.zapped[nx + ',' + ny]) {
    ms.zapped[nx + ',' + ny] = true;
    return true;
  }
  return false;
}

// Search the current cell's four edges for secret doors. Costs time.
export function searchSecrets(game, rng) {
  const events = [];
  const map = currentMap(game);
  const ms = mapStateFor(game, map.id);
  const { x, y } = game.pos;
  const hasKnave = realParty(game).some(c => c.cls === 'knave' && isAlive(c));
  let found = 0;
  for (let d = 0; d < 4; d++) {
    if (edgeAt(map, x, y, d) === 's' && !secretFound(game, map.id, x, y, d)) {
      const chance = 35 + (hasKnave ? 30 : 0);
      if (rng.chance(chance)) { ms.secrets.push(edgeKey(x, y, d)); found++; }
    }
  }
  advanceClock(game, rng, events);
  if (found) events.unshift({ type: 'msg', text: found === 1 ? 'You find a secret door!' : `You find ${found} secret doors!` });
  else events.unshift({ type: 'msg', text: 'You search the walls and find nothing.' });
  rollEncounter(game, rng, events);
  return events;
}

export function answerRiddle(game, answer) {
  const map = currentMap(game);
  const ms = mapStateFor(game, map.id);
  const a = answer.trim().toLowerCase();
  if (map.riddle.answers.includes(a)) { ms.riddle = true; return true; }
  return false;
}

// ---- random encounters -----------------------------------------------------
export function rollEncounter(game, rng, events) {
  const map = currentMap(game);
  let enc = map.encounters;
  if (!enc) return;
  if (map.kind === 'town') enc = isNight(game) ? enc.night : enc.day;
  let rate = enc.rate;
  if (game.song?.effect?.kind === 'evade' && rng.chance(game.song.effect.amount)) return;
  if (!rng.chance(rate)) return;

  const nGroups = Math.min(4, rollDice(rng, enc.groups));
  const totalWeight = enc.table.reduce((a, t) => a + t.weight, 0);
  const groups = [];
  for (let i = 0; i < nGroups; i++) {
    let w = rng.int(totalWeight);
    let pickRow = enc.table[0];
    for (const row of enc.table) { if (w < row.weight) { pickRow = row; break; } w -= row.weight; }
    const def = DB.monster(pickRow.monster);
    if (game.song?.effect?.kind === 'repel_undead' && def.undead && rng.chance(game.song.effect.amount)) continue;
    groups.push({ monster: pickRow.monster, count: rollDice(rng, def.group) });
  }
  if (!groups.length) return;
  events.push({ type: 'combat', groups });
}

// House entry encounter roll — elevated rate, same day/night tables as street.
// Kept separate from rollEncounter to preserve that function's exact RNG order.
export function rollHouseEncounter(game, rng, events) {
  const map = currentMap(game);
  const enc = map.encounters;
  if (!enc?.house) return;
  const night = isNight(game);
  const rate = night ? enc.house.nightRate : enc.house.dayRate;
  const timeEnc = night ? enc.night : enc.day;
  if (!rng.chance(rate)) return;

  const nGroups = Math.min(4, rollDice(rng, timeEnc.groups));
  const totalWeight = timeEnc.table.reduce((a, t) => a + t.weight, 0);
  const groups = [];
  for (let i = 0; i < nGroups; i++) {
    let w = rng.int(totalWeight);
    let pickRow = timeEnc.table[0];
    for (const row of timeEnc.table) { if (w < row.weight) { pickRow = row; break; } w -= row.weight; }
    const def = DB.monster(pickRow.monster);
    if (game.song?.effect?.kind === 'repel_undead' && def.undead && rng.chance(game.song.effect.amount)) continue;
    groups.push({ monster: pickRow.monster, count: rollDice(rng, def.group) });
  }
  if (!groups.length) return;
  events.push({ type: 'combat', groups });
}

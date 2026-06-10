// Active party effects: light, shields, levitation, true seeing, compass,
// secret-sight, phase door charges, battle-cries. Durations are in clock
// ticks (one per step or combat round).

import { currentMap, inZone, isNight } from './gamestate.js';

export function addEffect(game, eff) {
  // refresh same-kind effect instead of stacking
  game.effects = game.effects.filter(e => e.kind !== eff.kind || e.fire !== eff.fire);
  game.effects.push(eff);
}

export function hasEffect(game, kind) {
  return game.effects.some(e => e.kind === kind);
}
export function getEffect(game, kind) {
  return game.effects.find(e => e.kind === kind);
}
export function removeEffect(game, kind) {
  game.effects = game.effects.filter(e => e.kind !== kind);
}

export function tickEffects(game) {
  const expired = game.effects.filter(e => e.until != null && e.until <= game.clock);
  game.effects = game.effects.filter(e => e.until == null || e.until > game.clock);
  return expired;
}

// Anti-magic: every magical effect drops. Torches (fire) survive.
export function purgeMagic(game) {
  const before = game.effects.length;
  game.effects = game.effects.filter(e => e.fire);
  return game.effects.length !== before;
}

// Effective view radius in cells. 0 = no light (dim view of one cell).
export function lightRadius(game) {
  const map = currentMap(game);
  if (map.kind === 'town') return isNight(game) ? 2 : 3;
  if (inZone(game, 'dark')) return -1;          // magical darkness: pitch black
  let r = 0;
  for (const e of game.effects) if (e.kind === 'light') r = Math.max(r, e.radius);
  if (game.song?.effect?.kind === 'light') r = Math.max(r, game.song.effect.radius);
  return r;
}

export function partyAcBonus(game) {
  let b = 0;
  const sh = getEffect(game, 'shield');
  if (sh) b += sh.ac;
  if (game.song?.effect?.kind === 'ac') b += game.song.effect.amount + (game.song.power >= 3 ? 1 : 0);
  return b;
}

export function songDmgBonus(game) {
  if (game.song?.effect?.kind === 'dmg') return game.song.effect.amount + (game.song.power >= 3 ? 1 : 0);
  return 0;
}

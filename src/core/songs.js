// Skald songs. Exploration songs persist until the singer stops, the party
// changes maps, or combat begins. Combat songs are a one-round action.

import { DB } from './db.js';
import { songPower, isAlive } from './character.js';

export function canSing(ch) {
  if (ch.cls !== 'skald') return 'Only a Skald can sing the old verses.';
  if (!isAlive(ch)) return 'The singer is in no state to sing.';
  if (songPower(ch) === 0) return 'No instrument in hand — the verses need strings or wind.';
  if (ch.songsLeft <= 0) return 'The Skald’s voice is spent. Wine restores it.';
  return null;
}

export function startExploreSong(game, ch, songId) {
  const err = canSing(ch);
  if (err) return { ok: false, msg: err };
  const song = DB.song(songId);
  ch.songsLeft -= 1;
  game.song = { id: song.id, singerId: ch.id, power: songPower(ch), effect: song.explore, name: song.name };
  return { ok: true, msg: `${ch.name} strikes up ${song.name}. (${ch.songsLeft} songs left)` };
}

export function stopSong(game) {
  const had = game.song;
  game.song = null;
  return had;
}

// returns the one-round combat effect descriptor, or an error string
export function singCombat(ch, songId) {
  const err = canSing(ch);
  if (err) return { ok: false, msg: err };
  const song = DB.song(songId);
  ch.songsLeft -= 1;
  return { ok: true, song, power: songPower(ch) };
}

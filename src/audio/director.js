// Music & SFX director: decides what plays from game context. Pure UI-side;
// game logic never calls in here.

import { Synth } from './synth.js';

export const synth = new Synth();
let MUSIC = null, SFX = null;

export async function loadAudio(loader) {
  [MUSIC, SFX] = await Promise.all([
    loader('data/audio/music.json'),
    loader('data/audio/sfx.json')
  ]);
}

export function unlockAudio() {
  if (!synth.unlocked()) synth.unlock();
}

export function sfx(name) {
  if (!SFX) return;
  synth.playSfx(SFX.sfx[name]);
}

// Skald instrument tier flavors the song's voice slightly
function songOpts(power) {
  return { detune: power >= 3 ? 4 : power === 2 ? 0 : -7 };
}

// context: 'title' | 'explore' | 'combat' | 'tavern' | 'victory' | 'defeat' | 'silence'
export function updateMusic(game, ctx) {
  if (!synth.unlocked() || !MUSIC) return;
  if (ctx === 'silence') return synth.stopMusic();
  if (ctx === 'victory') { synth.stopMusic(); synth.playOnce(MUSIC.themes.victory); synth.current = { name: 'victory-hold' }; return; }
  if (ctx === 'defeat') { synth.stopMusic(); synth.playOnce(MUSIC.themes.defeat); synth.current = { name: 'defeat-hold' }; return; }
  if (ctx === 'title' || !game) return synth.playMusic('title', MUSIC.themes.title);
  if (ctx === 'combat') return synth.playMusic('combat', MUSIC.themes.combat);
  if (ctx === 'tavern') return synth.playMusic('tavern', MUSIC.themes.tavern);

  // exploration: an active bard song IS the music
  if (game.song && MUSIC.songs[game.song.id]) {
    const s = MUSIC.songs[game.song.id];
    return synth.playMusic('song:' + game.song.id + ':' + game.song.power, s.loop, songOpts(game.song.power));
  }
  const map = game.pos.map;
  if (map === 'town') {
    const night = game.clock % 400 >= 280;   // mirrors gamestate DAY_LEN/NIGHT_AT
    return synth.playMusic(night ? 'town_night' : 'town_day',
      night ? MUSIC.themes.town_night : MUSIC.themes.town_day);
  }
  const dungeon = map.startsWith('undercroft') ? 'dungeon_undercroft'
    : map.startsWith('barrow') ? 'dungeon_barrow' : 'dungeon_needle';
  // tension rises with depth: each level down sits a little lower and slower
  const depth = parseInt(map.replace(/\D+/g, ''), 10) || 1;
  return synth.playMusic(dungeon + depth, MUSIC.themes[dungeon], { transpose: -(depth - 1) });
}

// one-round combat flourish of a bard song
export function flourish(songId) {
  const s = MUSIC?.songs[songId];
  if (s) synth.playOnce(s.flourish);
}

export function audioCfg() { return synth.cfg; }
export function setAudio(key, val) { synth.set(key, val); }

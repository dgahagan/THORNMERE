// Audio data integrity: every pattern parses, note tokens are legal, tracks
// within a pattern agree on total length (loops stay phase-locked), every
// bard song has a distinct loop and a flourish, and SFX recipes are sane.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const music = JSON.parse(readFileSync(join(ROOT, 'data', 'audio', 'music.json'), 'utf8'));
const sfx = JSON.parse(readFileSync(join(ROOT, 'data', 'audio', 'sfx.json'), 'utf8'));

const TOKEN = /^([a-g][#b]?\d|r):\d+(\.\d+)?$/;
const VOICES = new Set(['square', 'pulse', 'tri', 'noise']);

function checkPattern(name, pat) {
  assert.ok(pat.bpm > 0, `${name}: bpm`);
  assert.ok(pat.tracks?.length, `${name}: tracks`);
  const lengths = [];
  for (const tr of pat.tracks) {
    assert.ok(VOICES.has(tr.voice), `${name}: voice '${tr.voice}'`);
    let total = 0;
    for (const tok of tr.notes.trim().split(/\s+/)) {
      assert.match(tok, TOKEN, `${name}: bad token '${tok}'`);
      total += parseFloat(tok.split(':')[1]);
    }
    lengths.push(total);
  }
  const max = Math.max(...lengths);
  for (const l of lengths) {
    assert.equal(l, max, `${name}: track lengths differ (${lengths.join(', ')}) — loop would drift`);
  }
  return max;
}

test('all 7 bard songs have valid loops and flourishes', () => {
  const ids = Object.keys(music.songs);
  assert.equal(ids.length, 7);
  for (const id of ids) {
    const s = music.songs[id];
    assert.ok(s.name, `${id}: name`);
    const loopLen = checkPattern(`song ${id} loop`, s.loop);
    checkPattern(`song ${id} flourish`, s.flourish);
    assert.ok(loopLen >= 32, `${id}: loop should be at least 2 bars`);
  }
});

test('bard songs are mutually distinct (tempo or melody)', () => {
  const seen = new Map();
  for (const [id, s] of Object.entries(music.songs)) {
    const sig = s.loop.bpm + '|' + s.loop.tracks[0].notes.trim();
    assert.ok(!seen.has(sig), `${id} duplicates ${seen.get(sig)}`);
    seen.set(sig, id);
  }
});

test('bard song ids match the game songs data', () => {
  const gameSongs = JSON.parse(readFileSync(join(ROOT, 'data', 'songs.json'), 'utf8'));
  for (const s of gameSongs) {
    assert.ok(music.songs[s.id], `game song '${s.id}' (${s.name}) has no melody`);
  }
});

test('all themes parse: title, town day/night, three dungeon drones, combat, victory, defeat, tavern', () => {
  for (const key of ['title', 'town_day', 'town_night', 'dungeon_undercroft', 'dungeon_barrow',
    'dungeon_needle', 'combat', 'victory', 'defeat', 'tavern']) {
    assert.ok(music.themes[key], `missing theme ${key}`);
    checkPattern(`theme ${key}`, music.themes[key]);
  }
});

test('sfx recipes are well-formed and cover the required set', () => {
  for (const name of ['footstep_stone', 'footstep_dirt', 'bump', 'door', 'secret', 'stairs',
    'hit', 'miss', 'crit', 'spell_hexen', 'spell_lorist', 'spell_storm', 'trap', 'chest',
    'gold', 'levelup', 'heal', 'mouth', 'save', 'torch']) {
    const r = sfx.sfx[name];
    assert.ok(Array.isArray(r) && r.length, `missing sfx ${name}`);
    for (const n of r) {
      assert.ok(VOICES.has(n.voice), `${name}: voice`);
      assert.ok(n.freq > 0 && n.dur > 0 && n.vol > 0 && n.vol <= 1, `${name}: freq/dur/vol`);
    }
  }
});

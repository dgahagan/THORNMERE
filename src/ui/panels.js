// Status strip and party roster panels.

import { DB } from '../core/db.js';
import {
  currentMap, partyChars, timeOfDay, isNight
} from '../core/gamestate.js';
import { lightRadius, partyAcBonus, getEffect, hasEffect } from '../core/effects.js';
import { effectiveAC, clsOf } from '../core/character.js';
import { FACING_NAMES } from '../core/maze.js';

export function renderStatus(game, el) {
  const map = currentMap(game);
  const r = lightRadius(game);
  const lightTxt = map.kind === 'town' ? (isNight(game) ? 'moon' : 'daylight')
    : r < 0 ? 'DARKNESS' : r === 0 ? 'none' : String(r);
  const bits = [];
  if (getEffect(game, 'shield')) bits.push(`SHLD+${getEffect(game, 'shield').ac}`);
  if (hasEffect(game, 'levitate')) bits.push('LEVT');
  if (hasEffect(game, 'trueseeing')) bits.push('TRUE');
  if (hasEffect(game, 'secrets')) bits.push('SEEK');
  if (hasEffect(game, 'battlecry')) bits.push('FURY');
  if (hasEffect(game, 'phase')) bits.push('PHAS');
  if (getEffect(game, 'compass')) bits.push(`LOC ${game.pos.x},${game.pos.y}`);
  const song = game.song ? `♪ ${game.song.name}` : '♪ —';
  el.textContent =
    `${FACING_NAMES[game.pos.facing]}  Light: ${lightTxt}  ${timeOfDay(game)}  Gold: ${game.gold}\n` +
    `${song}   ${bits.join(' ') || ''}\n` +
    `${map.name}`;
}

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
const padl = (s, n) => String(s).padStart(n).slice(0, n);

export function renderRoster(game, el, highlightId = null) {
  const chars = partyChars(game);
  let html = `<span class="hdr">#  NAME          AC   HP/ MAX   SP/ MAX  CLASS        LVL</span>\n`;
  for (let i = 0; i < 6; i++) {
    const ch = chars[i];
    if (!ch) { html += `<span class="hdr">${i + 1}  (empty)</span>\n`; continue; }
    let line;
    if (ch.summon) {
      const def = DB.monster(ch.monsterId);
      line = `${i + 1}  ${pad(ch.name, 13)} ${padl(def.ac, 3)} ${padl(ch.hp, 4)}/${padl(ch.maxHp, 4)}   ${padl('-', 3)}/${padl('-', 4)}  ${pad(ch.illusion ? 'Illusion' : 'Summoned', 12)} ${padl(def.tier, 3)}`;
      html += `<span class="summon${ch.id === highlightId ? ' pick' : ''}">${line}</span>\n`;
    } else {
      const flags = [ch.status.dead ? 'DEAD' : '', ch.status.stone ? 'STON' : '',
        ch.status.poison ? 'PSN' : '', ch.status.fear ? 'FEAR' : ''].filter(Boolean).join(',');
      const name = flags ? `${ch.name.slice(0, 8)}*${flags}` : ch.name;
      line = `${i + 1}  ${pad(name, 13)} ${padl(effectiveAC(ch, partyAcBonus(game)), 3)} ` +
        `${padl(ch.hp, 4)}/${padl(ch.maxHp, 4)}   ${padl(ch.maxSp ? ch.sp : '-', 3)}/${padl(ch.maxSp ? ch.maxSp : '-', 4)}  ` +
        `${pad(clsOf(ch).name + (ch.cls === 'skald' ? ` ${ch.songsLeft}♪` : ''), 12)} ${padl(ch.level, 3)}`;
      const cls = ch.status.dead || ch.status.stone ? 'dead' : (ch.id === highlightId ? 'pick' : '');
      html += cls ? `<span class="${cls}">${line}</span>\n` : line + '\n';
    }
  }
  el.innerHTML = html;
}

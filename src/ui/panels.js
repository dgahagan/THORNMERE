// Status strip and party roster panels (DOM), colored by condition like the
// original: wounded yellow, critical red, poisoned green, stoned grey,
// dead dark red. Portrait chips and class icons come from the art registry.

import { DB } from '../core/db.js';
import { currentMap, partyChars, timeOfDay, isNight, streetAt } from '../core/gamestate.js';
import { lightRadius, partyAcBonus, getEffect, hasEffect } from '../core/effects.js';
import { effectiveAC, clsOf } from '../core/character.js';
import { FACING_NAMES } from '../core/maze.js';
import { ART, resolveVariant, frameAt, drawSpriteToCtx } from './art.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---- status strip -----------------------------------------------------------
let compassCv = null, noteCv = null, statusText = null;

function buildStatus(el) {
  el.innerHTML = '';
  compassCv = document.createElement('canvas');
  compassCv.width = 32; compassCv.height = 32;
  compassCv.title = 'click to turn right';
  compassCv.dataset.key = 'ArrowRight';
  compassCv.style.cursor = 'pointer';
  statusText = document.createElement('div');
  statusText.className = 'stat-text';
  noteCv = document.createElement('canvas');
  noteCv.width = 16; noteCv.height = 16;
  el.append(compassCv, statusText, noteCv);
}

function drawCompass(facing) {
  const ctx = compassCv.getContext('2d');
  ctx.clearRect(0, 0, 32, 32);
  const sp = ART.sprites.ui_compass;
  if (sp) drawSpriteToCtx(ctx, sp, 2);
  // needle: gold toward facing (screen-up = the way you face)
  ctx.strokeStyle = '#d8a224';
  ctx.lineWidth = 2;
  const cx = 16, cy = 16, r = 9;
  const ang = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][0]; // needle always up: view-relative
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(ang) * 3, cy - Math.sin(ang) * 3);
  ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
  ctx.stroke();
  // letter of the cardinal you face, below the needle
  ctx.fillStyle = '#f8d878';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NESW'[facing], cx, cy + 4);
}

export function tickNote() {
  if (!noteCv) return;
  const ctx = noteCv.getContext('2d');
  ctx.clearRect(0, 0, 16, 16);
  if (!noteCv.dataset.on) return;
  const fr = frameAt({ anim: ART.anims.ui_note, remap: null }, Date.now());
  const sp = fr && ART.sprites[fr.name];
  if (sp) drawSpriteToCtx(ctx, sp, 2);
}

export function renderStatus(game, el) {
  if (!game) { el.innerHTML = ''; compassCv = null; noteCv = null; return; }
  if (!statusText || !el.contains(statusText)) buildStatus(el);
  const map = currentMap(game);
  const r = lightRadius(game);
  const lightTxt = map.kind === 'town' ? (isNight(game) ? 'moonlight' : 'daylight')
    : r < 0 ? 'DARKNESS' : r === 0 ? 'none' : String(r);
  const bits = [];
  if (getEffect(game, 'shield')) bits.push(`SHLD+${getEffect(game, 'shield').ac}`);
  if (hasEffect(game, 'levitate')) bits.push('LEVT');
  if (hasEffect(game, 'trueseeing')) bits.push('TRUE');
  if (hasEffect(game, 'secrets')) bits.push('SEEK');
  if (hasEffect(game, 'battlecry')) bits.push('FURY');
  if (hasEffect(game, 'phase')) bits.push('PHAS');
  if (getEffect(game, 'compass')) bits.push(`LOC ${game.pos.x},${game.pos.y}`);
  const street = streetAt(game);
  const mapLine = street ? `${esc(map.name)} — ${esc(street)}` : esc(map.name);
  statusText.innerHTML =
    `${FACING_NAMES[game.pos.facing]}  ·  light: ${lightTxt}  ·  ${timeOfDay(game)}  ·  <span class="gold">${game.gold} gold</span>\n` +
    `<span class="songname">${game.song ? '♪ ' + esc(game.song.name) : '♪ —'}</span>  <span class="effects">${bits.join(' ')}</span>\n` +
    mapLine;
  drawCompass(game.pos.facing);
  noteCv.dataset.on = game.song ? '1' : '';
  noteCv.title = game.song ? game.song.name : '';
  tickNote();
}

// ---- roster ------------------------------------------------------------------
function conditionOf(ch) {
  if (ch.status.dead) return 'dead';
  if (ch.status.stone || ch.status.paralyzed) return 'numb';
  if (ch.status.poison) return 'poisoned';
  if (ch.hp <= ch.maxHp * 0.25) return 'critical';
  if (ch.hp <= ch.maxHp * 0.5) return 'wounded';
  return 'ok';
}

const ARCHETYPES = {
  blade: 'warrior', warden: 'warrior', fistwright: 'warrior',
  knave: 'rogue', strider: 'rogue', skald: 'skald'
};
function chipId(ch) {
  return ch.portrait || `pc_${ch.race}_${ARCHETYPES[ch.cls] || 'caster'}_a`;
}

function chip(drawableId, size, fallbackSprite) {
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const d = resolveVariant(drawableId);
  const fr = d && frameAt(d, 0);
  const sp = fr ? ART.sprites[fr.name] : ART.sprites[fallbackSprite];
  if (sp) {
    const ctx = cv.getContext('2d');
    const sc = Math.max(1, Math.floor(size / Math.max(sp.w, sp.h)));
    drawSpriteToCtx(ctx, sp, sc, fr?.remap);
  }
  return cv;
}

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
const padl = (s, n) => String(s).padStart(n).slice(0, n);

export function renderRoster(game, el, highlightId = null) {
  const chars = partyChars(game);
  el.innerHTML = '';
  const hdr = document.createElement('div');
  hdr.className = 'row hdr';
  hdr.innerHTML = `<span>#</span><span></span><span></span><span>NAME</span><span>AC</span><span>HP/MAX</span><span>SP/MAX</span><span>CLASS</span><span>LVL</span><span></span>`;
  el.append(hdr);
  for (let i = 0; i < 6; i++) {
    const ch = chars[i];
    const row = document.createElement('div');
    if (!ch) {
      row.className = 'row empty';
      row.innerHTML = `<span class="num">${i + 1}</span><span></span><span></span><span>(empty)</span><span></span><span></span><span></span><span></span><span></span><span></span>`;
      el.append(row);
      continue;
    }
    row.dataset.key = String(i + 1);
    if (ch.summon) {
      const def = DB.monster(ch.monsterId);
      row.className = `row summon${ch.id === highlightId ? ' pick' : ''}`;
      row.append(
        cell('num', i + 1),
        chip(ch.monsterId, 20, null) || cell('', ''),
        cell('', ''),
        cell('', ch.name),
        cell('', def.ac),
        cell('', `${padl(ch.hp, 4)}/${padl(ch.maxHp, 4)}`),
        cell('', '   -/   -'),
        cell('', ch.illusion ? 'Illusion' : 'Summoned'),
        cell('', def.tier),
        cell('', '')
      );
      el.append(row);
      continue;
    }
    const cond = conditionOf(ch);
    row.className = `row${ch.id === highlightId ? ' pick' : ''}`;
    const flags = [ch.status.stone ? 'STONE' : '', ch.status.fear ? 'FEAR' : '',
      ch.status.poison ? 'PSN' : '', ch.drained ? 'DRAIN' : ''].filter(Boolean).join(' ');
    const clsName = clsOf(ch).name + (ch.cls === 'skald' ? ` ${ch.songsLeft}♪` : '');
    row.append(
      cell('num', i + 1),
      chip(chipId(ch), 20, null),
      chip('icon_' + ch.cls, 16, 'icon_' + ch.cls),
      cell(cond, pad(ch.name, 18)),
      cell(cond, padl(effectiveAC(ch, partyAcBonus(game)), 3)),
      cell(cond, `${padl(ch.hp, 4)}/${padl(ch.maxHp, 4)}`),
      cell(ch.maxSp ? 'sp' : cond, ch.maxSp ? `${padl(ch.sp, 4)}/${padl(ch.maxSp, 4)}` : '   -/   -'),
      cell(cond, pad(clsName, 14)),
      cell(cond, padl(ch.level, 3)),
      cell('flags', flags)
    );
    el.append(row);
  }
}

function cell(cls, txt) {
  const s = document.createElement('span');
  if (cls) s.className = cls;
  s.textContent = txt;
  return s;
}

// The wireframe viewport: single-point perspective, ~3 cells of depth plus
// the cells to each side. Walls are drawn far-to-near as black-filled,
// stroked polygons, so near geometry occludes far geometry exactly.

import { DX, DY, edgeState, cellSpecial, edgeAt } from '../core/maze.js';
import { currentMap, mapStateFor, isNight, inZone } from '../core/gamestate.js';
import { lightRadius, hasEffect } from '../core/effects.js';
import { drawPortrait } from './portraits.js';

const W = 448, H = 336;
const CX = W / 2, CY = H / 2;
const K = 120;                       // focal constant
const DEPTHS = [0.45, 1.45, 2.45, 3.45, 4.45]; // far-edge plane of cell k
const NEAR = 0.16;                   // clamp for the cell you stand in

export const COLORS = {
  line: '#8df272',
  dim: '#3f7a38',
  glyph: '#c9f7b0',
  black: '#000000'
};

function planeDist(k) { return k < 0 ? NEAR : DEPTHS[k]; }
function py(d, topOrBottom) { const hh = K / d; return topOrBottom === 't' ? CY - hh : CY + hh; }
function px(u, d) { return CX + (u * 2 * K) / d; }

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  clear() {
    const { ctx } = this;
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(0, 0, W, H);
  }

  frame(color) {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
  }

  // ---- main entry ----------------------------------------------------------
  draw(game) {
    const { ctx } = this;
    this.clear();
    const map = currentMap(game);
    const radius = lightRadius(game);

    if (radius < 0) { // magical darkness
      this.frame(COLORS.dim);
      ctx.fillStyle = COLORS.dim;
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('darkness', CX, CY);
      return;
    }

    const noLight = map.kind === 'dungeon' && radius === 0;
    const maxDepth = noLight ? 1 : Math.min(3, Math.max(1, radius + 1));
    const stroke = noLight ? COLORS.dim : COLORS.line;
    const f = game.pos.facing;
    const rf = (f + 1) % 4;

    const cellAt = (k, o) => ({
      x: game.pos.x + DX[f] * k + DX[rf] * o,
      y: game.pos.y + DY[f] * k + DY[rf] * o
    });
    // edge of cell (k,o) in relative direction: 0=front 1=right 2=back 3=left
    const edge = (k, o, rel) => {
      const c = cellAt(k, o);
      return edgeState(game, map, c.x, c.y, (f + rel) % 4);
    };

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'miter';

    for (let k = maxDepth; k >= 0; k--) {
      const dFar = planeDist(k);
      const dNear = planeDist(k - 1);

      // --- side columns (left o=-1, right o=+1)
      for (const o of [-1, 1]) {
        const between = edge(k, 0, o === -1 ? 3 : 1); // wall between center and side cell
        if (between !== 'open') continue;             // can't see into the side cell
        // outer side wall of the side cell
        const outer = edge(k, o, o === -1 ? 3 : 1);
        if (outer !== 'open') {
          this.sideWall(o === -1 ? -1.5 : 1.5, dNear, dFar, outer, stroke, o === -1 ? 1 : -1);
        }
        // front wall of the side cell
        const sideFront = edge(k, o, 0);
        if (sideFront !== 'open') {
          this.frontWall(o - 0.5, o + 0.5, dFar, sideFront, stroke);
        }
        // floor/ceiling continuation lines of the opening
        this.openingLines(o === -1 ? -0.5 : 0.5, dNear, dFar, stroke);
      }

      // --- center column side walls
      const left = edge(k, 0, 3);
      const right = edge(k, 0, 1);
      if (left !== 'open') this.sideWall(-0.5, dNear, dFar, left, stroke, 1);
      if (right !== 'open') this.sideWall(0.5, dNear, dFar, right, stroke, -1);

      // --- center front wall
      const front = edge(k, 0, 0);
      if (front !== 'open') {
        // widen to cover side gaps if the adjacent cells' front walls continue
        this.frontWall(-0.5, 0.5, dFar, front, stroke);
      }

      // --- special glyph in the center cell at this depth
      const c = cellAt(k, 0);
      const sp = cellSpecial(map, c.x, c.y);
      if (sp && k > 0) this.glyph(game, sp, dNear, dFar, stroke);
    }

    // horizon ticks for the corridor (depth cue)
    ctx.strokeStyle = stroke;
    this.frame(stroke);

    if (map.kind === 'town' && isNight(game)) {
      ctx.fillStyle = COLORS.dim;
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('night', 8, 16);
    }
    if (game.debugMap) this.automap(game);
  }

  // wall parallel to view at lateral u, spanning dNear..dFar. lean: +1 if its
  // face looks rightward (left-hand walls), -1 for right-hand walls.
  sideWall(u, dNear, dFar, state, stroke, lean) {
    const { ctx } = this;
    const x1 = px(u, dNear), x2 = px(u, dFar);
    const t1 = py(dNear, 't'), b1 = py(dNear, 'b');
    const t2 = py(dFar, 't'), b2 = py(dFar, 'b');
    ctx.fillStyle = COLORS.black;
    ctx.beginPath();
    ctx.moveTo(x1, t1); ctx.lineTo(x2, t2); ctx.lineTo(x2, b2); ctx.lineTo(x1, b1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = stroke;
    if (state === 'door' || state === 'riddle') {
      ctx.stroke();
      // inset door: interpolate along the wall
      const di = (t) => dNear + (dFar - dNear) * t;
      const dx1 = px(u, di(0.3)), dx2 = px(u, di(0.7));
      const dt1 = CY - (K / di(0.3)) * 0.72, db1 = py(di(0.3), 'b');
      const dt2 = CY - (K / di(0.7)) * 0.72, db2 = py(di(0.7), 'b');
      ctx.beginPath();
      ctx.moveTo(dx1, db1); ctx.lineTo(dx1, dt1); ctx.lineTo(dx2, dt2); ctx.lineTo(dx2, db2);
      ctx.stroke();
    } else {
      ctx.stroke();
    }
  }

  frontWall(uL, uR, d, state, stroke) {
    const { ctx } = this;
    const x1 = px(uL, d), x2 = px(uR, d);
    const t = py(d, 't'), b = py(d, 'b');
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(x1, t, x2 - x1, b - t);
    ctx.strokeStyle = stroke;
    ctx.strokeRect(x1, t, x2 - x1, b - t);
    if (state === 'door' || state === 'riddle') {
      const w = x2 - x1, h = b - t;
      const dx = x1 + w * 0.28, dw = w * 0.44;
      const dt = t + h * 0.26;
      ctx.strokeRect(dx, dt, dw, b - dt);
      if (state === 'riddle') {
        ctx.fillStyle = stroke;
        ctx.font = `${Math.max(9, h * 0.2)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('?', x1 + w / 2, t + h * 0.6);
      }
    }
  }

  openingLines(u, dNear, dFar, stroke) {
    const { ctx } = this;
    ctx.strokeStyle = stroke;
    ctx.beginPath();
    // floor and ceiling seams of the corridor continue across the opening
    ctx.moveTo(px(u, dNear), py(dNear, 'b')); ctx.lineTo(px(u, dFar), py(dFar, 'b'));
    ctx.moveTo(px(u, dNear), py(dNear, 't')); ctx.lineTo(px(u, dFar), py(dFar, 't'));
    ctx.stroke();
  }

  // wireframe glyphs for maze furniture, drawn on the floor of cell k
  glyph(game, sp, dNear, dFar, stroke) {
    const ms = mapStateFor(game, currentMap(game).id);
    const kind = sp.t;
    if (['spinner', 'teleport', 'trap', 'building'].includes(kind)) return; // invisible
    if (kind === 'treasure' && ms.once[sp.id]) return;
    if (kind === 'encounter' && ms.once[sp.id]) return;
    const { ctx } = this;
    const d = (dNear + dFar) / 2;
    const cx = px(0, d);
    const floor = py(d, 'b');
    const s = (2 * K) / d; // pixels per unit at this plane
    ctx.strokeStyle = COLORS.glyph;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    if (kind === 'stairs') {
      const w = s * 0.4, hstep = s * 0.09;
      if (sp.dir === 'down') {
        for (let i = 0; i < 4; i++) {
          ctx.rect(cx - w / 2 + i * (w / 8), floor - hstep * (4 - i) - s * 0.02, w - i * (w / 4), hstep);
        }
      } else {
        for (let i = 0; i < 4; i++) {
          ctx.rect(cx - w / 2 + i * (w / 8), floor - hstep * (i + 1) - s * 0.02, w - i * (w / 4), hstep);
        }
      }
    } else if (kind === 'mouth') {
      const r = s * 0.13;
      ctx.ellipse(cx, floor - s * 0.45, r, r * 0.55, 0, 0, Math.PI * 2);
      ctx.moveTo(cx - r, floor - s * 0.45);
      ctx.lineTo(cx + r, floor - s * 0.45);
    } else if (kind === 'treasure') {
      const w = s * 0.3, h = s * 0.16;
      ctx.rect(cx - w / 2, floor - h, w, h);
      ctx.moveTo(cx - w / 2, floor - h);
      ctx.quadraticCurveTo(cx, floor - h - w * 0.3, cx + w / 2, floor - h);
    } else if (kind === 'encounter') {
      // a waiting horror: jagged crown sigil
      const w = s * 0.34;
      ctx.moveTo(cx - w / 2, floor - s * 0.1);
      for (let i = 0; i <= 4; i++) {
        ctx.lineTo(cx - w / 2 + (w / 4) * i, floor - s * (i % 2 ? 0.5 : 0.25));
      }
      ctx.lineTo(cx + w / 2, floor - s * 0.1);
      ctx.closePath();
    } else if (kind === 'seal') {
      const r = s * 0.3;
      ctx.arc(cx, floor - r - s * 0.05, r, 0, Math.PI * 2);
      ctx.moveTo(cx, floor - 2 * r - s * 0.05); ctx.lineTo(cx, floor - s * 0.05);
      ctx.moveTo(cx - r, floor - r - s * 0.05); ctx.lineTo(cx + r, floor - r - s * 0.05);
    } else if (kind === 'gate') {
      const w = s * 0.5, h = s * 0.7;
      ctx.moveTo(cx - w / 2, floor); ctx.lineTo(cx - w / 2, floor - h * 0.7);
      ctx.quadraticCurveTo(cx, floor - h * 1.15, cx + w / 2, floor - h * 0.7);
      ctx.lineTo(cx + w / 2, floor);
    }
    ctx.stroke();
    ctx.lineWidth = 1.5;
  }

  // combat: lead monster portrait over the viewport
  combatPortrait(game, monsterDef) {
    const { ctx } = this;
    this.clear();
    this.frame(COLORS.line);
    const bw = 240, bh = 240;
    const bx = CX - bw / 2, by = CY - bh / 2 - 14;
    ctx.strokeStyle = COLORS.line;
    ctx.strokeRect(bx, by, bw, bh);
    drawPortrait(ctx, monsterDef.portrait, bx + 12, by + 12, bw - 24, bh - 24, COLORS.glyph);
    ctx.fillStyle = COLORS.line;
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(monsterDef.name.toUpperCase(), CX, by + bh + 24);
  }

  // interior of a town building: simple counter-and-keeper vignette
  interior(name, kind) {
    const { ctx } = this;
    this.clear();
    this.frame(COLORS.line);
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1.5;
    // room
    ctx.strokeRect(40, 40, W - 80, H - 110);
    // counter
    ctx.strokeRect(120, 190, 210, 46);
    ctx.beginPath();
    ctx.moveTo(120, 190); ctx.lineTo(104, 266); ctx.moveTo(330, 190); ctx.lineTo(346, 266);
    ctx.stroke();
    // keeper
    drawPortrait(ctx, kindKeeper(kind), 180, 78, 90, 110, COLORS.glyph);
    ctx.fillStyle = COLORS.line;
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(name.toUpperCase(), CX, H - 28);
  }

  splash(title, sub) {
    const { ctx } = this;
    this.clear();
    this.frame(COLORS.line);
    ctx.fillStyle = COLORS.glyph;
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(title, CX, CY - 20);
    ctx.font = '13px monospace';
    ctx.fillStyle = COLORS.line;
    if (sub) ctx.fillText(sub, CX, CY + 14);
  }

  automap(game) {
    const { ctx } = this;
    const map = currentMap(game);
    const cs = Math.floor(Math.min(150 / map.w, 150 / map.h) * 2) / 2;
    const ox = W - map.w * cs - 10, oy = 10;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(ox - 4, oy - 4, map.w * cs + 8, map.h * cs + 8);
    ctx.strokeStyle = COLORS.dim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const sx = ox + x * cs, sy = oy + (map.h - 1 - y) * cs;
      if (edgeAt(map, x, y, 0) !== '0') { ctx.moveTo(sx, sy); ctx.lineTo(sx + cs, sy); }
      if (edgeAt(map, x, y, 2) !== '0') { ctx.moveTo(sx, sy + cs); ctx.lineTo(sx + cs, sy + cs); }
      if (edgeAt(map, x, y, 3) !== '0') { ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + cs); }
      if (edgeAt(map, x, y, 1) !== '0') { ctx.moveTo(sx + cs, sy); ctx.lineTo(sx + cs, sy + cs); }
    }
    ctx.stroke();
    // party arrow
    const axc = ox + game.pos.x * cs + cs / 2, ayc = oy + (map.h - 1 - game.pos.y) * cs + cs / 2;
    ctx.strokeStyle = '#ffd96b';
    ctx.beginPath();
    const f = game.pos.facing;
    const vx = [0, 1, 0, -1][f], vy = [-1, 0, 1, 0][f]; // screen-space (y down)
    ctx.moveTo(axc - vx * cs * 0.3, ayc - vy * cs * 0.3);
    ctx.lineTo(axc + vx * cs * 0.35, ayc + vy * cs * 0.35);
    ctx.moveTo(axc + vx * cs * 0.35, ayc + vy * cs * 0.35);
    ctx.lineTo(axc + vy * cs * 0.2, ayc - vx * cs * 0.2);
    ctx.stroke();
    ctx.restore();
  }
}

function kindKeeper(kind) {
  return {
    hall: 'knight', greta: 'humanoid', review: 'sorcerer', temple: 'sorcerer',
    spark: 'hag', goose: 'brute', hart: 'brute', tannery: 'zombie',
    belltower: 'maldrec', empty: 'humanoid'
  }[kind] || 'humanoid';
}

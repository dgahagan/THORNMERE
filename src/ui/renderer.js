// The solid bitmap viewport: single-point perspective over a 320x240 indexed
// framebuffer, textured walls drawn far-to-near for exact occlusion, palette
// distance shading with Bayer dithering — the 1985 Amiga look.
//
// Same interface the game loop has always used:
//   draw(game) · combatPortrait(game, def) · interior(name, id) ·
//   splash(title, sub) — plus scene helpers for the portrait window.

import { DX, DY, edgeState, cellSpecial, edgeAt } from '../core/maze.js';
import { currentMap, mapStateFor, isNight, DAY_LEN, NIGHT_AT } from '../core/gamestate.js';
import { lightRadius } from '../core/effects.js';
import { ART, sprite, areaStyle, resolveVariant, frameAt } from './art.js';
import { Fb, FBW, FBH } from './fb.js';

const W = FBW, H = FBH;
const CX = W / 2, CY = H / 2;
const K = 92;                                 // focal constant
const DEPTHS = [0.45, 1.45, 2.45, 3.45, 4.45]; // far-edge plane of cell k
const NEAR = 0.16;

const C = {                                   // palette indices for chrome
  black: 0, frame: 3, frameLit: 5, gold: 29, candle: 30,
  bone: 6, chalk: 7, text: 13, dim: 4
};

function planeDist(k) { return k < 0 ? NEAR : DEPTHS[k]; }
function py(d, tb) { const hh = K / d; return tb === 't' ? CY - hh : CY + hh; }
function px(u, d) { return CX + (u * 2 * K) / d; }

// distance -> fractional shade level (dithered between integer ramp steps)
function shadeLevel(d, boost) {
  return Math.max(0, Math.min(4, (d - 1.0) * 0.85 + boost));
}

export class Renderer {
  constructor(canvas) {
    this.fb = new Fb(canvas);
    this.now = 0;          // animation clock (ms), set by the UI loop
  }

  // ---- main exploration view ----------------------------------------------
  draw(game) {
    const fb = this.fb;
    const map = currentMap(game);
    const style = areaStyle(map.id);
    const radius = lightRadius(game);

    if (radius < 0) {                          // magical darkness: one step only
      fb.clear(0);
      this.walls(game, map, style, 0, 3.2);
      fb.textCentered('DARKNESS', CX, H - 24, C.dim);
      this.frame();
      fb.flush();
      return;
    }

    const noLight = map.kind === 'dungeon' && radius === 0;
    const maxDepth = noLight ? 1 : Math.min(3, Math.max(1, radius));
    const boost = map.kind === 'town'
      ? (isNight(game) ? 0.8 : 0)
      : Math.max(0, 2.0 - radius * 0.65);

    this.backdrop(game, map, style, maxDepth, boost);
    this.walls(game, map, style, maxDepth, boost);
    this.frame();
    if (game.debugMap) this.automap(game);
    fb.flush();
  }

  frame() {
    const fb = this.fb;
    fb.rect(0, 0, W, H, C.frame);
    fb.rect(1, 1, W - 2, H - 2, C.black);
  }

  // ---- floor / ceiling / sky ------------------------------------------------
  backdrop(game, map, style, maxDepth, boost) {
    const fb = this.fb;
    const dMax = DEPTHS[maxDepth];
    const town = map.kind === 'town';

    // ceiling (or sky)
    for (let y = 0; y < CY; y++) {
      const d = K / (CY - y);                  // plane distance for this row
      if (town) { this.skyRow(game, y, style); continue; }
      const ceil = style.ceil;
      if (d > dMax + 1) { fb.fillRect(0, y, W, 1, 0); continue; }
      const t = Math.min(1, d / dMax);
      const lvl = shadeLevel(d, boost);
      const row = y * W;
      for (let x = 0; x < W; x++) {
        fb.px[row + x] = fb.shaded(fb.mix(ceil.near, ceil.far, t, x, y), lvl, x, y);
      }
    }
    // floor
    const floor = style.floor;
    for (let y = CY; y < H; y++) {
      let d = K / Math.max(1, y - CY);
      const row = y * W;
      if (!town && d > dMax + 1) { fb.fillRect(0, y, W, 1, 0); continue; }
      if (town) d = Math.min(d, dMax);         // streets haze out, never go black
      const t = Math.min(1, d / Math.max(dMax, 3));
      const lvl = town ? Math.min(shadeLevel(d, boost), 1.0 + boost) : shadeLevel(d, boost);
      for (let x = 0; x < W; x++) {
        let base = fb.mix(floor.near, floor.far, t, x, y);
        // wet sheen / bone flecks, scattered deterministically
        if (floor.sheen != null && (y % 5 === 2) && ((x * 29 + y * 53) % 23) < 3) base = floor.sheen;
        if (floor.fleck != null && ((x * 37 + y * 71) % 311) === 0) base = floor.fleck;
        fb.px[row + x] = fb.shaded(base, lvl, x, y);
      }
    }
  }

  skyRow(game, y, style) {
    const fb = this.fb;
    const phase = game.clock % DAY_LEN;
    const dusk = !isNight(game) && phase > NIGHT_AT - 30;
    const sky = style.sky[isNight(game) ? 'night' : dusk ? 'dusk' : 'day'];
    const t = Math.min(1, ((CY - y) / CY) * 1.6); // 1 at top, 0 at horizon
    const row = y * W;
    for (let x = 0; x < W; x++) {
      let c = fb.mix(sky.horizon, sky.top, t, x, y);
      if (sky.stars != null && ((x * 97 + y * 61 + (x >> 3) * 13) % 331) === 7) c = sky.stars;
      fb.px[row + x] = c;
    }
  }

  // ---- the maze -------------------------------------------------------------
  walls(game, map, style, maxDepth, boost) {
    const f = game.pos.facing;
    const rf = (f + 1) % 4;
    const cellAt = (k, o) => ({
      x: game.pos.x + DX[f] * k + DX[rf] * o,
      y: game.pos.y + DY[f] * k + DY[rf] * o
    });
    // how the edge of cell (k,o) in relative dir renders: null = open
    const edgeTex = (k, o, rel) => {
      const c = cellAt(k, o);
      const dir = (f + rel) % 4;
      const st = edgeState(game, map, c.x, c.y, dir);
      const beyond = cellSpecial(map, c.x + DX[dir], c.y + DY[dir]);
      const bld = beyond?.t === 'building';
      if (st === 'open') return null;
      if (bld) {
        if (st === 'door') {
          return { tex: beyond.id.startsWith('empty') ? style.boards : style.door, sign: beyond };
        }
        return { tex: style.facade || style.wall };
      }
      if (st === 'door') return { tex: style.door };
      if (st === 'riddle') return { tex: style.riddleDoor };
      return { tex: style.wall };
    };

    for (let k = maxDepth; k >= 0; k--) {
      const dFar = planeDist(k);
      const dNear = planeDist(k - 1);
      const lvlFar = shadeLevel(dFar, boost);

      // side columns
      for (const o of [-1, 1]) {
        if (edgeTex(k, 0, o === -1 ? 3 : 1)) continue;     // can't see in
        const outer = edgeTex(k, o, o === -1 ? 3 : 1);
        if (outer) this.sideWall(o === -1 ? -1.5 : 1.5, dNear, dFar, outer.tex, boost);
        const sideFront = edgeTex(k, o, 0);
        if (sideFront) this.frontWall(o - 0.5, o + 0.5, dFar, sideFront, lvlFar);
      }

      // center column side walls
      const left = edgeTex(k, 0, 3);
      const right = edgeTex(k, 0, 1);
      if (left) this.sideWall(-0.5, dNear, dFar, left.tex, boost);
      if (right) this.sideWall(0.5, dNear, dFar, right.tex, boost);

      // center front wall
      const front = edgeTex(k, 0, 0);
      if (front) this.frontWall(-0.5, 0.5, dFar, front, lvlFar);

      // furniture sprite in the center cell at this depth
      const c = cellAt(k, 0);
      const sp = cellSpecial(map, c.x, c.y);
      if (sp && k > 0) this.furniture(game, sp, dNear, dFar, boost);
    }
  }

  // wall facing the party at depth d, spanning lateral uL..uR
  frontWall(uL, uR, d, edge, lvl) {
    const fb = this.fb;
    const tex = sprite(edge.tex);
    const x1 = Math.round(px(uL, d)), x2 = Math.round(px(uR, d));
    const t = Math.round(py(d, 't')), b = Math.round(py(d, 'b'));
    const cells = Math.max(1, Math.round(uR - uL));
    const xs = Math.max(1, x1), xe = Math.min(W - 1, x2);
    const ys = Math.max(1, t), ye = Math.min(H - 1, b);
    for (let x = xs; x < xe; x++) {
      const tu = (((x - x1) * tex.w * cells / (x2 - x1)) | 0) % tex.w;
      for (let y = ys; y < ye; y++) {
        const tv = Math.min(tex.h - 1, ((y - t) * tex.h / (b - t)) | 0);
        const v = tex.data[tv * tex.w + tu];
        if (v >= 0) fb.px[y * W + x] = fb.shaded(v, lvl, x, y);
      }
    }
    if (edge.sign) this.signboard(edge.sign, x1, x2, t, b, d);
  }

  // wall parallel to the view at lateral u, spanning depths dNear..dFar
  sideWall(u, dNear, dFar, texName, boost) {
    const fb = this.fb;
    const tex = sprite(texName);
    const xn = Math.round(px(u, dNear)), xf = Math.round(px(u, dFar));
    const step = xn < xf ? 1 : -1;
    for (let x = xn; x !== xf; x += step) {
      if (x < 1 || x >= W - 1) continue;
      let d = (u * 2 * K) / (x - CX);
      if (!Number.isFinite(d)) continue;
      d = Math.max(dNear, Math.min(dFar, d));
      const t = Math.round(py(d, 't')), b = Math.round(py(d, 'b'));
      const tu = Math.min(tex.w - 1, (((d - dNear) / (dFar - dNear)) * tex.w) | 0);
      const lvl = shadeLevel(d, boost);
      const ys = Math.max(1, t), ye = Math.min(H - 1, b);
      for (let y = ys; y < ye; y++) {
        const tv = Math.min(tex.h - 1, (((y - t) * tex.h) / (b - t)) | 0);
        const v = tex.data[tv * tex.w + tu];
        if (v >= 0) fb.px[y * W + x] = fb.shaded(v, lvl, x, y);
      }
    }
  }

  // signboard hung over a building's door, scaled with distance
  signboard(cell, x1, x2, t, b, d) {
    const name = 'sign_' + cell.id.replace(/\d+$/, '');
    const sp = ART.sprites[name] || ART.sprites.sign_generic;
    if (!sp) return;
    const wallW = x2 - x1, wallH = b - t;
    const dw = Math.min(sp.w * 6, Math.max(8, Math.round(wallW * 0.5)));
    const dh = Math.round(dw * sp.h / sp.w);
    this.fb.blit(sp, x1 + ((wallW - dw) >> 1), t + Math.round(wallH * 0.12), dw, dh,
      { shade: shadeLevel(d, 0) });
  }

  // floor furniture (stairs, chests, mouths, seals, gates, waiting horrors)
  furniture(game, sp, dNear, dFar, boost) {
    const ms = mapStateFor(game, currentMap(game).id);
    const kind = sp.t;
    if (['spinner', 'teleport', 'trap', 'building'].includes(kind)) return;
    if ((kind === 'treasure' || kind === 'encounter') && ms.once[sp.id]) return;
    const name = {
      stairs: sp.dir === 'down' ? 'fx_stairs_down' : 'fx_stairs_up',
      mouth: 'fx_mouth', treasure: 'fx_chest', encounter: 'fx_danger',
      seal: 'fx_seal', gate: 'fx_gate'
    }[kind];
    const art = name && ART.sprites[name];
    if (!art) return;
    const d = (dNear + dFar) / 2;
    const s = (2 * K) / d;                     // pixels per cell-unit
    const dw = Math.round(s * (kind === 'gate' ? 0.9 : 0.5));
    const dh = Math.round(dw * art.h / art.w);
    const cx = Math.round(px(0, d));
    const floor = Math.round(py(d, 'b'));
    this.fb.blit(art, cx - (dw >> 1), floor - dh - Math.round(s * 0.02), dw, dh,
      { shade: shadeLevel(d, boost) });
  }

  // ---- portrait window scenes ------------------------------------------------
  // carved panel + art box; used by combat, buildings, specials, splash
  panel(title) {
    const fb = this.fb;
    fb.clear(1);
    // dithered backdrop
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (((x + y * 2) % 7) === 0) fb.px[y * W + x] = 2;
      }
    }
    this.frame();
    if (title) fb.textCentered(title, CX, 10, C.gold);
  }

  artBox(drawable, label, sub) {
    const fb = this.fb;
    const fr = frameAt(drawable, this.now);
    const sp = fr && ART.sprites[fr.name];
    const scale = sp ? Math.max(1, Math.floor(140 / Math.max(sp.w, sp.h))) : 1;
    const dw = sp ? sp.w * scale : 96, dh = sp ? sp.h * scale : 96;
    const bw = Math.max(dw + 16, 120), bh = Math.max(dh + 16, 120);
    const bx = CX - (bw >> 1), by = CY - (bh >> 1) - 12;
    fb.fillRect(bx - 3, by - 3, bw + 6, bh + 6, C.frameLit);
    fb.fillRect(bx - 2, by - 2, bw + 4, bh + 4, 2);
    fb.fillRect(bx, by, bw, bh, 0);
    if (sp) {
      const remap = fr.remap ? Object.fromEntries(Object.entries(fr.remap).map(([a, b]) => [+a, +b])) : null;
      fb.blit(sp, bx + ((bw - dw) >> 1), by + ((bh - dh) >> 1), dw, dh, { remap });
    } else {
      fb.textCentered('?', CX, by + (bh >> 1) - 4, C.dim, 2);
    }
    if (label) fb.textCentered(label, CX, by + bh + 10, C.text);
    if (sub) fb.textCentered(sub, CX, by + bh + 22, C.dim);
  }

  combatPortrait(game, monsterDef) {
    this.panel('BATTLE');
    const drawable = resolveVariant(monsterDef.id) || resolveVariant('mon_' + monsterDef.portrait);
    this.artBox(drawable, monsterDef.name.toUpperCase());
    this.fb.flush();
  }

  interior(name, id) {
    this.panel(null);
    const drawable = resolveVariant('int_' + id) || resolveVariant('per_' + id);
    this.artBox(drawable, name.toUpperCase());
    this.fb.flush();
  }

  // small scene for specials: mouths, stairs, statues, the verses…
  special(kind, label) {
    this.panel(null);
    this.artBox(resolveVariant(kind), label);
    this.fb.flush();
  }

  splash(title, sub) {
    const fb = this.fb;
    fb.clear(0);
    // starfield night-sky flourish
    for (let i = 0; i < 90; i++) {
      const x = (i * 97 + 31) % W, y = (i * 61 + 7) % H;
      fb.pset(x, y, (i % 5 === 0) ? C.bone : 2);
    }
    fb.rect(6, 6, W - 12, H - 12, C.gold);
    fb.rect(8, 8, W - 16, H - 16, C.frame);
    const big = ART.sprites.scene_title;
    if (big && /THORNMERE/i.test(title)) {
      fb.blit(big, CX - big.w, CY - big.h - 18, big.w * 2, big.h * 2);
      fb.textCentered(title, CX, CY + 30, C.gold, 2);
    } else {
      fb.textCentered(title, CX, CY - 24, C.gold, 2);
    }
    if (sub) fb.textCentered(sub, CX, CY + 52, C.text);
    fb.flush();
  }

  victory() {
    this.panel('THE FOUNDING SONG');
    this.artBox(resolveVariant('scene_victory'), 'THORNMERE IS WHOLE');
    this.fb.flush();
  }

  // ---- debug automap ----------------------------------------------------------
  automap(game) {
    const fb = this.fb;
    const map = currentMap(game);
    const cs = Math.max(2, Math.floor(Math.min(150 / map.w, 150 / map.h)));
    const ox = W - map.w * cs - 10, oy = 10;
    fb.fillRect(ox - 4, oy - 4, map.w * cs + 8, map.h * cs + 8, 1);
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const sx = ox + x * cs, sy = oy + (map.h - 1 - y) * cs;
      if (edgeAt(map, x, y, 0) !== '0') fb.fillRect(sx, sy, cs + 1, 1, C.dim);
      if (edgeAt(map, x, y, 2) !== '0') fb.fillRect(sx, sy + cs, cs + 1, 1, C.dim);
      if (edgeAt(map, x, y, 3) !== '0') fb.fillRect(sx, sy, 1, cs + 1, C.dim);
      if (edgeAt(map, x, y, 1) !== '0') fb.fillRect(sx + cs, sy, 1, cs + 1, C.dim);
    }
    const axc = ox + game.pos.x * cs + (cs >> 1), ayc = oy + (map.h - 1 - game.pos.y) * cs + (cs >> 1);
    const f = game.pos.facing;
    const vx = [0, 1, 0, -1][f], vy = [-1, 0, 1, 0][f];
    fb.line(axc - vx * cs * 0.3, ayc - vy * cs * 0.3, axc + vx * cs * 0.4, ayc + vy * cs * 0.4, C.gold);
    fb.pset(axc + vx, ayc + vy, C.candle);
  }
}

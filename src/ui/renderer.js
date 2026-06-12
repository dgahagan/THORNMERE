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
        let base;
        if (town) {
          // perspective cobblestone street: running-bond grid in world space,
          // dark mortar at the seams, a few stone shades per cobble
          const wu = (x - CX) * d / (2 * K);
          const rowF = d * 2.6, rowI = Math.floor(rowF);
          const colF = wu * 4.0 + (rowI & 1 ? 0.5 : 0);
          const su = ((colF % 1) + 1) % 1, sv = ((rowF % 1) + 1) % 1;
          if (su < 0.11 || sv < 0.13) base = 3;          // mortar (slate-dark)
          else {
            const h = ((Math.floor(colF) * 73856093) ^ (rowI * 19349663)) >>> 0;
            base = [4, 5, 4, 10][h & 3];                 // slate / stone / slate / warm cobble
          }
        } else {
          base = fb.mix(floor.near, floor.far, t, x, y);
          // wet sheen / bone flecks, scattered deterministically
          if (floor.sheen != null && (y % 5 === 2) && ((x * 29 + y * 53) % 23) < 3) base = floor.sheen;
          if (floor.fleck != null && ((x * 37 + y * 71) % 311) === 0) base = floor.fleck;
        }
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
    const day = sky.stars == null;               // night uses stars instead of clouds
    for (let x = 0; x < W; x++) {
      let c = fb.mix(sky.horizon, sky.top, t, x, y);
      if (day) {
        // soft drifting clouds: low-frequency value noise banded at two altitudes
        const f = Math.sin(x * 0.055 + y * 0.5) * 0.5 + Math.sin(x * 0.021 + 4.2) * 0.5
                + Math.sin(x * 0.11 - y * 0.2) * 0.3;
        const w = Math.max(0, 1 - Math.abs(y - 28) / 8) + 0.85 * Math.max(0, 1 - Math.abs(y - 50) / 6);
        const cloud = (f + 0.45) * w;
        if (cloud > 0.62) c = 7;                 // bright cloud core (chalk)
        else if (cloud > 0.34) c = 6;            // cloud body (bone)
        else if (cloud > 0.16 && ((x + y) & 1)) c = 23; // dithered wispy edge (mist-blue)
      } else if (sky.stars != null && ((x * 97 + y * 61 + (x >> 3) * 13) % 331) === 7) {
        c = sky.stars;
      }
      fb.px[row + x] = c;
    }
  }

  // ---- the maze -------------------------------------------------------------
  walls(game, map, style, maxDepth, boost) {
    const f = game.pos.facing;
    const rf = (f + 1) % 4;
    const town = map.kind === 'town';
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
          return { tex: beyond.id.startsWith('empty') ? style.boards : style.door, sign: beyond, roof: town };
        }
        return { tex: style.facade || style.wall, roof: town };
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
        if (outer) this.sideWall(o === -1 ? -1.5 : 1.5, dNear, dFar, outer.tex, boost, outer.roof);
        const sideFront = edgeTex(k, o, 0);
        if (sideFront) this.frontWall(o - 0.5, o + 0.5, dFar, sideFront, lvlFar);
      }

      // center column side walls
      const left = edgeTex(k, 0, 3);
      const right = edgeTex(k, 0, 1);
      if (left) this.sideWall(-0.5, dNear, dFar, left.tex, boost, left.roof);
      if (right) this.sideWall(0.5, dNear, dFar, right.tex, boost, right.roof);

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
    // gable roof: a slate triangle peaking over the facing wall
    if (edge.roof && t > 1) {
      const xc = (x1 + x2) / 2, span = Math.max(1, (x2 - x1) / 2);
      const roofH = Math.max(3, Math.round((b - t) * 0.30));
      const ov = Math.max(1, Math.round((x2 - x1) * 0.06));   // eave overhang
      const xa = Math.max(1, x1 - ov), xb = Math.min(W - 1, x2 + ov), yb = Math.min(H - 1, t);
      for (let x = xa; x < xb; x++) {
        const frac = 1 - Math.min(1, Math.abs(x - xc) / (span + ov));
        const yTop = Math.round(t - roofH * frac);
        for (let y = Math.max(1, yTop); y < yb; y++) {
          const rc = y < yTop + 2 ? 5 : (((x + y) & 3) === 0 ? 4 : 3); // ridge / fleck / slate
          fb.px[y * W + x] = fb.shaded(rc, lvl, x, y);
        }
      }
    }
    if (edge.sign) this.signboard(edge.sign, x1, x2, t, b, d);
  }

  // wall parallel to the view at lateral u, spanning depths dNear..dFar
  sideWall(u, dNear, dFar, texName, boost, roof) {
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
      // slate cornice/roofline above the eave (tapers with depth)
      if (roof && t > 1) {
        const yTop = Math.max(1, t - Math.max(2, Math.round((b - t) * 0.26)));
        for (let y = yTop; y < t; y++) {
          const rc = y < yTop + 2 ? 5 : (((x + y) & 3) === 0 ? 4 : 3);
          fb.px[y * W + x] = fb.shaded(rc, lvl, x, y);
        }
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

  artBox(drawable, label, sub, cap = 192) {
    const fb = this.fb;
    const fr = frameAt(drawable, this.now);
    const sp = fr && ART.sprites[fr.name];
    const scale = sp ? Math.max(1, Math.floor(cap / Math.max(sp.w, sp.h))) : 1;
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
    // Monsters crush to 112×93; cap 224 keeps the 2× display (112→224px), matching interiors.
    this.artBox(drawable, monsterDef.name.toUpperCase(), null, 224);
    this.fb.flush();
  }

  interior(name, id) {
    this.panel(null);
    const drawable = resolveVariant('int_' + id) || resolveVariant('per_' + id);
    // Interiors crush to 112×80 (≈ original BT art window); cap 224 keeps the
    // 2× display crisp (112→224px) instead of dropping to 1× under the 192 cap.
    this.artBox(drawable, name.toUpperCase(), null, 224);
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

  // ---- player automap (Remastered) ------------------------------------------
  parchmentMap(game, am, fullscreen) {
    if (!fullscreen) return this.miniMap(game, am);
    const fb = this.fb;
    const map = currentMap(game);
    const CS = Math.max(3, Math.floor(Math.min((W - 44) / map.w, (H - 50) / map.h)));
    const mapW = map.w * CS, mapH = map.h * CS;
    const ox = ((W - mapW) >> 1);
    const oy = ((H - mapH) >> 1) + 8;
    fb.fillRect(0, 0, W, H, C.bone);
    fb.textCentered(map.name || 'MAP', W >> 1, 3, C.gold);
    if (am && !am.synced) fb.textCentered('~ DESYNC ~', W >> 1, H - 10, C.dim);
    const visited = new Set(am ? am.visited : []);
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        if (!visited.has(x + ',' + y)) continue;
        const sx = ox + x * CS, sy = oy + (map.h - 1 - y) * CS;
        fb.fillRect(sx, sy, CS, CS, C.chalk);
        if (edgeAt(map, x, y, 0) !== '0') fb.fillRect(sx, sy, CS + 1, 1, C.dim);
        if (edgeAt(map, x, y, 2) !== '0') fb.fillRect(sx, sy + CS, CS + 1, 1, C.dim);
        if (edgeAt(map, x, y, 3) !== '0') fb.fillRect(sx, sy, 1, CS + 1, C.dim);
        if (edgeAt(map, x, y, 1) !== '0') fb.fillRect(sx + CS, sy, 1, CS + 1, C.dim);
      }
    }
    const cursor = am?.cursor || { x: game.pos.x, y: game.pos.y, facing: game.pos.facing };
    const col = (am && !am.synced) ? C.candle : C.gold;
    this._mapArrow(ox + cursor.x * CS + (CS >> 1),
                   oy + (map.h - 1 - cursor.y) * CS + (CS >> 1),
                   cursor.facing, col, Math.max(3, CS >> 1));
    fb.flush();
  }

  // Compact, see-through, party-centred local map for the corner overlay.
  // Shows only an 8x8 window of discovered cells that scrolls with the party,
  // drawn as a small solid "parchment scrap" so it reads cleanly on any scene
  // (the indexed framebuffer has no alpha, so true transparency isn't viable).
  miniMap(game, am) {
    const fb = this.fb;
    const map = currentMap(game);
    const cursor = am?.cursor || { x: game.pos.x, y: game.pos.y, facing: game.pos.facing };
    const VIEW = 8, CS = 11, half = VIEW >> 1, span = VIEW * CS;
    const ox = W - span - 6, oy = 6;
    fb.fillRect(ox - 3, oy - 3, span + 6, span + 6, C.black);   // thin dark edge
    fb.fillRect(ox - 2, oy - 2, span + 4, span + 4, C.bone);    // parchment ground
    const x0 = cursor.x - half, y0 = cursor.y - half;   // bottom-left map cell of the window
    const visited = am ? new Set(am.visited) : new Set();
    for (let wy = 0; wy < VIEW; wy++) {
      for (let wx = 0; wx < VIEW; wx++) {
        const mx = x0 + wx, my = y0 + wy;
        if (mx < 0 || my < 0 || mx >= map.w || my >= map.h) continue;
        if (!visited.has(mx + ',' + my)) continue;
        const sx = ox + wx * CS, sy = oy + (VIEW - 1 - wy) * CS;  // map y grows up; invert for screen
        fb.fillRect(sx, sy, CS, CS, C.chalk);                    // explored floor
        if (edgeAt(map, mx, my, 0) !== '0') fb.fillRect(sx, sy, CS + 1, 1, C.dim);
        if (edgeAt(map, mx, my, 2) !== '0') fb.fillRect(sx, sy + CS, CS + 1, 1, C.dim);
        if (edgeAt(map, mx, my, 3) !== '0') fb.fillRect(sx, sy, 1, CS + 1, C.dim);
        if (edgeAt(map, mx, my, 1) !== '0') fb.fillRect(sx + CS, sy, 1, CS + 1, C.dim);
      }
    }
    const col = (am && !am.synced) ? C.candle : C.gold;
    this._mapArrow(ox + half * CS + (CS >> 1), oy + (VIEW - 1 - half) * CS + (CS >> 1),
                   cursor.facing, col, 4);
    fb.flush();
  }

  // Small filled facing-arrow (triangle) centred on (cx,cy), pointing the way
  // the party faces, with a dark outline so it reads on any background.
  // facing: 0=N 1=E 2=S 3=W.
  _mapArrow(cx, cy, facing, col, r) {
    const fb = this.fb;
    const vx = [0, 1, 0, -1][facing], vy = [-1, 0, 1, 0][facing];
    const px = -vy, py = vx;                            // perpendicular -> arrowhead width
    const tri = (rr, color) => {
      const ax = cx + vx * rr,          ay = cy + vy * rr;            // tip
      const bx = cx - vx * rr + px * rr, by = cy - vy * rr + py * rr; // back-left
      const dx = cx - vx * rr - px * rr, dy = cy - vy * rr - py * rr; // back-right
      const minx = Math.min(ax, bx, dx) | 0, maxx = Math.max(ax, bx, dx) | 0;
      const miny = Math.min(ay, by, dy) | 0, maxy = Math.max(ay, by, dy) | 0;
      const edge = (x, y, x0, y0, x1, y1) => (x - x0) * (y1 - y0) - (y - y0) * (x1 - x0);
      for (let y = miny; y <= maxy; y++) {
        for (let x = minx; x <= maxx; x++) {
          const e1 = edge(x + 0.5, y + 0.5, ax, ay, bx, by);
          const e2 = edge(x + 0.5, y + 0.5, bx, by, dx, dy);
          const e3 = edge(x + 0.5, y + 0.5, dx, dy, ax, ay);
          if ((e1 >= 0 && e2 >= 0 && e3 >= 0) || (e1 <= 0 && e2 <= 0 && e3 <= 0))
            fb.pset(x, y, color);
        }
      }
    };
    tri(r + 1, C.black);   // outline
    tri(r, col);           // body
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

// Indexed-color software framebuffer, 320x240, flushed to the canvas once per
// frame and scaled up by CSS with nearest-neighbor. Every drawing op writes
// palette indices; flush() converts through the palette LUT.

import { ART } from './art.js';

export const FBW = 320, FBH = 240;

// 4x4 Bayer matrix as thresholds in [0,1) — the period ordered dither.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
].map(r => r.map(v => v / 16));
export const bayer = (x, y) => BAYER[y & 3][x & 3];

export class Fb {
  constructor(canvas) {
    canvas.width = FBW; canvas.height = FBH;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.img = this.ctx.createImageData(FBW, FBH);
    this.u32 = new Uint32Array(this.img.data.buffer);
    this.px = new Uint8Array(FBW * FBH);
    // palette LUT (RGBA little-endian) and shade tables
    this.lut = new Uint32Array(ART.rgb.length);
    ART.rgb.forEach(([r, g, b], i) => { this.lut[i] = (255 << 24) | (b << 16) | (g << 8) | r; });
    const n = ART.rgb.length;
    this.shadeTab = [Uint8Array.from({ length: n }, (_, i) => i)];
    for (let lvl = 1; lvl <= 4; lvl++) {
      const prev = this.shadeTab[lvl - 1], cur = new Uint8Array(n);
      for (let i = 0; i < n; i++) cur[i] = ART.palette.shade[prev[i]];
      this.shadeTab.push(cur);
    }
  }

  clear(idx = 0) { this.px.fill(idx); }

  pset(x, y, idx) {
    if (x < 0 || y < 0 || x >= FBW || y >= FBH) return;
    this.px[y * FBW + x] = idx;
  }

  fillRect(x, y, w, h, idx) {
    const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0);
    const x1 = Math.min(FBW, (x + w) | 0), y1 = Math.min(FBH, (y + h) | 0);
    for (let yy = y0; yy < y1; yy++) this.px.fill(idx, yy * FBW + x0, yy * FBW + x1);
  }

  rect(x, y, w, h, idx) {
    this.fillRect(x, y, w, 1, idx); this.fillRect(x, y + h - 1, w, 1, idx);
    this.fillRect(x, y, 1, h, idx); this.fillRect(x + w - 1, y, 1, h, idx);
  }

  // shade a color index by a fractional level with ordered dithering
  shaded(idx, level, x, y) {
    if (level <= 0) return idx;
    const l0 = Math.min(4, level | 0);
    const frac = level - l0;
    const lvl = (frac > bayer(x, y) && l0 < 4) ? l0 + 1 : l0;
    return this.shadeTab[lvl][idx];
  }

  // dithered mix of two palette indices; t in [0,1] picks b over a
  mix(a, b, t, x, y) { return t > bayer(x, y) ? b : a; }

  // Blit a sprite scaled to (dw x dh) at (dx,dy). opts: remap {from:to},
  // shade level (fractional, dithered), flip horizontal.
  blit(sp, dx, dy, dw = sp.w, dh = sp.h, opts = {}) {
    const { remap = null, shade = 0, flip = false } = opts;
    dx |= 0; dy |= 0; dw |= 0; dh |= 0;
    if (dw <= 0 || dh <= 0) return;
    const x0 = Math.max(0, dx), y0 = Math.max(0, dy);
    const x1 = Math.min(FBW, dx + dw), y1 = Math.min(FBH, dy + dh);
    for (let y = y0; y < y1; y++) {
      const sy = Math.min(sp.h - 1, (((y - dy) * sp.h) / dh) | 0);
      const rowOff = sy * sp.w;
      for (let x = x0; x < x1; x++) {
        let sx = Math.min(sp.w - 1, (((x - dx) * sp.w) / dw) | 0);
        if (flip) sx = sp.w - 1 - sx;
        let v = sp.data[rowOff + sx];
        if (v < 0) continue;
        if (remap && remap[v] !== undefined) v = remap[v];
        this.px[y * FBW + x] = shade ? this.shaded(v, shade, x, y) : v;
      }
    }
  }

  // 5x7 bitmap text. scale: integer. Returns pixel width drawn.
  text(str, x, y, idx, scale = 1) {
    const f = ART.font;
    const adv = (f.w + 1) * scale;
    let cx = x | 0;
    for (const ch of String(str).toUpperCase()) {
      const g = f.glyphs[ch];
      if (g) {
        for (let gy = 0; gy < f.h; gy++) {
          for (let gx = 0; gx < f.w; gx++) {
            if (g[gy][gx] === '#') {
              if (scale === 1) this.pset(cx + gx, y + gy, idx);
              else this.fillRect(cx + gx * scale, y + gy * scale, scale, scale, idx);
            }
          }
        }
      }
      cx += adv;
    }
    return cx - x;
  }

  textWidth(str, scale = 1) { return String(str).length * (ART.font.w + 1) * scale; }

  textCentered(str, cx, y, idx, scale = 1) {
    this.text(str, cx - this.textWidth(str, scale) / 2, y, idx, scale);
  }

  line(x0, y0, x1, y1, idx) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.pset(x0, y0, idx);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  flush() {
    const { px, u32, lut } = this;
    for (let i = 0; i < px.length; i++) u32[i] = lut[px[i]];
    this.ctx.putImageData(this.img, 0, 0);
  }
}

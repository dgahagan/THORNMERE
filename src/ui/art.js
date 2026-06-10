// Art registry: loads the palette, bitmap font, per-area styles and every
// sprite document under data/art/, decoding text-grid pixel maps into typed
// arrays. All UI drawing goes through ART; game logic never touches it.

const SPRITE_DOCS = ['textures', 'ui', 'signs', 'monsters', 'monsters2', 'monsters3', 'people', 'scenes'];

export const ART = {
  palette: null,      // {colors:[{hex}], shade:[...]}
  rgb: [],            // palette as [r,g,b]
  font: null,         // {w,h,glyphs:{ch:rows}}
  styles: null,       // per-area styles
  sprites: {},        // name -> {w,h,data:Int16Array}
  anims: {},          // name -> {frames:[{sprite,ms}]}
  variants: {}        // name -> {base, remap:{from:to}, name?}
};

function decodeSprite(name, sp) {
  const data = new Int16Array(sp.w * sp.h);
  for (let y = 0; y < sp.h; y++) {
    const row = [...sp.rows[y]];
    for (let x = 0; x < sp.w; x++) {
      const v = sp.legend[row[x]];
      data[y * sp.w + x] = v === undefined ? -1 : v;
    }
  }
  return { w: sp.w, h: sp.h, data };
}

export async function loadArt(loader) {
  const [palette, font, styles] = await Promise.all(
    ['palette', 'font', 'styles'].map(n => loader(`data/art/${n}.json`)));
  ART.palette = palette;
  ART.rgb = palette.colors.map(c => {
    const h = c.hex.slice(1);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  });
  ART.font = font;
  ART.styles = styles;
  const docs = await Promise.all(SPRITE_DOCS.map(n =>
    loader(`data/art/${n}.json`).catch(() => null)));
  for (const doc of docs) {
    if (!doc) continue;
    for (const [name, sp] of Object.entries(doc.sprites || {})) ART.sprites[name] = decodeSprite(name, sp);
    for (const [name, an] of Object.entries(doc.anims || {})) ART.anims[name] = an;
    for (const [name, v] of Object.entries(doc.variants || {})) ART.variants[name] = v;
  }
  return ART;
}

export function sprite(name) {
  const sp = ART.sprites[name];
  if (!sp) throw new Error('no sprite ' + name);
  return sp;
}

// Area style for a map id ('undercroft2' -> styles.areas.undercroft).
export function areaStyle(mapId) {
  const key = Object.keys(ART.styles.areas).find(k => mapId.startsWith(k)) || 'town';
  return ART.styles.areas[key];
}

// Resolve a drawable for a monster/person id: variants give a base sprite (or
// anim) plus a palette remap. Falls back to the name itself.
export function resolveVariant(id) {
  const v = ART.variants[id];
  if (!v) {
    if (ART.anims[id]) return { anim: ART.anims[id], remap: null };
    if (ART.sprites[id]) return { spriteName: id, remap: null };
    return null;
  }
  const remap = v.remap || null;
  if (ART.anims[v.base]) return { anim: ART.anims[v.base], remap };
  if (ART.sprites[v.base]) return { spriteName: v.base, remap };
  return null;
}

// Draw a decoded sprite into any 2d canvas context (DOM chips, dev page).
export function drawSpriteToCtx(ctx, sp, scale = 1, remap = null) {
  for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) {
    let v = sp.data[y * sp.w + x];
    if (v < 0) continue;
    if (remap && remap[v] !== undefined) v = remap[v];
    ctx.fillStyle = ART.palette.colors[v].hex;
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }
}

// Pick the sprite for an anim at a given clock (ms); plain sprites pass through.
export function frameAt(drawable, ms) {
  if (!drawable) return null;
  if (drawable.spriteName) return { name: drawable.spriteName, remap: drawable.remap };
  const frames = drawable.anim.frames;
  const total = frames.reduce((a, f) => a + f.ms, 0);
  let t = ms % total;
  for (const f of frames) { if ((t -= f.ms) < 0) return { name: f.sprite, remap: drawable.remap }; }
  return { name: frames[0].sprite, remap: drawable.remap };
}

# Art Review Log — Thornmere HD Pass

Format: `sprite_name [SIZE] — PASS / FAIL: reason`

Inspection method: `node tools/artrender.js <name> N` → PNG read visually.
Quality bar: readable silhouette; interior detail (faces have eyes, armor has
plates, masonry has individual stones); 3+ shading levels per surface;
deliberate dithering; consistent UL lighting; outlines selective.

---

## Step 1 — infrastructure

- renderer.js artBox formula: 140→192 — PASS
- tools/artrender.js PNG export tool — PASS

---

## Dimension baseline (all existing art, inspected before any redraw)

Every sprite family is at old density. Blanket verdict by class:

| family | current | target | status |
|---|---|---|---|
| textures.json (11 sprites) | 16×16 | 32×32 | OLD — all fail quality bar |
| signs.json — signboards (9) | 18×14 | 36×28 | OLD |
| signs.json — interiors (9) | 56×40 | 96×72 | OLD |
| monsters.json set A (11 fam) | 32×32 | 96×80 | OLD |
| monsters3.json showpieces (4) | 48×48 | 96×80 | OLD |
| monsters2.json (9 fam) | MISSING | 96×80 | MISSING — 1 test red |
| people.json — pc chips (4) | 24×24 | 32×40 | OLD |
| people.json — icons (10) | 8×8 | 16×16 | OLD |
| scenes.json — title/victory | 140×56 / 100×72 | 160×64 / 160×120 | OLD |
| ui.json — fx sprites | 16×12–16 | 24×24 | OLD |

---

## Step 2 — wall / floor / ceiling textures (32×32)

Rendered at 6× via `node tools/artrender.js --sheet tex 6`.

- tex_town_wall [32×32] — PASS: grey running bond, 3 shade levels on brick faces (shadow/slate-dark/stone), mortar joints clear, alternating row offset readable
- tex_town_door [32×32] — PASS: vertical wood planks, warm brown 3-shade faces, horizontal iron banding at rows 10–11 and 21–22
- tex_under_wall [32×32] — PASS: warm brown dungeon stone, 6 clustered moss patches (2×2 to 3×3) placed mid-brick-cell, subtle darker centres
- tex_under_door [32×32] — PASS: 5 vertical iron bars + horizontal mid-rail, stone surround, fully dark interior, bar highlights on left edge
- tex_barrow_wall [32×32] — PASS: earth-brown irregular masonry, 5 bone fragments (bone/chalk), 3 mold patches (moss-deep), rough mortar lines
- tex_barrow_door [32×32] — PASS: stone arch + jambs over dark interior, bone-coloured keystone at crown, lit top-edge on each arch stone, threshold slab
- tex_needle_wall [32×32] — PASS: dark blue-slate running bond, 4 violet rune clusters (2×3 each) one per offset brick row
- tex_needle_door [32×32] — PASS: dark blue gate frame, 9 violet/mist sigil marks scattered over recessed abyss-blue interior, corner glow pixels
- tex_riddle_door [32×32] — PASS: stone surround, recessed panel, gold ? glyph (arc + stem + dot) legible at 6×, candle highlight on top arc
- tex_facade [32×32] — PASS: warm sandstone running bond, central 10×8 blue window with cross-pane divider, lintel and sill highlighted
- tex_boards [32×32] — PASS: horizontal planks at 4px period (hi/face/shadow), nail heads at 8-col intervals per plank row, 3 weathering patches

---

## Step 3 — town facades, signboards, interiors

<!-- verdicts logged as each sprite is drawn -->

---

## Step 4 — showpieces

<!-- verdicts logged as each sprite is drawn -->

---

## Step 5a — monster set A

<!-- verdicts logged as each family is drawn -->

---

## Step 5b — monster set B (monsters2.json)

<!-- verdicts logged as each family is drawn -->

---

## Step 6 — characters, icons, FX, scenes

<!-- verdicts logged as each sprite is drawn -->

# Backlog — deferred improvements

Items raised but intentionally deferred. Not lost — pick up when prioritized.

## ~~UI/gameplay polish pass~~ — DONE 2026-06-12

Period-interface pass (global, both modes): ornate thorn-vine DOM chrome +
carved buttons/plaque/panels (`data/art/chrome.json`, `style.css`), OFL period
fonts (`assets/fonts/`), bright-light view distance with horizon haze and a
smooth one-cell camera glide on step (`src/ui/renderer.js`, `src/ui/slide.js`).
Dungeon/darkness rendering verified pixel-identical; 27 original logic tests
untouched. Verdicts/screens in `art-review/art-review.md`.

## ~~Town first-person viewport polish~~ — DONE 2026-06-11

Implemented (`src/ui/renderer.js`): perspective cobblestone street, soft drifting
clouds in the day sky, and slate roofs (gable triangle on facing walls, tapering
cornice on side walls). Before/after: `art-review/town-viewport-beforeafter.png`.
Original request below for reference.

### (original request)

The procedurally-rendered first-person town view (the corridor walk, NOT the
interior scenes) needs visual work. This is **engine rendering** in
`src/ui/renderer.js` (the `draw(game)` viewport path) + `data/art/styles.json`
town colors — not the AI-art pipeline. Three asks:

1. **Ground** — the dithered grey floor reads flat; improve toward cobblestone /
   packed-earth street with better depth shading.
2. **Sky** — the blue→reddish horizon gradient could be richer (time-of-day is
   already in `styles.json` town.sky day/dusk/night).
3. **Roofs** — buildings currently rise as walls straight into the sky with **no
   roof**; needs roofline/rooftop geometry so the town reads as buildings, not
   bottomless walls.

Reference: the interior scenes (`int_*`, now AI at 112×80) are the populated
indoor views; this item is the *outdoor* viewport that frames them. Original BT
Amiga town shots in `dev/original-amiga-screenshots/` for reference.

Scope note: roofs likely need the most thought (the renderer draws wall faces by
depth band; a roof needs a top cap per building cell). Ground/sky are color +
dither tweaks. Suggest tackling sky+ground first (cheap), roofs as a follow-up.

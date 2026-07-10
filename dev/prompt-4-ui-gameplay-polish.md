# PROMPT 4 — UI & gameplay polish: period chrome, view distance, smooth step

**Model: Opus** (`/model opus`) for the whole run. Thrifty alternative: `/model sonnet`
for Phases 1–2 (CSS/chrome work), then switch to **Opus for Phases 3–4** — the renderer
depth extension and the movement interpolation are the two places that need stronger
reasoning about projection math and the frame loop.
**Run in a fresh session.**

Paste everything below this line.

---

The game is complete and playable through the Feelies phase. This is a **polish pass**
with three goals, all approved by Dan as **global changes — they apply to both
Remastered and Legacy alike, no new settings toggles**:

1. **Period UI chrome.** The DOM chrome (panels, buttons, fonts in `style.css`) looks
   modern — thin 1px CSS borders, flat buttons, Courier New. Restyle it toward an
   old-England/fantasy look in the **dark direction**: keep the current night/gold/
   parchment palette, but make every border ornate pixel art, every button look carved,
   and the typography medieval. Reference: `dev/original-amiga-screenshots/` — steal the
   *spirit* (ornate tiled frame, plaque labels, chunky period type), not the light/cream
   color scheme.
2. **Bright-light view distance.** The party currently sees ~2–3 tiles even outdoors at
   noon — it reads as fog, not daylight. Extend the renderer to **~6 tiles in bright
   light**, with the farthest planes dither-fading into haze. Dungeon torchlight and
   darkness zones keep their current short radii — claustrophobia underground is a
   feature.
3. **Smooth step.** Forward/backward movement currently teleports one tile per
   keypress — it feels like warping. Add a **short camera slide (~120–160ms)** so the
   party visibly glides into the next cell. Turning stays instant — that is correct
   and period-accurate.

## Ground rules

- **Start by re-reading the codebase.** Key files before touching anything:
  - `src/ui/renderer.js` — `K`, `DEPTHS`, `NEAR` constants near the top; the
    `maxDepth = Math.min(3, …)` clamp in the draw path; `walls()`; `shadeLevel()`;
    `splash()` (title screen, drawn into the framebuffer).
  - `src/ui/fb.js` — framebuffer + 5×7 bitmap text.
  - `src/ui/panels.js`, `style.css`, `index.html` — all DOM chrome.
  - `src/main.js` — `doStep()` (~line 442), `exploreMode.onKey()`, and the render loop
    (`setInterval(…, 130)` near the bottom).
- **The 27 original logic tests are sacrosanct.** Nothing here touches core logic:
  `step()`/`turn()` in `src/core/maze.js` must not change behavior. All three features
  are presentation-side. `npm test` green after every phase.
- **No npm deps, no build step.** Fonts ship as static `.woff2`/`.ttf` files loaded via
  `@font-face`; new art is text-grid JSON in the existing format.
- **All CLAUDE.md hard rules apply**, especially: commit per phase; judge new pixel art
  only from `tools/artrender.js` renders; log chrome-art verdicts (including FAILs with
  reasons) in `art-review/art-review.md` as you inspect them; incremental writes; loud
  failures.
- Work in phases, committing and keeping the game runnable after each.

## Phase 1 — Period typography

- Pick and bundle **OFL-licensed fonts** (download the TTFs, e.g. from the
  google/fonts GitHub repo via curl; commit the font files plus their OFL license files
  under something like `assets/fonts/`). If downloads fail, suspect the VPN, report it,
  and stop rather than substituting silently.
- **Display font** for the page title, panel `data-title` labels, plaque text, and
  button key-letters: a blackletter/medieval face (candidates: *Pirata One*,
  *UnifrakturMaguntia*, *MedievalSharp*). Blackletter is for headers ONLY — it is
  unreadable as body text; do not use it for the log, menu options, or roster.
- **Body text** (log, menus, status, hints): readability beats theme. An old-style
  serif (e.g. *IM Fell English*) is allowed **only if it stays legible at the actual
  rendered size** — screenshot and judge at 100% zoom before committing to it;
  otherwise keep a monospace and get the period feel from the chrome instead.
- **Roster and any tabular text keep strict column alignment.** The roster already uses
  CSS grid columns; verify nothing drifts when the font changes. If the body font is
  proportional, the roster may stay monospace — mixed is fine and period-accurate
  (the Amiga mixed faces too).
- Update `style.css` `font-family` stacks and sizes; check every screen state (title,
  guild, shop, combat, camp, automap) for overflow/clipping at the new metrics.

## Phase 2 — Ornate pixel chrome

All hand-pixeled in-session — **no FLUX round-trip for this phase**. Author each piece
as text-grid JSON in the existing `data/art/` format using only palette colors, render
with `tools/artrender.js`, judge the PNG, log the verdict, then wire it in.

- **Outer frame**: an ornate repeating border tile (knot-work / thorn-vine motif — this
  is Thornmere) with corner pieces, applied to `#game` via CSS `border-image` from a
  rendered PNG with `image-rendering: pixelated`. The Amiga screenshots show the
  effect to aim for; ours stays in the dark palette (umber/gold-dark/gold on night).
- **Panel borders**: replace the 1px slate `.panel` borders with a slimmer
  carved/beveled border-image variant; keep the gold `data-title` tabs but set them in
  the display font.
- **Viewport plaque**: move the `#loc` location line into a carved plaque centered
  under the viewport (like "The Guild" nameplate in the Amiga shots) — pixel-art plaque
  ends + repeating middle, display font, gold-on-umber.
- **Buttons** (`#cmdbar button`, `.nav` arrows): carved-wood/stone look — border-image
  bevel, leather/umber fill, gold key letter, pressed state shifts the bevel. No flat
  modern hover styles; hover = candle-glow text, not background swaps.
- **Title screen** (`splash()` in `renderer.js`, framebuffer-side): give the title
  lettering and border the same thorn-vine treatment so the first screen sets the
  theme. Hand-pixel; a FLUX title illustration is explicitly out of scope for this
  prompt (can be a later batch if Dan wants one).
- Keep a before/after screenshot pair per screen in `art-review/` and log verdicts as
  you go. A chrome pass with zero rejected tiles will not be believed.

## Phase 3 — Bright-light view distance (Opus from here)

- Extend `DEPTHS` from 5 to **7 planes** (continue the existing 1-tile spacing:
  `[0.45 … 6.45]`) and raise the hard clamp in the draw path from 3 to **6**.
- **Light radius still governs.** Bright light (outdoor daytime, well-lit town streets)
  → effective depth 6. Torch/spell radii in dungeons and the darkness-zone special
  case keep today's values — do not widen underground visibility. Audit how `radius`
  and the time-of-day boost flow into the clamp so only genuinely bright contexts
  benefit.
- **Haze fade**: extend `shadeLevel()` so the farthest ~2 visible planes dither toward
  the sky/horizon color outdoors and toward black underground. 32-color palette is
  law — distance fade is done with the existing Bayer dithering, never new colors.
- Walls at depth 5–6 are only a few pixels tall at 320×240 — guard against degenerate
  rects (zero/negative heights, off-by-one column widths) and make sure far planes
  don't shimmer or tear against the backdrop.
- Furniture/encounter sprites (stairs, chests, figures) drawn at the new depths need
  correct scaling and shading at those distances — check the sprite path, not just
  walls.
- Verify with screenshots: town at noon (deep view, haze at the far end), dungeon by
  torchlight (unchanged), darkness zone (unchanged). Compare against pre-change
  screenshots for the latter two — they must be pixel-identical or you've leaked the
  change into the wrong contexts.

## Phase 4 — Smooth step

- **Logic stays instant; only the camera interpolates.** `step()` applies immediately
  exactly as today — events, traps, encounters, automap updates all fire at once. The
  renderer then plays a ~120–160ms slide from the previous cell into the new one.
  Backward steps slide backward. Turning stays instant. Wall bumps do not slide.
- **Preferred technique — fractional camera offset.** The projection is single-point
  perspective scaled by distance (`K / dist`), so an in-between frame is the same
  scene rendered with `t ∈ (0,1)` subtracted from every plane distance (and sprite
  distance). Thread an offset parameter through `draw()`/`walls()`/`shadeLevel()`/the
  sprite path rather than duplicating the renderer. As `t` sweeps 0→1, near walls
  slide past the edges and the next plane grows — that's the whole effect. Use a
  slight ease-out so the step lands rather than stops dead.
- **Fallback only if fractional rendering proves genuinely intractable**: zoom the
  previous frame toward the vanishing point over the same duration, then snap to the
  real new frame. Try the real thing first; the fake is visibly cheaper. If you fall
  back, say so loudly in the commit message and README.
- **Frame loop**: the 130ms `setInterval` is too coarse for a 140ms animation. Drive
  the slide with `requestAnimationFrame` for its duration (or restructure the loop as
  rAF with the existing 130ms throttle for sprite animation ticks — your call, but
  keep sprite-anim timing unchanged).
- **Held-key walking must stay responsive.** Holding forward should chain steps
  back-to-back with no dead time: either let a new step interrupt/complete the current
  slide instantly, or start the next slide from wherever the camera is. No input
  queue deeper than one step — that creates drift between where the player looks and
  where the party is.
- **Interruptions snap.** If the step triggers combat, a message box, a teleport, or a
  mode change, the slide snaps to completion before the new mode renders. Spinners and
  teleporters must not animate a misleading path — snap on those too.
- If you extract the easing/offset math into a pure function, add a small unit test
  for it (new test file — never touch the originals).

## Phase 5 — Tests, docs, screenshots

- Full `npm test` green; run the smoke harness (`tools/drive.js` per `test/README.md`)
  and confirm a walk through town and a dungeon entry work with the slide active.
- Update `README.md` (short "Polish pass" note: chrome, fonts + licenses, view
  distance, smooth step) and replace the stale root `thornmere-start.png` with a
  current title-screen shot.
- Update `dev/backlog.md` — strike anything this pass closed.

## Acceptance criteria

- Side-by-side with `dev/original-amiga-screenshots/`, the chrome reads as the same
  *genre* of interface — ornate frame, plaque, period type — while keeping the dark
  Thornmere palette. No flat-modern borders or buttons remain.
- All text legible at normal play size; roster columns aligned; no clipped/overflowing
  panel in any screen state. Font license files committed.
- Outdoors at noon the party sees ~6 tiles with a dithered haze at the limit; dungeon
  torchlight and darkness-zone screenshots are pixel-identical to pre-change.
- A forward step visibly glides (~120–160ms, eased), held-key walking chains smoothly,
  turning is instant, combat/teleport interruptions snap cleanly. No drift between
  camera and party position after any input sequence.
- The 27 original logic tests pass untouched; full suite green; smoke run clean.
- `art-review/art-review.md` shows contemporaneous verdicts for every chrome piece,
  rejections included.

Finish with a 5-minute playtest script demonstrating: the restyled title screen and
chrome, a noon walk down a long street showing the haze limit, a torch-lit dungeon
corridor (still short), a held-key sprint showing chained slides, and one combat entry
mid-step snapping correctly.

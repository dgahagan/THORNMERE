# PROMPT 1 of 3 — "Pixel Fidelity Pass" (v2: includes the missing monster art)

**Model: Sonnet** (`/model sonnet`). Optional escalation: `/model opus` for phase 4 (the four showpieces) only, then back to Sonnet.
**Run in a fresh session.** Check `/usage` first — this is the most output-heavy of the remaining passes.

Paste everything below this line.

---

The Amiga Edition pass is complete (commit 8d1a2cd) and the game works, but the art is far blockier than the real 1985 Amiga game. The original ran at 320×200 with detailed, finely-drawn bitmap art — its portrait window alone was roughly 100×90 pixels of real illustration; our showpieces are currently 48×48. This pass raises the pixel density of all art to genuine 1985 fidelity, and also authors the 9 portrait families that were never completed. Game logic, balance, data schemas (beyond sprite dimensions), and audio must not change.

## Standing rule for this entire session

**Any file that accumulates generated content (art data, review logs) must be written incrementally — after every family or sprite group — so progress is always on disk and externally verifiable.** This applies to the main session and to any subagent. If you delegate art families to subagents, each subagent gets this rule verbatim in its task prompt, and you must verify its target file is growing before letting it run long.

## Step 0: Audit before changing anything

Known starting state: 320×240 indexed framebuffer at exact 2× nearest-neighbor, 32-color palette; portraits and showpieces drawn at low density (48×48 showpieces). Re-read the render layer and confirm, before writing code: the pixel dimensions of each art class (wall textures, portraits, facades, character chips, icons), and how walls are textured (tile sampling vs. drawn quads). The framebuffer itself is likely fine — the expected diagnosis is art density, not screen resolution — but verify rather than assume. Then propose target dimensions per the table below, confirm the plan, and proceed.

## Resolution targets

- **Internal framebuffer: keep 320×240** unless the audit reveals a reason to change; nearest-neighbor integer scaling only.
- **Palette stays 32 colors** — fidelity comes from density and craft, not more colors. You may rebalance the palette ramps (more dark steps for shading) as long as it remains one master palette in data.
- Target art dimensions (adjust ±20% to fit the actual layout):
  - Monster portraits: **~96×80** (showpieces — the Tallow King, the Choir's Eldest, the Mock King, and Maldrec — may go larger, up to the full portrait window)
  - Town building facades: drawn to fill their wall quads at full framebuffer density, with legible signboards
  - Wall/floor/ceiling textures: **32×32 tiles minimum**, with proper perspective sampling so near walls show full texture detail
  - Character portraits: **~32×40**; roster chips ~16×16; class icons 16×16
  - Interior dioramas, special-square art, title and victory illustrations: full-window density
- **No stretched legacy art anywhere.** Every sprite is redrawn at its new native size. Update the dimension/legend validation test so any old-size sprite fails CI.

## The quality loop (this is the heart of the pass)

Text-grid sprite authoring stays (same pipeline, same legend format — grids just get bigger), but add a **visual self-inspection loop**:

1. Write a script that renders any sprite, texture, animation strip, or full mock screen to a **PNG at 3–4× scale** (and a contact sheet per sprite family). Build on the existing tools/artcheck.js and /dev.html where useful.
2. After drawing or revising each sprite, **render it and look at the PNG yourself.** Critique it against the bar below and iterate until it passes. Do not mark an art task done on the strength of the text grid alone — judge only the rendered image.
3. Keep an `art-review.md` log, updated incrementally: one line per sprite — pass, or what was wrong and what changed.

**The bar (1985 Amiga, not 8-bit):** readable silhouette at 1× scale; interior detail (faces have eyes and expression, armor has plates, masonry has individual stones); 3+ shading levels per surface using palette ramps; deliberate dithering for gradients and texture, not noise; consistent light direction within a scene; outlines used selectively, not around everything. A portrait should look like a small illustration, not an icon.

## Scope and order of work

Work family by family, **committing after each numbered step** so progress survives interruption:

1. **Renderer plumbing** — texture sampling at the new densities, perspective-correct sampling for wall quads, distance-shading ramps rechecked, portrait window and UI layout adjusted to the new art sizes without logic changes.
2. **Wall/floor/ceiling texture sets** (4 areas) — these set the whole game's perceived quality; get them right first.
3. **Town facades and signboards.**
4. **The four showpieces** — Tallow King, Choir's Eldest, Mock King, Maldrec. Spend real iteration here; multiple revision rounds expected. These should be portfolio pieces.
5. **All monster portrait families** — (a) redraw set A's base portraits at new density; (b) **author the 9 missing families (22 bestiary ids) from scratch** at the new density — see `HANDOFF-ART.md` for the family list, tier-remap hints, and style references. Match set A's character at the new fidelity bar. Re-verify every palette-swap variant renders correctly and stays readable. This step must green the 4 currently-red art-coverage tests.
6. **Character portraits, chips, icons, interiors, specials, title and victory illustrations.**
7. **Animation re-pass** — frames redrawn at new density; 2–4 fps loops preserved; check that animation reads at 1×.

## Acceptance criteria

- Audit report delivered before changes; per-class dimensions match agreed targets.
- Dimension validation test updated; zero legacy-size sprites; **full suite green — 42/42**, the original 27 logic tests unmodified.
- Contact-sheet PNGs for every art family committed under `art-review/` along with `art-review.md` showing each sprite was visually inspected.
- Near-wall texture detail is visibly sharper than far walls; dithered distance shading reads cleanly at the new density.
- Side-by-side check: capture the same three scenes (Undercroft corridor, a fight with a portrait up, Greta's facade) before and after — the after shots should look like a 1985 Amiga game, not a 1981 one.
- No monster shows the framed `?` placeholder.
- Performance unchanged: instant input, no frame hitching with animations active.
- README updated: art pipeline section amended with the PNG inspection workflow and new dimensions.

Finish with the three before/after scene captures and a one-paragraph summary of what changed visually.

# W8 — Asset Regeneration Scope & Discovery

**Author:** worker session, 2026-06-11 (`worker/audit-01-remediation`).
**Driver:** Director ruling W8 (see `dev/advisor/audit-01-decisions.md`):
> "update all previously claude generated graphics with the local AI system
> python scripts … so all graphics will be of similar quality."

This is the **discovery/scoping** pass only. **No generation here** — GPU runs are
Dan's. **Subject lines below are DRAFTS for Dan's approval** (the pipeline's first
gate). Nothing is written into `gen-manifest.json` until subjects are approved.

---

## 1. What is in scope (and why)

`gen-manifest.json` holds exactly the **30 FLUX-pipelined** ids (`mon_*`, `pc_*`,
`scene_*`). Three art files are **absent from it** — they were authored by
procedural Node generators (`tools/gen_textures.js`, `tools/gen_signs.js`) or by
hand, never through FLUX. Those are the regeneration targets:

| File | Generator (to retire) | Sprites | Target dims |
|---|---|---|---|
| `data/art/textures.json` | `tools/gen_textures.js` | 11 | 32×32 (tileable) |
| `data/art/signs.json` | `tools/gen_signs.js` | 18 | 9× signboard 36×28 + 9× interior 96×72 |
| `data/art/ui.json` | hand-authored | 12 | 16×16 / 16×12 / 12×8 / 8×8 |

**Out of scope:** `font.json` (text glyphs, not art); `palette.json`, `styles.json`
(config, not sprites).

**ROI ranking (read this before committing GPU time):**
1. **Interiors (96×72)** — highest ROI. Big enough for real scene art; this is
   where uniform quality is most visible. Use the `scene` pipeline path.
2. **Signboards (36×28)** — good ROI. Single carved-object subjects crush well.
3. **FX furniture (16×16)** — moderate. Discrete icons can read cleanly at 16px,
   but FLUX→16px is a heavy downscale; expect to hand-touch after crush.
4. **Wall/door textures (32×32, tileable)** — **lowest ROI, highest risk.** Two
   compounding problems (§4): seamless tiling, and 32px holds little detail. The
   uniform-quality win here is marginal. **Recommend sequencing last and
   reconsidering whether FLUX is even the right tool** (see §4).

---

## 2. New manifest infrastructure required

The manifest's `style_suffixes` and `gen_dims` only cover monster/showpiece/
character/scene. W8 needs new classes. **Proposed additions (for Dan's review):**

```jsonc
"style_suffixes": {
  "texture":   "pixel art, seamless tileable material texture, flat orthographic view, 16-bit Amiga style, limited palette, game wall texture",
  "signboard": "pixel art, single hanging carved wooden signboard, centered object, 16-bit Amiga style, limited palette, solid black background, game asset",
  "interior":  "pixel art, interior room scene, atmospheric lighting, 16-bit Amiga style, muted limited palette, dark background, game screen art",
  "fx":        "pixel art, small dungeon icon, single bold readable object, centered, 16-bit Amiga style, limited palette, solid black background, game UI sprite"
}
"gen_dims": {
  "texture":   [256, 256],   // downscaled to 32×32 — see §4 detail warning
  "signboard": [320, 256],   // -> 36×28
  "interior":  [480, 360],   // -> 96×72 (4:3, scene-like)
  "fx":        [256, 256]    // -> 16×16; expect post-crush hand cleanup
}
```

Each new manifest entry mirrors the existing schema (`id`, `art_class`,
`art_file`, `subject`, `style_suffix_key`, `dims`, `allowed`, `bg_indices`,
`seeds_to_generate`, `chosen_seed`, `frame_effects`/`frame_regions`/`frame_ms`
where animated, `status`, `verdict`, `notes`). **Animated entries to preserve:**
`fx_mouth`↔`fx_mouth_open` (anim `fx_mouth_anim`) and `ui_note_a`↔`ui_note_b`
(anim `ui_note`).

`allowed` palette indices are per-sprite and must be chosen at manifest-write
time (the v1 monsters dropped gold indices to stop hue bleed, etc.). Drafts below
don't fix `allowed`; that's a manifest-authoring step once subjects are approved.

---

## 3. DRAFT subject lines — PENDING DAN approval

Fiction sourced from `data/maps/town.json` (building names), `data/art/styles.json`
(area themes), and the area set {town, undercroft, barrow, needle-spire}. Edit
freely — these are art direction.

### 3a. Textures (`textures.json`, 32×32 tileable) — style_suffix_key: `texture`
| id | draft subject |
|---|---|
| `tex_town_wall` | seamless tileable medieval town wall, timber framing over weathered plaster and grey stone courses, fitted masonry |
| `tex_town_door` | heavy town oak door, vertical planks, iron studs and ring handle, set in a stone frame |
| `tex_under_wall` | seamless tileable damp crypt wall, dressed dark stone blocks, mortar seams, faint moss and water stain |
| `tex_under_door` | ironbound crypt door, riveted dark iron plates, heavy hinges, recessed in stone |
| `tex_barrow_wall` | seamless tileable barrow-mound wall, packed earth and turf over old dry-stone, trailing roots |
| `tex_barrow_door` | ancient barrow slab door, weathered grey megalith, carved spiral, earth-stained |
| `tex_needle_wall` | seamless tileable spire wall, smooth bone-pale dressed stone, thin vertical seams, cold and austere |
| `tex_needle_door` | narrow spire door, pale carved stone arch, single thin metal band |
| `tex_riddle_door` | enchanted riddle door, arcane glyphs etched in a stone arch, faint blue glowing runes, sealed |
| `tex_facade` | town building facade, shuttered upper window, iron sign bracket, plaster and timber front |
| `tex_boards` | boarded-up doorway, crossed weathered planks nailed across, rusty nails, dark gaps between |

### 3b. Signboards (`signs.json` sign_*, 36×28) — style_suffix_key: `signboard`
| id | building | draft subject |
|---|---|---|
| `sign_hall` | Adventurers' Hall | carved hanging signboard, crossed sword and shield emblem, gilt lettering, iron bracket |
| `sign_greta` | Greta's Provisioner | carved hanging signboard, sack-and-scales general-store emblem, painted wood |
| `sign_review` | Magistrate's Court | carved hanging signboard, balanced scales of justice, sober dark wood with brass |
| `sign_temple` | Temple of the Quiet Flame | carved hanging signboard, single serene candle-flame emblem, pale wood |
| `sign_spark` | Roskva's Spark House | carved hanging signboard, crackling arcane spark glyph, blue magical glow |
| `sign_goose` | The Drowned Goose (tavern) | carved hanging signboard, comic goose half-sunk in a tankard, weathered paint |
| `sign_hart` | The Hart & Hollow (inn) | carved hanging signboard, antlered stag head within a hollow, warm painted wood |
| `sign_tannery` | The Boarded Tannery (closed) | weathered boarded-over signboard, faded hide-and-knife emblem, cracked peeling paint |
| `sign_belltower` | The Bell Tower | carved hanging signboard, single hanging bell emblem, dark iron and grey stone |

### 3c. Interiors (`signs.json` int_*, 96×72) — style_suffix_key: `interior`
| id | draft subject |
|---|---|
| `int_hall` | interior of a stone adventurers' guild hall, quest notice board, hearth, weapon racks, warm torchlight |
| `int_greta` | interior of a cluttered provisioner's shop, shelves of sacks barrels and gear, counter, lantern light |
| `int_review` | interior of a stern magistrate's courtroom, raised judge's bench, hanging banners, cold stone, shafts of light |
| `int_temple` | interior of a quiet candlelit temple, rows of candles, altar bearing a single sacred flame, serene shadow |
| `int_spark` | interior of a mage's spark house, arcane workbench, glowing crystals and scrolls, blue magical glow |
| `int_goose` | dim waterside tavern interior, the Drowned Goose, plank tables, tankards, hung fishing nets, hearth glow |
| `int_hart` | cozy inn common-room interior, the Hart & Hollow, antler chandelier, fireplace, wooden booths |
| `int_tannery` | abandoned boarded tannery interior, empty curing racks, dust, broken light through boarded windows, gloom |
| `int_belltower` | stone bell-tower base interior, great hanging bell, ropes, spiral stair, dim vertical light |

### 3d. FX furniture (`ui.json` fx_* + sign_generic) — style_suffix_key: `fx`
| id | dims | draft subject |
|---|---|---|
| `fx_stairs_down` | 16×12 | stone dungeon stairway descending into darkness, steps going down |
| `fx_stairs_up` | 16×12 | stone dungeon stairway ascending toward light, steps going up |
| `fx_chest` | 16×12 | closed wooden treasure chest, iron bands and lock, on dungeon floor |
| `fx_mouth` | 16×16 | carved stone magic mouth, mouth closed, weathered wall relief *(anim frame a)* |
| `fx_mouth_open` | 16×16 | carved stone magic mouth, mouth open mid-speech, faint glowing throat *(anim frame b — keep `fx_mouth_anim`)* |
| `fx_danger` | 16×12 | jagged hazard warning glyph, ominous red, bold silhouette |
| `fx_seal` | 16×16 | circular arcane warding seal, glowing runes |
| `fx_gate` | 16×16 | heavy iron portcullis gate set in a stone arch |
| `sign_generic` | 12×8 | small blank carved-wood shop sign on a bracket *(tiny — may stay procedural)* |

### 3e. UI glyphs (`ui.json` ui_*) — **RULED OUT by director 2026-06-11**
| id | dims | note |
|---|---|---|
| `ui_compass` | 16×16 | functional HUD compass rose |
| `ui_note_a` / `ui_note_b` | 8×8 | functional HUD music-note (anim `ui_note`) |

> **DECIDED: these three stay OUT.** Tiny functional HUD glyphs, not scene art;
> FLUX at 8×8 is pointless and risks making them less legible than the current
> clean pixel art. `font.json` also out. **In scope from `ui.json`:** the 8 `fx_*`
> furniture sprites + `sign_generic` (§3d). Everything in 3a–3d is IN.

---

## 4. The tileable-texture problem (blocking design issue for 3a)

The 11 `tex_*` sprites are **seamless 32×32 tiles** the engine repeats across wall
faces (`styles.json` maps each area to its wall/door tile; `renderer.js` tiles
them with distance shading). FLUX output is **not seamless** — naively crushing a
FLUX wall and tiling it will show a hard grid seam on every dungeon wall.

The current pipeline (`generate → crush → import at native dims`) has **no tiling
step**. This is a genuine pipeline gap, not a subject tweak. Options:

| Option | What | Verdict |
|---|---|---|
| **A. Tiling post-process** | After crush, run an offset-and-heal pass (roll the tile by 16px, blend the seam, re-crush) to force tileability, then downscale to 32×32. | Best quality path, but needs a **new tool** (`tools/make_tileable.py`) + per-tile QA. Real work. |
| **B. Seamless-mode generation** | If the local FLUX.2-klein setup supports a tiling/seamless flag or LoRA, generate tileable directly. | Cheapest IF supported — **needs Dan to confirm** the local pipeline can do it. Unknown. |
| **C. Accept non-tileable, pick a flat region** | Crush, then hand-pick a 32×32 region that happens to read flat (low-frequency material). | Low effort, but most FLUX material won't tile cleanly; expect visible seams. |
| **D. Keep textures procedural** | Leave `gen_textures.js` output; only pipeline signs/interiors/FX. | Marginal-ROI textures stay as-is. Contradicts the "all graphics" directive but is the honest low-risk call. |

> **Recommendation:** decide textures **separately and last.** Pursue **B** if the
> local FLUX can do seamless tiling (Dan confirms); else **A** with a new
> `make_tileable` step; treat **D** as the acceptable fallback if the seam quality
> isn't there. **Do not block the signs/interiors/FX batches on this.**

Secondary caveat for all tiny targets (textures 32×32, FX 16×16): generating at
256px and crushing to 16–32px discards most detail. These will likely need a
**hand-cleanup pass after crush** — budget for it, and judge from the rendered
sprite at game scale (CLAUDE.md rule), not the FLUX raw.

---

## 5. Proposed batch sequence & gates

Run as separate pipeline batches (each: manifest entries with subjects FIRST →
generate → crush → **human adjudication** → import → tests → commit per batch):

1. **Batch INT** — 9 interiors (96×72, `interior`/`scene` path). Highest ROI; start here.
2. **Batch SIGN** — 9 signboards (36×28). 
3. **Batch FX** — 8 fx_* + sign_generic (16×16), expect hand-cleanup. (ui_* pending §3e ruling.)
4. **Batch TEX** — 11 textures, only after §4 tiling approach is chosen.

Each batch:
- New candidate dir (`candidates-interiors/`, `candidates-signs/`, `candidates-fx/`,
  `candidates-textures/`) — never clobber.
- Subjects written into the manifest **before** any GPU run (CLAUDE.md hard rule).
- Winners picked by **human** (the audit's core lesson: the pipeline self-judged
  tone and missed).
- Retire the matching procedural generator (`gen_textures.js` / `gen_signs.js`)
  only after its batch imports and tests pass; record in `PIPELINE-HANDOFF.md`.

---

## 6. Open questions for Dan (blocking generation, not this doc)

1. **§3e UI glyphs** — ✅ RESOLVED 2026-06-11: ruled OUT (`ui_compass`,
   `ui_note_a/b`, `font.json`). In scope: `fx_*` ×8 + `sign_generic`.
2. **§3b Signboards (9)** — ✅ RESOLVED 2026-06-11: **ruled OUT, keep procedural.**
   They hang on doors in the first-person view, distance-scaled to ~36px; the bold
   procedural emblems (crossed-swords, bell, scales…) read better there than a
   FLUX image crushed to 36×28. Same logic as the UI glyphs.
3. **§4 textures** — ✅ RESOLVED 2026-06-11: **ruled OUT, keep procedural.**
   `test_tiling.py` ran on the host: circular padding *reduced* seams but FLUX
   does NOT tile cleanly (it's transformer-based — circular padding only wraps the
   VAE conv edges, not the transformer-generated structure, so the layout still
   seams). Combined with the 32×32-tiny + distance-shaded factors, procedural
   wins. True seamless would need latent-rolling tiling — not worth it at 32px.
4. **§3d FX furniture (8 fx_* + sign_generic, 16×16)** — ✅ RESOLVED 2026-06-11:
   **ruled OUT, keep procedural.** Same logic as signboards/glyphs — tiny
   viewport icons read better as bold procedural pixel art than crushed FLUX.

## FINAL W8 OUTCOME (2026-06-11)

The asset-regen resolved on a clean principle: **FLUX for the large art windows,
procedural for the small viewport elements.**

| asset | dims | outcome |
|---|---|---|
| **Interiors** | 96×72 → **112×80** | ✅ regenerated via FLUX, populated, imported & live |
| **Monster/showpiece portraits** | 96×80 → **112×93** | ✅ re-crushed to 112-wide (bonus pass), live |
| Signboards | 36×28 | ❌ keep procedural (distance-scaled emblems) |
| Textures | 32×32 | ❌ keep procedural (FLUX can't tile cleanly + tiny) |
| FX furniture | 16×16 | ❌ keep procedural (tiny viewport icons) |
| UI glyphs / font | 8–16px | ❌ keep procedural (functional HUD) |

The "~112-wide" target (≈ the original BT ~117 art window) was validated against
`dev/original-amiga-screenshots/`. W8 is **closed**.
4. **Palette `allowed` sets** — per-sprite; will be drafted at manifest-write time
   with the approved subjects (not blocking now).

---

*No `gen-manifest.json` changes made. No generation run. No procedural generator
retired. This document is the plan; §6 gates the first manifest write.*

# Audit-01 Verification Report
**Session:** Independent verification — read-only except dev/advisor/
**Date:** 2026-06-11
**Server:** npm start → http://127.0.0.1:8377 (started, shut down at end)
**Browser:** Playwright MCP (headless Chromium)

---

## Part 1 — Live Frame Effects

### Monster portrait: eye_pulse (mon_rat / fen_rat)

**Method:** Game started fresh, party created via UI flow (Hroth, Korrun Blade), teleported to undercroft1 (5,5), torch lit, combat forced via `window.__thorn.startCombat({ groups: [{ monster: 'fen_rat', count: 3 }] })`. Screenshots taken of BATTLE! intro and orders screens. Canvas pixel sampling at computed eye region (sprite eye_region x:32,y:24,w:32,h:10 at scale 2 → canvas coords x:128,y:76,w:64,h:20).

**Pixel data:** 10 samples at 200ms intervals across 2 seconds:

| t (ms) | eye brightness | interpretation |
|--------|---------------|----------------|
| 0 | 398 | bright (frame_b) |
| 200 | 398 | bright |
| 400 | 287 | dim (frame_a) |
| 600 | 287 | dim |
| 800 | 398 | bright |
| 1000 | 398 | bright |
| 1200 | 287 | dim |
| 1400 | 287 | dim |
| 1600 | 398 | bright |
| 1800 | 398 | bright |

**Verdict: ANIMATION IS PLAYING.** Brightness oscillates 398↔287 every 400ms, exactly matching `frame_ms.a = 400, frame_ms.b = 400` in the manifest. The setInterval tick fires every 130ms (`src/main.js:1357`), `renderer.now` updates each tick, `frameAt` selects alternating frames at 1200ms total cycle (400ms per half). Phase transitions confirmed by polling at 10ms resolution — frame boundaries found at expected intervals.

**Screenshots:**
- `dev/advisor/render/live/encounter_t0ms.png` — BATTLE! intro showing rat portrait
- `dev/advisor/render/live/encounter_frame_a_dim.png` — captured at dim phase (eye brightness 287)
- `dev/advisor/render/live/encounter_frame_b_bright.png` — captured at bright phase (eye brightness 398)
- `dev/advisor/render/live/combat_orders.png` — orders screen, portrait still animating

The two screenshots are visually very similar at page scale (canvas is 320×240 CSS-scaled to 640×480 then displayed in viewport); the eye region is small. The pixel-level sampling is the reliable measure.

**Observation (not a verdict):** The rat portrait (`mon_rat` / fen_rat) is a large round grey rat with prominent round ears, buck teeth, and a round body. The adjudication note in art-review.md says "AI: grey upright rat, fangs, beady red eyes — menacing." At rendered game scale the portrait reads more as a sturdy cartoon rat than a menacing dungeon creature. This is consistent with the game director's subsequent verdict ("mon_rat is adorable"). No art judgment is being made here; this documents what is visible in engine.

---

### PC portrait: breathe+eye_pulse (pc_warrior)

**Method:** After exiting combat, pressed '1' in town to open the character inspection view for Hroth. Attempted canvas hash sampling over 1.5s. Canvas hash was **completely static** (`unique_count: 1` over 15 samples at 100ms intervals).

**Investigation:**
1. Confirmed `renderer.now` IS updating every 130ms — animation tick is live.
2. Confirmed `frameAt(resolveVariant('pc_warrior'), t)` DOES alternate between `pc_warrior_a` and `pc_warrior_b` at 600ms intervals.
3. Confirmed `pc_warrior_a` and `pc_warrior_b` ARE visually different: 300 pixels differ, full-canvas hash changes between forced renders (`hashA=3048063490` vs `hashB=3815331278`).
4. **Root cause found:** `src/main.js:368` — `function portraitOf(ch) { return ch.portrait || \`pc_${ch.race}_${archetypeOf(ch.cls)}_a\`; }` — the `_a` suffix is hardcoded. The character inspection mode calls `renderer.special(portraitOf(ch), ...)`, which always resolves to `resolveVariant('pc_warrior_a')` — a static drawable, not the animated `pc_warrior` anim drawable.

**Verdict: PC portrait breathe+eye_pulse is NOT visible in-engine in the character inspection view.** The `_a` frame is always rendered. The two derived frames exist and differ correctly (programmatic criterion 11 passed), and the animated drawable `resolveVariant('pc_warrior')` returns `animated:pc_warrior_a,pc_warrior_b`, but `portraitOf()` bypasses the animation system by hardcoding `_a`.

This is a functional gap between the programmatic verification (which directly computed frame_b and compared it pixel-by-pixel) and live in-engine animation. The breathe+eye_pulse effect is CORRECT in the sprite data but NOT rendered animatedly in any known screen path.

**Screenshots:**
- `dev/advisor/render/live/pc_portrait_view.png` — character view showing Hroth (static frame_a)
- `dev/advisor/render/live/pc_warrior_frame_a.png` — forced render of frame_a
- `dev/advisor/render/live/pc_warrior_frame_b.png` — forced render of frame_b (visually indistinguishable at page scale; pixel data confirmed different)

---

## Part 2 — Before/After Scene Captures

### (a) Undercroft dungeon corridor view

**Path:** `dev/advisor/render/live/undercroft_corridor.png`
**Context:** undercroft1, position (5,5), facing north, torch lit (light: 2). Warm brown stone walls with dark ceiling and floor, first-person 3D perspective rendered. The `tex_under_wall` texture (warm brown dungeon stone with moss patches) is visible on the forward and side walls. Map shows "The Sunken Undercroft — Drowned Cellars."

### (b) Combat screen with monster portrait visible

**Paths:**
- `dev/advisor/render/live/encounter_t0ms.png` — BATTLE! intro, 3 Fen Rats, full rat portrait centered
- `dev/advisor/render/live/combat_orders.png` — round 1 orders screen with portrait still visible

Portrait: grey upright rat (mon_rat), ears, buck teeth, red eyes, long tail. Label "FEN RAT." The AI-generated portrait is clearly visible at game scale. Eye region is visible but small.

### (c) Greta's building — exterior and interior

**Exterior:** The first-person town view shows the stone wall (tex_town_wall) facing Greta's building from various distances. The signboard (sign_greta) is NOT separately visible as a 3D object — the view shows the wall texture tiling across the building exterior.
- `dev/advisor/render/live/greta_facade.png` — 1 step back (wall close-up, dark stone)
- `dev/advisor/render/live/greta_facade_far.png` — 3 steps back (full wall texture visible)

**Interior:** Entering via ArrowUp from position (11,16) facing north:
- `dev/advisor/render/live/greta_interior.png` — `int_greta` scene: NPC in green robe at counter, shoe shelves on both walls, stone brickwork, work lamp. Matches art-review description exactly.

### Baseline comparison

**Before (committed 086d882):** `thornmere-start.png` — pure CRT green-on-black terminal display. Title screen shows only "THORNMERE — The Founding Song" text, "(N) New game" option, empty art panel. No sprites, no color, no art of any kind.

**After (current):** Full indexed-color 320×240 framebuffer with:
- AI-generated title scene (dark silhouette panorama with star field)
- Monster portraits at 96×80 in combat with animation
- Interior scenes at 96×72
- PC portraits at 32×40
- Complete texture set for dungeon/town walls

**Other historical screenshot commits:**
- `086d882` — thornmere-start.png (baseline), plus all art-review contact sheets as of that session
- `b47f7d4` — brute benchmark candidates (dev/pixel-art/candidates/brute_s*), lora_test.png, base_test.png, early fx/icon/sign/tex/mon contact sheets, scene art (scene_title.png, scene_victory.png)
- `2c685df` — updated pc portrait art-review renders, scene sheets
- `39e62ec` — initial artrender tool renders

---

## Part 3 — Icons/FX Scope Claim

### Quotes from art-review/art-review.md

From **Step 6** (line 222–225):
> "PC portraits (32×40) and scenes (160×64 / 160×120) completed via AI pipeline above.
> Icons, FX sprites, and NPC faces remain procedural — not in AI pipeline scope for this pass."

From the **Acceptance criteria walkthrough** table: Icons and FX are not listed as criteria. No criterion covers them.

### Quotes from dev/Prompt_art_pipeline.md (the v2.1 pipeline spec)

From the **Acceptance criteria** section (last block):
> "Wall/floor/ceiling textures and small UI icons are NOT adjudicated — procedural/hand-authored stays (generated images don't tile)."

Note: this line specifically calls out **textures** and **small UI icons** as excluded. It does not explicitly exclude FX sprites by name.

From **Deliverable 4**:
> "Facades, interiors, scenes, title/victory illustrations: same adjudication, per-class style suffixes."
> "Character portraits (~32×40): same; reject any candidate whose face doesn't survive the crush at 1×."

FX sprites are not mentioned in Deliverable 4.

From the **PIPELINE-HANDOFF.md** target dimensions table:
> `FX sprites | data/art/ui.json | 24×24 | (was 16×12–16)`

FX sprites ARE listed in the handoff as a target for the AI pipeline session, with a target dimension of 24×24.

### Current icon/FX art quality

**`art-review/icon-sheet.png`** — 10 icons at 16×16 rendered at approx 4× scale. Shows: sword, shield, staff/wand, key(?), face/mask, musical note, snowflake/starburst, ghost or draped figure; second row: lightning bolt, question mark. These are **detailed pixel art icons** — clean silhouettes, multi-color fills, visible internal detail at 16px. Not placeholder geometry.

**`art-review/fx-sheet.png`** — 9 FX sprites at 24×24 rendered. Shows: gate post/guillotine frame, black rectangle, trapezoid (floor tile?), orange grid/portcullis, two round smiley/neutral face icons, skull icon, circle-with-downward-arrow icon, and a portcullis/gate sprite in bottom left. These appear to be **dungeon environment view elements** (wall/ceiling geometry indicators) rendered as sprites, not spell effects. Quality is mixed — some are readable pixel-art geometry, others are abstract.

### Conclusion on scope claim

The walkthrough's "out of scope" statement ("Icons, FX sprites, and NPC faces remain procedural — not in AI pipeline scope for this pass") is an **interpretation**, not a verbatim spec line.

The pipeline spec (Prompt_art_pipeline.md) explicitly excludes only **wall/floor/ceiling textures** and **small UI icons** from adjudication, citing the reason "generated images don't tile." FX sprites are listed in PIPELINE-HANDOFF.md as a pipeline target with a defined target dimension (24×24). The spec's Deliverable 4 does not mention FX sprites in its scope exclusions.

The "out of scope" claim in art-review.md is therefore a session-level scope decision made during the AI pipeline run, not a hard rule from the spec. The spec implies FX sprites were intended for the pipeline but were not executed. The icons exclusion ("small UI icons") is genuinely in the spec.

---

## Part 4 — Lost-Correction Forensics

### Step 1: Search for the original art-direction note

**Results of grep across PIPELINE-HANDOFF.md, art-review/art-review.md, NEEDS-HUMAN.md, dev/, and `git log -p --all` for "mangy", "feral", "adorable", "rat":**

**LESSONS.md (commit 3ed7e0b, 2026-06-10 22:35):**
> "AI output also fails in characteristic ways — our dungeon rat came out adorable — so subject prompts must specify *condition and intent* (mangy, feral, snarling), not just species."

**dev/advisor/audit-01-delegation-prompts.md (commit 72044fe, in this branch):**
> "mon_rat (adorable), mon_hound, mon_moth, mon_blob (less adorable but still wrong). The mid-run 'mangy/feral' correction therefore did not land…"

**NOWHERE ELSE.** The words "mangy", "feral", and "adorable" appear in no file other than LESSONS.md and dev/advisor/ files. Neither `art-review/art-review.md`, `PIPELINE-HANDOFF.md`, `NEEDS-HUMAN.md`, nor `data/art/gen-manifest.json` contain these terms.

**The original art-direction note ("mangy/feral") does not exist in the repository at all.** It lived only in chat.

### Step 2: Manifest subject and notes fields for the four IDs

Verbatim from `data/art/gen-manifest.json` (committed 7c8419f, 2026-06-10 13:45):

**mon_rat:**
- `"subject": "large fen rat, upright pose, round grey body, round cupped ears with inner ear, prominent buck teeth, long hairless tail, small red beady eyes"`
- `"notes": "Existing procedural art scores PASS. Generate to compare."`

**mon_hound:**
- `"subject": "upright wolf hound, large stocky grey body, pointed ears, single large red glowing eye, bared white fangs, four thick pillar legs"`
- `"notes": "Pure grey body ramp; single red-to-flame eye for contrast. Procedural PASS — compare carefully."`

**mon_moth:**
- `"subject": "giant basilisk moth with enormous spread wings, wings covered in concentric ring eye-spots, feathery antennae, segmented thorax body"`
- `"notes": "Warm brown wings. Eye-spot rings: blood-to-flame + violet. Blue-black eye centers."`

**mon_blob:**
- `"subject": "amorphous tallow blob monster, tan-amber pyramid mound shape, two gold coin eyes with black pupils, dashed toothy grin, side pseudopod arms, shiny gelatinous surface"`
- `"notes": "Warm amber-brown body; gold eyes. Drop green/blue entirely."`

**None of the four subject lines contain "mangy", "feral", "snarling", or any similar condition/intent modifier.** The git history for `data/art/gen-manifest.json` shows three commits touching that file:
- `7c8419f` (2026-06-10 13:45) — initial manifest creation, subjects written as above
- `136523b` (2026-06-10 19:45) — imports (status/verdict changes only)
- `8864c3a` (2026-06-10 19:51) — formatting cleanup only (whitespace normalization)

The subject lines were never rewritten after initial creation.

### Step 3: Timeline reconstruction

| Time | Event |
|------|-------|
| 2026-06-10 ~13:45 | `7c8419f` — gen-manifest.json created. mon_rat subject written as "large fen rat, upright pose, round grey body…" No feral/mangy language present. |
| 2026-06-10 ~13:45–19:45 | GPU generation runs on host. Seeds generated and crushed for all 30 entries. The rat family is generated from the existing "adorable" subject. |
| 2026-06-10 ~19:45 | `136523b` — all 24 monster/showpiece sprites imported. mon_rat imported as s42/sub14. |
| 2026-06-10 ~19:51 | `8864c3a` — PC portraits and scenes imported. |
| 2026-06-10 ~19:51 | `21a8efc` — art-review.md logs PC portrait and scene adjudication verdicts. |
| 2026-06-10 ~22:15 | `2c685df` — audit pass writes NEEDS-HUMAN.md, expanded adjudication, acceptance criteria walkthrough. No feral/mangy mention anywhere. |
| 2026-06-10 ~22:35 | `3ed7e0b` — LESSONS.md written for a team presentation. **First appearance of "adorable" and "feral/mangy"** — written as a retrospective lesson, not a live directive. The art had already been imported and accepted. |
| 2026-06-10 ~23:xx | `72044fe` — Advisor session writes delegation prompts and notes that the "mangy/feral correction did not land." |

The art-direction note ("mangy/feral") was **never issued during the generation phase**. LESSONS.md (commit 3ed7e0b) appears to be a retrospective observation written AFTER all art was already imported and reviewed, not a mid-run directive. The delegation prompts (audit-01) treat it as a "mid-run correction" but the timeline evidence does not support this: there is no commit, no file edit, and no manifest change between generation and import that issued the correction.

The adjudication in art-review.md (commit 136523b) records the mon_rat verdict as:
> "replace | Procedural: cute brown oval, cartoony. AI: grey upright rat, fangs, beady red eyes — menacing."

This verdict accepted the rat as "menacing" — contradicting the later assessment that it is adorable. The adjudication reviewer apparently accepted the portrait on generation-prompt terms rather than noting any gap.

### Step 4: Conclusion

**Most likely failure point:** The art-direction intent ("rat should read as feral/mangy, not cute") was never written into the manifest `subject` field before generation. The subject prompt described anatomy ("round grey body, round cupped ears, prominent buck teeth") without condition or attitude modifiers. Anatomy-only prompts predictably produce benign-looking animals; FLUX renders charm by default. The correction may have been discussed in chat and noted mentally by the session director but was never persisted anywhere before the generation run began.

A secondary failure: even after generation, the adjudication accepted the rat as "menacing" ("fangs, beady red eyes") without comparing the result against a stated feral/mangy standard, because that standard had never been written down.

**Concrete process fix:** The CLAUDE.md hard rule already states: *"Art-direction changes must be written into the manifest `subject` field before any generation run — a directive that lives only in chat will be lost (this happened)."* This rule exists precisely because this failure occurred. The fix is already formalized; it just was not in place (or not enforced) when this batch was generated.

---

## Anomalies

1. **PC portrait animation dead path.** `src/main.js:368 portraitOf()` hardcodes `_a` suffix. The character inspection screen never renders frame_b. The breathe+eye_pulse effect exists in sprite data and is programmatically correct but is not visible in any reachable game screen. The animated drawable (`resolveVariant('pc_warrior')`) is correctly constructed but `portraitOf` bypasses it. This is a live-verification gap not surfaced by the programmatic criterion.

2. **"Mid-run correction" is a retrospective observation, not a real-time event.** The delegation prompt framing implies a directive was issued and ignored during the pipeline run. The evidence does not support this: "mangy/feral" first appears in LESSONS.md written after all art was already committed. The failure was not a dropped correction but an absent one — the subject was never written to begin with.

3. **FX sprite scope ambiguity.** The pipeline spec lists FX sprites (24×24) as a deliverable target in PIPELINE-HANDOFF.md but the spec's acceptance criteria explicitly excludes only "wall/floor/ceiling textures and small UI icons." The session-level decision to exclude FX sprites is not in the spec. Whether fx-sheet.png shows icons or viewport geometry elements is also unclear; the current sprites look like dungeon environment rendering primitives rather than spell effect FX.

4. **Icon quality higher than expected.** The `art-review/icon-sheet.png` shows polished multi-color 16×16 pixel art icons (sword, shield, note, etc.) — clearly better than placeholder geometry. These may already be at or near acceptable quality without AI replacement.

---

## Files Written

All files are under `dev/advisor/` (read-only constraint respected elsewhere).

### Screenshots — dev/advisor/render/live/

| File | Content |
|------|---------|
| `initial_load.png` | Title screen with AI scene_title art |
| `after_newgame.png` | Town exterior after new game |
| `undercroft_corridor.png` | Undercroft dungeon corridor, torch lit |
| `encounter_t0ms.png` | BATTLE! intro — rat portrait t=0 |
| `encounter_frame_a_dim.png` | Rat portrait captured at dim phase (eye brightness 287) |
| `encounter_frame_b_bright.png` | Rat portrait captured at bright phase (eye brightness 398) |
| `combat_orders.png` | Combat orders screen with rat portrait |
| `greta_facade.png` | Town exterior wall 1 step from Greta's |
| `greta_facade_far.png` | Town exterior wall 3 steps from Greta's |
| `greta_interior.png` | int_greta scene — NPC in green robe |
| `pc_portrait_view.png` | Character inspection view — Hroth (static frame_a always) |
| `pc_warrior_frame_a.png` | PC warrior frame_a forced-rendered |
| `pc_warrior_frame_b.png` | PC warrior frame_b forced-rendered (visually very similar at page scale) |

### This report
`dev/advisor/audit-01-verification.md`

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

Signboards rendered at 8× via `--sheet sign 8`; interiors at 3× via `--sheet int 3`.
sign_greta and sign_spark required one revision each (boot silhouette, bold bolt shape).

### Signboards (36×28)
- sign_hall [36×28] — PASS: crossed swords X, gold crossguards, clear silhouette
- sign_greta [36×28] — PASS (rev 2): boot shaft + foot + heel profile clearly readable, lace eyelets visible
- sign_review [36×28] — PASS: balance scales, post, beam, two hanging pans
- sign_temple [36×28] — PASS: caged lantern, hanger, red flame inside glass
- sign_spark [36×28] — PASS (rev 2): bold two-block yellow zigzag bolt with gold-dark shadow edge
- sign_goose [36×28] — PASS: white bird silhouette, gold beak, eye, standing pose
- sign_hart [36×28] — PASS: antler beams with tines, deer face with eyes and nostrils
- sign_tannery [36×28] — PASS (rev 2): stretched hide on wooden frame, corner tie cords, texture marks
- sign_belltower [36×28] — PASS: gold bell on grey arch frame, clearly suspended

### Interior scenes (96×72)
- int_hall [96×72] — PASS: red banner, NPC in blood robe, notice board, candles, stone brickwork
- int_greta [96×72] — PASS: NPC in green robe, shoe shelves both sides, work lamp, leather piece on counter
- int_review [96×72] — PASS: NPC in blue robe, blue-curtained back wall, hanging scales on wall, candles
- int_temple [96×72] — PASS: NPC in gold robe, prominent flame altar on pedestal at centre, candelabra
- int_spark [96×72] — PASS: NPC in violet robe, abyss-blue walls, coloured vial shelves, rune circle
- int_goose [96×72] — PASS: NPC visible, large barrel left, fireplace right with fire, mugs on counter
- int_hart [96×72] — PASS: fireplace left, 3 leather pelts hung on wall, antlers, NPC visible
- int_tannery [96×72] — PASS: leather roll shelves, measuring cord across wall, pouches, bone needle on counter
- int_belltower [96×72] — PASS: giant gold bell on stone arch dominates scene, NPC in dark robe, rope visible

---

## Step 4 — showpieces (48×48 → 96×80, 3 frames each)

Rendered at 3× via `--sheet mon_<boss> 3`. All 4 bosses generated from `tools/gen_showpieces.js`.

- mon_candleking_a/b/c [96×80] — PASS: wax figure centred in candle forest (8 flanking pillars), blue-flame crown row, large red ember eye sockets, gaping mouth with teeth, wax throne base; frame b left arm raised with fireball, frame c eyes brighter
- mon_choir_eldest_a/b/c [96×80] — PASS: dark triangle robe fills full frame, giant concentric-ring eye (void → blue iris → bright core → black pupil) dominates hood, rows of tiny trapped faces as dash-pair marks across robe, green pendant gem, left clawed hand emerging; frame c full-blaze eye with all face-eyes lit green
- mon_mock_king_a/b/c [96×80] — PASS: blue tile golem with gold grout grid, 3 gold crown prongs, wide rectangular eyes glowing sky-blue, gold belly emblem, mist-blue branch arms; arm pose distinct across 3 frames
- mon_maldrec_a/b/c [96×80] — PASS: dark grey robe triangle, boxy face with violet glowing eyes and upturned grin, staff with bright blue orb; frame b diagonal staff + violet/blue casting tendrils; right hand honey-toned but identity unambiguous

---

## Step 5a — monster set A (32×32 → 96×80, 2 frames each)

Rendered at 3× via `--sheet mon_<family> 3`. Generated from `tools/gen_monsters_a.js`.
mon_hound required 3 revisions (insect-blob→side-wolf→upright wolf). mon_snake_b required 1 revision (disconnected blocks→ellipse-chain S-curve).

- mon_rat_a/b [96×80] — PASS: large oval body, round ears with inner ear, buck teeth, long tail; frame b forelegs raised
- mon_beetle_a/b [96×80] — PASS: silver dome carapace with concentric ridge rings, red compound eyes, mandibles, 6 legs; frame b elytra raised showing blue wings
- mon_hound_a/b [96×80] — PASS (rev 3): upright wolf, large grey body, pointed ears, big red glowing eye, white fangs, 4 thick pillar legs; frame b crouching with raised foreleg and red tongue
- mon_spider_a/b [96×80] — PASS: two-segment body (cephalothorax + abdomen), 8 legs spread, 4-pair red eye cluster, chelicera fangs, hair bristles; frame b front legs raised
- mon_snake_a/b [96×80] — PASS (snake_b rev 2): frame a S-coil with hollow loops, triangular head, gold slit eyes; frame b diagonal ellipse-chain continuous body, head lunging left, forked tongue
- mon_zombie_a/b [96×80] — PASS: green humanoid, outstretched arms, red wound patches, one dead eye + empty socket, slack mouth; frame b one arm raised higher
- mon_skeleton_a/b [96×80] — PASS: skull with dark sockets, ribcage, spine, hip/knee joints, gold sword; frame a sword down, frame b sword raised high
- mon_blob_a/b [96×80] — PASS: tan pyramid mound, gold eyes with pupils, dashed toothy grin, side pseudopods; frame b spreading wider with drip tendrils
- mon_wisp_a/b [96×80] — PASS: vivid concentric-ring orb (honey→ember→flame→gold→chalk), 6 orbiting sparks, hanging legs; frame b brighter with radial burst rays
- mon_brute_a/b [96×80] — PASS: massive green block body, red eyes under heavy brow ridge, white tusks, huge fists, muscle band lines; frame b both fists raised to smash
- mon_humanoid_a/b [96×80] — PASS: dark triangular robe, hooded face with gold eye glint, gold dagger; frame a dagger horizontal, frame b dagger thrust vertical

---

## Step 5b — monster set B (monsters2.json)

Generated by `tools/gen_monsters_b.js`. All 9 families × 2 frames written and passing data-integrity
test (42/42 green as of this session). Visual inspection was NOT performed — plan changed before
rendering: portrait-class art (set B monsters, characters, icons, FX, scenes) will be replaced by an
AI-generation pipeline in the next session. The programmatic sprites serve as placeholder geometry
that satisfies the test harness until AI-generated replacements land.

Families generated (not visually inspected):
- mon_sorcerer_a/b — robed cult mage, pointed cowl, staff, blood-red eyes
- mon_ghost_a/b — chalk/mist-blue shroud-wight, hollow eyes, howling O mouth
- mon_bird_a/b — gaunt storm-bird, spread wings, hooked beak
- mon_hag_a/b — fen-green hag, wild honey hair, hooked nose, clawed hands
- mon_knight_a/b — full plate revenant, visor glow, kite shield, notched sword
- mon_choir_a/b — three hooded singers, center taller, open black mouths
- mon_gargoyle_a/b — stone gargoyle, two horns, ember eyes, wide fanged grin
- mon_golem_a/b — blocky rune golem, rectangular head, sky-blue chest rune
- mon_moth_a/b — basilisk moth, huge wings, concentric eye-spots

---

---

## AI Pipeline — adjudication (monsters, showpieces)

Candidate source: `dev/pixel-art/candidates/<id>_s<seed>_sub<N>.png`
Procedural source: `art-review/proc_mon_<family>-sheet.png` (rendered via `node tools/artrender.js --sheet`)
Judge method: side-by-side visual comparison at 4× preview scale.
Verdicts: **replace** (AI clearly better), **kept-procedural** (existing holds up), **retry** (adjust prompt/palette once).

### Set B — monsters2.json (9 families, placeholder geometry never inspected before this pass)

All Set B procedural sprites were generated as placeholder geometry to satisfy the test harness; none
were visually inspected. Every AI candidate is compared against the placeholder.

| id | chosen_seed | crush_tag | verdict | notes |
|---|---|---|---|---|
| mon_sorcerer | 42 | sub17 | replace | Skull-faced cult mage, dark night robe, red eyes, staff. Placeholder had no readable anatomy. |
| mon_ghost | 42 | sub13 | replace | Screaming skull face, mist-blue tendrils. Placeholder was grey smear. |
| mon_bird | 42 | sub16 | replace | Dark storm-raven, spread wings, ember eyes. Placeholder was basic wing geometry. |
| mon_hag | 42 | sub16 | replace | Green warty skin, honey hair, grinning clawed face. Placeholder had no face. |
| mon_knight | 42 | sub15 | replace | Full plate, violet visor slit, shield and sword. Placeholder was stick armour. |
| mon_choir | 42 | sub16 | replace | Three howling hooded figures, blood-accented mouths, wide spread. Placeholder was three blobs. |
| mon_gargoyle | 42 | sub16 | replace | Stone body, two horns, ember eyes, leathery wings spread. Placeholder was flat. |
| mon_golem | 42 | sub16 | replace | Blocky stone body, sky-blue eyes, blue chest rune. Placeholder had no rune detail. |
| mon_moth | 7 | sub16 | replace | Warm brown wings, violet concentric eye-spot rings. s7 > s42 for violet contrast. |

### Set A — monsters.json (11 families, previously PASS procedural art)

Procedural art passed the Step 5a quality bar. AI candidates judged directly against those PASS sprites.
Every procedural sprite was a full-body geometry design; AI candidates are close-up portrait-format (correct
for the 96×80 dungeon-crawler encounter frame).

| id | chosen_seed | crush_tag | verdict | notes |
|---|---|---|---|---|
| mon_rat | 42 | sub14 | replace | Procedural: cute brown oval, cartoony. AI: grey upright rat, fangs, beady red eyes — menacing. |
| mon_beetle | 42 | sub14 | replace | Procedural: small pill with legs. AI: full armored carapace, concentric rings, spread mandibles. |
| mon_hound | 42 | sub12 | replace | Procedural: blocky toy dog. AI: grey hellhound, fangs bared, hunched forward, red eyes. |
| mon_spider | 42 | sub13 | replace | Procedural: top-down oval with stick legs. AI: frontal close-up, chelicerae, 8-leg spread. |
| mon_snake | 42 | sub14 | replace | Procedural: side-scrolling S-curve not portrait. AI: upright cobra portrait, triangular head. |
| mon_zombie | 42 | sub13 | replace | Procedural: Minecraft-block humanoid. AI: screaming green corpse, blood dripping, arms raised. |
| mon_skeleton | 42 | sub11 | replace | Procedural PASS held up (grey warrior, sword). AI: gold-bone cursed warrior with spear — more atmosphere. |
| mon_blob | 42 | sub12 | replace | Procedural: flat triangle with dot-eyes. AI: golden dripping mass, spiral eyes, grinning fangs. |
| mon_wisp | 42 | sub10 | replace | Procedural PASS: clean concentric orb. AI: candle-soul in rings with eldritch tendrils — dungeon-cohesive. |
| mon_brute | 42 | sub16 | replace | Procedural: green android blocks. AI: close-up orc portrait, tusks, muscles, red eyes — outstanding. |
| mon_humanoid | 42 | sub12 | replace | Procedural: grey chess-piece cone. AI: hooded assassin, glowing gold eyes, dagger drawn. |

Note: mon_brute AI raws named `brute_s*` (generated via test2.py before manifest). Import uses that path.
Note: mon_skeleton procedural was the strongest Set A sprite — AI still wins on palette atmosphere.
Note: mon_wisp closest call — procedural concentric orb was clean; AI candle-soul wins on thematic fit.

### Showpieces — monsters3.json (4 entries, previously PASS procedural art)

Showpiece procedural art was generated with gen_showpieces.js and passed Step 4 quality bar.

| id | chosen_seed | crush_tag | verdict | notes |
|---|---|---|---|---|
| mon_candleking | 31 | sub20 | replace | Palest wax body, dripping wax, 8 candles, blue flame crown — exceeds procedural. |
| mon_choir_eldest | 42 | sub19 | replace | Triangular robe, giant concentric eye, 20+ trapped faces, green pendant, skeletal claw. |
| mon_mock_king | 42 | sub15 | replace | Blue tile body, prominent gold grout, 3 crown prongs, gold medallion — tile-golem reads perfectly. |
| mon_maldrec | 31 | sub17 | replace | Triangular dark robe, blue orb staff, raised arm, grinning face, violet eyes. |

---

### PC Portraits — people.json (4 entries, previously OLD 24×24 placeholder art)

Existing portraits: all four (warrior, rogue, caster, skald) use an identical 24×24 face template
with only hat/hood color changed. Zero character differentiation. Replaced by 32×40 AI portraits.

| id | chosen_seed | crush_tag | verdict | notes |
|---|---|---|---|---|
| pc_warrior | 42 | sub16 | replace | Stern shaved-head plate-armored warrior. s7 near-identical; s42 slightly grittier. |
| pc_rogue | 42 | sub12 | replace | Dark-hooded figure, shadowed face. Clean archetype read. |
| pc_caster | 42 | sub14 | replace | Dark hair, blue gem amulet, dark robe. s7 was blonde/blue-eyes; s42 more dungeon-appropriate. |
| pc_skald | 42 | sub15 | replace | Bearded, leather/chain, warm gold tones. Strong Norse-bard silhouette. |

### Scenes — scenes.json (2 entries, previously OLD geometry art)

| id | chosen_seed | crush_tag | verdict | notes |
|---|---|---|---|---|
| scene_title | 42 | sub20 | replace | Dark mist-draped town silhouette panorama. s7 showed more detail; s42 atmospheric opener wins. |
| scene_victory | 7 | sub22 | replace | Church spire over golden river reflection, sunset. s7 > s42 (s42 had clocktower, less triumphant). |

---

## Step 6 — characters, icons, FX, scenes

PC portraits (32×40) and scenes (160×64 / 160×120) completed via AI pipeline above.
Icons, FX sprites, and NPC faces remain procedural — not in AI pipeline scope for this pass.

---

## Expanded adjudication — three contested sprites

Three sprites where multiple seeds were viewed and a genuine judgment call was made.
For each: seeds examined, winner, runner-up(s), and decisive criteria.

### scene_victory — three seeds compared

Seeds examined: **s7** (chosen), **s42**, **s11**.

| seed | description | verdict |
|---|---|---|
| s7 | Stone church with tall pointed spire, golden river running left-to-right in foreground catching the sunset reflection, flanking mountains, classic silhouette composition | **CHOSEN** |
| s42 | Round stone clocktower/watchtower (no spire), foreground wildflowers, warm gold tones, slightly smaller building fill in frame | runner-up |
| s11 | Bell tower with pagoda-influenced roof pitch, dense conifer forest both flanks, heavily amber/orange sky, bell visible inside tower window | eliminated |

**Why s7 wins:** The church-and-spire silhouette is the unambiguous signifier of "civilization restored" in European medieval visual vocabulary — exactly the register a victory screen needs. The river reflection doubles the light source, creating visual depth the other seeds lack. s42 is compositionally strong but reads as "watch post" not "triumph." s11 has superior warm saturation but the east-Asian roofline pitch breaks the setting's coherent visual period.

**Why this matters:** scene_victory is the last image the player sees after completing the dungeon. The final emotional cue is architectural. Church → collective triumph. Tower → personal observation. The choice is semantic, not aesthetic.

---

### scene_title — three seeds compared

Seeds examined: **s42** (chosen), **s7**, **s3**.

| seed | description | verdict |
|---|---|---|
| s42 | Pure silhouette panorama, all buildings in near-black against a blue-grey misty sky, atmospheric haze filling the mid-ground, varied roofline with bell tower | **CHOSEN** |
| s7 | Village street view with warm brown building facades showing stone texture, thatch detail, tall lit church spire at right, single tree in foreground — more readable but brighter | runner-up |
| s3 | Transition-hour scene (ambiguous dawn/dusk), warm amber on building walls, lighter sky but still misty, visually reads as early morning | eliminated |

**Why s42 wins:** A title screen for a dark dungeon crawler should withhold information and invite unease. s42's silhouette mode obscures Thornmere — you see the shape of a town but not its character. That ambiguity is what makes the player lean in. s7 is more attractive as art but more welcoming as image; "welcoming" is the wrong register for a game about descending into cursed crypts. s3 is eliminated immediately: dawn/morning lighting contradicts the game's persistent nocturnal tone.

**Sub-palette note:** s42 sub20 uses 20 colours including mist-blue and grey ramps — the palette naturally suppresses warmth, which reinforces the silhouette read. s7's warmer stone tones fight the dark-town concept at the colour level.

---

### pc_caster — three seeds compared

Seeds examined: **s42** (chosen), **s7**, **s3**.

| seed | description | verdict |
|---|---|---|
| s42 | Dark straight hair falling past shoulders, pale skin, blue faceted gem amulet at collar, dark robe with subtle blue sheen | **CHOSEN** |
| s7 | Light honey-blonde long hair, blue eyes prominent, blue collar trim — academic wizard aesthetic, lighter overall tone | runner-up |
| s3 | Light blonde/warm hair, similar face to s7, blue eyes, slightly different neckline — near-duplicate of s7 archetype | eliminated |

**Why s42 wins:** s7 and s3 both converge on the blonde-blue-eyed mage — a palatable academic type, but not palette-coherent with Thornmere's dark-fantasy tone. The sub14 allowed palette (indices: 0,1,2,3,11,12,13,14,15,16,17,28,29,30) skews towards grey-green and brown-gold ramps. Dark hair crushed against those tones reads clearly in game; light hair competes with the grey ramps and muddies the silhouette at small display sizes.

**The gem is the tie-breaker:** The blue amulet in s42 gives the caster a visual accent that reads as "magic item" at a glance. This gives the portrait an in-world prop that the warrior (armour) and rogue (blade) also carry. s7's lighter palette distributes the visual interest across hair and eyes — no single landmark for the eye to lock to.

**Identity note:** This choice is flagged in NEEDS-HUMAN.md. The physical presentation is a design decision, not a quality call.

---

## Acceptance criteria walkthrough — v2.1

Criteria derived from the original pipeline spec and PIPELINE-HANDOFF.md step list.

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | All 30 manifest entries: verdict set, status=imported | MET | `gen-manifest.json`: 30/30 entries `"status":"imported"`, all `"verdict":"replace"` |
| 2 | 42/42 test suite passes after all imports | MET | `npm test` output: `pass 42 / fail 0` (verified post-import) |
| 3 | Per-sprite sub-palettes recorded as art direction | MET | Each manifest entry has `"allowed":[...]` with specific index list; recorded before generation, not derived from output |
| 4 | Seeds recorded; any sprite regenerable bit-for-bit | MET | `chosen_seed` set for all 30 entries; `seeds_generated` lists all seeds generated; `host_gen.py` uses `torch.Generator("cpu").manual_seed(seed)` — CPU generator is deterministic |
| 5 | Mode-tagged filenames in candidates | MET | All crushed PNGs follow `<id>_s<seed>_sub<N>.png` pattern; gitignored as working artifacts |
| 6 | Contemporaneous review log (art-review.md) | MET | This file; verdict + one-line reasoning for all 30 entries; zero entries logged without reasoning |
| 7 | Loud failure on empty/invalid config | MET | `import_sprite.py` exits with `SystemExit` if `chosen_seed` is None; `generate.py` exits if `seeds_to_generate` is empty; `pixelcore.validate_allowed()` fails on empty or out-of-range |
| 8 | One verbatim style suffix per art class | MET | `gen-manifest.json` `"style_suffixes"` has four keys (monster, showpiece, character, scene); each entry's `style_suffix_key` points to one of these — never per-entry overrides |
| 9 | Import round-trip pixel-identical | MET | 11 entries sampled across all five art JSON files; re-derive index grid from candidate PNG using same `nearest_palette_idx` + `bg_indices` logic as `import_sprite.py`; 0 mismatches on all 11 (including largest: scene_title 10,240 px, scene_victory 19,200 px) |
| 10 | Frame-effect eye_pulse verified | MET | Programmatic check: all 24 eye_pulse-only entries — 0 errors, 0 outside-region changes; every pixel in eye region either brightened by exactly one BRIGHTEN step or is at-top-of-chain (left unchanged, correct) |
| 11 | Frame-effect breathe+eye_pulse verified | MET | All 4 PC portrait entries: full simulation of breathe (torso shift 1px down) then eye_pulse applied to frame_a; compared to frame_b pixel-by-pixel; 0 mismatches on all four |
| 12 | Dimension validation: target sizes present | MET | Test suite `art.test.js` validates every sprite's `rows` count == `h` and every row width == `w`; all imported sprites are at target dims (96×80 monsters, 32×40 PC portraits, 160×64/120 scenes); 42/42 pass confirms no dimension regressions |
| 13 | Showpiece ≥48×48 constraint | MET | Test 5 explicitly asserts `sp.w >= 48 && sp.h >= 48` for all five showpiece variants; imported showpieces are 96×80; 42/42 pass |
| 14 | Race × archetype × face portrait coverage | MET | Test 8 checks `pc_${race}_${arch}_${f}` for all races × archetypes × frames; people.json has variants mapping those keys to the imported base archetypes; 42/42 pass |
| 15 | NEEDS-HUMAN.md written | MET | `NEEDS-HUMAN.md` created; two flagged items (PC portrait identity, mon_skeleton palette shift); four art classes cleared with justification; zero-rejections rationale documented |
| 16 | Candidates directory gitignored | MET | `.gitignore` entry `dev/pixel-art/candidates/` added; confirmed not tracked |
| 17 | distrobox/GPU bridge used for all generation | MET | `generate.py` invokes `distrobox-host-exec bash -lc 'source ~/pixelart-venv/bin/activate && ...'`; no GPU code runs in the container; all 194 raws generated via this bridge in the prior session |

**Not-met / out of scope:**

| # | Criterion | Status | Note |
|---|---|---|---|
| A | Before/after captures (three standard scenes) | **MET** (audit-01 W-verification) | Live engine captures taken (`dev/advisor/render/live/`) against baseline `thornmere-start.png`; monster eye_pulse confirmed oscillating live at 400ms cadence |
| B | Icons (16×16) and FX sprites (24×24) updated | **RESOLVED — keep procedural** (audit-01 W8, director ruling 2026-06-11) | Small distance-scaled viewport elements (icons/FX/signboards/textures) read better as bold procedural pixel art than crushed FLUX; FLUX reserved for the large art windows (interiors/portraits) |
| C | Live in-game frame-effect timing (2–4 fps eye pulse) | **MET** (audit-01 W1) | Monster eye_pulse verified oscillating live (400ms, 2.5fps). PC portrait breathe+eye_pulse was invisible (`portraitOf` hardcoded `_a`) — **fixed in W1**; inspection portraits now animate |

---

## Feral re-prompt pass — 2026-06-10

**Trigger:** Director review of v1 AI imports identified four families as "too cute" / tonally
mismatched for a dark 1985-style dungeon crawler. A mid-pipeline directive to move mon_rat toward
"mangy/feral" was never written into the manifest, so the cute v1 subjects drove generation and
import. Fix: write feral subjects into manifest NOW (source of truth), regenerate all four families
to new output dir, adjudicate as humans.

**Families in scope:** mon_rat, mon_hound, mon_moth, mon_blob

**Subject changes recorded in manifest** (`data/art/gen-manifest.json`, status=regenerating):

| id | v1 subject (superseded) | v2 feral subject |
|---|---|---|
| mon_rat | large fen rat, upright pose, round grey body, round cupped ears... | gaunt mangy fen rat, hunched aggressive pose, matted patchy grey-brown fur with scabby bald patches, long yellowed incisors bared, ragged notched ears, scaly hairless tail, glinting malevolent red eyes |
| mon_hound | upright wolf hound, large stocky grey body, pointed ears, single large red glowing eye... | snarling gaunt wolf hound, ribs showing through matted grey fur, hackles raised, ears pinned flat, single huge red glowing eye, jaw agape with bared fangs, predatory hunched stance |
| mon_moth | giant basilisk moth with enormous spread wings, wings covered in concentric ring eye-spots... | sinister giant basilisk moth, ragged tattered-edged wings spread wide, hypnotic concentric ring eye-spots, spiny bristled antennae, gaunt chitinous segmented thorax, hooked clawed legs |
| mon_blob | amorphous tallow blob monster, tan-amber pyramid mound shape, two gold coin eyes... | dripping amorphous tallow blob horror, slumping half-melted wax mound, two uneven sunken gold eyes under sagging wax lids, wide drooping mouth with crooked embedded teeth, grasping pseudopod arms, greasy glistening surface |

**Pipeline:** `dev/pixel-art/generate_feral.py` — identical to generate.py except
`CANDIDATES_DIR = candidates-feral/` (no clobber of v1 set). v2 filenames follow same
`<id>_s<seed>_sub<N>.png` convention.

**v1 sub-palette tags** (will match v2 since allowed indices unchanged):

| id | sub tag |
|---|---|
| mon_rat | sub14 |
| mon_hound | sub12 |
| mon_moth | sub16 |
| mon_blob | sub12 |

### Generation log

GPU run: COMPLETE — 2026-06-10 23:30–23:35. All 24 raws + 24 crushed landed in `candidates-feral/`.

| id | seeds | raw exists | crush tag | crushed exists |
|---|---|---|---|---|
| mon_rat | 3,7,11,17,23,42 | YES (×6) | sub14 | YES (×6) |
| mon_hound | 3,7,11,17,23,42 | YES (×6) | sub12 | YES (×6) |
| mon_moth | 3,7,11,17,23,42 | YES (×6) | sub16 | YES (×6) |
| mon_blob | 3,7,11,17,23,42 | YES (×6) | sub12 | YES (×6) |

Comparison sheets: `art-review/feral-compare-<family>.png` (v1 frame-a reference + 6 feral candidates, 2740×376 each).

### Adjudication (to be filled after comparison sheets presented)

Human adjudication required — self-judging tone is what caused the v1 error.

| id | chosen_seed | crush_tag | verdict | notes |
|---|---|---|---|---|
| mon_rat | 11 | sub14 | replace | Hunched feral pose, dark grey facial shadow over face, two red eyes clearly read at game scale. Chosen over s17/s42 (bluer, colder) and s3 (warmer brown but less face shadow depth). |
| mon_hound | 7 | sub12 | replace | Snarling hunched wolf, dominant red-orange glowing eyes readable at game scale, good forward-lean aggression. Chosen over s3 (bulkier, less dynamic) and s42 (tighter portrait, less body presence). |
| mon_moth | 42 | sub16 | replace | Compact folded-wing pose — both concentric ring eye-spots visible, folded posture reads as resting predator. Chosen over spread-wing variants (s17/s23) which sacrificed ring readability for wingspan. |
| mon_blob | 11 | sub12 | replace | Two distinct sunken eye sockets clearly readable, wide open mouth with crooked embedded teeth. Better balance of horror and readability than s3 (too face-filling) or s42 (too compact). |

---

## Audit-01 re-adjudication (W2 / W3) — seed-vs-seed from existing candidates

Per `dev/advisor/audit-01.md` §7. These re-judge families the original pass
awarded to seed 42 on thin (AI-vs-procedural) reasoning. No regeneration — the
better seeds already existed on disk. Judged from crushed `_sub` candidates at
~2× game scale (montages `art-review/mon_<id>-readjudication.png`), then the
imported winner rendered from game data and viewed (`art-review/readjud/`).

### W2 — mon_spider: **FLIP s42 → s17**

The manifest's own key reads are a **two-segment body** (cephalothorax + abdomen)
and a **four-pair red eye cluster**. Per-seed (all sub13):

| seed | read | verdict |
|---|---|---|
| s3 | single-mass body; tiny compact red eyes, hard to count; fangs ok | weak eye cluster |
| s7 | single-mass body; a pair of larger reds, no clear cluster | misses two-segment |
| s11 | legs spread well; red cluster reads but body is one mass | runner-up (no abdomen) |
| **s17** | **distinct round abdomen above the cephalothorax; legible 4+ red-eye cluster; eight hairy legs spread; pale fangs; most menace** | **WINNER — clear win** |
| s23 | single round body; smaller pair of reds; less feature-rich | midpack |
| s42 (old pick) | competent but single-mass body and a red *pair*, not a clustered 8-eye arrangement — **misses both manifest key features** | superseded |

Imported s17 → `monsters.json`. Eye_pulse region re-measured on frame a (red
indices 25/26 cluster at x41–54,y27–36): `frame_regions.eye` updated from the old
s42-fitted `x28,y22,w40,h14` to **`x40,y26,w16,h12`**. Verified frame b brightens
only the eye box (185 px, all inside x40–55,y26–37). Confidence: clear win on
subject fidelity.

### W3 — mon_mock_king (showpiece): **FLIP s42 → s13**

Defining read (manifest): "blue-gold **tile** body… must look tiled/ceramic, not
smooth." Both the blind audit and the showpiece review independently flagged s42's
body as reading like **gilt plate, not tiled ceramic** — that is the defect this
re-adjudication exists to fix. Per-seed (all sub15, 10-seed showpiece):

| seed | read | verdict |
|---|---|---|
| s1 | clean balanced figure, two framed rectangular eyes, moderate gold grout | runner-up (tiling only moderate) |
| s3 | leaner/statue-like, moderate grout, narrower eyes | midpack |
| s5 | big medallion but body reads smooth, weak tile | smooth |
| s7 | smooth plastic body, single vertical line — minimal tiling | weakest tile read |
| s11 | mostly smooth, some grout | midpack |
| **s13** | **clearest gold-grout tile grid (decisive ceramic read); bright rectangular eyes; crown prongs; prominent medallion** | **WINNER — clear on the deciding criterion** |
| s17 | decent tiling, squat, good — but no standout | midpack |
| s23 | brightest eyes + most commanding squat silhouette, BUT crown reads as two **horns** (manifest wants three prongs) and tiling is panel-outlines, not a fine ceramic grid | strong runner-up; lost on tile + crown reads |
| s31 | narrow eyes, smooth body | smooth |
| s42 (old pick) | gold follows **segment edges = gilt plate**; eyes narrow, not glowing — the flagged defect | superseded |

Decision factor: s13 most decisively delivers the tiled-ceramic read (the named
gap) while still hitting crown prongs, glowing eyes, and medallion; s23 was close
on silhouette/eyes but its horn-crown and panel-outline body don't fix the tile
defect. Imported s13 → `monsters3.json`. Eyes located spatially (bright blues
22/23 also tile the body, so isolated the dense upper band rows 23–29, x36–57):
`frame_regions.eye` updated from s42-fitted `x28,y24,w40,h10` to **`x35,y22,w24,h9`**.
Verified eye_pulse on frames b and c brightens only the eye box (176 px, inside
x35–58,y22–30); c double-pulses brighter than b. Closes the showpiece review's
sole SHIP-WITH-NOTES reservation on this boss.

### W5 — Set-B spot re-judge (seed-vs-seed; ghost already confirmed, moth regenerated)

The 7 remaining Set-B families the original pass awarded to s42 on thin
(AI-vs-procedural) reasoning, re-judged as real contests from crushed sub
candidates at ~2× game scale (montages `art-review/w5/<id>-w5.png`). **No imports
made — per W5 protocol, any seed that beats s42 is FLAGGED for review, not flipped
silently.** Result: **6 of 7 uphold s42; 1 flagged (mon_golem).**

| family | key read | per-seed summary | verdict |
|---|---|---|---|
| **mon_sorcerer** | hood, knotted staff, blood-red eyes, bony hands | all 6 are strong hooded skull-mages; every key read lands on s42. s17 marginally richer (layered robe, both hands gripping). | **s42 holds** (close w/ s17) |
| **mon_bird** | outstretched wings, hooked beak, ember eyes, talons | consistent family; s42 has spread wings, glowing ember eyes, talons. s17 has the most body mass; s3/s7/s23 widest wingspan. | **s42 holds** (close w/ s17) |
| **mon_hag** | warty green skin, honey matted hair, hooked nose, claws, rotten teeth | s42 complete and menacing. *Family-wide note:* all 6 read as muscular green brutes, not a wizened "ancient" crone — a subject gap that needs a regen, not a re-pick (applies to every seed equally). | **s42 holds** |
| **mon_knight** | violet visor slit, kite shield, broadsword, plate | clean family; s42 among the strongest — prominent notched broadsword, shield, gold-dark decoration, commanding stance. | **s42 holds** (clear) |
| **mon_choir** | three singers wide, center taller, mouths open O, hollow eyes | s42 shows three clearly-open mouths, good three-wide spacing, center taller. s3/s11 equally good. | **s42 holds** |
| **mon_gargoyle** | two horns, ember eyes, fanged grin, spread stone wings | s42 lands all reads (horns, ember eyes, grin, warm umber wing membranes, crouch). s11 marginally more striking. | **s42 holds** (close w/ s11) |
| **mon_golem** | **sky-blue glowing chest rune** + eye slits, blocky head, wide shoulders | s42 has eye slits + blocky head + shoulders, but its **chest rune — the defining key read — is a modest small glyph**, while **s11 and s17 carry markedly larger, bolder geometric runes** that read better at game scale. | **⚑ FLAGGED — review s11/s17** |

**Flag detail (mon_golem):** not a miss (s42 has all reads present), but the
named defining feature (chest rune) is delivered more weakly by s42 than by s11
(bold circular rune) or s17 (large geometric rune). Recommend Dan/advisor review
the three side by side (`art-review/w5/mon_golem-w5.png`); if a flip is approved,
import via the W2/W3 protocol (re-measure the eye-slit region — s42's box was
fitted to its eye slits). Confidence: close call — s42 is acceptable, but the key
read is stronger elsewhere. **STOPPED here; no import.**

> **RESOLVED 2026-06-11 — Dan chose to flip to s17.** Imported s17 →
> `monsters2.json`: large bold geometric chest rune (the defining read now lands
> strongly), glowing eye slits. Eye-slit region re-measured to `x36,y19,w24,h7`
> (the slits sit at rows 20–24; the chest rune at rows 45–72 is left static).
> Verified eye_pulse brightens only the slit box (146 px, x36–59,y19–25). 42/42
> tests. So Set-B net result is **5/7 uphold s42, 2 flipped** (golem joins the
> outright-flip column with spider and mock_king from W2/W3).

*Net W5 outcome: the s42 table largely stands for Set B (6/7), with one soft flag.
This is a materially better evidentiary basis than the original "replace"
rationale, and it does not vindicate blanket trust in s42 (spider and mock_king
flipped outright in W2/W3) — the seed won where the field was even and lost where
a specific key read was contested.*

### W4 — mon_choir_eldest (showpiece): **NO SEED PASSES — regeneration required**

The showpiece review failed this boss as NOT BOX ART (`audit-01-showpieces.md`):
the black robe composites into the night background leaving no silhouette, and
the defining concentric-ring eye renders small and detached. W4 re-judges the 10
seeds for (a) robe value separation from the night bg and (b) a large eye seated
in the hood — importing only if a seed passes **both**.

**Structural root cause (not a seed problem):** the manifest `subject` says
*"**black** triangular robe"*, but `bg_indices` are `[0,1]` (black + night) — the
transparency keys. So any robe pixel painted black/night becomes invisible. The
shipped s42 is **88% black/night → only 12% visible**: a small eye and a scatter
of floating faces/hand, no figure (`art-review/w5/mon_choir_eldest-sheet.png`).

Judged each candidate **as it would ship** — re-indexed to palette, indices 0/1
made transparent, composited over the night bg `#16121e`
(`art-review/w5/mon_choir_eldest-shipsim.png`). Visible-mass = silhouette survival:

| seed | visible mass | robe silhouette (a) | giant eye in hood (b) |
|---|---|---|---|
| s1 | 14% | fail — robe transparent, bits float | small eye, top |
| s3 | 14% | fail | small eye |
| s5 | 16% | fail — thin edge only | small eye |
| s7 | 24% | partial — dim triangle | small eye |
| s11 | **37%** | **holds — triangular robe reads** | small eye |
| s13 | 31% | holds — dark triangular body | small eye |
| s17 | 29% | partial | small eye |
| s23 | 16% | fail | small eye |
| s31 | **36%** | **holds best — solid robed triangle** | small eye |
| s42 (cur) | 12% | **fail — worst; floating bits only** | tiny detached eye |

**Verdict: no seed passes both.** Criterion (a) is seed-dependent and several seeds
(s31, s11, s13) hold a real robe silhouette — but criterion (b) **fails on all
ten**: the concentric eye is small and top-mounted in every candidate, with the
trapped faces dominating (the composition is inverted — faces should be secondary
texture, the eye should dominate). **STOPPED — no import.**

**Regeneration required.** Manifest subject rewrite drafted in `audit-01.md` §7 W4,
**PENDING DAN approval of wording**:
> "vast robed figure in charcoal triangular robe with pale rim-lit hood and
> shoulder line filling the frame, one enormous concentric-ring eye seated inside
> the hood dominating half the figure with void center and blue iris and bright
> core and black pupil, dozens of tiny trapped faces embossed across the robe
> surface like imprisoned souls, green pendant gem, one skeletal clawed hand
> emerging"

The rewrite fixes both failures by construction: **charcoal** robe (index 2/3,
not the transparent black) holds a silhouette + a **pale rim-lit hood** edge for
separation; **enormous eye dominating half the figure** fixes the small-eye miss;
faces demoted to "embossed across the robe surface" (texture, not subject). On
regen, keep `bg_indices [0,1]` but ensure the robe lands on shadow/slate, not
black — add a manifest note to that effect.

**Optional zero-cost stopgap for Dan (NOT done here):** if an interim improvement
is wanted before the GPU regen, **s31** is the best existing silhouette-holder —
re-picking it would at least show a robed figure instead of floating bits, though
it still fails the giant-eye bar. This is a flip requiring review (W2/W3 protocol
+ re-measure the eye region), not an automatic action.

### W7 — PC portrait distinctness (warrior-s42 vs skald-s42): **DISTINCT — no change**

Report-only check (Dan kept all four s42 portraits). Rendered the imported Vael
base portraits side by side at game-display (5×) and true 1× game scale
(`art-review/w7/pc_warrior_vs_skald.png`). The audit flagged a risk that the two
warm-toned masculine portraits read as the same person, with the skald's "green
garb accent" too weak to separate them.

**Finding: they read as clearly distinct at both scales**, and the separation does
**not** rely on the weak green accent:
- **Warrior:** clean-shaven, short hair, stern face, **cool blue-grey plate**
  pauldrons.
- **Skald:** full **beard**, longer hair, holding a round **instrument** at the
  chest (a distinct lower-body silhouette the warrior lacks), all-**warm
  leather/brown** garb.

The instrument + beard + cool-plate-vs-warm-leather palette carry the distinction
even at 1×. The audit's "both warm brown/gold" concern was overstated — the
warrior reads distinctly cooler/armored. **No green touch-up or re-pick needed;
the keep-all-four-s42 decision stands cleanly.**

---

## W4 / W6 regeneration — v2 candidates (GPU run 2026-06-11 13:37–13:39)

Director-approved subjects generated via `generate_regen.py` → all raws + crushed
in `dev/pixel-art/candidates-regen-v2/` (never clobbering v1). Manifest auto-updated
to `status: candidates`. **Winners picked by human — presenting, not self-judging.**

### Generation + crush log
| family | seeds | raws | crush tag | crushed |
|---|---|---|---|---|
| mon_skeleton (W6) | 3,7,11,17,23,42 | 6/6 | sub11 | 6/6 |
| mon_choir_eldest (W4) | 1,3,5,7,11,13,17,23,31,42 | 10/10 | sub19 | 10/10 |

### W6 skeleton — regen SUCCEEDED (sheet `art-review/regen-v2/skeleton-v2-adjud.png`)
The inversion is fixed: **all 6 candidates are bone-white/grey skeletons holding a
GOLD SWORD** (hollow eye sockets, full ribcage) — the exact opposite of the v1
gold-bones/grey-sword miss. Gold is now correctly the *sword accent*. All six are
strong and close; differences are mostly sword pose. Worker read for Dan: s7/s17
have the cleanest upright gold sword + clearest skull; all are viable.
**IMPORTED — Dan picked s11 (2026-06-11).** Bone-white skull + ribcage, gold sword
the sole gold accent. Imported via explicit mode from `candidates-regen-v2/` (no
v1 clobber); eye_pulse region re-measured to the skull sockets `x40,y13,w16,h8`
(old box `x32,y16,w32,h10` was fitted to the v1 gold pixels); verified frame b
brightens only the socket box (53 px). 42/42 tests. **W6 closed.**

### W4 choir_eldest — regen SUCCEEDED (sheet `art-review/regen-v2/choir_eldest-v2-shipsim.png`)
Both v1 failure criteria resolved. Judged as-they'd-ship (transparency applied,
night bg): **visible mass jumped to 41–47%** (v1 s42 was 12%, v1 best s31 was 36%)
— the **charcoal robe now holds a strong triangular silhouette**, and the **large
concentric-ring eye is seated in a pale rim-lit hood, dominating the upper figure**
(criterion b, which ALL v1 seeds failed). Trapped faces correctly demoted to robe
texture; green pendant + skeletal hand present. All ten read as box-art now.
Worker read for Dan: s31 (deep dramatic hood, large seated eye), s23 (cleanest
concentric eye), s7/s1 (crisp balanced) are the strongest.
**IMPORTED — Dan picked s13 (2026-06-11).** Charcoal triangular robe holds a
strong silhouette; large concentric eye (blue iris, bright core, void center,
black pupil) seated in a pale rim-lit hood and dominating the upper figure; faces
demoted to robe texture; green pendant + skeletal hand. Imported via explicit mode
from `candidates-regen-v2/` (3 frames; c double-pulses). Eye region re-measured to
the concentric eye `x39,y15,w16,h15` (old box `x30,y14,w36,h24`); verified
eye_pulse on b and c brightens only the eye box (153 px), c brighter than b.
**Both v1 NOT-BOX-ART failures resolved. W4 closed.**

---

## W8 interiors — v2 batch (prompt fix) results (2026-06-11)

Director review of v1 found HUD bleed + an empty-feeling world + an illegible
belltower. v2 regenerated all 9 with: suffix fix (no "game screen art"/"game
asset"; added "no text/UI/HUD"), social rooms populated (no NPC overlay exists in
the engine — `renderer.interior` draws one full scene), belltower reworked to a
bronze bell + daylight. Output: `candidates-interiors-v2/` (v1 kept). Sheets:
`art-review/interiors-v2/<id>-sheet.png` (6 seeds each, crushed, ~2× game scale).

**All three issues resolved (worker verification):**
- **UI bleed gone** — the v1 offenders (int_review s23, int_spark s17, int_hall
  s11) and the rest are clean; the quest board in int_hall now reads as a board,
  not a "QUEST" menu.
- **World feels alive** — int_hall (adventurers + quest board), int_greta
  (shopkeeper + shelves), int_review (magistrate + gallery), int_temple (priest
  tending candles), int_spark (mage + blue crystals), int_goose (patrons +
  bartender), int_hart (travellers + fireplace) all populated; figures survive
  the 96×72 crush as readable silhouettes. int_tannery + int_belltower stay
  deserted by design.
- **Belltower legible** — every seed now reads as a tower: prominent bronze bell,
  bright daylight through louvered windows, timber beams.

**Awaiting Dan's per-interior winner picks (9).** Then import (rename int_*_a →
int_* to replace the procedural sprites so resolveVariant finds the AI art) and
tighten per-winner palettes if any crush muddy.

---

## W8 interiors — resolution bump to 112×80 + import (2026-06-11)

Director sanity-checked against original Bard's Tale Amiga screenshots
(`dev/original-amiga-screenshots/`): the original monster/interior art window is
**~117×83 native, drawn 1:1**. Our crush was 96×72 (interiors) / 96×80 (monsters)
— slightly *under* the original. 96 was the largest native width the art-box
still doubled to a crisp 2× (96→192px). Decision: bump **interiors to 112×80**
(≤117, ~1.4 aspect matching the original), re-crush from the 480×360 raws (cropped
to 1.4 to avoid distortion). Before/after confirmed a real gain, strongest on the
populated rooms (figures read crisper).

Renderer: `artBox` gained a `cap` param; `interior()` passes 224 so 112-wide art
displays at 2× (224px) instead of dropping to 1× under the 192 cap. Surgical —
monsters/portraits unchanged (per "interiors only for now").

Imported 8 winners at 112×80 → `signs.json`, renaming `int_<id>_a` → `int_<id>`
to replace the procedural sprites (so `resolveVariant('int_<id>')` finds the AI
art): belltower s11, hall s11, goose s23, hart s17, review s42, spark s42,
tannery s42, temple s42. 42/42 tests.

**int_greta still pending** — Greta is a woman's name; v2 rendered a male
shopkeeper, so her subject was rewritten female and she regenerates fresh at
448×320 (`generate_interiors.py --id int_greta`), then imports as the 9th.
Open follow-up: if 112×80 reads better in-game, consider re-crushing the
monsters/showpieces/portraits to 112-wide too (no-GPU re-crush + re-import pass).

**int_greta IMPORTED s11 (2026-06-11)** — female Greta (stout matronly aproned
shopkeeper behind the counter, stocked shelves, customer) at 112×80, renamed to
replace the procedural. **All 9 interiors now AI art at 112×80. W8 interiors
batch COMPLETE.**

---

## Monster/showpiece re-crush to 112×93 (2026-06-11)

Follow-up to the interior 112×80 bump: re-crushed all 24 monster/showpiece
sprites from their chosen-seed raws (96×80 → 112×93, preserving the 1.2 portrait
aspect). Same composition at higher res, so eye_pulse `frame_regions` scaled
linearly (×112/96, ×93/80) — no manual re-measure. Crushed previews →
`candidates-112/` (no clobber). Raws sourced correctly: feral families from
`candidates-feral/`, skeleton/choir_eldest from `candidates-regen-v2/`, the rest
from `candidates/`. `combatPortrait` cap raised to 224 so 112-wide monsters
display at a crisp 2× (224px), matching interiors. Verified eye_pulse lands on
the eyes/visor for spider/golem/mock_king/candleking/knight; 42/42 tests.
Batch script: `dev/pixel-art/recrush_monsters_112.py`.

---

## Ornate DOM chrome — period UI pass (2026-06-12)

Hand-pixeled in `tools/gen_chrome.js` → `data/art/chrome.json`, rendered with
`tools/artrender.js`, judged from PNGs at scale 8–16. Brass thorn-vine on
umber/peat (dark Thornmere palette), 9-slice `border-image` sources for CSS plus
a title-screen thorn-vine the framebuffer tiles. Stolen-in-spirit from the Amiga
ornate frame in `dev/original-amiga-screenshots/`, never its cream colours.

- **chrome_frame** (36×36, slice 12) — PASS. `art-review/chrome_frame.png`.
  Corner brass bosses, winged clasps on top/bottom edges, four-point diamonds on
  the sides, gold rules in/out over umber. Tiling cells verified seamless: top
  edge cable runs y5/6 full-width so clasps chain; side cable x5/6 full-height.
  Caveat: corner bosses are square-blocky (acceptable studs, not filigree).
- **chrome_panel** (12×12, slice 4) — PASS. Slim carved bevel: gold-dark outer
  rule, bone/stone light on top-left, slate/shadow dark on bottom-right, umber
  inner. Replaces the flat 1px slate panel borders.
- **chrome_plaque** (32×16, 9-slice caps 4 / middle tiles) — PASS w/ caveat.
  `art-review/chrome_plaque.png`. Gold-rimmed wooden nameplate, scroll caps with
  candle highlight. Caps are simple (4px) — readable as a plaque; revisit if it
  looks thin behind the location text in-browser.
- **chrome_button** (12×12, slice 4) — PASS. Raised carved bevel, candle/gold
  light top-left, leather/peat shadow bottom-right, gold-dark outer rule.
- **chrome_button_down** (12×12, slice 4) — PASS. `art-review/chrome_button_down.png`.
  Inverted bevel (light bottom-right) reads as pressed/inset. First draft was
  too uniformly bright; ramp split into peat top-left / candle bottom-right fixed
  it.

In-browser border-image judging (the true test of tiling/scale) recorded below
as screens are wired.

### In-browser border-image verdicts (2026-06-12)

Wired into `style.css` as `border-image` (assets/chrome/*.png at 2×, displayed
1:1, `image-rendering: pixelated`). Judged live via Playwright. Cache note: the
dev server (`tools/devserver.py`) gained a `/vN/` cache-bust prefix because
Chromium clung to stale ES modules from the pre-`no-store` server.

- **Outer frame** on `#game` — PASS. `art-review/chrome-after-title.png`. Brass
  thorn-vine reads ornate and period at the container scale; `round` repeat tiles
  the clasps with no seams; corners crisp.
- **Title-screen framebuffer border** (`renderer.ornateScreenBorder`) — PASS.
  Same `chrome_frame` tiled into the 320×240 framebuffer; nests inside the DOM
  frame like the Amiga's layered borders. First fix needed: `chrome` was missing
  from `art.js` SPRITE_DOCS, so the sprite was undefined and it fell back to a
  plain gold rect — added and re-verified.
- **Panel bevels** on `.panel` — PASS. `art-review/chrome-after-explore.png`.
  Slim carved frame replaces the flat 1px slate; gold blackletter data-title
  tabs sit on the top rail.
- **Location plaque** (`#loc`) — PASS. Carved nameplate centred under the
  viewport ("Bellward"), gold-on-umber, display font — the Amiga "The guild"
  nameplate equivalent. `#loc` is now populated with the street/map name
  (`src/main.js`), previously empty outside debug.
- **Carved buttons** (`#cmdbar button`, `.nav`) — PASS. Raised bevel + umber
  fill + gold blackletter keycap; hover = candle-glow text (no bg swap);
  `:active` swaps to the inset `chrome_button_down` bevel. No flat-modern hover
  remains.

Before = the Phase-1 commit (flat 1px borders, Courier). All acceptance points
for the chrome pass met: ornate frame, plaque, period type, dark Thornmere
palette; no flat-modern borders/buttons remain.

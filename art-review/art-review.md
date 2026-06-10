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

<!-- verdicts logged as each family is drawn -->

---

## Step 6 — characters, icons, FX, scenes

<!-- verdicts logged as each sprite is drawn -->

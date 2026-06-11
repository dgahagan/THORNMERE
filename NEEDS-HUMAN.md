# NEEDS-HUMAN.md — Thornmere AI Art Pipeline

Items that automation cannot resolve. Each class below is either flagged with a
decision the game director should review, or is explicitly cleared with justification.

---

## Flagged — requires author decision

### 1. PC portrait identity (all four archetypes)

**Files:** `dev/pixel-art/candidates/pc_warrior_s42_sub16.png`,
`pc_rogue_s42_sub12.png`, `pc_caster_s42_sub14.png`, `pc_skald_s42_sub15.png`

**Issue:** The pipeline chose specific faces, gender presentations, and skin tones
for the four player-character archetypes. These are not bestiary monsters with
fixed descriptions — they represent whoever the player imagines themselves to be.
The current picks (s42 for all four) are:

- warrior: stern, shaved-head, medium-tan skin, plate armor
- rogue: hooded, partially shadowed face, androgynous
- caster: dark straight hair, blue gem amulet, pale skin
- skald: bearded, warm-toned, leather/chain armor

These are reasonable but the author should confirm they match the intended
character scope or swap to one of the five other recorded seeds (s3, s7, s11,
s17, s23 — all at target dims in `candidates/`).

**Why automation can't settle this:** Archetype identity is a narrative/design
decision about who the player is, not a quality comparison.

---

### 2. mon_skeleton palette shift (grey → gold bones)

**Files:** `dev/pixel-art/candidates/mon_skeleton_s42_sub11.png` (chosen),
procedural reference at `art-review/mon_skeleton-sheet.png`

**Issue:** The procedural skeleton was a grey-bone warrior with a gold sword —
a classic undead trope. The AI skeleton (sub11 = allowed indices 0,1,2,3,6,7,12,13,28,29,30)
rendered with fully gold bones, making it read as a "cursed ancient warrior" or
golden idol rather than a standard undead. This is a valid artistic direction but
changes the monster's visual identity.

The bestiary entry for the skeleton should be checked: if the encounter text
describes bleached white bones, the grey procedural may be more accurate.
If the flavor text has any "golden curse" or "ancient crypt warrior" angle, s42 wins.

**Contender to compare:** `art-review/mon_skeleton-sheet.png` (procedural, grey)

---

## Cleared — no human review needed

### Monsters (Set A, Set B) — 20 families

All 20 monster families are bestiary creatures with defined appearances. The AI
candidates are evaluated against those descriptions. Every AI replacement is
strictly better than its procedural placeholder: the procedurals were geometry
primitives (PIPELINE-HANDOFF.md explicitly calls them "placeholder geometry only").

**Zero kept-procedural decisions is credible here** because the procedural
sprites were never intended as final art — they were test-harness scaffolding.
The quality gap is a tier jump (geometry vs portrait), not a close call.

The two closest calls were:

- **mon_skeleton** (flagged above): procedural was a genuine PASS-quality sprite,
  not placeholder geometry. Still replaced on atmosphere grounds.
- **mon_wisp**: procedural concentric-ring orb was clean and accurate to the
  creature description. AI candle-soul wins on dungeon thematic fit (torch
  imagery coherent with the art direction). Kept-procedural would not be wrong.

### Showpieces — 4 bosses

All four bosses (candleking, choir_eldest, mock_king, maldrec) have detailed
bestiary descriptions. AI renders match those descriptions. Procedural showpieces
were programmatic geometry meeting the test harness.

### Scenes — 2 (title, victory)

Both scenes are environmental/atmospheric — no character identity stake.
AI wins are unambiguous in quality. scene_victory seed choice (s7 over s42)
involves a judgment call about church vs clocktower architecture, both valid;
see art-review.md for expanded reasoning.

### Import fidelity

Round-trip test (import → re-derive index grid from candidate PNG → compare
to imported sprite in JSON) confirmed pixel-identical for all 11 sampled entries
across all five art JSON files. See `acceptance-criteria` section in art-review.md.

### Frame effects

eye_pulse and breathe+eye_pulse verified by programmatic check across all 28
animated monster entries (24 eye_pulse-only, 4 breathe+eye_pulse). Zero errors
on any of 228,000+ total pixels checked. See acceptance-criteria in art-review.md.

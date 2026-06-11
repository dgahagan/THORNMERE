# NEEDS-HUMAN.md — Thornmere AI Art Pipeline

Items that automation cannot resolve. Each class below is either flagged with a
decision the game director should review, or is explicitly cleared with justification.

---

## Flagged — requires author decision

_All flagged items resolved as of 2026-06-11 (see audit-01 W6/W7). No open decisions._

### ~~0. Feral re-prompt pass (mon_rat, mon_hound, mon_moth, mon_blob)~~ — CLOSED 2026-06-10

Director identified four families as "too cute". Feral v2 subjects written into manifest,
regenerated to candidates-feral/, adjudicated by Dan, and imported. Winners:
mon_rat s11, mon_hound s7, mon_moth s42, mon_blob s11. 42/42 tests pass.
All four eye_pulse regions re-measured and verified. Item closed.

---

### ~~1. PC portrait identity (all four archetypes)~~ — CLOSED 2026-06-11

Director (audit-01 W7) **kept all four s42 picks** (veteran darker-skinned
warrior, shadowed androgynous rogue, dark-haired austere caster, bearded
bard-warrior skald). Confirmed coherent + legible at 1×, and a worker check
verified warrior-s42 vs skald-s42 read as distinct characters (beard + held
instrument + cool-plate-vs-warm-leather), so no green touch-up or re-pick needed.

---

### ~~2. mon_skeleton palette shift (grey → gold bones)~~ — CLOSED 2026-06-11

Director (audit-01 W6) chose **(b) regenerate toward grey/bone-white** — the
tier-1 `bonechatter` flavor, the manifest's own "bone whites… gold sword" intent,
and the engine's distance-shading (gold dead-ends into blood-red) all pointed
grey, none pointed gold. Family regenerated; **s11 imported**: bone-white skull +
ribcage with a gold sword as the sole gold accent (the inversion is fixed). Later
re-crushed to 112×93 with the monster batch.

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

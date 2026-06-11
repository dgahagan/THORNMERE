# Thornmere Art Pipeline Handoff

## Decision

Portrait-class art (monster families set B, character portraits, icons, FX sprites, scene illustrations)
will be produced by an AI-generation pipeline rather than programmatic pixel-art generators.
This document records what was finished, what was abandoned mid-stream, and what the next session
needs to know.

---

## What is committed and complete

| Commit | Step | Art class | Status |
|--------|------|-----------|--------|
| 39e62ec | Step 1 | Renderer plumbing: artBox formula 140→192px, `tools/artrender.js` PNG export tool, `art-review/` dir | DONE |
| 08668e5 | Step 2 | Wall/door textures 11 sprites: 16×16 → 32×32 — all PASS inspected | DONE |
| c82defc | Step 3 | Signboards (9 × 36×28) + interiors (9 × 96×72) — all PASS inspected | DONE |
| ed31fb5 | Step 4 | Boss showpieces 4 × 96×80 × 3 frames (candleking, choir_eldest, mock_king, maldrec) — all PASS | DONE |
| 1146bfb | Step 5a | Monster set A 11 families × 2 frames 96×80 (rat, beetle, hound, spider, snake, zombie, skeleton, blob, wisp, brute, humanoid) — all PASS | DONE |
| a8b85cf | Fix | Add `anims` + `variants` to set A and showpiece generators; regenerated JSON — 42/42 tests green | DONE |
| 1fed105 | Step 5b | Monster set B 9 families × 2 frames 96×80 (sorcerer, ghost, bird, hag, knight, choir, gargoyle, golem, moth) — 42/42 green, **visual inspection deferred** | DONE (tests pass) |
| ffc1bd3 | Art-direction v2 setup | Director rejected 4 families (rat, hound, moth, blob) as "too cute"; wrote feral subjects into manifest, created generate_feral.py (outputs to candidates-feral/) | DONE |
| 75f2d14–223a75b | Art-direction v2 import | GPU re-generation + adjudication + import of feral winners: mon_rat s11, mon_hound s7, mon_moth s42, mon_blob s11 — 42/42 tests green, eye_pulse verified | DONE |

The test suite (`npm test`) runs 42/42 green as of the v2 feral import pass (2026-06-10).

---

## What was in progress and is now abandoned

**Programmatic monster set B visual inspection** — `tools/gen_monsters_b.js` produces syntactically
valid 96×80 sprites that satisfy all data-integrity tests, but they have never been rendered and
reviewed. They are placeholder geometry only. The AI pipeline should overwrite `data/art/monsters2.json`
with real generated art; the generator script can then be deleted or archived.

**Steps 6–8 (characters, icons, FX, scenes, README, final commit)** — not started. All these art
classes are in scope for the AI pipeline.

---

## Agreed target dimensions per art class

| Art class | File | Sprite size | Notes |
|-----------|------|-------------|-------|
| Wall/door textures | `data/art/textures.json` | 32×32 | 11 sprites; artBox scale=6 |
| Signboards | `data/art/signs.json` | 36×28 | 9 signs; scale=8 |
| Interior scenes | `data/art/signs.json` | 96×72 | 9 interiors; scale=3 |
| Boss showpieces | `data/art/monsters3.json` | 96×80 | 4 bosses × 3 frames |
| Monster set A | `data/art/monsters.json` | 96×80 | 11 families × 2 frames |
| Monster set B | `data/art/monsters2.json` | 96×80 | 9 families × 2 frames |
| PC portrait chips | `data/art/people.json` | 32×40 | 4 classes × 1 frame (was 24×24) |
| PC icons | `data/art/people.json` | 16×16 | 10 icons (was 8×8) |
| FX sprites | `data/art/ui.json` | 24×24 | (was 16×12–16) |
| Title scene | `data/art/scenes.json` | 160×64 | (was 140×56) |
| Victory scene | `data/art/scenes.json` | 160×120 | (was 100×72) |

---

## Art JSON format (required for every sprite file)

```json
{
  "sprites": {
    "mon_rat_a": { "w": 96, "h": 80, "legend": { ".": -1, "A": 6, ... }, "rows": ["..."] }
  },
  "anims": {
    "mon_rat": { "frames": [{"sprite": "mon_rat_a", "ms": 400}, {"sprite": "mon_rat_b", "ms": 400}] }
  },
  "variants": {
    "tallow_king": { "base": "mon_candleking" }
  }
}
```

Key rules for the test suite to pass:
- Every sprite in `rows` must have every character present in `legend`, including `".": -1` for
  transparent pixels.
- Every bestiary monster needs `anims.has('mon_' + portrait_family)` to be true (test 4).
- Boss variants `tallow_king`, `choir_eldest`, `mock_king`, `maldrec`, `maldrec_image` must exist
  in `variants` pointing to a base anim whose sprites are ≥48×48 (test 5).
- The `resolveVariant` chain in `src/ui/art.js` loads all three sections from each JSON doc.

---

## Renderer changes (what was plumbed in Step 1)

- `src/ui/renderer.js` — artBox formula changed from `Math.max(1, Math.floor(140/max))` to
  `Math.max(1, Math.floor(192/max))`. At 96×80 this gives scale=2.
- `tools/artrender.js` — standalone PNG export tool using Node.js `zlib`. Usage:
  ```
  node tools/artrender.js <sprite-or-anim-name> <scale> [output.png]
  node tools/artrender.js --sheet <prefix> <scale> [output.png]
  ```
  Composites against palette[1] (#16121e night) background. Reads all art JSON files
  from `data/art/`.

---

## What the next session needs to do

1. **Replace `data/art/monsters2.json`** with AI-generated art for the 9 set B families.
   Format must match the JSON spec above (sprites + anims sections required).
2. **Populate `data/art/people.json`** with PC portrait chips (32×40) and icons (16×16).
3. **Populate `data/art/ui.json`** FX sprites (24×24).
4. **Populate `data/art/scenes.json`** title (160×64) and victory (160×120) scenes.
5. **Update dimension validation tests** in `test/art.test.js` to assert new target sizes
   rather than the old ones.
6. Run `npm test` — target 42/42 green.
7. README before/after screenshots and final commit.

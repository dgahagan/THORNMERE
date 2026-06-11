# Audit 01 — Director Decisions

**Decided by:** Dan (game director), 2026-06-11.
**Resolves the three PENDING DAN items in `audit-01.md` §7 (W6, W7, W8).**
This file is the durable record of the rulings — per the project hard rule that
art direction must not live only in chat. The worker session executes against
these.

---

## W6 — mon_skeleton: grey vs gold bones → **REGENERATE TOWARD GREY**

Ruling: **branch (b)** from `audit-01-needs-human.md` Brief 2.

The gold import (all six seeds) inverted the manifest's design of record
("bone whites… gold *sword* accent" → gold bones + grey sword), fights the
tier-1 `bonechatter` flavor, and dead-ends into blood-red under engine
distance-shading. Regenerate the family toward bone-white.

Worker steps (the W6(b) payload, now un-gated):
1. **Before any GPU run**, replace the `mon_skeleton` manifest `subject` with:
   > `"animated skeleton warrior, bleached bone-white and pale grey bones, chalk-coloured skull with dark hollow eye sockets, visible ribcage, exposed spine and hip joints, holding a single gold sword as the only gold accent"`
   De-emphasise "yellowed" (the likely gold trigger). Keep allowed indices.
2. New output dir `candidates-skeleton-v2/` (never clobber v1).
3. Prepare exact host generation commands for Dan; STOP for the GPU run.
4. Human adjudication → import → **re-measure the `eye` frame_region**
   (current box x32,y16,w32,h10 was fitted to the gold pixels).
5. 42/42 tests; commit "art-direction v2: mon_skeleton grey re-prompt".

---

## W7 — PC portrait identity → **KEEP ALL FOUR s42**

Ruling: accept the audit's default position. No seed swaps.

Default party stands: veteran darker-skinned warrior (s42), shadowed
gender-ambiguous rogue (s42), dark-haired austere caster (s42), bearded
bard-warrior skald (s42). All survive the 1× crush; all keep skin on the
ancestry-remap-safe palette indices {13,12,11,9}.

Worker steps:
- The only remaining sub-item is the **W7 report-only check**: render
  warrior-s42 and skald-s42 side by side at true 1× and confirm they read as
  distinct characters (the manifest's "green garb accent" on the skald is weak
  in the import). Report only — **no change unless they read as the same
  person**, in which case flag for a follow-up green touch-up (do not act
  silently).
- No portrait imports. No `people.json` changes.

---

## W8 — Asset scope → **EXPANDED: regenerate ALL Claude-procedural graphics through the local AI pipeline**

The original W8 question was narrow (FX sprites only). Dan's ruling is broader:

> "These should be in scope as well as the textures (txt_boards.png, etc…) and
> the sign-sheet. Basically we should update all previously claude generated
> graphics with the local AI system python scripts. That way all graphics will
> be of similar quality."

**Intent:** bring every asset that was *hand/procedurally authored by Claude*
(and therefore never ran through the FLUX pixel-art pipeline) up to the same
quality bar as the FLUX-generated monsters/portraits/scenes. Uniform quality
across the whole game.

**Confirmed scope — the three asset files NOT in `gen-manifest.json`** (the
manifest holds exactly the 30 FLUX-pipelined `mon_*`/`pc_*`/`scene_*` ids; these
are absent from it, i.e. they are the procedural set):

| File | Generator (to be retired) | Count | Sprites |
|---|---|---|---|
| `data/art/textures.json` | `tools/gen_textures.js` | 11 | tex_*_wall / *_door (town, under, barrow, needle, riddle), tex_facade, tex_boards — 32×32 **tileable** |
| `data/art/signs.json` | `tools/gen_signs.js` | 18 | sign_* signboards (36×28) ×9 + int_* interior scenes (96×72) ×9 |
| `data/art/ui.json` | hand-authored | 12 | fx_* viewport FX (stairs_down/up, chest, mouth, mouth_open, danger, seal, gate) ×8, sign_generic, ui_compass, ui_note_a, ui_note_b |

≈ **41 sprites** across three files.

**Flags the worker must resolve before generating (do NOT assume):**
1. **Tileable textures** — the 11 `tex_*` are seamless 32×32 tiles. FLUX output
   is not seamless by default; the pipeline needs a tiling/edge-wrap step or
   these will seam visibly on dungeon walls. This is a real pipeline gap, not a
   subject-line tweak — scope it first, it may need its own approach.
2. **Tiny UI glyphs** — `ui_compass`, `ui_note_a/b` (and `font.json` glyphs,
   which are explicitly out) are functional ~16px glyphs. The audit found
   existing icons are "already polished pixel art" and the v2.1 spec excludes
   "small UI icons." Confirm with Dan whether these tiny glyphs are in or out
   before spending generation on them; default-include the 8 `fx_*` and
   `sign_generic`, default-question the three `ui_*`.
3. `font.json` is text glyphs, **out of scope** (not art).

**Worker approach (mini-pipeline per file, manifest-first):**
- Add manifest entries (with `subject` lines written FIRST) for each in-scope
  sprite before any generation — same hard rule as every other pipeline run.
- New candidate dirs per batch (`candidates-textures/`, `candidates-signs/`,
  `candidates-ui/`), never clobber.
- Standard generate → crush → human-adjudicate → import flow. GPU runs are
  Dan's command.
- This is a multi-batch effort; sequence it after the W1–W6 remediation lands
  so the game is otherwise stable. Record the in-scope ruling and the tiling
  decision in `PIPELINE-HANDOFF.md`.

---

*These three rulings un-gate W6, W7, and W8 in the worker remediation message.
W1–W5 and W9 were already decision-free. The asset-regeneration expansion (W8)
is the largest remaining body of work and warrants its own discovery/scoping
pass before generation — especially the tileable-texture problem.*

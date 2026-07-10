# CLAUDE.md — The Lay of Thornmere

Bard's Tale (1985)-faithful first-person dungeon crawler. 320×240 indexed
framebuffer, 32-color palette (`data/art/palette.json`), all art stored as
text-grid pixel maps with legends in `data/art/*.json`, all audio synthesized.
No build step, no npm deps — plain ES modules served statically.

## Commands

- `npm start` — serve at http://127.0.0.1:8377
- `npm test` — full suite (42 tests). **The original 27 logic tests are
  sacrosanct**: never edit them to make them pass; a change that breaks them
  is wrong until proven otherwise.
- `node tools/artrender.js <sprite|--sheet prefix|--all> [scale] [outdir]` —
  render sprites from game data to PNG. Judge art from these renders.
- Smoke harness: `test/smoke.html` / `test/smoke.js`, driven via
  `tools/drive.js` (see `test/README.md`).

## Hard rules (paid for in tokens and hours — do not relearn them)

- **Incremental writes.** Any file that accumulates generated content is
  written after every item. Never compose content inside reasoning and dump
  it at the end; progress must always be on disk.
- **Commit per family/phase.** Small logical commits; the git log is the
  status report. No `Co-Authored-By` lines.
- **Contemporaneous logs.** Review verdicts go into
  `art-review/art-review.md` AS items are inspected, including rejections
  with reasons. A review log with zero FAILs will not be believed.
- **Judge only rendered output.** Art verdicts come from crushed/rendered
  PNGs at game scale — never from raw generations, never from text grids.
- **Mode/state in filenames** (`_raw`, `_subN`, version tags), never
  implicit. New candidate batches go in new directories; never clobber a
  prior set.
- **Loud failures.** No silent fallbacks; a step that can't be completed is
  reported, not papered over.
- **Chunk long work.** No single command sized near the bash timeout.
- Supervision triad: liveness = file timestamps, quality = rendered output,
  safety = git log.

## Art pipeline (AI-generated assets)

- `data/art/gen-manifest.json` is the production record and the regeneration
  source of truth. **Art-direction changes must be written into the manifest
  `subject` field before any generation run** — a directive that lives only
  in chat will be lost (this happened; see the "too cute" regeneration pass).
- Local FLUX.2-klein pipeline lives in `dev/pixel-art/`; candidates in
  `dev/pixel-art/candidates*/`. GPU generation is executed by Dan on the
  host — sessions prepare exact commands and stop.
- Import winners with `tools/import_sprite.py`. When sprite art changes,
  re-measure `frame_regions` (eye_pulse boxes were fitted to the old pixels).
- Paper trail: `dev/PIPELINE-HANDOFF.md`, `art-review/art-review.md`,
  `dev/NEEDS-HUMAN.md`, plus the manifest. (`dev/` is untracked — local only.)

## Areas

- `dev/` — build provenance: the phased prompts that created the game, the
  runbook (`dev/thornmere-runbook.md`), the art pipeline spec
  (`dev/Prompt_art_pipeline.md`).
- `dev/advisor/` — the read-only advisor session's output (audits, briefs,
  delegation prompts). Worker sessions read it; only the advisor writes it.

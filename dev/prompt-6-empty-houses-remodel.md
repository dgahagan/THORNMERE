# PROMPT 6 — Empty houses: town remodel for density (Plan B)

**Model: Opus** (`/model opus`) for the whole run. This is the contingency pass:
hand-editing the 24×24 town edge-grid, save migration, and harness retuning all
need careful spatial reasoning. **Run in a fresh session.**

**Prerequisite:** Plan A (`prompt-5-empty-houses.md`) is merged — the mechanic
(`rollHouseEncounter`, `enterEmptyHouse`, the renderer `house*` door branch, and
the `int_house_*` interior art) already exists and works. This pass only changes
the **town map layout, tuning, and supporting docs/tests** — no new game systems.

Full rationale and the locked design decisions live in
`dev/empty-houses-plan.md` §5. Read it first; this prompt implements **Plan B**.

**Only run this if Plan A's feel warrants it** — i.e. 4 houses reads as too thin
or door-camping (re-bumping one door) reads as cheesy in playtest. If Plan A
already feels good, do **not** run this pass.

Paste everything below this line.

---

Plan A shipped enterable houses on the 4 existing empty cells. This pass
reclaims the dead building-interior footprint the design flagged and raises
grind **density** while removing door-camping — by spreading **~12–16** small
houses across the town so the natural play becomes "patrol the abandoned
quarter" (a circuit), not standing at one door.

## Ground rules

- **Read first:** `dev/empty-houses-plan.md` §5, `data/maps/town.json` (the
  `hw`/`vw` edge grids, `cells`, `streets`, `entry`, `encounters`),
  `src/core/maze.js` (`edgeState` ~50, `step` ~71, `cellSpecial` ~43), the map
  atlas `dev/maps.md` and whatever tool generates it (provenance in recent
  commits), and `dev/designer-guide.md`.
- **The 27 original logic tests are sacrosanct** and untouched. This pass is
  data + tuning + docs; no core logic changes. `npm test` green after every
  phase.
- **Geometry is the dangerous part.** Every change to a building footprint
  ripples into the `hw`/`vw` edge grids and the renderer's signboard/door
  placement. Validate connectivity programmatically (Phase 1) before trusting an
  eyeball. **No silent fallbacks** — a house with no reachable door is a bug,
  not flavor.
- **All CLAUDE.md hard rules apply:** incremental writes; commit per phase;
  judge any new pixel art only from `tools/artrender.js` renders; log art
  verdicts in `art-review/art-review.md`; loud failures.
- Keep the game runnable and committed after each phase.

## Phase 1 — Map remodel (`data/maps/town.json`)

- **Keep the 9 signed landmark buildings** (`hall`, `greta`, `review`, `temple`,
  `spark`, `belltower`, `goose`, `hart`, `tannery`) — they own the interior art
  and the services — but **shrink their oversized 5×4 footprints** (target 3×3
  or 2×3). Their interior art is keyed by id and is footprint-independent, so
  shrinking is safe; only re-place each landmark's signed **door edge** so it
  still faces a walkable lane and the renderer signboard still draws.
- **Carve the freed cells into ~12–16 single-cell `house*` cells**
  (`{t:'building', id:'houseN', name:'...'}`, varied nondescript names),
  **spread across all four quarters**, with **alleys cut through** so no cell is
  walled off. Each `house*` cell needs **exactly one `d` (door) edge** facing a
  walkable lane and walls (`1`) on its other edges.
- Update `entry` only if the remodel disturbs (4,16); the spawn must stay
  walkable and not boxed in, with the hall door still sensibly reachable from it.
- Update the `streets[]` rects so the named-street zones still match the new
  layout (flavor only — `streetAt` — but keep it honest).
- **Build/extend a validation check** (a small script or a test) that asserts,
  against the final `town.json`:
  1. every `house*`/landmark cell has exactly one door edge,
  2. every walkable cell is reachable from `entry` (flood fill),
  3. no walkable cell is orphaned, and `entry` itself is walkable.
  Run it and paste the clean result before committing.
- Render the town atlas and **eyeball connectivity** against the validator.
- Commit: "Town: remodel for house density — shrink landmarks, add houses".

## Phase 2 — Save migration & automap safety (`src/`)

- A saved party can be standing on a cell that is now a wall/building. Add a
  **load-time sanity check** that detects an out-of-bounds or in-wall party
  position in town and nudges it to `entry` (with a loud `msg`), so old saves
  don't trap the player. Keep it minimal and town-scoped.
- Confirm the town **automap** reveal keys on coordinates, not cell ids, so a
  loaded automap isn't corrupted by renamed/added/removed cells. If it keys on
  ids, fix the load path to tolerate unknown ids.
- Add/extend a test for the load-time nudge (new test file; never edit the 27).
- Commit: "Town: save-load nudge for remodeled geometry; automap safety".

## Phase 3 — Retune encounter rate (harness)

- With a 12–16 house circuit, Plan A's 25% day rate over-feeds XP. **Retune
  `encounters.house.dayRate`** (expect it to settle ≈15–20%) and `nightRate`
  (≈30%) via the `dev/playtest/` harness to hit the §6 metric:
  *a fresh six-character party reaches a comfortable pre-dungeon level by
  patrolling the quarter, with ≤1 wipe across tuned runs, while night-house
  looting still risks a wipe (gate-wight drain intact).*
- Only if harness data shows camping **survives** the spread: add a light
  per-house cooldown (skip the roll for N turns after an encounter there). Do
  **not** add it pre-emptively.
- Record before/after numbers in a short note (append to
  `dev/playtest-report-v2.md` or a v3 stub).
- Commit: "Balance: retune house encounter rates for remodeled town".

## Phase 4 — Art variety & docs

- Optionally add **1–2 more `int_house` variants** for the higher house count
  (same pipeline as Plan A Phase 3: manifest `subject` entries → host gen by Dan
  → `tools/import_sprite.py` → judge renders → log verdicts). If you add
  manifest entries, **stop for the human gen step**; don't fake the art.
- **Regenerate the map atlas `dev/maps.md`** and update `dev/designer-guide.md`
  links — the derived difficulty/geometry summary references the town.
- `README.md`: update the houses note if the count/feel changed materially.
- Strike the closed item from `dev/backlog.md` if present.
- Commit: "Docs: regenerate town atlas + designer guide for remodel".

## Acceptance criteria

- ~12–16 plain-door (signless) houses spread across the town's four quarters;
  the 9 landmarks remain, shrunk, with their signed doors intact and reachable.
- The connectivity validator passes: every house has one reachable door, every
  walkable cell is reachable from `entry`, nothing orphaned.
- An old save standing where geometry changed loads cleanly (party nudged to
  `entry` with a message), and the automap is uncorrupted.
- Harness: a fresh party reaches a comfortable pre-dungeon level by patrolling,
  ≤1 wipe across tuned runs; night looting still risks a wipe.
- The 27 original logic tests pass untouched; full suite green; smoke clean.
- Atlas + designer-guide regenerated; any new int_house art has logged verdicts.

Finish with a playtest script: a full day-grind **circuit** of the quarter
(showing density without camping, clock staying in daylight), a night looting
run that punishes carelessness, and a load of a pre-remodel save proving the
nudge works.

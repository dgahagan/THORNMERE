# PROMPT 5 — Empty houses: enterable doors with encounters (Plan A)

**Model: Sonnet** (`/model sonnet`) for the whole run — this is mostly data +
plumbing against tested code. Escalate to **Opus only** if the Phase 1 core work
tempts you toward refactoring `rollEncounter` (it must not change behavior — see
ground rules). **Run in a fresh session.**

Full design rationale and the deferred Plan B (map remodel) live in
`dev/empty-houses-plan.md` — read it first; this prompt implements **Plan A**.

Paste everything below this line.

---

The game is complete and playable. This pass adds **enterable "empty houses"** to
the town: plain (signless) doors the party can bump to roll a high-density
encounter against the *existing* day/night tables, so a low-level party can earn
XP/gold/loot in daylight without braving the dungeon — and without burning so
many street-steps that the clock rolls into the lethal night (the failure
`dev/playtest-report-v2.md` documents).

**Scope is Plan A only:** ship the mechanic + interior art on the **4 existing
empty cells**. No town map-geometry changes — that is the deferred Plan B.

## Ground rules

- **Read first, then touch:** `dev/empty-houses-plan.md`,
  `src/core/maze.js` (`rollEncounter` ~296, `step` ~71, `advanceClock` ~117),
  `src/main.js` (`openBuilding` ~1093, `handleEvents` ~600-625, `startCombat`
  ~1616, tavern brawl ~1542), `src/ui/renderer.js` (building-door branch
  198-200, `interior` ~401), `data/maps/town.json` (cells + `encounters`).
- **The 27 original logic tests are sacrosanct.** Do **not** refactor
  `rollEncounter`'s street path — its seeded RNG call order is asserted. Add the
  house roll as a *sibling* function; duplicating ~8 lines is correct here. A
  shared helper is allowed only if you prove the street path's RNG sequence is
  byte-identical. `npm test` green after every phase.
- **No npm deps, no build step.** New art is text-grid JSON in the existing
  `data/art/` format; new interior images come through the FLUX → import
  pipeline (Phase 3) like the W8 interiors.
- **All CLAUDE.md hard rules apply:** incremental writes; commit per phase;
  judge pixel art only from `tools/artrender.js` renders; log art verdicts
  (FAILs included) in `art-review/art-review.md` as you inspect; loud failures
  (no silent fallbacks).
- Work in phases, committing and keeping the game runnable after each.

## Phase 1 — Core house-encounter roll + data

- `data/maps/town.json`: convert the 4 `empty*` cells to enterable houses
  (keep coordinates; id prefix `house`, varied nondescript names):
  - `8,9` → `{t:'building', id:'house1', name:'A Quiet House'}`
  - `14,9` → `{t:'building', id:'house2', name:'An Empty House'}`
  - `8,13` → `{t:'building', id:'house3', name:'A Shuttered House'}`
  - `14,13` → `{t:'building', id:'house4', name:"A Cottager's House"}`
- Add a `house` sub-block to `encounters` (shares the day/night *tables*, owns
  its *rates*):
  ```json
  "house": { "dayRate": 25, "nightRate": 40, "find": { "chance": 12, "gold": "1d6" } }
  ```
- `src/core/maze.js`: add exported `rollHouseEncounter(game, rng, events)` that
  mirrors `rollEncounter` but takes the rate from `enc.house.dayRate/nightRate`
  (by `isNight`) while drawing groups from `enc.day`/`enc.night` for the current
  time. Same `{type:'combat', groups}` output, or nothing on a miss.
- New test file (do not touch originals): seed the RNG and assert (a) the
  elevated rate fires/misses as expected, (b) day vs night selects the right
  table, (c) a regression guard that `rollEncounter`'s street outcomes are
  unchanged from a recorded baseline.
- Commit: "Town: empty houses — core roll + town data".

## Phase 2 — Wiring, door render, interior peek

- `src/main.js` `openBuilding` (~1093): route houses **before** the `empty*`
  branch — `if (id.startsWith('house')) return enterEmptyHouse(id, name);` —
  keep the boarded-`empty*` branch intact for future decor.
- Add `enterEmptyHouse(id, name)`: `sfx('door')` → `advanceClock` +
  `rollHouseEncounter` → if combat, `startCombat({ groups })` (same path as the
  event switch at ~622); else roll the `find` (12% → `+1d6` gold,
  `msg(..., 'good')`) then show the interior peek.
- Add `interiorPeek(name)`: a transient card (not a menu mode) that draws
  `renderer.interior(name, 'house')` with a flavor line and waits for Space/Esc
  → `setMode(exploreMode)`. Entry must cost **exactly one** clock turn total.
- `src/ui/renderer.js` building-door branch (198-200): add a `house*` case —
  plain `style.door`, **omit `sign`** so no signboard draws; leave `empty*` →
  `style.boards` (+sign). Verify nothing else relied on the old empty-door
  texture.
- Graceful degradation: if `resolveVariant('int_house')` is null (art not yet
  imported), the peek shows flavor text + placeholder card — never a crash.
- Smoke-check via `tools/drive.js`: plain door / no sign renders; bump → combat
  on a hit; bump → peek (+occasional gold) on a miss.
- Commit: "Town: enter empty houses — combat or interior peek".

## Phase 3 — Interior art (manifest + gen handoff; then STOP)

- Add **3** `interior` entries to `data/art/gen-manifest.json` using the W8
  `int_hall` entry as the template (`art_class:"interior"`,
  `art_file:"data/art/signs.json"`, `dims:[112,80]`, gen 448×320, seeds
  `[3,7,11,17,23,42]`, broad interior `allowed` palette). Subjects (humble /
  abandoned, dim, **no people, no text/UI**):
  - `int_house` — humble abandoned fenland cottage, cold hearth, broken stool,
    dusty table, shuttered window, cobwebs, dim grey light.
  - `int_house2` — ransacked one-room house, overturned chest, scattered straw,
    a guttering tallow candle, damp stone walls, shadows.
  - `int_house3` — shuttered parlor, sheet-draped furniture, cobwebbed rafters,
    a single shaft of pale light through a cracked shutter.
- Per CLAUDE.md, **GPU generation runs on the host (Dan), not in-session.**
  Write the manifest `subject` fields, print the exact `dev/pixel-art/`
  generate commands, **commit the manifest, and STOP for the human gen step.**
- Commit: "Art: int_house interior manifest entries (gen pending)".

## Phase 4 — Import, tune, verify (after gen)

- Import chosen seeds with `tools/import_sprite.py` (manifest mode) into
  `data/art/signs.json` as `int_house_a/b/c`. Judge rendered PNGs at game
  scale; log verdicts (FAILs included) in `art-review/art-review.md`.
- Run the `dev/playtest/` harness. **Tune `dayRate` within [20%, 35%]** to hit:
  *a fresh six-character party wins ~5 day fights in under ~200 clock-turns,
  zero wipes*, while night-house looting still risks a wipe (gate-wight drain
  intact). Record before/after town win counts in a short note (append to
  `dev/playtest-report-v2.md` or a v3 stub).
- `README.md`: one-line note on enterable houses. Strike the closed item from
  `dev/backlog.md` if present.
- Commit: "Art: import int_house variants; tune house encounter rate".

## Acceptance criteria

- Each former-empty cell shows a **plain door with no signboard**; bumping it
  opens with the door sfx (not the boarded-bump message).
- Entry rolls combat at the configured day/night rate: **day** fights are
  fen-stray/footpad only; **night** fights can include gate-wights.
- A miss shows an `int_house` interior card + flavor, with ~12% minor gold find.
- Entry costs exactly **1** clock turn; a fresh party clears ~5 day fights well
  inside daytime without a wipe (harness-verified).
- The 27 original logic tests pass untouched; full suite green; smoke clean.
- `art-review/art-review.md` shows contemporaneous verdicts for every int_house
  variant, rejections included.

Finish with a short playtest script: walk the town by day, enter each house
showing a combat and an empty peek with a find, then enter a house at night
showing the harder table — and confirm the clock stays in daylight across a
full day-grind circuit.

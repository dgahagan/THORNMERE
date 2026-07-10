# Empty Houses — design & implementation plan

**Status:** Plan A **DONE** (2026-06-14). Plan B designed as a contingency
(do only if Plan A's feel/tuning warrants more grind density).

This file is the durable source of truth. Two session prompts are generated
*from* it: `dev/prompt-5-empty-houses.md` implements **Plan A** (the mechanic,
on the 4 existing empty cells), and `dev/prompt-6-empty-houses-remodel.md`
implements **Plan B** (the town remodel) — run only if Plan A's feel warrants
more density. Plan A is a prerequisite for Plan B.

---

## 1. Problem (from the playtests)

`dev/playtest-report-v2.md` is blunt: *"Town fighting is a night activity, and
night is where you die."* The failure is a math trap, not a balance number:

- Day street encounters fire at **1%/step** (`data/maps/town.json` →
  `encounters.day.rate`). Winning ~5 fights needs hundreds of steps.
- The clock advances **+1 every step and every combat round**
  (`maze.js:109`, `combat.js`), and night begins at **turn 280 of 400**
  (`gamestate.js` `NIGHT_AT`/`DAY_LEN`; `isNight` at line 79).
- So the grind *itself* rolls the party into night (6% rate, gate-wights that
  **permanently drain levels**). The report measures ~2.2 of ~5 town fights
  landing at night even untried; the default party caps at ~3.7 town wins
  before a wipe.

**Root cause: encounter density per turn is too low, and turns are what kill
you.** Fix = make a *deliberate action* (entering a house) far denser than a
street step, so the party gets its fights in few turns and never drifts into the
kill-box.

## 2. Engine facts that shape the design

- Buildings are **bump-blocks, not walk-in rooms.** Facing a building cell fires
  `{type:'building', id, name}` and the party does **not** move onto the cell
  (`maze.js:92-94`). A 5×4 building is 20 cells of *visual footprint* the party
  already can never stand on. Empty houses will work the same way: a door you
  bump, not a room you traverse. **No new map-traversal code.**
- The renderer already branches on empty cells: facing a building door draws
  `style.door` + a signboard, except `empty*` ids draw `style.boards` and still
  pass a sign (`renderer.js:198-200`). Flipping empties to a **plain door, no
  signboard** is a ~3-line change.
- Combat can be started outside `step()`: the tavern brawl calls
  `startCombat({groups})` directly (`main.js:1542`; `startCombat` at `:1616`).
  The event switch routes `{type:'combat'}` → `startCombat` (`main.js:622`).
- The encounter roll (`maze.js:296 rollEncounter`) already selects the day/night
  table for town (`:300`) and builds groups from a weighted table (`:305-317`).
  Reusable for houses with a different *rate* but the **same tables** (so day
  houses spawn the same easy fen-strays/footpads — no new monster data).
- Interior art is data-driven: `renderer.interior(name, id)` resolves
  `int_<id>` via `resolveVariant` (`renderer.js:401-406`), rotating variants
  (`int_house_a/b/c`). Pipeline = manifest entry → FLUX on host (Dan) →
  `tools/import_sprite.py` (template: the W8 `int_hall` entry in
  `data/art/gen-manifest.json`).

## 3. Design decisions (locked)

- **Plain door, no sign** = the visual grammar for "nondescript enterable
  house." Signed door = known service building; plain door = unknown house.
- **Entering = 1 turn** (advance clock by 1, like a step) and plays the `door`
  sfx. Keeps light clock pressure; combat rounds still advance the clock, so a
  grind session lands well short of night (target metric in §6).
- **Encounter on entry uses the existing day/night tables**, at an **elevated,
  data-driven rate**:
  - **Day: 25%** per entry (25× the street step). Tune in **[20%, 35%]**.
  - **Night: 40%** per entry, **night table** (gate-wights etc.) — poking into
    dark houses after dark is deliberately high-risk / high-reward.
- **No-encounter entry is not wasted:** show a **house-interior image**
  (`int_house` variants) + flavor, with a **small ~12% chance of a minor gold
  find** (`1d6`). Not guaranteed loot (no money printer).
- **No party-level scaling** anywhere (consistent with the rest of the game;
  difficulty is day-vs-night only). Slight early over-leveling is *desirable* —
  it's the stated goal of letting a fresh party climb before the dungeon.

## 4. Plan A — Minimal (implement now)

Scope: ship the mechanic + art on the **4 existing empty cells** only. No map
geometry changes. 4 re-enterable houses is enough to validate the loop and tune
the rate. Door-camping (re-bumping one door) is *tolerated* in A; Plan B solves
it by spreading houses so a patrol circuit is the natural play.

### 4.1 Data — `data/maps/town.json`

1. Convert the 4 `empty*` cells to enterable houses (id prefix `house`, plain
   door, varied nondescript names). Coordinates stay:
   - `8,9` `empty3` → `{t:'building', id:'house1', name:'A Quiet House'}`
   - `14,9` `empty4` → `{t:'building', id:'house2', name:'An Empty House'}`
   - `8,13` `empty1` → `{t:'building', id:'house3', name:'A Shuttered House'}`
   - `14,13` `empty2` → `{t:'building', id:'house4', name:'A Cottager's House'}`
2. Add a `house` sub-block to `encounters` (shares the day/night *tables*, owns
   its *rates*):
   ```json
   "house": { "dayRate": 25, "nightRate": 40, "find": { "chance": 12, "gold": "1d6" } }
   ```

### 4.2 Core — `src/core/maze.js`

- Add an exported `rollHouseEncounter(game, rng, events)` that mirrors
  `rollEncounter` but reads `enc.house.dayRate/nightRate` for the rate while
  drawing groups from the same `enc.day`/`enc.night` table for the current time.
- **Do NOT refactor `rollEncounter`'s existing street path** — the 27 sacrosanct
  logic tests assert seeded outcomes and depend on its exact RNG call order.
  Duplicating ~8 lines is zero-risk; an optional shared helper is allowed *only*
  if the street path's RNG sequence is provably unchanged.
- Returns the same `{type:'combat', groups}` event shape, or nothing on a miss.
- Reuse `advanceClock(game, rng, events)` for the turn cost.

### 4.3 Wiring — `src/main.js`

- In `openBuilding` (`:1093`), route **before** the `empty*` branch:
  ```js
  if (id.startsWith('house')) return enterEmptyHouse(id, name);
  ```
  Keep the existing `empty*` boarded-flavor branch for any future decor cells.
- `enterEmptyHouse(id, name)`:
  1. `sfx('door')`.
  2. Build an events array; `advanceClock` + `rollHouseEncounter`.
  3. If a `combat` event → `startCombat({ groups })` (same path as `:622`).
  4. Else → roll the `find` (12% → `+1d6` gold, `msg(..., 'good')`), then show
     the interior peek (§4.4).

### 4.4 Interior peek — `src/main.js` + `src/ui/renderer.js`

- The empty-entry display is a transient art card, **not** a menu mode. Add a
  tiny `interiorPeek(name)` flow that draws `renderer.interior(name, 'house')`
  with the flavor line and waits for Space/Esc → `setMode(exploreMode)`.
- `renderer.interior(name, 'house')` already resolves `int_house` and rotates
  variants — no renderer change needed for the peek itself.

### 4.5 Door rendering — `src/ui/renderer.js:198-200`

- Add a `house*` case to the building-door branch: plain `style.door`, **omit
  `sign`** so no signboard draws. Leave `empty*` → `style.boards` (+ sign) for
  future boarded decor. Example:
  ```js
  if (st === 'door') {
    if (beyond.id.startsWith('house')) return { tex: style.door, roof: town };
    if (beyond.id.startsWith('empty')) return { tex: style.boards, sign: beyond, roof: town };
    return { tex: style.door, sign: beyond, roof: town };
  }
  ```

### 4.6 Art handoff — `int_house` variants

- Add **3** interior entries to `data/art/gen-manifest.json` (template: the W8
  `int_hall` entry — `art_class:"interior"`, `art_file:"data/art/signs.json"`,
  `dims:[112,80]`, gen at 448×320, seeds `[3,7,11,17,23,42]`, `allowed` =
  broad interior palette). Subjects (humble/abandoned, candle/dim, no people):
  - `int_house` — "interior of a humble abandoned fenland cottage, cold hearth,
    a broken stool and a dusty table, shuttered window, cobwebs, dim grey light"
  - `int_house2` — "interior of a ransacked one-room house, overturned chest,
    scattered straw, a guttering tallow candle, damp stone walls, shadows"
  - `int_house3` — "interior of a shuttered parlor, sheet-draped furniture,
    cobwebbed rafters, a single shaft of pale light through a cracked shutter"
- **GPU generation is run by Dan on the host** (per CLAUDE.md). The session
  writes the manifest `subject` fields + prints exact `generate.py` commands,
  then **stops**. Import the chosen seeds with `tools/import_sprite.py`
  (manifest mode) into `data/art/signs.json` as `int_house_a/b/c`. Judge only
  rendered PNGs at game scale; log verdicts (incl. FAILs) in
  `art-review/art-review.md` as you inspect.
- If art isn't ready, the peek must **fail loud-soft**: `resolveVariant`
  returning null should show flavor text + a placeholder card, never a crash.

### 4.7 Tests & verification

- `npm test` green; **the 27 original logic tests untouched and passing.**
- New test file (never edit originals) for `rollHouseEncounter`: seeded RNG →
  asserts the elevated rate fires/misses correctly and that day vs night picks
  the right table. Confirm the street-path `rollEncounter` outcomes are
  byte-identical to before (regression guard for the no-refactor rule).
- Smoke (`test/smoke.html` / `tools/drive.js`): enter a house → combat; enter
  again → empty peek + occasional find; confirm plain door / no sign renders.
- Run `dev/playtest/` harness; record before/after town win counts in a short
  note appended to `dev/playtest-report-v2.md` (or a v3 stub).

### 4.8 Acceptance (Plan A)

- Facing a former-empty cell shows a **plain door, no sign**; bumping it opens
  (door sfx), not the boarded-bump message.
- Entry rolls combat at the configured day/night rate; day fights are
  fen-stray/footpad only; night fights can include gate-wights.
- Empty entry shows an `int_house` interior card + flavor; ~12% minor gold find.
- Entry costs exactly 1 clock turn; a fresh party can win ~5 **day** fights well
  inside daytime (metric §6) without a wipe.
- 27 logic tests untouched; full suite green; smoke clean; art verdicts logged.

## 5. Plan B — Moderate remodel (contingency)

Trigger: Plan A proves the loop fun but 4 houses feels thin / door-camping reads
as cheesy. Goal: **density + anti-camp via spread**, and reclaim the dead
building-interior footprint the user flagged.

### 5.1 Map redesign — `data/maps/town.json`

- Keep the **9 signed landmark buildings** (they own the interior art and the
  services) but **shrink their oversized 5×4 footprints** (e.g. to 3×3 / 2×3),
  and carve the freed cells into a **warren of ~12–16 single-cell `house*`
  cells spread across all four quarters**, with **alleys cut through** so no
  cell is walled off and every house faces a walkable lane.
- Spread is the anti-camp mechanism: grinding becomes "patrol the abandoned
  quarter," which blends in a little street-encounter chance and feels active.
- Re-validate edge grids (`hw`/`vw`): every `house*` cell needs exactly one
  `d` (door) edge facing a walkable lane and walls elsewhere; no orphaned
  walkable pockets; the party `entry` (4,16) stays valid and not boxed in.

### 5.2 Supporting changes

- Encounter rate likely **lower** than Plan A's 25% once a circuit exists (more
  houses per loop) — retune via harness; expect the day rate to settle lower
  (≈15–20%) so a 12–16 house loop yields ~3 fights without over-feeding XP.
- Optionally add 1–2 more `int_house` variants for visual variety at the higher
  count.
- Consider a light **per-house cooldown** (skip the roll for N turns after an
  encounter there) only if harness data shows camping survives the spread.

### 5.3 Migration / regen concerns

- **Save compatibility:** geometry changes can trap a party saved standing on a
  now-wall cell. The map is static data and saves store party pos — add a
  load-time sanity check that nudges an out-of-bounds/in-wall party to `entry`.
- **Automap:** confirm town reveal keys on coordinates, not cell ids (renaming/
  adding cells must not corrupt a saved automap).
- **Regenerate docs:** re-run the map atlas (`dev/maps.md`) and update
  `dev/designer-guide.md` links; the derived difficulty summary references town
  geometry.

### 5.4 Tests & acceptance (Plan B)

- 27 logic tests untouched; full suite green.
- Add a **map-validation test**: no `house*` cell without a door edge; no
  walkable cell unreachable from `entry`; party `entry` walkable.
- Harness: a fresh party reaches a comfortable pre-dungeon level by patrolling
  the quarter, with ≤1 wipe across tuned runs, and night remains lethal enough
  to punish careless looting.
- Atlas + designer-guide regenerated and committed.

## 6. Tuning targets (both plans)

Primary metric (via `dev/playtest/` harness): **a fresh six-character party can
win ~5 day fights in under ~200 clock-turns with zero wipes**, while a party
that loots houses *at night* still risks a wipe (gate-wight drain intact).
Secondary: post-grind gold/XP closes the ~100–175g muster shortfall called out
in `dev/playtest-report-v2.md` without trivializing the dungeon.

## 7. Risks / open questions

- **27-test fragility around `rollEncounter`** — enforced by the no-refactor
  rule (§4.2); the regression guard test makes a violation loud.
- **Door-camping in Plan A** — accepted for validation; Plan B fixes it.
- **Art latency** — peek must degrade gracefully until `int_house_*` imports.
- **Over-leveling** — judged desirable; revisit only if the harness shows the
  dungeon trivialized.

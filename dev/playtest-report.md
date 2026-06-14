# Thornmere Playtest Report — Surviving Town & the First Dungeon

*Goal: win 5 battles in town, then 5 in the first dungeon. Learn across 10
attempts, then recommend a party and a way to play it.*

**Date:** 2026-06-13 · **Branch:** `polish-pass-ui-gameplay`

---

## TL;DR — why you keep dying, and how to stop

The default party isn't the trap. **Three habits are:**

1. **Your two mages have no spells.** A freshly-loaded Fen-Pact starts with
   *zero* spells — the Hexen and Lorist are 4-HP dead weight until you visit the
   **Review Board** and buy tier-1 spells. Buying them is the single biggest
   lever measured: Undercroft success **18% → 75%**.
2. **You're fighting at night.** Town **by day** is almost safe (1% encounter
   rate, only fen-strays/footpads). Town **at night** is a kill-box (6% rate —
   *six times* as many fights — including **gate-wights** that drain your levels
   permanently). Wander long enough and the clock rolls to night on its own.
3. **You don't go back to town between fights.** Clearing fights back-to-back
   ("attrition") with no Temple/Spark-House trips is a near-guaranteed wipe even
   for a *good* party (**28%** success). Heal and recharge between fights and the
   same party hits **98%**.

Do all three (plus reroll for decent stats and put your two tankiest bodies up
front) and a level-1 party clears town + the Sunken Undercroft **~98% of the
time** in Remastered, **~80–97%** in Legacy.

And: **the Sunken Undercroft (via the Tannery) is the first dungeon.** The
Howling Barrow (East Gate) is a tier harder — even the tuned party wins it only
**10%** of the time at this level. Go there *after* you've leveled in the
Undercroft.

---

## How this was tested (methodology)

A **hybrid** approach, agreed up front:

- **Headless simulation on the real engine.** A Node harness
  (`dev/playtest/harness.mjs`) loads the actual game data and drives the *real*
  `src/core` combat code (`combat.js`, `character.js`, `leveling.js`,
  `services.js`, …) — not a re-implementation. A "smart player" policy chooses
  orders each round (heal a hurt ally, AoE/fear a cluster, nuke the biggest
  group, melee in front, defend/advance when out of reach) and runs the
  between-fight town economy (Temple heal, Spark-House recharge, tavern wine,
  Review-Board leveling). This let the "10 attempts" learning loop run over
  **many seeds** per configuration instead of one lucky run.
- **Live Playwright showcase.** The winning build was then played through the
  actual browser UI (screenshots in repo root: `showcase-*.png`) to confirm the
  harness matches reality. The tuned party won a town footpad fight and a
  9-enemy Undercroft swarm at **character level 1 with zero deaths** — the
  casters did most of the killing, exactly as the sim predicted.

Encounters are drawn from the real map tables (`data/maps/*.json`) using the same
weighting `maze.rollEncounter` uses. Two regimes are reported throughout:

- **managed** — the careful player returns to town to heal/recharge/level
  between fights.
- **attrition** — no town trips; just keep walking and fighting (the "walking
  around getting destroyed" scenario).

Reproduce: `node dev/playtest/run-experiments.mjs 40`,
`node dev/playtest/run-supplemental.mjs 40`, `node dev/playtest/run-attempts.mjs`.

---

## The diagnosis: where the default party actually dies

| Build | Mode/Regime | Success | Wipe | Town wins | Dungeon wins | Avg deaths |
|---|---|--:|--:|--:|--:|--:|
| **DEFAULT** (no spells) | remastered/managed | 18% | 83% | 5.0 | 1.9 | 6.1 |
| **DEFAULT** (no spells) | remastered/attrition | 0% | 100% | 4.0 | 0.2 | 6.0 |
| DEFAULT + tier-1 spells | remastered/managed | 75% | 25% | 5.0 | 4.3 | 2.3 |
| DEFAULT + tier-1 spells | remastered/attrition | 0% | 100% | 4.9 | 1.1 | 6.0 |
| **TUNED** | remastered/managed | **98%** | 3% | 5.0 | 4.9 | 0.6 |
| **TUNED** | remastered/attrition | 28% | 73% | 5.0 | 2.8 | 5.0 |
| TUNED | legacy/managed | 80% | 20% | 5.0 | 4.4 | 1.5 |
| TUNED | legacy/attrition | 28% | 73% | 5.0 | 2.8 | 5.0 |

*(40 seeds per row.)*

Read it this way:

- **Town day is a non-event.** Every build wins all 5 town fights — the day
  encounter rate is 1% and the foes are fen-strays/footpads. If you're "getting
  destroyed in town," you are almost certainly fighting **at night**…
- **…and night is a different game.** Default party, town-at-night, no town
  trips: **1.6 town wins, 100% wipe** (supplemental table below). Gate-wights
  (3d8 HP, chill-touch *drain*, 180 XP) and footpad/tough swarms tear up a
  level-1 line, and a drained level doesn't come back without a Temple visit you
  can't yet afford.
- **The Undercroft is where the no-spell party dies.** It survives town (5/5)
  then averages **~1.9 dungeon wins before wiping**. The two mages contribute
  nothing, so there's no burst damage and no in-combat healing.
- **Attrition is fatal for everyone.** Even the tuned party drops to 28% if it
  never returns to town — SP runs dry, wounds stack, and one bad initiative
  round cascades into a wipe.

### Town at night & the other dungeon (supplemental, 40 seeds)

| Case | Success | Wipe | Town wins | Dungeon wins |
|---|--:|--:|--:|--:|
| TOWN-NIGHT, default, managed | 8% | 93% | 2.7 | 1.1 |
| TOWN-NIGHT, default, attrition | 0% | 100% | 1.8 | 0.1 |
| TOWN-NIGHT, tuned, managed | 88% | 13% | 5.0 | 4.6 |
| BARROW, default, managed | 0% | 100% | 5.0 | 0.1 |
| BARROW, tuned, managed | 5% | 95% | 5.0 | 0.9 |
| BARROW, tuned, legacy/managed | 0% | 100% | 5.0 | 0.8 |

The default party **cannot reliably even clear town at night** (2.7/5). The
Barrow eats *everyone* at level 1.

---

## The 10 attempts — learn as you go

Each attempt changes **one thing** based on what the last one taught. For each:
the configuration, the lesson, a 30-seed success/wipe rate, and one detailed
"showcase" run so the story isn't a lucky roll. Full data:
`dev/playtest/attempts-detail.json`.

### Attempt 1 — Default party, no spells, no town trips, drifting into night
*Reproduce the player's experience: take the pre-built party and just walk around.*
- **Config:** remastered / attrition / **town-NIGHT** / Undercroft
- **Rate (30 seeds):** success **0%**, wipe **100%**, town wins **1.6**, dungeon **0**
- **Showcase:** won 3 town fights, then `1×footpad + 2×gate_wight` → **defeat**;
  whole party dead.
- **Lesson:** Night town + no spells + no healing = dead before the dungeon.

### Attempt 2 — Same party, but fight by DAY
*Avoid the night gate-wights.*
- **Config:** remastered / attrition / day / Undercroft
- **Rate:** success **0%**, wipe **100%**, town wins **4.0**, dungeon **0.3**
- **Showcase:** wiped to `4×fen_stray` in town (focus fire on a squishy), never
  reached the dungeon.
- **Lesson:** Day is far safer, but with no spells and no healing you still
  attrition out — even fen-strays kill if you never recover HP.

### Attempt 3 — Buy tier-1 spells for the two casters
*Visit the Review Board. The mages finally do something.*
- **Config:** remastered / attrition / day / Undercroft
- **Rate:** success **0%**, wipe **100%**, town wins **5.0**, dungeon **1.2**
- **Showcase:** swept town 5/5, took one Undercroft fight, then `4×sodden_dead`
  finished the stragglers.
- **Lesson:** Spells fix town entirely and get you *into* the dungeon — but
  without recharging, SP runs out after ~2 fights and it collapses again.

### Attempt 4 — Return to town between fights (Temple + Spark House) ⟵ the turning point
*Heal wounds, recharge SP, restore songs, train levels.*
- **Config:** remastered / **managed** / day / Undercroft
- **Rate:** success **77%**, wipe **23%**, town wins **5.0**, dungeon **4.2**
- **Showcase:** 5 town + 5 dungeon, only one death (a warden who took a bad round).
- **Lesson:** This is the biggest jump of all. The between-fight routine is not
  optional — it *is* the strategy.

### Attempt 5 — Roll better stats (reroll until strong)
*High ST/CN for fighters, high IQ for casters.*
- **Config:** remastered / managed / day / Undercroft
- **Rate:** success **100%**, wipe **0%**, dungeon wins **5.0**, deaths **0.4**
- **Showcase:** flawless 10/10, no deaths; most fights over in 1–2 rounds.
- **Lesson:** Stats are free power. Rerolling for a strong prime stat + CN turns
  a coin-flip front line into a wall.

### Attempt 6 — Tougher front line: two Korrun + a Strider; drop the squishy Knave
*The 6-HP Fennick Knave kept dying in the front three.*
- **Config:** remastered / managed / day / Undercroft
- **Rate:** success **100%**, wipe **0%**, deaths **0.3**
- **Lesson:** Who stands in the **front three** matters more than raw class
  choice. Put your two highest-HP bodies (Korrun Blade + Warden) and one durable
  third (Strider) up front; keep casters in back.

### Attempt 7 — Final tuned build, full smart play (Remastered)
*Everything together: tuned line, spells, services, good marching order.*
- **Config:** remastered / managed / day / Undercroft
- **Rate:** success **100%**, wipe **0%**, deaths **0.3**
- **Lesson:** The recommended baseline. Reliable to the point of boredom.

### Attempt 8 — Tuned build vs town at NIGHT (the original death trap)
*Prove the build survives what wiped the default party.*
- **Config:** remastered / managed / **town-NIGHT** / Undercroft
- **Rate:** success **87%**, wipe **13%**, town wins **4.7**, dungeon **4.4**
- **Lesson:** Even the good party would rather fight by day — night costs ~10
  points of success — but it now *survives* night, where the default party
  couldn't.

### Attempt 9 — Tuned build in LEGACY mode (1985 rules)
*Harder XP (~+67% to level), per-character packs, 6 total party+summon slots.*
- **Config:** legacy / managed / day / Undercroft
- **Rate:** success **97%**, wipe **3%**, dungeon wins **4.9**, deaths **0.8**
- **Lesson:** The strategy transfers. Legacy is a little less forgiving (slower
  leveling, no shared bag) but the same party clears it.

### Attempt 10 — Tuned build pushes into the Howling Barrow
*Is the Barrow a viable "first dungeon"? (No — level up first.)*
- **Config:** remastered / managed / day / **Barrow**
- **Rate:** success **10%**, wipe **90%**, dungeon wins **0.9**, deaths **5.5**
- **Showcase:** cleared town 5/5, won one Barrow fight, then
  `4×moor_hound + 2×fen_lurker` wiped the party.
- **Lesson:** The Barrow's moor-hounds, hollow-men and barrow-wights are a clear
  step up. Treat the **Sunken Undercroft** as dungeon #1; come back to the Barrow
  a few levels later.

**Arc in one line:** `0% → 0% → 0%(but reaching the dungeon) → 77% → 100% → 100%
→ 100% → 87%(night) → 97%(legacy) → 10%(wrong dungeon)`.

---

## Recommended party

Six characters, **reroll stats** at the Hall until the prime stat is high and CN
is solid (the "Roll again" option is free):

| Slot | Name | Race | Class | Why | Reroll for |
|--:|---|---|---|---|---|
| 1 (front) | Hroth | **Korrun** | **Blade** | Highest HP die (10) + Korrun +2 ST/+2 CN; the broadsword (2d4) carries melee | ST, CN |
| 2 (front) | Brand | **Korrun** | **Warden** | Tanky, +4 saves (shrugs poison/drain), shield bonus | ST, CN |
| 3 (front) | Sorrel | Half-Wyld | **Strider** | Durable third body, growing crit, can also shoot | DX, CN |
| 4 (back) | Elspeth | **Aldari** | **Lorist** | **Healer** — Mending Word/Salve in combat; Lance of Day vs undead | IQ, CN |
| 5 (back) | Morrigan | **Aldari** | **Hexen** | **Burst + control** — Ash Dart (1d6+2), Mocking Echo (group fear) | IQ, CN |
| 6 (back) | Tamsin | Vael/Fennick | **Skald** | Party buffs: Confounding Jig (foes −3 hit), Wayfarer's March (+2 AC) | DX |

**Marching order matters:** only the front three meet melee. Keep the two
Korrun + the Strider in slots 1–3 and the casters/skald in 4–6.

### Starting shopping list (~700–900 gold from mustering 6)
- **Spells first.** At the **Review Board**, buy **Hexen tier 1** and **Lorist
  tier 1** (120g each). This is the highest-value purchase in the game at level 1.
- **Armor + shield** for the front line (leather armor, buckler, leather cap).
- An **instrument** for the Skald (Reed Pipe, 30g) — songs do nothing without one.
- A couple of **Healing Draughts** (30g) as emergency backup for the back row.
- Keep a **torch** lit in the dungeon (press **T**) — the Undercroft is dark.

---

## How to play it (the smart-player loop)

**Between every fight, go back to town and:**
1. **Temple** — heal everyone, cure poison/fear, restore any drained levels.
2. **Spark House** — recharge the casters' SP (cost scales with how empty they are).
3. **Tavern** — buy the Skald wine to refill songs.
4. **Review Board** — train every level you can afford, and buy the next spell
   tier when you hit the level for it (tier *n* needs level *2n−1*).

**In a fight:**
- **Front three attack** the nearest/biggest group. **Back three:** Lorist heals
  if anyone's below ~45% HP, otherwise Hexen nukes (Ash Dart) or **fears the
  big group** (Mocking Echo) on round 1; Skald sings **Confounding Jig** when
  swarmed (4+ foes) or **Wayfarer's March** otherwise.
- If foes are far and nobody can reach, **(V) advance** and brace one round
  rather than flailing — monsters close on their own.
- **Don't let it become attrition.** If two casters are dry and someone is hurt,
  retreat to town. A clean retreat beats a wipe; running mid-fight, though, ends
  the battle without the win.

**Progression:** grind the Undercroft (and town by day) to ~level 4–5 *before*
trying the **Howling Barrow**. Avoid town wandering after dark unless you're
ready for gate-wights.

---

## Balance notes for the developer (optional)

These are observations, not bugs — flag them if the early-game difficulty curve
is intentional:

- **The no-spell cliff.** A new player who loads the pre-built party and walks
  out has two 4-HP characters who literally cannot act. Town (5/5) lulls them;
  the Undercroft then wipes them ~83%. Consider giving the pre-built casters
  their tier-1 spells, or a one-line nudge ("Visit the Review Board to learn
  spells before you descend").
- **Permanent death economy.** Resurrection is 200 + 50·level (250g+ at level 1),
  unaffordable early, so an early death usually sticks for the rest of the run.
  Combined with gate-wight level *drain* at night, a single bad town-night fight
  can quietly end a run.
- **Day vs night asymmetry is huge** (1% vs 6% rate, and a much nastier table).
  A player who doesn't realize the clock advances toward night may attribute the
  difficulty to "town" generally. Working as intended — just very swingy.
- **Attrition wall.** Even an optimal party caps at ~28% without town trips. If
  you want "walking the dungeon a while" to be viable, the Skald's Hearthsong
  Lull regen and Lorist healing help but aren't enough; SP economy is the binding
  constraint.

---

## Artifacts

All under `dev/playtest/`:

- `harness.mjs` — loads real `src/core`, smart combat policy, town economy, run driver.
- `run-experiments.mjs` — builds × modes × regimes table → `results-summary.json`.
- `run-supplemental.mjs` — town-night and Barrow cases.
- `run-attempts.mjs` — the 10-attempt arc → `attempts-detail.json`.
- `selftest.mjs` — single-run smoke test.

Live showcase screenshots: `dev/playtest/screenshots/showcase-01..07-*.png` —
title → mustered party → town battle orders/round → victory → Undercroft battle
→ aftermath.

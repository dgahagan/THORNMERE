# Thornmere Playtest Report v2 — A Realistic, Money-Constrained Model

*Second pass. The v1 harness was too kind: it built a fully-kitted party without
charging for it and let the party teleport home for free, full-heal, and fully
recharge between every fight. This pass makes the run pay for everything and
travel for everything — and the difficulty picture changes completely.*

**Date:** 2026-06-14 · **Branch:** `polish-pass-ui-gameplay` ·
Supersedes [`playtest-report.md`](playtest-report.md).

---

## What was wrong in v1, and how v2 fixes it

| v1 flaw (you flagged) | v2 fix |
|---|---|
| Built a fully-equipped party but **didn't charge gold** for it (the browser showcase set gold to 600 and granted spells free). | Honest economy: pre-built party gets the real **flat 220g**; a created party gets the **per-character muster purse** (90 + 0–60 each). **All** gear and spells are paid for. The browser showcase now injects the party through the same paid path (you watch it start at ~80–170g, not 600). |
| Town trips were **free, instant, and risk-free** (teleport home, full heal+recharge every fight). | Recovery happens in town and **getting there costs steps** that advance the clock toward night and **roll random encounters en route**. Retreating from the dungeon means fighting your way out. |
| Showcase showed **no healing/leveling/gear/spell purchases** and only **2 battles**. | Three full **5-town + 5-dungeon** browser runs with visible Temple healing, Spark recharge, level-ups, spell-tier buys, chests, and traps. |
| Mana/health recovery was hand-waved. | Modeled as a real **tradeoff**: heal with Lorist spells (cost SP) vs potions vs Temple (gold); recharge by paying the **Spark House** vs **waiting** (wandering town to trickle SP back free — but each wait-step rolls an encounter and advances the clock). |
| No resurrection cost, no chests, no traps, no fleeing. | Resurrection economics + **permanent-death tracking**; chests via the real `loot.js` (income **and** trap risk); the dungeon's **floor traps** fire while you explore; the party **flees** a fight it judges lost rather than feeding a wipe. |

The headline consequence: **a strong, well-played party clears 5 town + 5 dungeon
~60% of the time in Remastered and ~37% in Legacy** — not the ~98% v1 implied.
The gap is entirely money and recovery logistics.

---

## The realistic model (methodology)

Same principle as v1 — the harness drives the **real** `src/core` combat engine —
but now wrapped in a costed, clocked run loop (`dev/playtest/harness-v2.mjs`):

- **Living clock.** Day/night comes from `game.clock` (day 0–279, night 280–399,
  repeating). Every step and every combat round advances it. Town encounters use
  the day table (1% rate) or the **night table (6% rate, far nastier)** depending
  on the clock — so a long town grind **drifts you into night** on its own.
- **Honest muster budget.** A created party can't afford the **full** kit **and**
  spells **and** an emergency reserve. The muster policy prioritizes: essential
  gear (weapon/armor/instrument) → **spells** → non-essential gear
  (shield/helm/gauntlets) only while staying above a ~150g reserve → potions only
  with surplus. (Buying the entire recommended kit blindly leaves ~20g and dooms
  the run — see "the muster trap" below.)
- **Costed recovery, in town, not free.** Survival spending (heal/cure/resurrect)
  happens freely because it's cheap at low level; **discretionary** spending
  (spell-tier upgrades, wine, SP recharge) is reserve-gated. SP recharge pays the
  Spark House when flush, else **waits** (wanders town, risking encounters).
- **Travel costs.** Retreating from the dungeon walks out over real steps (with
  dungeon encounters), surfaces into town at whatever time it now is, recovers,
  then re-descends.
- **Floor traps** (the Undercroft's 2 crumble + 2 gas cells, DC 11) fire while
  exploring — gas-poison on a wounded party is a real killer. **Chests** (40%
  after a dungeon win) give gold/items but can spring dart/gas/blast traps; the
  Knave (or highest-DX) disarms.
- **Flee-to-survive.** When a fight looks lost (≤2 standing and outgunned, or the
  whole front rank down), the party runs. A flee is survival, **not** a win.

Two failure modes are now distinguished: **wiped** (everyone dead) and **stuck**
(broke and crippled — can't afford to heal/resurrect/recover, so the run stalls).

*Abstraction (disclosed):* "wandering" a map = repeatedly calling the real
`maze.advanceClock` + `maze.rollEncounter` (so clock, poison, song-regen, SP
trickle and the encounter tables are all engine-exact) plus the faithful
floor-trap roll. We don't literally pathfind walls; travel distances are modeled
as step counts. The smart-player combat/recovery policy is ours, not the engine's.

---

## Headline results (30 seeds per cell)

| Build | Mode | Success | Wiped | **Stuck** | Town wins | Dungeon wins | Deaths | Perma-deaths | Final gold |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|
| **DEFAULT** (no spells) | Remastered | 7% | 57% | 37% | 3.7 | 0.8 | 4.7 | 3.2 | 157 |
| **DEFAULT** (no spells) | Legacy | 0% | 57% | 43% | 3.6 | 0.3 | 4.8 | 3.2 | 161 |
| DEFAULT + tier-1 spells | Remastered | 7% | 67% | 27% | 4.2 | 1.5 | 4.9 | 3.0 | 63 |
| DEFAULT + tier-1 spells | Legacy | 7% | 70% | 23% | 4.1 | 1.4 | 5.2 | 2.4 | 68 |
| **TUNED** | **Remastered** | **60%** | 7% | 33% | 4.9 | 3.7 | 2.0 | 2.0 | 100 |
| **TUNED** | **Legacy** | **37%** | 13% | 50% | 4.9 | 3.1 | 2.5 | 2.7 | 83 |

(Build definitions unchanged from v1: DEFAULT = the pre-built Fen-Pact comp/gear;
TUNED = rerolled stats, two Korrun + Strider front line, Lorist/Hexen/Skald back,
tier-1 spells, 2 healing draughts.)

---

## Key findings

### 1. The muster trap: you cannot afford everything
Six created characters muster ~700–780 gold. The **full** recommended kit
(weapons + leather armor + shields + helms for the front three, robes/instrument
for the back) costs ~365g, and tier-1 spells for both casters cost **240g**.
That's ~605g before a single potion — leaving ~100–175g. Buy potions and a few
helmets on top and you hit **~20g**, with no fund to heal or resurrect. In
testing, the "buy everything" muster left the party unable to recover from the
first death, and the run collapsed. **The correct play is to prioritize spells +
front-line armor and keep ~150g in reserve** — drop helmets/extra potions before
you drop the reserve.

### 2. Recovery logistics, not combat, is the binding constraint
The tuned party wins almost every individual fight (it reaches 4.9 town / 3.1–3.7
dungeon wins on average). What it runs out of is **money and spell points**.
SP recharge at the Spark House scales with level and emptiness and is the biggest
gold sink after gear; the alternative — waiting in town to trickle SP back — costs
steps that **drift you into night** and roll more fights. Tuned runs average
**3.0–3.6 retreats** to town, each one a logistics tax of time, gold, and
en-route risk.

### 3. Permanent death is the #1 killer of otherwise-winning runs
"**Stuck**" — broke and crippled — is the single most common failure (33% of tuned
Remastered runs, **50%** of tuned Legacy). The cause is almost always an early
death the party **can't afford to resurrect** (200 + 50·level = **250g+** at level
1, against a muster reserve of ~150). Once a front-liner dies and stays dead, a
6-HP caster rotates into the melee and the party unravels. Protecting the front
line — and carrying resurrection money — matters more than any gear upgrade.

### 4. Town fighting is a night activity, and night is where you die
Day town encounters are 1% per step; to win 5 you must wander hundreds of steps,
which **rolls the clock into night** (6% rate, with gate-wights that *drain
levels* and tavern-tough/footpad swarms). Across tuned runs, **~2.2 of ~5 town
fights happen at night** even without trying. The default party can't survive it
(town wins cap at ~3.7). This is the concrete answer to "I get destroyed walking
around town."

### 5. The default (no-spell) party is, realistically, a dead end
Under honest economy it succeeds **0–7%** and wipes/stalls the rest. Buying tier-1
spells alone is **not** enough anymore (still ~7%) because the deeper problems are
budget and recovery, not just damage. You need the tuned build *and* disciplined
money management.

---

## The three browser showcase runs (best-of-10-per-mode)

Driven live through the real game UI (combat played through the actual order
menus; recovery through the real Temple/Spark/Review-Board functions, so gold
visibly drops). Screenshots in `dev/playtest/screenshots/v2-*.png`.

> Note: the browser runs are **live demonstrations seeded from the top sims**, not
> bit-identical replays — the harness abstracts movement, so its RNG path can't be
> reproduced step-for-step in the literal UI. They show the same strategy and
> economy playing out for real.

### Run 1 — Remastered, by day (clean success) — `v2-01..03`
Mustered at **129 gold** (purse 734 − gear 365 − spells 240). Won 5 town fights
(fen-strays/footpads), descended, won 5 Undercroft fights, **0 deaths**, leveled
**1 → 3**, ended at 40 gold. A chest even sprang a **blast trap** on Hroth as he
lifted the lid — survived. The clean, intended experience.

### Run 2 — Remastered, forced night (cautionary tale) — `v2-04`
Same party, but the clock pushed to nightfall before the town grind. It won all 5
**night** town fights (footpad + tavern-tough swarms, gate-wights) — but lost
**Hroth and Sorrel permanently** (only 161 gold, can't afford the 250g
resurrection). It descended four-strong; **two more died** in the Undercroft, yet
the surviving Warden + Skald (now leveled and tanky) **still ground out all 5
dungeon wins** — a pyrrhic 5+5 with 4 permadeaths. This is the night-town danger,
live.

### Run 3 — Legacy, by day (clean success) — `v2-05`
1985 rules (harder XP, per-character packs). Mustered at 103 gold, won 5 town +
5 Undercroft fights, **0 deaths**, leveled 1 → 2, ended at 37 gold. The strategy
transfers; Legacy just levels slower and leaves less margin. (A few 10-plus-enemy
grave-mite swarms ran past the driver's round cap and show as unresolved — the
party took no losses in them; that's a driver limit, not a defeat.)

Two clean wins (one per mode) and one night-stress disaster — together they show
both the success path and exactly how a good party still loses.

---

## Updated recommendations (money-aware)

Party composition is unchanged from v1 (two Korrun Blade/Warden + Strider front;
Aldari Lorist/Hexen + Skald back; reroll for prime stat + CN). What v2 adds is
**economic discipline**:

1. **At muster, buy in this order and stop at a ~150g reserve:** weapons → front-
   line armor → **both casters' tier-1 spells** → shields → (only if money left)
   helmets, then 1–2 healing draughts. Do **not** spend down to zero.
2. **Keep a resurrection fund.** A dead front-liner you can't raise (250g+) usually
   ends the run. If you're below that, play to *not lose anyone* — lead with the
   Hexen's Mocking Echo (group fear) and the Skald's Confounding Jig, and heal
   before HP gets dangerous.
3. **Fight town by day; avoid grinding after dark** until you're a few levels up.
   If night falls, consider retreating indoors rather than wandering into
   gate-wights.
4. **Heal cheaply and often** (Lorist spells are free if you have SP; Temple is
   ~2g/HP at low level). **Recharge SP by waiting only when poor** — it's free but
   it burns daylight and invites fights.
5. **Level before the Barrow.** (Unchanged from v1: the Howling Barrow is a tier
   above the Undercroft; grind the Undercroft to ~L4–5 first.)

---

## Remaining limitations (honest)

- **Movement is abstracted** (no literal wall pathfinding); travel cost is modeled
  as step counts, so exact retreat distances are approximate.
- **The combat/recovery policy is a heuristic**, not optimal play. A human who
  reloads on an unlucky level-1 death would see a higher success rate than the
  "stuck" numbers imply — the harness never reloads, so early variance is fully
  counted. Read "success %" as *"how often a careful, no-reload run survives,"* and
  "stuck %" as *"how often early bad luck becomes unrecoverable without a reload."*
- **Browser runs aren't bit-identical** to the sim seeds (see note above).
- **Fixed/boss encounters** aren't in scope ("5 dungeon battles" = 5 random
  encounters on Undercroft level 1; the boss is deeper).
- The hidden Undercroft cache (2 healing draughts + 120g behind a wall) is **not**
  modeled as found — a thorough player who searches would have a little more margin
  than these numbers show.

---

## Artifacts (all under `dev/playtest/`)

- `harness-v2.mjs` — the realistic, costed, clocked harness.
- `run-v2.mjs` → `results-v2.json` — aggregate table + 10-per-mode ranked runs.
- `run-best3-detail.mjs` → `best3-detail.json` — battle-by-battle economy detail.
- `selftest-v2.mjs` — single-run smoke test.
- `browser-showcase.js` — the in-page driver used for the live runs (reference).
- `screenshots/v2-01..05-*.png` — the three browser runs.
- v1 artifacts (`harness.mjs`, etc.) retained for provenance; see
  [`playtest-report.md`](playtest-report.md).

Reproduce: `node dev/playtest/run-v2.mjs 30` and
`node dev/playtest/run-best3-detail.mjs`.

---

## Addendum — Empty House Encounter Balance (2026-06-14)

Plan A: 4 empty houses are now enterable. Each visit costs 1 clock tick
and rolls `rollHouseEncounter` (day 25%, night 40%) from the existing town
encounter table.

**Harness:** `dev/playtest/run-house-v1.mjs` (500 seeded runs)  
**Party:** 6-char prebuilt (2 blades, warden, skald, hexen, lorist); full gear; heal
between each fight (simulates temple visit — the realistic town grind loop).

| Metric | dayRate=25 | Target |
|---|---|---|
| 5 wins before night | 498/500 (99.6%) | ≥70% |
| 5 wins AND clock ≤ 200 | 498/500 (99.6%) | — |
| Day wipes | 2/500 (0.4%) | ≈0 |
| Avg clock at 5-win | 32.3 turns | ≤200 |
| Night wipes (starting at NIGHT_AT) | 236/500 (47.2%) | ≥5% |

2 day wipes are mutual-annihilation corner cases (last monster and last char
die in the same round). Level-drain shows 0 because all chars are Level 1
(drain guards `ch.level > 1`); gate_wights still kill through raw 1d8 damage,
confirmed by the 47% night wipe rate.

**dayRate=25 is confirmed. No tuning required.**

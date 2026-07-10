# Thornmere Playtest Report — Level 3 Pre-Dungeon Grind

*How long does it take a fresh party to reach Level 3 using the empty-house
encounter loop before diving into the Sunken Undercroft?*

**Date:** 2026-06-15 · **Branch:** `polish-pass-ui-gameplay`  
**Harness:** `dev/playtest/run-level3-v1.mjs` · 200 seeded runs · Legacy mode  
Depends on: Plan A (enterable empty houses, `dayRate=25`), tavern overnight mechanic.

---

## What this tests

Previous playtests (`playtest-report-v2.md`) showed that street encounters at
1%/step force the party to wander hundreds of turns, drifting into night and
gate-wights before they can win enough fights to level. Plan A (4 enterable
empty houses at 25%/visit) fixes the density problem. This report answers
the follow-on question: *can a fresh party actually reach Level 3 this way,
within a reasonable in-game timeframe, without going broke?*

---

## The modeled loop

A careful player starting in Thornmere would do the following — and this
is what the harness simulates:

1. **Buy Lorist T1 (MEND) at muster.** 220g start; Lorist T1 costs 120g;
   ~100g reserve for early Temple healing. Hexen starts at T0 — buy T1
   from fight income once gold allows.
2. **Grind empty houses by day.** Each visit costs 1 clock tick and rolls a
   25% encounter. On a hit: fight. On a miss: nothing wasted (no gold, no
   travel, no clock drift from wandering).
3. **Heal between fights.** Lorist casts MEND/SALV/BALM out of combat
   (castExplore). Temple fallback for front-row chars still under 50% HP
   when Lorist SP is exhausted (~2g/HP at Level 1).
4. **Level up free at the Review Board** whenever XP accumulates.
5. **Buy spell tiers from fight income** when gold allows (60g safety buffer).
6. **When night falls, sleep in the tavern.** The new overnight mechanic
   skips the clock to next morning (no encounters, safe zone). Skald songs
   reset on wake.
7. **Replace fallen comrades from the Adventurers' Hall — free.** This is
   the BT1 loop: a dead Level 1–2 character is replaced with a fresh Level 1
   recruit of the same class who inherits the dead char's gear. The party
   keeps running. Resurrection (250g at Level 1) is unaffordable and makes no
   economic sense until a character has invested in spell tiers and XP.
8. **Dead Level 3+ veterans are resurrected** when affordable — at that point
   the gold cost is justified by their accumulated investment.

---

## Party composition

| Slot | Name | Race | Class | Weapon | Armor | Spells at muster |
|---|---|---|---|---|---|---|
| 1 | Hroth | Korrun | Blade | Broadsword | Leather | — |
| 2 | Brenna | Vael | Blade | Spear | Leather | — |
| 3 | Aldwyn | Vael | Warden | Shortsword | Leather | — |
| 4 | Tamsin | Fennick | Skald | Shortsword | Padded jack / reed pipe | — |
| 5 | Morrigan | Aldari | Hexen | Dagger | Robes | T0 (none yet) |
| 6 | Elspeth | Aldari | Lorist | Quarterstaff | Robes | **T1 (MEND)** |

Stats: `prebuilt` (flat 220g), 1 reroll. Lorist T1 purchased at muster (120g).
Starting reserve: ~100g.

---

## Results (200 seeds, Legacy mode)

| Metric | Result | Target |
|---|---|---|
| All 6 slots at Level 3 (incl. replacements) | **181/200 (90.5%)** | ≥70% |
| All survivors at L3, some slots replaced | 0/200 (0.0%) | — |
| Full party wipe (all 6 dead) | 19/200 (9.5%) | <15% |
| Hit clock cap (>3200 ticks / ~8 days) | **0/200 (0.0%)** | ~0% |

The zero clock-cap rate is the key result: in all previous iterations of this
harness (before recruitment was modeled), 26% of runs hit the cap because dead
Level 1 chars couldn't be resurrected and blocked the all-L3 condition forever.
Recruitment collapsed that to zero.

---

## Successful run statistics

*Averaged over the 181 successful runs.*

| Stat | Value |
|---|---|
| Avg in-game days to finish | 1.1 |
| Avg nights slept in tavern | 0.1 |
| Avg house fights won | 33.7 |
| Avg Hall recruits (replacements) | 1.6 |
| Avg total level-ups (all chars) | 12.9 |
| Avg spell tiers purchased in-run | 0.6 |
| Avg gold spent at Temple | 111g |
| Avg gold spent on spell tiers | 72g |
| Avg final gold (on completion) | 115g |
| Avg casters with T1 on completion | 1.5 |

Most parties finish in a single in-game day (~1.1 days average). The tavern is
rarely needed (0.1 nights avg) because 33 fights at ~12 clock ticks each
(1 visit + ~11 combat rounds) totals ~400 ticks — just at DAY_LEN. Parties
that have unlucky combat RNG or run into early deaths use a second day.

---

## The recruit loop in practice

**53% of successful runs replaced at least one fallen comrade.** Replacement
is not a corner case — it is a routine part of the loop.

| Replacements | Successful runs | % |
|---|---|---|
| 0 (original 6 all reach L3) | 85/181 | 47.0% |
| 1 replacement | 50/181 | 27.6% |
| 2 replacements | 15/181 | 8.3% |
| 3+ replacements | 31/181 | 17.1% |

The 17% of runs with 3+ replacements represent parties that hit a rough early
patch (bad RNG on a warden or blade with low HP). Because replacement is free
and the gear stays with the party, these runs still succeed — the new recruit
grinds up alongside the survivors.

This matches the BT1 design intent:
- **Low-level characters are replaceable.** Losing a Level 1 fighter is a
  setback, not a catastrophe. The party adapts.
- **High-level characters are worth protecting.** A Level 3 Lorist with T1
  spells and 260+ XP represents a real investment. Resurrection at that point
  is a sensible spend.
- **The Adventurers' Hall is a real resource**, not just a place to fill slots
  on first muster.

---

## Days to Level 3 histogram

*181 successful runs.*

```
Day 1:  164  ████████████████████████████████████
Day 2:   16  ████
Day 3:    0
Day 4:    1
```

90% of successful runs finish in a single day. The handful of Day 2+ runs are
parties that took early deaths, slept overnight (tavern mechanic), and needed
a second day to grind the replacement chars up to L3.

---

## Economy

The gold economy stays healthy throughout:

- **Temple spending (~111g):** mostly early, healing front-liners before Lorist
  SP catches up to the fight rate. Drops significantly once the Lorist reaches
  Level 2 (more SP per day from trickle + larger maxSp pool).
- **Spell tiers (~72g):** Hexen T1 is bought from fight income mid-run in most
  successful runs. Average completion has 1.5 casters with T1 (Lorist always;
  Hexen in ~half of runs).
- **Final reserve (~115g):** enough to sustain the first dungeon trip (Temple
  heal budget ~100–150g for the Undercroft's tougher encounters).

The recruit replacement mechanic has no direct gold cost — the party pays
nothing to hire from the Hall. The indirect cost is the new char has no spell
tiers (if they're a caster), requiring a re-buy from income. This is priced
into the "avg spell tiers bought: 0.6" figure.

---

## Wipe analysis

19/200 runs (9.5%) ended in a full party wipe. All wipes occur within the
first ~10 fights, before the Lorist has had time to accumulate SP and before
replacements have had a chance to level. Causes:

- **Bad initial stat rolls** producing a front line with very low HP (blade
  with 3–4 HP at Level 1 dies in one hit from a footpad).
- **Cascading deaths:** losing both blades early leaves casters exposed;
  even with free replacement, two dead front-liners in quick succession
  leaves only 1 front-row fighter while 2 casters fill slots 2–3.
- **Night drift:** the 0.1 avg overnight is correct for successful runs;
  the wipe bucket has a higher overnight rate (parties that couldn't finish
  before dark and got hit by the 40% night-table encounter).

A 9.5% wipe rate is healthy — it gives the game real stakes without making
the pre-dungeon grind feel like a wall. A player who reloads on a catastrophic
Level 1 wipe would see an effectively 0% "stuck" rate (since recruitment
handles all non-catastrophic deaths).

---

## Verdict

The enterable empty houses (Plan A, dayRate=25) + tavern overnight mechanic
together create a complete and balanced pre-dungeon loop:

- **A fresh party can credibly reach Level 3 in one in-game day** (~33 house
  fights, ~400 clock ticks).
- **The BT1 recruit economy works.** 53% of runs replace at least one char;
  the mechanic keeps the loop alive without trivializing death.
- **No runs stall.** Zero clock-cap cases — the design is self-correcting.
- **The economy lands right.** ~115g final gold is enough to enter the
  Undercroft with a Temple buffer.
- **9.5% wipe rate** provides meaningful early danger without being a wall.

No further tuning required. The loop is ready for the dungeon phase.

---

## Artifacts

- `dev/playtest/run-level3-v1.mjs` — the harness (reproduce: `node dev/playtest/run-level3-v1.mjs 200`)
- `dev/playtest/harness-v2.mjs` — combat/economy engine (shared with v2 playtests)
- `dev/playtest-report-v2.md` — prior report (house encounter balance addendum at end)

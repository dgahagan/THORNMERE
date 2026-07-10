# Playtest harness

Headless playtesting that drives the **real** `src/core` combat engine (no
re-implementation) with a "smart player" policy, plus live browser showcase
screenshots.

- **v2 (current, realistic):** [`../playtest-report-v2.md`](../playtest-report-v2.md)
  — honest gold economy, non-free town trips, living day/night clock, paid-vs-wait
  recovery, resurrection economics, chests, floor traps, flee-to-survive.
- **v1 (superseded):** [`../playtest-report.md`](../playtest-report.md) — the first
  pass; kept for provenance. Its harness over-credited the party (free full
  heal/recharge between fights, unpaid gear) — see the v2 report's "what was wrong".

## Run it

```bash
# v2 (realistic, money-constrained)
node dev/playtest/selftest-v2.mjs           # one realistic run, full economy summary
node dev/playtest/run-v2.mjs 30             # builds × both modes -> results-v2.json (+ ranked best-3)
node dev/playtest/run-best3-detail.mjs      # battle-by-battle economy for the best runs -> best3-detail.json

# v1 (superseded, idealized recovery)
node dev/playtest/selftest.mjs
node dev/playtest/run-experiments.mjs 40    # -> results-summary.json
node dev/playtest/run-supplemental.mjs 40   # town-at-night + Howling Barrow cases
node dev/playtest/run-attempts.mjs          # the 10-attempt learning arc -> attempts-detail.json
```

The browser showcase driver is `browser-showcase.js` (paste into the game page
console with `?debug`; see its header). Screenshots in `screenshots/`.

The argument is seeds-per-cell (default 40 / 30). No build step, no deps —
plain Node ES modules importing the game's own `src/core/*.js`.

## Files

- `harness.mjs` — DB loader, smart party builder (stat rerolls, gear/spell buys),
  faithful encounter sampling, the round-by-round combat policy, the town-service
  economy, and the full run driver (`runAttempt`).
- `run-experiments.mjs`, `run-supplemental.mjs`, `run-attempts.mjs` — experiment drivers.
- `selftest.mjs` — smoke test.
- `results-summary.json`, `attempts-detail.json` — generated data.
- `screenshots/` — live Playwright showcase (the tuned party winning in the real UI).

## What "managed" vs "attrition" means

- **managed** — return to town between fights to heal (Temple), recharge SP
  (Spark House), refill songs (tavern), and train levels (Review Board).
- **attrition** — never go back; just keep walking and fighting. Models the
  "walking around getting destroyed" scenario.

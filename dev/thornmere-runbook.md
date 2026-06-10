# Thornmere Runbook — remaining passes

| # | Prompt file | Model | Session | Notes |
|---|---|---|---|---|
| 0 | (none — play the game) | you | — | Run the 10-minute tour from the Amiga summary; screenshot the start location for the before/after pair; skim /dev.html to know the art baseline. |
| 1 | prompt-1-pixel-fidelity-v2.md | **Sonnet** | fresh | Heaviest output of the three. Check `/usage` before starting. Optional `/model opus` for phase 4 (showpieces) only, then back. Now includes the missing set-B art → ends at 42/42. |
| 2 | prompt-2-remastered-qol-v2.md | **Sonnet** (or `opusplan`) | fresh | Mostly plumbing against tested code. `opusplan` if you want Opus reasoning on the automap-desync and inventory abstraction at Sonnet execution prices. |
| 3 | prompt-3-feelies-v2.md | **Sonnet** | fresh | Last on purpose: manual tables generate from final data; Command Card includes QoL keys; cover art uses final-res sprites. |

## Pre-flight, every session
1. Fresh session in the project root; `git status` clean.
2. `/model sonnet` (verify in the status line — don't trust the default).
3. `/usage` — don't start pass 1 with less than ~half a session window.
4. Approve the plan before execution; read any proposed deviation from the spec rather than reflexively accepting or rejecting.

## Standing rules (already baked into the prompts)
- Incremental writes for any generated-content file; verify subagent target files are growing.
- Commit per phase/family — interruption should never cost more than the current unit of work.
- Escalate by exception: `/model opus` for a wall, back to `/model sonnet` after. Fable only if Opus also stalls on something genuinely cross-cutting.

## Post-run, every pass
- Run the full test suite yourself; eyeball the playtest tour.
- `/cost` → log the number in the ccusage workbook (pass name, model, tokens, $).
- Take the comparison screenshot after pass 1.

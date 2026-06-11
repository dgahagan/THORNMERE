# LESSONS.md — What Building "The Lay of Thornmere" Taught Us About Agentic Development

*A tech demo / learning project: recreating The Bard's Tale (1985) with Claude Code, from a single prompt to a finished game with an AI-generated art pipeline. This file records what actually happened — including the expensive parts — because the failures taught more than the successes. Written for the team as a field guide for Claude Code adoption.*

---

## 1. The economics: route models by task shape, not by habit

The frontier model (Fable 5) one-shotted the base game — engine, combat, magic, content, 27 passing tests — from a single detailed prompt. That is genuinely what the top tier buys: architecture from a blank page, holding a large spec in working memory for hours. Then we left it running on a *presentation* pass (pixel art, audio) and it consumed an entire Max 5x session plus $100 in API credits, with one subagent burning 55 minutes producing literally nothing. The work that followed — art regeneration, feature plumbing, adjudication — ran on Sonnet at a fraction of the cost with no visible quality loss, because by then the specs were detailed and the codebase was tested.

The rule that emerged: **frontier model for the blank page and the brick wall; workhorse model for everything in between.** Escalate by exception (`/model opus` for one hard problem, back down after), never by default. Output-heavy generation work (art data, content files, docs) is the worst place for flagship rates and the best place for cheap models with good specs. Every session ends with `/cost` logged to the usage workbook — by the end of this project we had a real-dollar dataset comparing model tiers on comparable work, which is exactly the evidence an adoption decision needs.

## 2. Progress must be externally verifiable at all times

The single most expensive failure: a subagent tasked with authoring monster art ran 55 minutes, generated a 479KB transcript, and **never wrote a byte to its target file**. Later, the main session spent a 29-minute turn "drawing wall textures" — 93k tokens of output — entirely inside its reasoning, with nothing reaching disk. When that turn was accidentally killed, it cost nothing, because nothing had ever been safe.

The fix became a standing rule in every subsequent prompt: *any file that accumulates generated content must be written incrementally — after every item — so progress is always on disk.* Corollaries: never compose content inside thinking (think about the rendered result, write the content directly to files); any agent you delegate to inherits the rule verbatim; and verify a long-running agent's target file is *growing* before letting it run long. The liveness check is one shell command: `find . -type f -newermt '30 minutes ago'`.

## 3. Commit cadence is your blast radius

Prompts specified "commit after each phase/family." When a session honored this, interrupting it cost at most one unit of work; when one session sat on a single commit spanning five phases, a crash would have cost three hours. Mid-run, a queued one-line reminder ("commit completed steps now as separate logical commits") fixed it without breaking stride. The git log doubles as the most reliable status report a session produces — more reliable than its own narration.

## 4. Logs are only evidence if written contemporaneously

A required review log (`art-review.md`, one verdict per sprite as inspected) turned out to be the highest-signal artifact in the project. When we found it empty for five phases of supposedly finished work, that emptiness *was* the finding: the inspection process had been skipped. Two phrasings that materially changed model behavior: requiring verdicts to be logged "AS you inspect," and stating that **"a log with zero FAILs will not be believed."** Models will rubber-stamp a backlog if allowed; demanding visible rejections makes honest review the path of least resistance. Note the counterpoint: the empty log was honest emptiness, which is recoverable — far better than fabricated green.

Our supervision dashboard reduced to three artifacts answering three different questions: **file timestamps tell you it's alive; rendered output tells you it's good; the git log tells you it's safe.**

## 5. Make the model look at its own work

Language models judge a rendered image far better than they mentally simulate a text grid, a layout, or a UI. The quality inflection point for hand-authored art was a required loop: render every sprite to a PNG, look at it, critique against an explicit bar, revise, and only then mark it done — "judge only the rendered image." The same principle later powered the AI-art adjudication: verdicts allowed only on crushed, game-scale previews, never on flattering raw generations. Generalization: any task with a renderable output (documents, UIs, charts, art) should force the model through the rendered form before acceptance.

## 6. Know the capability ceiling — and switch tools instead of pushing

Hand-gridded pixel art plateaued at "decent icon" no matter how good the process. Procedural drawing code (the model writing routines that *generate* art) beat freehand grids. Local image generation (FLUX.2-klein on an RTX 5080, ~1.5s/image) beat both decisively for organic subjects. The winning division of labor: **the LLM as pipeline engineer, prompt writer, and curator; the diffusion model as artist; deterministic code as the bridge.** The model's best work happened the moment we stopped asking it to place pixels and started asking it to judge them.

The pipeline details that mattered: per-sprite *sub-palette* quantization (an explicit allowed-color list per sprite) eliminated hue-bleed and doubled as recorded art direction; a fixed verbatim style suffix kept 30 sprites reading as one artist; deterministic seeds plus a manifest (prompt, seed, palette, chosen candidate, notes) made every asset traceable and regenerable. Adding a monster later is one JSON entry. AI output also fails in characteristic ways — our dungeon rat came out adorable — so subject prompts must specify *condition and intent* (mangy, feral, snarling), not just species.

## 7. Silent failure states are forbidden

A quantization script was given an empty allowed-list; a Python falsy-check silently fell back to the full palette and produced output identical to the previous run under a new filename. We "ran the experiment" twice without running it once. The fixes are policy now: guard clauses that fail loudly on empty/invalid config, and **mode baked into output filenames** (`_full` vs `_sub16`) so a wrong-mode run cannot masquerade as the right one. A default that lies quietly is worse than a crash.

## 8. Know which context your command lands in

Three separate incidents, one theme. A paste buffer survived a container `exit` and executed its remaining commands on the host. A distrobox created without `--nvidia` couldn't see the GPU that was physically present. The eventual production design used `distrobox-host-exec` precisely because it makes the execution context *explicit*. On immutable-OS workstations with layered containers, "where does this run" is a first-class question — for humans and for agents. Relatedly: size commands well under the bash timeout and chunk long work per-item (per-sprite generation calls, not one mega-batch) — the incremental principle applies to command duration, not just file writes.

## 9. Unattended autonomy is bounded by the permission allowlist

A finished-except-for-one-approval session sat frozen for four hours on a command authorization while its operator was away. All the interruption-safety we'd engineered (incremental writes, per-phase commits) protected the *work* but not the *wall clock*. For walk-away sessions, design the permission surface in advance: pre-approve the session's known-safe verbs (test runner, art tools, git add/commit, the generation bridge) in project settings rather than reaching for skip-all-permissions.

## 10. Audit claims; trust distributions to tell on shortcuts

A completed adjudication reported a tidy table: 30/30 sprites replaced, with **the same seed winning 26 of 30 independent contests.** That uniformity was the tell that demanded an audit — either a genuinely strong seed under a rigid prompt template (possible!) or shallow judging. The audit method: count the evidence on disk first (one shell pipeline confirmed all candidates actually existed, killing a timeout theory), then blind spot-checks — judge the contest yourself before reading the model's verdict. Companion rule: an acceptance criterion not demonstrated with evidence is unmet, however confident the summary. The model's remediation pass, when challenged, produced genuinely good escalations — including flagging two decisions (player-character identity, a monster's palette identity) as *human* calls. Demanding a NEEDS-HUMAN channel gives the model a legitimate alternative to guessing.

## 11. When the plan changes, tell the workers

While we built the image pipeline, the previous art session kept faithfully executing the now-obsolete plan — and separately, stale references (a handoff naming `monsters2.json` when `monsters3.json` existed) nearly caused confusion that only the test suite could arbitrate. Rules: a strategy change means stopping affected sessions *surgically* (commit what's still valuable, write a handoff, abandon the superseded work); prompts are versioned artifacts that get updated when reality moves; and tests, not prose, adjudicate naming drift.

## 12. The session architecture that emerged

By the end the project ran as: a **worker** session (Sonnet) executing versioned prompt-specs with hard acceptance criteria; a **human** relaying guidance, doing spot-audits, and serving as final acceptance test; and an **advisor/auditor** session (Fable, read-only, plan mode, its own sandbox directory, never committing) with direct repo access to render artifacts and audit claims — oversight as infrastructure rather than as uploads to an external chat. Prompt-engineering patterns that did the heavy lifting throughout: phased runnable milestones; acceptance criteria as forcing functions (a demanded "playtest script" can't be written honestly about a broken build); data-driven content with single sources of truth; and policy-as-test (a spoiler-lint test enforcing documentation rules no prose instruction would survive).

---

## Quick reference: the standing rules we now put in every long-running prompt

Incremental writes for all generated content, inherited verbatim by subagents. Commit per phase/family. Contemporaneous logs; zero-rejection logs are disbelieved. Judge rendered output, not source representations. Loud failures over silent fallbacks; mode/state in filenames. No command sized near the timeout ceiling. Permission allowlist designed before unattended runs. Stop and re-brief workers when plans change. Timestamps = alive, rendered output = good, git log = safe.

*Built June 2026. Models: Claude Fable 5 (greenfield, advisory), Claude Sonnet 4.6 (production passes), FLUX.2-klein-4B (art generation, local RTX 5080). The before/after screenshots are in the repo — start at thornmere-start.png and prepare to be smug.*

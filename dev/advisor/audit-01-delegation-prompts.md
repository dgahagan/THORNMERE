# Audit-01 Delegation Prompts — for Dan's review

The six audit tasks split into four delegable chunks plus a consolidation step,
plus one BUILD chunk arising from Dan's own portrait review. Model assignments
reflect the judgment load: blind visual adjudication and narrative briefs need
Opus; evidence-gathering (screenshots, renders, greps) and pipeline mechanics
are Sonnet work.

**Director's ruling (2026-06-10, supersedes audit task 4):** Dan reviewed all
creature portraits. Four families are "too cute" and look out of place —
**mon_rat** (adorable), **mon_hound**, **mon_moth**, **mon_blob** (less
adorable but still wrong). The mid-run "mangy/feral" correction therefore did
NOT land, and the miss is wider than the rat. Consequences baked in below:
Prompt C's rat part is now process forensics (why the correction was lost),
Prompt A swaps mon_hound for mon_spider (no point blind-judging seeds in a
family slated for regeneration), and new Prompt F regenerates the four
families.

| Chunk | Covers | Model | Depends on | Output file |
|-------|--------|-------|-----------|-------------|
| A | Task 1 — seed-42 audit | **Opus** | nothing | `dev/advisor/audit-01-seed42.md` |
| B | Task 2 — NEEDS-HUMAN briefs (portraits + skeleton) | **Opus** | nothing | `dev/advisor/audit-01-needs-human.md` |
| C | Task 3 — live verification + lost-correction forensics | **Sonnet** | nothing | `dev/advisor/audit-01-verification.md` |
| D | Task 5 — showpiece box-art review | **Opus** | nothing | `dev/advisor/audit-01-showpieces.md` |
| E | Task 6 — consolidated report + worker remediation message | advisor (me) or **Opus** | A–D | `dev/advisor/audit-01.md` |
| F | NEW — regenerate rat/hound/moth/blob toward mangy-feral | **Sonnet** (build worker; adjudication by Dan/advisor) | Dan approves subject lines; GPU run is Dan's command | manifest + art JSONs (worker-owned) |

A–D are independent and can run in any order (C needs the dev server, so don't
run it concurrently with another session that has the game open). F is the only
BUILD chunk — it modifies game data, so it belongs to the worker session, not
an audit session, and should run after A completes (A may surface more families
to fold into the same regeneration batch). For E, my recommendation: bring the
four reports back to this advisor session and I'll consolidate — it's cheap
once the evidence exists. A fallback Opus prompt is included at the end.

Notes baked into every prompt (the project's hard-won conventions): read-only
outside `dev/advisor/`, no commits, judge only rendered/crushed PNGs at game
scale, incremental writes, cite paths, loud failures, chunk long commands.

---

## Prompt A — Seed-42 audit (model: **Opus**)

```
You are an independent AUDIT session for the Thornmere project
(<repo-root>). You are auditing a
completed AI-art adjudication pass, not building anything.

HARD RULES
- Read-only everywhere except dev/advisor/ — write your report and any
  comparison images ONLY under dev/advisor/. Never modify game code, data, or
  docs. Never git add/commit.
- Judge art ONLY from rendered/crushed PNG images viewed with the Read tool,
  never from raw generations alone and never from text grids.
- Write findings INCREMENTALLY to dev/advisor/audit-01-seed42.md as you go.
- Cite a file path for every claim.

BACKGROUND
The art pipeline generated candidates for 30 sprites across 6 seeds (10 for
showpieces) and adjudicated one winner each. Seed 42 won 26 of 30 contests.
That dominance is either a genuinely strong seed under the fixed prompt
template, or evidence of shallow judging on the 27 uncontested entries. Your
job: re-judge three contests blind and report agreement or disagreement.

THE THREE CONTESTS (chosen to span groups, avoiding the three the original
pass already expanded — scene_victory, scene_title, pc_caster — and avoiding
the four families the director has already ordered regenerated for being
off-direction: mon_rat, mon_hound, mon_moth, mon_blob):
1. mon_spider — monster set A; 6 seeds; the procedural art it replaced was
   PASS quality, so this was a real contest
2. mon_ghost  — monster set B; 6 seeds
3. mon_mock_king — showpiece; 10 seeds

BLINDING PROTOCOL — follow this order strictly:
1. Do NOT read data/art/gen-manifest.json, art-review/art-review.md,
   NEEDS-HUMAN.md, or PIPELINE-HANDOFF.md until step 5. They contain the
   original verdicts and would anchor you.
2. The candidates are in dev/pixel-art/candidates/ named
   <id>_s<seed>_sub<N>.png (crushed to game palette, 4x preview scale; the
   _raw files are pre-crush — ignore them for judging). For each contest,
   view EVERY _sub PNG. PIL 12.2.0 is available via python3 (no ImageMagick)
   if you want labeled side-by-side montages — write any helper script and
   montages under dev/advisor/render/.
3. For EACH seed write 1-3 sentences of strengths/weaknesses BEFORE naming
   any winner: silhouette readability at game scale, palette discipline,
   subject fidelity (spider: large dungeon spider, brown two-segment body,
   eight hairy legs spread wide, four-pair red eye cluster, chelicera fangs;
   ghost: translucent shroud-wight, pale chalk face, hollow sockets, howling
   mouth, mist-blue trailing form; mock_king: squat blue glazed ceramic tile
   golem, gold grout lines, three gold crown prongs, glowing sky-blue
   rectangular eyes, gold belly medallion — must read as TILED, not smooth),
   1985 Amiga character, and MENACE — the director has already rejected four
   other families for reading "too cute"; treat cuteness as a defect here too.
4. Then declare your winner per contest, with a confidence (clear win /
   close call / coin flip).
5. ONLY NOW read data/art/gen-manifest.json (chosen_seed + notes for the
   three ids) and the adjudication sections of art-review/art-review.md.
   Record agreement/disagreement per contest and whether the original
   reasoning addresses the actual deciding factors you found.
6. Mechanical sanity check: sha256 the s42 _sub files across several
   families to confirm generation actually varied per family, and note that
   seed 42 LOST 4 of 30 contests (mon_moth, candleking, maldrec,
   scene_victory) — weigh that in your conclusion.

VERDICT (final section of your report): either "uphold the adjudication
table" or name the sprite families that need re-adjudication, with reasoning.
A tidy 3/3 agreement is a finding, not a goal — disagree where the pixels
disagree.
```

---

## Prompt B — NEEDS-HUMAN briefs: PC portraits + skeleton (model: **Opus**)

```
You are an independent AUDIT session for the Thornmere project
(<repo-root>). Your job is to
prepare decision BRIEFS for the human game director (Dan) on the two items in
NEEDS-HUMAN.md. You recommend; Dan decides. Do not "resolve" anything.

HARD RULES
- Read-only everywhere except dev/advisor/ — write your brief and comparison
  images ONLY under dev/advisor/. Never modify game code, data, or docs.
  Never git add/commit.
- Judge art ONLY from rendered/crushed PNGs viewed with the Read tool, at or
  near game scale. PIL 12.2.0 available via python3 (no ImageMagick); put any
  montage helper + sheets under dev/advisor/render/.
- Write incrementally to dev/advisor/audit-01-needs-human.md. Cite paths.

FIRST read NEEDS-HUMAN.md and the relevant entries (pc_warrior, pc_rogue,
pc_caster, pc_skald, mon_skeleton) in data/art/gen-manifest.json.

BRIEF 1 — PC portrait identity (who the player IS — frame as a narrative
choice with quality notes, NOT a quality verdict):
1. For each of the four archetypes, montage ALL six crushed candidates
   (dev/pixel-art/candidates/pc_<arch>_s<seed>_sub<N>.png — ignore _raw) at
   both 4x preview and true 1x game scale (sprites are 32x40; the _sub PNGs
   are 4x previews, so downscale by 4 with NEAREST for the 1x view). A
   portrait whose face does not survive 1x is not a realistic option — say so
   and drop it.
2. For each archetype: describe every realistic option in plain terms a
   director can act on (apparent gender presentation, skin tone, age, gear,
   expression), then give ONE recommendation with a sentence of reasoning.
   Note where the current pick (s42 in all four cases) is or isn't the
   strongest.
3. Flag any cross-archetype consistency issues (e.g. two portraits reading
   as the same person, mismatched rendering styles, palette clashes).

BRIEF 2 — mon_skeleton grey-vs-gold bones:
1. Read the skeleton's bestiary/encounter flavor text — check
   data/monsters.json and any bestiary strings elsewhere in data/ (grep for
   skeleton). Quote the relevant text in the brief.
2. Render the IMPORTED gold skeleton from game data:
   node tools/artrender.js mon_skeleton 4 dev/advisor/render/
   and view it next to the procedural grey reference
   art-review/mon_skeleton-sheet.png.
3. Check how monster tier/rank palette swaps work in this engine (search js/
   and data/ for tier or palette-swap logic) and state what a gold base bone
   color does to those swaps versus a grey base.
4. Recommend ONE of: (a) accept the gold identity, optionally with a one-line
   flavor-text touch-up for the worker session to apply (draft the line), or
   (b) re-prompt the family toward grey bones. Give the tradeoffs either way.

Deliverable: dev/advisor/audit-01-needs-human.md with the two briefs, each
ending in a clearly-marked RECOMMENDATION block for Dan.
```

---

## Prompt C — Live verification + rat evidence (model: **Sonnet**)

```
You are an independent VERIFICATION session for the Thornmere project
(<repo-root>). You gather
evidence; you do not fix anything.

HARD RULES
- Read-only everywhere except dev/advisor/ — screenshots, renders, and your
  report go ONLY under dev/advisor/. Never modify game code, data, or docs.
  Never git add/commit.
- Anything you start (servers, browsers) you shut down before finishing.
- Write incrementally to dev/advisor/audit-01-verification.md. Cite paths.
  Report failures loudly — a verification that can't be completed is a
  finding, not something to paper over.
- No single bash command sized near the timeout — chunk long work.

BACKGROUND: the art pipeline's acceptance-criteria walkthrough
(art-review/art-review.md, "Acceptance criteria walkthrough" section) reported
3 criteria NOT met: (1) live animation playback never verified in-engine
(only programmatic timing checks), (2) before/after engine screenshots never
captured, (3) icons/FX declared out of pipeline scope. Verify each.

PART 1 — live frame effects:
1. Start the game: npm start (background; serves http://127.0.0.1:8377).
2. Drive it with the Playwright MCP tools (browser_navigate, browser_press_key,
   browser_take_screenshot, browser_evaluate). test/README.md, test/smoke.js
   and tools/drive.js document how the game can be driven; index.html is the
   entry. Reach a combat encounter (any monster).
3. Capture a timed burst of screenshots (e.g. 6 shots ~200ms apart) of the
   monster portrait during the encounter. Frame timings in
   data/art/gen-manifest.json are 400ms/frame (2-4 fps). Confirm from the
   captured frames that the eye_pulse effect visibly alternates. If you can
   reach a screen showing a PC portrait (party/status view), do the same for
   breathe+eye_pulse on a PC portrait (600ms frames).
4. Save the frame bursts under dev/advisor/render/live/ with mode-tagged
   names (e.g. encounter_t0ms.png, encounter_t200ms.png). State plainly in
   the report whether animation is visibly playing or static.

PART 2 — before/after scene captures (current state):
1. Capture: (a) an Undercroft dungeon corridor view, (b) a combat screen with
   a monster portrait visible, (c) Greta's building facade in town (search
   data/ for Greta to locate it; tools/drive.js may help navigate).
2. Save to dev/advisor/render/live/. The "before" baseline is
   thornmere-start.png at the repo root (committed in 086d882); note any
   other historical screenshots you find in git history and list their
   commits. Do NOT attempt aesthetic judgment — capture and document only.
3. Shut down the server and browser.

PART 3 — icons/FX scope claim:
1. Read the icons/FX scope statements in art-review/art-review.md and
   dev/Prompt_art_pipeline.md. Quote them.
2. View art-review/icon-sheet.png and art-review/fx-sheet.png. Describe
   current icon/FX art quality factually (geometry vs detailed pixel art).
3. Report whether the v2.1 pipeline spec genuinely excludes icons/FX or the
   walkthrough's "out of scope" was an interpretation. Quote the spec lines.

PART 4 — lost-correction forensics (process audit, not art judgment):
Context: a mid-run art-direction note ordered the rat family re-prompted from
"adorable" toward "mangy/feral". The game director has since reviewed all
portraits and ruled that the correction did NOT land — mon_rat is adorable,
and mon_hound, mon_moth, mon_blob also read too cute. Those four will be
regenerated (separate task). YOUR job is to document how the correction got
lost, so the process hole can be closed:
1. Find the original art-direction note: grep PIPELINE-HANDOFF.md,
   art-review/art-review.md, NEEDS-HUMAN.md, dev/ and git log -p --all for
   mangy / feral / adorable / rat. Quote what you find with source + commit.
   If it appears NOWHERE in the repo, say so loudly — an order that lived
   only in chat is itself the process hole.
2. Quote the manifest "subject" and "notes" fields verbatim for all four ids
   (mon_rat, mon_hound, mon_moth, mon_blob in data/art/gen-manifest.json).
   Note whether any subject line was ever rewritten toward feral, and what
   the git history of those lines shows (git log -p -- data/art/gen-manifest.json).
3. Reconstruct the timeline: when the note was given (if findable), what was
   generated/imported after it, and where the pipeline should have caught it
   (e.g. adjudication notes never mention the directive).
4. One-paragraph conclusion: the single most likely failure point, and one
   concrete process fix (e.g. "art-direction changes must be written into
   the manifest subject field before any generation run").

Deliverable: dev/advisor/audit-01-verification.md with all four parts, every
screenshot/render path listed, and a short "anomalies" section at the end.
```

---

## Prompt D — Showpiece box-art review (model: **Opus**)

```
You are an independent ART REVIEW session for the Thornmere project
(<repo-root>). You judge the four
imported showpiece boss sprites against one bar: "would this ship as 1985
box art?" (Bard's Tale-era Amiga/C64 box and manual art.)

HARD RULES
- Read-only everywhere except dev/advisor/ — renders and report ONLY under
  dev/advisor/. Never modify game code, data, or docs. Never git add/commit.
- Judge ONLY from rendered PNGs of the IMPORTED game data (what actually
  ships), not the candidate files. Write incrementally to
  dev/advisor/audit-01-showpieces.md. Cite paths.

THE FOUR SHOWPIECES (in data/art/monsters3.json, 96x80, 3 frames each):
mon_candleking (the Tallow King — FLAGSHIP), mon_choir_eldest, mon_mock_king,
mon_maldrec.

STEPS
1. Render each at 1x and 4x:
     node tools/artrender.js mon_candleking 1 dev/advisor/render/
     node tools/artrender.js mon_candleking 4 dev/advisor/render/
   (repeat per showpiece; artrender emits each animation frame). View every
   frame at both scales with the Read tool.
2. Read each entry's "subject" and "notes" in data/art/gen-manifest.json and
   the matching bestiary descriptions in data/ — the key reads it must hit:
   - candleking: blue-flame crown CRITICAL; red ember eyes must read at 2x;
     wax body on candle throne, flanking candle pillars
   - choir_eldest: giant concentric-ring eye is THE defining feature; trapped
     faces secondary; skeletal hand
   - mock_king: must read as TILED ceramic (blue tiles, gold grout), not
     smooth; three crown prongs; gold medallion
   - maldrec: violet eyes + blue staff orb; prominent staff; readable grin
3. Per showpiece, judge: (a) does each key read land at 1x? at 4x? (b)
   silhouette strength, (c) palette discipline / Amiga character, (d) frame
   b/c eye_pulse coherence (do the animation frames make sense as a pulse,
   or do they smear?). Score each: SHIP / SHIP-WITH-NOTES / NOT BOX ART,
   with the misses named precisely enough that a re-prompt could fix them.
4. The Tallow King is the flagship — give it the longest treatment, and
   explicitly check the blue-flame crown and ember eyes at 2x (render scale 2
   as well for that check).

Deliverable: dev/advisor/audit-01-showpieces.md, one section per showpiece,
each ending with its score line.
```

---

## Prompt F — Regenerate the four "too cute" families (model: **Sonnet**, build worker)

This is the only BUILD chunk — it modifies game data and runs in the worker
session under its normal permissions. Two gates before it runs:
1. **Dan approves the four new subject lines below** (edit freely — they're
   art direction, drafted by the advisor to preserve each sprite's eye color
   so the eye_pulse identity survives).
2. **GPU generation is Dan's command** — the worker prepares the exact
   command lines and STOPS; Dan runs them via
   `distrobox-host-exec bash -lc 'source ~/pixelart-venv/bin/activate && cd <repo>/dev/pixel-art && python3 <script>'`.

Also wait for chunk A's verdict — if the seed-42 audit names more families
for re-adjudication, fold them into this same batch.

DRAFT SUBJECT LINES (replacing the current manifest subjects; keep the same
allowed-palette and style-suffix machinery):

- mon_rat (was: "large fen rat, upright pose, round grey body, round cupped
  ears with inner ear, prominent buck teeth, long hairless tail, small red
  beady eyes")
  → "gaunt mangy fen rat, hunched aggressive pose, matted patchy grey-brown
  fur with scabby bald patches, long yellowed incisors bared, ragged notched
  ears, scaly hairless tail, glinting malevolent red eyes"

- mon_hound (was: "upright wolf hound, large stocky grey body, pointed ears,
  single large red glowing eye, bared white fangs, four thick pillar legs")
  → "snarling gaunt wolf hound, ribs showing through matted grey fur,
  hackles raised, ears pinned flat, single huge red glowing eye, jaw agape
  with bared fangs, predatory hunched stance"

- mon_moth (was: "giant basilisk moth with enormous spread wings, wings
  covered in concentric ring eye-spots, feathery antennae, segmented thorax
  body")
  → "sinister giant basilisk moth, ragged tattered-edged wings spread wide,
  hypnotic concentric ring eye-spots, spiny bristled antennae, gaunt chitinous
  segmented thorax, hooked clawed legs"

- mon_blob (was: "amorphous tallow blob monster, tan-amber pyramid mound
  shape, two gold coin eyes with black pupils, dashed toothy grin, side
  pseudopod arms, shiny gelatinous surface")
  → "dripping amorphous tallow blob horror, slumping half-melted wax mound,
  two uneven sunken gold eyes under sagging wax lids, wide drooping mouth
  with crooked embedded teeth, grasping pseudopod arms, greasy glistening
  surface"

```
Art-direction correction pass: the game director reviewed all creature
portraits and rejected four families as "too cute" / out of place:
mon_rat (adorable), mon_hound, mon_moth, mon_blob. A mid-run directive to
move the rat family toward "mangy/feral" was never written into the
manifest, so the cute subjects were generated and imported. Fix that now.

Repo: <repo-root>
Conventions (non-negotiable): incremental writes; contemporaneous logging in
art-review/art-review.md; mode/state in filenames, never implicit; loud
failures; one commit per family; the 27 original logic tests are sacrosanct;
no command sized near the bash timeout.

PHASE 1 — re-prompt setup
1. In data/art/gen-manifest.json, replace the "subject" field for mon_rat,
   mon_hound, mon_moth, mon_blob with the director-approved lines (provided
   with this message). Add to each entry's "notes": "v2 feral re-prompt per
   director review 2026-06-10; v1 'cute' import superseded." Reset their
   seeds_generated to [] and status to "regenerating". Do NOT touch
   allowed/bg_indices/dims.
2. New candidate files must NOT clobber the v1 set: output to
   dev/pixel-art/candidates-feral/ (or equivalent explicit v2 tag in the
   filename). Check how generate.py names outputs and adapt invocation, not
   the convention.
3. Prepare the exact host generation command(s) for the four families, all
   six seeds each (3,7,11,17,23,42), then STOP and hand them to Dan — GPU
   runs are his to execute. Verify liveness afterward by file timestamps in
   the output dir.

PHASE 2 — crush + present (no self-adjudication)
4. Crush every new raw through the standard recrush/subset flow (same subN
   palette subsets as v1: rat sub?, check v1 filenames for the per-family N).
5. Build one labeled comparison sheet per family (all 6 crushed candidates
   plus the v1 imported sprite rendered via tools/artrender.js as a "current"
   reference) into art-review/. Log generation + crush results in
   art-review/art-review.md as you go, including any rejects with reasons.
6. STOP. Present the four sheets for adjudication by Dan/advisor. The lesson
   of this correction pass is that the pipeline self-judged tone and missed;
   winners are picked by a human this time.

PHASE 3 — import + verify (after winners are named)
7. Import each winner with tools/import_sprite.py. The eye_pulse
   frame_regions in the manifest were measured against v1 art — re-measure
   the eye region on each new sprite and update frame_regions to match
   (verify with the programmatic frame-effect check used in the acceptance
   pass).
8. Update manifest (chosen_seed, status=imported, notes with one-line
   adjudication reasoning), render before/after into art-review/, log the
   verdicts in art-review/art-review.md.
9. Run the full test suite — all 42 must pass. Commit per family with
   message "art-direction v2: <family> feral re-prompt (replaces cute v1)".
   No Co-Authored-By lines.
10. Update PIPELINE-HANDOFF.md and NEEDS-HUMAN.md to reflect the four
    regenerations and close the rat item.
```

---

## Prompt E (fallback) — Consolidation (model: **Opus**; preferred: advisor session)

Preferred path: bring A–D's four reports back to the advisor (Fable) session,
which already holds the audit framing, and it consolidates into
`dev/advisor/audit-01.md`. If running it as a worker instead:

```
You are consolidating a completed four-part audit of the Thornmere AI-art
pipeline (<repo-root>).

HARD RULES: read-only except dev/advisor/; never modify game code/data/docs;
never git add/commit.

INPUTS (read all four, plus NEEDS-HUMAN.md and the "Acceptance criteria
walkthrough" section of art-review/art-review.md):
- dev/advisor/audit-01-seed42.md
- dev/advisor/audit-01-needs-human.md
- dev/advisor/audit-01-verification.md
- dev/advisor/audit-01-showpieces.md

Write dev/advisor/audit-01.md:
1. Executive summary — one paragraph: does the adjudication table stand?
2. Seed-42 audit verdict (uphold / re-adjudicate which families). Families
   the audit flags should be folded into the pending feral-regeneration
   batch (delegation Prompt F in this file) rather than spawning new tasks.
3. The two NEEDS-HUMAN briefs for Dan, condensed to decision points with
   recommendations (Dan decides — keep them framed as choices).
4. Acceptance-criteria status after live verification: which of the three
   not-met criteria are now verified, which remain open, whether icons/FX
   need a follow-up task.
5. Lost-correction forensics: how the mangy/feral directive was dropped
   (director has already ruled mon_rat/mon_hound/mon_moth/mon_blob too cute;
   regeneration is chunk F) and the process fix to adopt.
6. Showpiece scores.
7. ONE paste-ready message for the worker (Sonnet build) session, fenced in
   a code block, covering every fix the audit surfaced — concrete,
   file-level, with acceptance checks. Nothing in the message that Dan
   hasn't been asked to decide; mark decision-dependent items as
   "PENDING DAN: ..." placeholders.

Do not soften findings. Disagreements between sub-reports are themselves
findings — surface them, don't average them.
```

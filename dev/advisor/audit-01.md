# Audit 01 — Consolidated Report: Thornmere AI-Art Pipeline

**Consolidator:** advisor session (Fable), 2026-06-11.
**Inputs:** `audit-01-seed42.md`, `audit-01-needs-human.md`,
`audit-01-verification.md`, `audit-01-showpieces.md`, `NEEDS-HUMAN.md`,
`art-review/art-review.md` (acceptance walkthrough + feral pass log).
**Independent checks performed during consolidation:** semantic JSON diff of the
feral import commit (only the 8 intended sprites changed; no foreign sprites
touched), `npm test` at HEAD (**42/42 pass**), visual confirmation of the
imported feral rat (`art-review/mon_rat-sheet.png` — correction landed).

---

## 1. Executive summary

**The adjudication table does not stand as-is — but the damage is contained and
mostly fixable without GPU time.** A 3-contest blind re-judging overturned 2 of 3
sampled seed-42 wins and found the structural cause: the review log documents
*AI-beats-procedural*, never *seed-42-beats-the-other-seeds*, so most of the 26
seed-42 wins carry low evidentiary weight (seed 42 lost every contest where deep
judging was actually forced). Separately: one showpiece (Choir's Eldest) fails
the box-art bar outright; one engine bug means PC portrait animation is never
visible in-game; and the "mangy/feral" directive turned out never to have been
written down at all — the feral v2 regeneration pass that fixed it (rat, hound,
moth, blob) has since executed cleanly and is verified here. What remains:
re-adjudicate 2–3 families from *existing* candidates, spot re-judge Set B,
one code fix, two decisions for Dan (skeleton, PC portraits), and one scope
ruling (FX sprites).

Scoreboard:

| Area | Verdict | Evidence |
|---|---|---|
| Seed-42 dominance | **Reject blanket uphold** — re-adjudicate spider, mock_king; spot re-judge Set B | `audit-01-seed42.md` |
| Feral regen (rat/hound/moth/blob) | **Done & verified** — closed | `art-review.md` feral log; my diff + test checks |
| Showpieces | 1 SHIP, 2 SHIP-WITH-NOTES, **1 NOT BOX ART** (choir_eldest) | `audit-01-showpieces.md` |
| Live animation | Monsters verified live; **PC portraits never animate (bug)** | `audit-01-verification.md` Part 1 |
| Acceptance criteria A/B/C | A now evidenced; B needs a scope ruling on FX; C half-met (bug above) | §4 below |
| NEEDS-HUMAN items | 2 open, briefed with recommendations | §3 below |

---

## 2. Seed-42 audit verdict

**Do NOT uphold the table.** Blind sample (spider, ghost, mock_king — judged
from crushed PNGs before reading any original verdict):

| Contest | Blind pick | Original | Outcome |
|---|---|---|---|
| mon_spider | **s17** | s42 | Disagree — s42 fails the manifest's own key feature (4-pair eye cluster, two-segment body); s17 delivers both |
| mon_ghost | **s42** | s42 | Agree — only candidate that's actually translucent/trailing; 5 of 6 seeds rendered an opaque muscular bust |
| mon_mock_king | **s1** (s13 best tiles, s23 best eyes) | s42 | Disagree — s42 is mid-pack on the emphasized "TILED not smooth" criterion |

The pattern, confirmed mechanically: every recorded justification argues
AI > procedural placeholder ("replace"), which clears a near-zero bar for Set B's
uninspected placeholders. The seed-vs-seed contest is essentially undocumented.
Seed 42's losses cluster exactly where deep judging was forced (2 of 4
ten-seed showpieces went to s31; moth and scene_victory to s7) — the profile of
a *default that wins shallow contests*, not a uniformly strong seed. Generation
itself is clean (distinct hashes across families and seeds; no copy bug).

**Disposition (folding into existing batches, no new task tracks):**
- **mon_spider, mon_mock_king** — re-adjudicate from existing candidates
  (worker message item W2/W3). No regen needed; better seeds already exist on disk.
- **mon_choir_eldest** — the showpiece review independently failed it; handled
  as W4 (re-adjudicate first, regen only if no seed passes).
- **Set B remainder** (sorcerer, bird, hag, knight, choir, gargoyle, golem) —
  spot re-judge as explicit seed-vs-seed contests with written per-seed
  reasoning (W5). Ghost is already confirmed; moth was regenerated feral.
- rat/hound/moth/blob already left the table via the feral v2 pass.

Scope caveat retained from the sub-report: 3 of 30 contests were sampled; the
claim is not "all 26 wins are wrong," it is "the table's evidentiary basis is
too thin to uphold without the targeted re-checks above."

---

## 3. NEEDS-HUMAN briefs (Dan decides; condensed from `audit-01-needs-human.md`)

### 3a. PC portrait identity

**Reframing fact:** each portrait is the root of a five-ancestry palette-remap
family (`data/art/people.json`) — players pick ancestry at creation and the
engine recolours skin/hair. So the seed choice sets the *default (Vael) face*,
not the only skin tone. **Hard constraint:** any swapped seed must keep skin on
palette indices {13, 12, 11, 9} or the ancestry remaps break (all current s42
picks pass; verified).

**Default position: keep all four s42 picks** — coherent, legible at 1×, and a
diverse default party (veteran darker-skinned warrior / shadowed ambiguous
rogue / dark-haired austere caster / bearded bard-warrior skald).

Your four decision points (narrative, not quality — montages in
`dev/advisor/render/pc_*_{1x,4x}.png`):
1. **Warrior:** keep darker-skinned veteran (s42) ⟷ textbook bright knight (s11)
2. **Caster:** keep dark-haired austere mage (s42) ⟷ blonde overtly feminine sorceress (s7)
3. **Rogue:** keep shadowed/ambiguous s42 (recommended — it *is* the archetype) ⟷ clearest face (s17)
4. **Skald:** keep s42, but the manifest's "green garb accent to distinguish from
   warrior" is weak in the import — worker will run a 1× side-by-side vs
   warrior-s42 (W7); if too close, green touch-up or re-pick (s17 = feminine
   alternative that better satisfies the green note).

### 3b. mon_skeleton — grey vs gold bones

The import inverted the design of record: manifest said "bone whites… gold
**sword** accent"; what shipped is **gold bones + grey sword**, on *all six
seeds* (no bone-white candidate exists to swap to). The flavor
(`bonechatter`, tier-1, "It talks all through the fight. None of it is words.")
has no gold/curse angle. Decisive technical point: under combat distance-shading
the gold ramp dead-ends through **blood-red to black** in 3–4 steps, while grey
bones ride a purpose-built 7-step neutral ramp
(`dev/advisor/render/skel_gold_shadeladder.png`).

> **Recommendation: (b) regenerate toward grey/bone-white** — fiction, the
> manifest's own written intent, and the engine all point grey; nothing points
> gold. Close call, though, and **(a) accept gold** is defensible at zero cost:
> keep s42 specifically (only seed whose sword stayed distinct) and apply the
> drafted flavor line making the gilding intentional:
> *"Grave-gilt and grinning. Someone dressed its bones in gold and it has not
> stopped boasting since."*
> Both payloads are pre-drafted in the worker message (W6); pick one.

---

## 4. Acceptance-criteria status (the three not-met items)

| # | Criterion | Status after live verification |
|---|---|---|
| A | Before/after engine captures | **Evidenced.** Current-state captures exist (`dev/advisor/render/live/`: undercroft corridor, combat with portrait, Greta facade+interior, title) against baseline `thornmere-start.png` (086d882 — CRT-green text, no art at all). Worker should fold official copies into the README pass (W10). |
| B | Icons (16×16) / FX (24×24) updated | **Split finding.** Icons: genuinely excluded by the spec ("small UI icons… NOT adjudicated") *and* current icons are polished pixel art — no action. FX: the spec does **not** exclude them, and PIPELINE-HANDOFF.md lists FX 24×24 as a pipeline target — the "out of scope" line in art-review.md was a session-level interpretation. **Needs a director scope ruling (W8).** |
| C | Live frame-effect playback at 2–4 fps | **Half met.** Monster eye_pulse verified live: canvas eye-region brightness oscillates 398↔287 on an exact 400 ms cadence (2.5 fps, in spec). PC portrait breathe+eye_pulse is **never visible in-engine**: `portraitOf()` at `src/main.js:368` hardcodes the `_a` frame, bypassing the animation system. Sprite data is correct; the render path is the bug (W1). |

---

## 5. Lost-correction forensics (rat/hound/moth/blob)

The verification session's timeline overturns my own earlier framing — a
finding in itself: **there was no mid-run directive that got dropped; the
directive never existed in the repo at all.** "Mangy/feral/adorable" first
appears in LESSONS.md (3ed7e0b, 22:35), written *after* all art was imported —
a retrospective observation, not a live order. The manifest subject lines were
never rewritten after initial creation (git history of `gen-manifest.json`
confirms). The failure was an **absent** correction, not a lost one — and the
adjudication layer then rubber-stamped the result ("grey upright rat, fangs…
**menacing**"), which independently corroborates §2's shallow-judging finding.

**Process fix:** already codified — CLAUDE.md's rule that art direction must be
written into the manifest `subject` field before any generation run. The feral
v2 pass followed it to the letter, and I verified the execution during
consolidation:

- Subjects written to manifest **before** GPU run (ffc1bd3); output to separate
  `candidates-feral/` (no v1 clobber); generation log + comparison sheets
  committed (b563d01); **human (Dan) adjudication** with varied winners
  (rat s11, hound s7, moth s42, blob s11 — no default-seed pattern); eye
  regions re-measured; NEEDS-HUMAN item closed (b5d9fd2).
- My semantic diff of the import commit: only the 8 intended sprite frames
  changed across `monsters.json`/`monsters2.json`; zero foreign edits.
  `npm test` at HEAD: 42/42. The rendered rat is unambiguously feral.
- **One hygiene nit:** commit 75f2d14 is labeled "mon_rat" but contains all
  four families' sprite data; the three "per-family" commits that follow are
  manifest/sheet-only. The log misstates the blast radius. Not worth a history
  rewrite — flagged so the convention holds next time.

---

## 6. Showpiece scores (vs "would ship as 1985 box art")

| Showpiece | Verdict | One-line basis |
|---|---|---|
| **Tallow King** (flagship) | **SHIP** | Blue-flame crown lands at every scale; ember eyes read at 2×; coherent pulse; genuine box art |
| Mockery King | **SHIP-WITH-NOTES** | All key reads land; "ceramic tile" reads as gilt plate — the one gap |
| Maldrec | **SHIP-WITH-NOTES** | All four key reads land; lower robe melts into bg; grin slightly goofy in frames a/b |
| **Choir's Eldest** | **NOT BOX ART** | Black robe composites into the `#16121e` background (no silhouette); defining concentric eye renders small and detached |

**Cross-report convergence worth noting:** the blind seed audit (no knowledge of
the showpiece review) and the showpiece review (judging only the import)
independently flagged the *same* defect on mock_king — weak tile read on s42 —
and the blind audit found seeds (s13 best tiles, s1 best balance, s23 best eyes)
that may resolve the SHIP-WITH-NOTES reservation **for free**. That's W3.
Recurring art-direction lesson for any regen: *"black robe" subjects need
explicit value separation from the night background or the figure disappears at
composite time* — bit choir_eldest fatally, grazed maldrec.

---

## 7. Paste-ready worker message

Everything below is concrete and file-level; items marked **PENDING DAN** must
not be executed until he decides. Relay as-is.

```
Remediation pass following the advisor audit (reports in dev/advisor/). Work
top to bottom; W1–W5 are decision-free. Conventions: manifest subject edits
BEFORE any generation; written per-seed reasoning in art-review/art-review.md
for every re-adjudication (seed-vs-seed, not AI-vs-procedural); re-measure
eye_pulse frame_regions after ANY sprite import; mode-tagged filenames; new
candidates never clobber old; one accurately-labeled commit per item; 42/42
tests after each import; the 27 original logic tests are untouchable.

W1 — BUG: PC portraits never animate in-engine.
src/main.js:368 portraitOf() hardcodes the `_a` suffix, so character
inspection always renders the static frame and the breathe+eye_pulse effect
(verified correct in sprite data) is invisible in every reachable screen.
Fix the render path so the inspection view uses the animated drawable
(resolveVariant of the un-suffixed portrait id). Acceptance: with the game
running, the character-view canvas hash changes on a 600ms cadence
(dev/advisor/audit-01-verification.md Part 1 documents the sampling method);
42/42 tests still pass.

W2 — Re-adjudicate mon_spider from EXISTING candidates (no regen).
Blind audit (dev/advisor/audit-01-seed42.md) found s42 fails the manifest's
own key feature ("4-pair red eye cluster"; also lacks a two-segment body)
while s17 delivers both. Judge all six crushed candidates side by side at
game scale, log per-seed reasoning, and if the verdict flips: import winner,
re-measure eye region, update manifest (chosen_seed + notes with the
seed-vs-seed rationale), run tests, commit.

W3 — Re-adjudicate mon_mock_king from EXISTING 10 candidates (no regen).
Two independent reviews converged on the same defect: s42's body reads as
gilt plate, not the required "TILED ceramic, not smooth". Contenders from the
blind audit: s1 (best overall balance), s13 (cleanest tile grid), s23
(brightest rectangular eye glow). Same protocol as W2. This likely clears the
showpiece review's only reservation on this boss for free.

W4 — mon_choir_eldest failed the box-art bar (NOT BOX ART).
Failure mode (dev/advisor/audit-01-showpieces.md): the black robe composites
into the #16121e night background leaving no silhouette, and the defining
concentric eye renders small and detached. First, re-adjudicate the 10
existing seeds specifically for (a) robe value separation from the night
background and (b) eye size/placement in the hood. If any seed passes both,
import it (W2 protocol). If none passes — likely — STOP and report:
regeneration needs a manifest subject rewrite, draft below, PENDING DAN
approval of the wording:
  "vast robed figure in charcoal triangular robe with pale rim-lit hood and
  shoulder line filling the frame, one enormous concentric-ring eye seated
  inside the hood dominating half the figure with void center and blue iris
  and bright core and black pupil, dozens of tiny trapped faces embossed
  across the robe surface like imprisoned souls, green pendant gem, one
  skeletal clawed hand emerging"
  (intent: figure must hold a silhouette against #16121e; faces are texture
  ON the robe, not the subject; eye 2-3x current size, in the hood.)

W5 — Spot re-judge the remaining Set B seed-42 wins as real contests.
Families: mon_sorcerer, mon_bird, mon_hag, mon_knight, mon_choir,
mon_gargoyle, mon_golem (ghost already blind-confirmed; moth regenerated).
For each: view all six crushed candidates at game scale, write per-seed
verdicts in art-review.md. Where s42 genuinely wins, say why it beat the
field. Where it doesn't, flag the family in the log and STOP — do not import
without the flip being reviewed (batch the flips into one report).

W6 — PENDING DAN: mon_skeleton grey-vs-gold (NEEDS-HUMAN item 2).
Decision brief: dev/advisor/audit-01-needs-human.md Brief 2. Execute exactly
one branch:
 (a) Accept gold: keep s42 as imported; replace bonechatter's flavor in
     data/monsters.json with: "Grave-gilt and grinning. Someone dressed its
     bones in gold and it has not stopped boasting since."
 (b) Regen grey: BEFORE any GPU run, replace the manifest subject with:
     "animated skeleton warrior, bleached bone-white and pale grey bones,
     chalk-coloured skull with dark hollow eye sockets, visible ribcage,
     exposed spine and hip joints, holding a single gold sword as the only
     gold accent" — then standard feral-pass protocol (new output dir
     candidates-skeleton-v2/, generation commands prepared for Dan, human
     adjudication, import, re-measure eye region x32,y16,w32,h10 which was
     fitted to the gold pixels).

W7 — PC portraits (NEEDS-HUMAN item 1).
Worker-executable now: render warrior-s42 and skald-s42 side by side at true
1x and report whether they read as distinct characters (the manifest's green
garb accent on the skald is weak in the import) — report only, no change.
PENDING DAN (execute only what he picks): warrior keep-s42 vs s11; caster
keep-s42 vs s7; rogue keep-s42 vs s17; skald keep / green touch-up / re-pick
s17. HARD CONSTRAINT if any seed is swapped: the new base's skin must use
palette indices {13,12,11,9} or the five-ancestry remap system in
data/art/people.json breaks — verify before import.

W8 — PENDING DAN: FX sprite scope ruling.
The v2.1 spec excludes only textures and small UI icons; PIPELINE-HANDOFF.md
lists FX sprites (24x24, data/art/ui.json) as a pipeline target. The
walkthrough's "icons/FX out of scope" was a session interpretation. If Dan
rules in-scope: run FX as a mini pipeline batch (manifest entries with
subjects FIRST, then the standard generate/crush/adjudicate/import flow). If
out-of-scope: record the exclusion explicitly in PIPELINE-HANDOFF.md with
"per director ruling <date>". Icons need nothing either way (spec-excluded
and already polished pixel art per art-review/icon-sheet.png).

W9 — Tool fix: tools/artrender.js output-directory argument.
Two audit sessions independently hit it: the positional out-dir is ignored
and renders land in art-review/ (one session nearly overwrote a tracked
reference sheet). Make the positional outdir work per the usage comment, or
fail loudly on unrecognized args. Add a line to test or manually verify both
forms.

W10 — Paper-trail close-out (after W1-W5 land).
Update art-review.md acceptance rows: A → MET citing the live captures
(dev/advisor/render/live/ + thornmere-start.png baseline, or re-capture
official copies for the README pass); C → MET-for-monsters citing the 400ms
live oscillation data, plus W1's fix evidence for PC portraits; B → per W8
outcome. Add re-adjudication outcomes (W2-W5) to the log with their
seed-vs-seed reasoning. Commit messages must name what actually changed
(the feral pass's "mon_rat" commit contained all four families — don't
repeat that).
```

---

*Consolidation checks: no files written outside `dev/advisor/`; no commits made
by this session; server not started (live evidence consumed from the
verification report). Test suite at HEAD: 42/42.*

# Audit 01 — Blind re-judging of seed-42 dominance

**Auditor:** independent advisor session (read-only outside `dev/advisor/`).
**Method:** judged only from crushed PNGs in `dev/pixel-art/candidates/` viewed
with the Read tool, via labeled montages and a true-game-scale (96×80) strip
under `dev/advisor/render/`. Original verdicts (gen-manifest, art-review,
NEEDS-HUMAN) NOT read until Step 5.

Contests re-judged blind:
1. `mon_spider` (set A, 6 seeds) — sub13
2. `mon_ghost` (set B, 6 seeds) — sub13
3. `mon_mock_king` (showpiece, 10 seeds) — sub15

Game sprite is 96×80 (candidate PNGs are 4× preview = 384×320).

---

## Contest 1 — mon_spider

_Subject target: large dungeon spider, brown two-segment body, eight hairy legs
spread wide, four-pair red eye cluster, chelicera fangs. Must read as menacing,
1985 Amiga._

**Per-seed (strengths/weaknesses before naming a winner):**

- **s3** (`mon_spider_s3_sub13.png`) — Clean rounded two-segment body, eight legs
  spread, pale curved chelicera. But the two upraised front legs read almost like
  antennae, eyes are small/faint, and the overall vibe is calm, not menacing.
  Anatomically fine, low threat.
- **s7** (`mon_spider_s7_sub13.png`) — Smaller body mass, long thin legs, twin pale
  fangs hanging straight down, bright red paired eyes. Reads as a spider but feels
  spindly/light rather than a "large dungeon spider"; less mass = less menace.
- **s11** (`mon_spider_s11_sub13.png`) — Good bulbous body, strong curved
  chelicera arc, red paired eyes, legs spread wide and hairy. Clean and readable
  but the face is a bit generic; only one visible eye pair.
- **s17** (`mon_spider_s17_sub13.png`) — Largest, most distinct **two-segment**
  body (clearly separated bulbous abdomen above cephalothorax), the only candidate
  showing a convincing **four-eye cluster**, prominent twin fangs, thick hairy legs
  spread wide. Best subject fidelity and most physical mass/threat of the set.
- **s23** (`mon_spider_s23_sub13.png`) — Clean, readable, red paired eyes, serrated
  chelicera. Competent but slightly rounder/softer; reads a touch generic and less
  imposing than s17.
- **s42** (`mon_spider_s42_sub13.png`) — Striking, creepy near-**humanoid screaming
  face** on the body; strong menace. But the two-segment anatomy is the weakest of
  the set — body is a single orb with a face rather than abdomen+cephalothorax, and
  only one eye pair. Scariest face, weakest spider-body.

**Game-scale (96×80) readability** (`render/mon_spider_gamescale.png`): all six
survive the crush. s17 keeps the most internal structure (abdomen + four eyes
still legible); s42's face still reads; s7 thins out most.

**Blind winner: seed 17 — close call (vs s42).** s17 wins decisively on subject
fidelity (two segments, four eyes, mass) and ties/leads on menace; s42 is the only
real rival and beats it purely on facial fright while losing the spider anatomy.
s11/s23 are clean runners-up. My pick: **s17**.

---

## Contest 2 — mon_ghost

_Subject target: translucent shroud-wight, pale chalk face, hollow sockets,
howling mouth, mist-blue trailing form._

**Per-seed (strengths/weaknesses before naming a winner):**

- **s3** (`mon_ghost_s3_sub13.png`) — Pale skull face, hollow sockets, wide howling
  mouth, long blue hair. But the body is a **solid muscular human torso** with
  defined pecs/shoulders — opaque, grounded, not translucent and not trailing.
  Off-target on "shroud-wight / mist-blue trailing form."
- **s7** (`mon_ghost_s7_sub13.png`) — Same problem, worse: heavily **muscled grey
  bodybuilder torso**, screaming skull. Reads as a frost-giant berserker, not a
  ghost. Least translucent of the set.
- **s11** (`mon_ghost_s11_sub13.png`) — Strong skull face and howl, but again a
  solid broad-shouldered torso. Opaque, no trailing mist. Off-target.
- **s17** (`mon_ghost_s17_sub13.png`) — Good menacing skull, but solid muscular
  shoulders/chest. Same off-target solidity.
- **s23** (`mon_ghost_s23_sub13.png`) — Skull + howl fine, solid shoulders. Slightly
  more shroud-like collar but still an opaque bust, no trailing form.
- **s42** (`mon_ghost_s42_sub13.png`) — The **only** candidate matching the brief:
  floating skull-faced wight, hollow sockets, howling mouth, and a body that
  **dissolves into wispy mist-blue tendrils** — no solid torso. Translucent,
  trailing, genuinely spectral. Strong menace. Clear subject-fidelity outlier.

**Game-scale (96×80)** (`render/mon_ghost_gamescale.png`): s42 reads cleanly as a
floating skull trailing into mist — unambiguously a ghost. The other five read as
screaming muscular busts; their solid shoulders persist even crushed.

**Blind winner: seed 42 — clear win.** Five of six seeds render the wrong creature
(an opaque muscular screaming undead); only s42 is a translucent trailing
shroud-wight. This is the least ambiguous of the three contests.

---

## Contest 3 — mon_mock_king (showpiece)

_Subject target: squat blue glazed ceramic **tile** golem, gold grout lines,
three gold crown prongs, glowing sky-blue rectangular eyes, gold belly medallion.
**Must read as TILED, not smooth.** Menace, not cute._

The whole field nails the silhouette (squat, blue, crowned, medallion). The
deciders are therefore the harder criteria: **tile discipline** (clean grout grid
vs. smooth muscled shading), **glowing rectangular eyes**, and **menace vs. cute**.

**Per-seed (strengths/weaknesses before naming a winner):**

- **s1** (`..._s1_sub15.png`) — Clean gold **grout grid** across body/limbs, two
  bright glowing sky-blue **rectangular eyes**, spiked crown, big gold medallion,
  gold claws. Squat, menacing-regal. Best all-round tile+eye+menace package.
- **s3** (`..._s3_sub15.png`) — Tiled but **noisy**: gold rendered as scattered
  speckles rather than clean grout lines, so the grid reads less cleanly. Good
  crown/stance/menace.
- **s5** (`..._s5_sub15.png`) — Clearest literal **three crown prongs** and a bold
  medallion, but the torso is **smooth/muscled** with sparse grout — weak on the
  emphasized "tiled" criterion.
- **s7** (`..._s7_sub15.png`) — **Smoothest and cutest**: rounded blob body, thin
  sparse lines, blank (non-glowing) eyes, placid face. Fails both "tiled" and "not
  cute." Weakest candidate.
- **s11** (`..._s11_sub15.png`) — Solid clean tile grid, crown, medallion, claws;
  face a little flat and eyes only faintly lit. Strong mid candidate.
- **s13** (`..._s13_sub15.png`) — **Best pure tile discipline**: gold grout clearly
  partitions the body into a rectangular ceramic grid. Crown + medallion + claws.
  Eyes/face a touch flat, but most unambiguously "TILED."
- **s17** (`..._s17_sub15.png`) — Good grid + clearly **glowing rectangular eyes**;
  head slightly rounded/soft but claws+crown hold menace. Strong.
- **s23** (`..._s23_sub15.png`) — **Brightest glowing rectangular eyes** in the set
  (pop even at game scale), clean tile grid, big medallion, menacing. Crown reads
  as two big horns rather than three prongs.
- **s31** (`..._s31_sub15.png`) — Bulky and menacing, multi-prong crown, but body
  is **smooth muscled plate**, sparse grout — weak "tiled" read (like s5/s7).
- **s42** (`..._s42_sub15.png`) — Angry angled eyes (good menace), crown, medallion
  on a gold belt, gold claws. But tiling is **mid-pack** — moderate grout over a
  fairly smooth muscular torso; leads on no single criterion.

**Game-scale (96×80)** (`render/mon_mock_king_gamescale.png`): tile grid + glowing
eyes survive best on s1, s23, s13, s17. s7 collapses to a smooth cute blob;
s5/s31 lose their (already sparse) grout.

**Blind winner: seed 1 — close call (vs s23 and s13).** s1 is the best balance of
the three deciding criteria (clean tiles + glowing rectangular eyes + menace).
s13 wins pure tile discipline; s23 wins eyes. **Notably, seed 42 is NOT my pick
here — it is mid-pack on the emphasized "tiled" criterion and leads on none.**

---

## Blind verdicts (locked before reading originals)

| Contest | My blind winner | Confidence |
|---|---|---|
| mon_spider | **seed 17** | close call (vs s42) |
| mon_ghost | **seed 42** | clear win |
| mon_mock_king | **seed 1** | close call (vs s23, s13) |

So before unsealing: I'd back seed 42 on **1 of 3** (ghost), disagree on spider
(I prefer 17), and — if the original chose 42 for the showpiece — disagree there too.

---

## Step 5 — Comparison with the original adjudication

**Original choices** (`data/art/gen-manifest.json`): all three chose **seed 42**.
- `mon_spider` → s42; manifest note: _"Brown body; 4-pair red eye cluster is key feature. Keep purely brown-red."_
- `mon_ghost` → s42; note: _"Pure grey-blue palette… Spectral glow from mist-blue ramp."_
- `mon_mock_king` → s42; note: _"Blue-gold tile body is the key read. Must look tiled/ceramic, not smooth."_

**Agreement table:**

| Contest | My blind pick | Original | Agree? | Original reasoning addresses the deciding factor? |
|---|---|---|---|---|
| mon_spider | s17 | s42 | ❌ disagree | No |
| mon_ghost | s42 | s42 | ✅ agree | Winner right, but recorded reasoning is AI-vs-placeholder, not seed-vs-seed |
| mon_mock_king | s1 (≈s23/s13) | s42 | ❌ disagree | No — and the note asserts the very quality the pixels contradict |

**Per-contest:**

1. **mon_spider — DISAGREE.** The `art-review.md` note (line 173) reads:
   _"Procedural: top-down oval with stick legs. AI: frontal close-up, chelicerae,
   8-leg spread."_ That justifies **AI > procedural**, not **s42 > the other 5 AI
   seeds** — the actual contest is never adjudicated in writing. And the manifest's
   own stated **key feature — the "4-pair red eye cluster"** — argues *against* s42:
   s42 renders a single dominant eye pair on a near-humanoid skull face with a
   weak, single-orb body (no clear cephalothorax+abdomen). **s17** is the one
   candidate that actually shows a multi-eye cluster *and* a distinct two-segment
   body. By the project's own criterion, s17 is the stronger spider.

2. **mon_ghost — AGREE (winner), but for undocumented reasons.** I independently
   reached s42, and decisively: five of six seeds render an opaque muscular
   screaming bust, not a translucent trailing shroud-wight. So the *outcome* is
   correct. But the recorded note (line 153) — _"Screaming skull face, mist-blue
   tendrils. Placeholder was grey smear."_ — again frames it as AI-beats-placeholder
   and never states the real deciding factor (that the other AI seeds are
   off-target solids). Right answer, wrong (or absent) reasoning. This is the one
   case where the field was so lopsided that any discriminating judge lands on 42.

3. **mon_mock_king — DISAGREE.** Note (line 194): _"Blue tile body, prominent gold
   grout, 3 crown prongs, gold medallion — tile-golem reads perfectly."_ The
   emphasized criterion is **"must read as TILED, not smooth"** — yet s42's torso
   is among the *smoother*, more-muscular candidates with only moderate grout.
   **s13** delivers the cleanest ceramic tile grid, **s23** the brightest glowing
   rectangular eyes, and **s1** the best overall balance of tiles+eyes+menace. The
   note claims s42 "reads perfectly" on exactly the axis where the pixels show three
   other seeds beating it. Disagreement squarely on the stated deciding factor.

**Pattern.** In all three, the recorded justification is an **AI-candidate vs.
procedural-placeholder** argument (verdict column = "replace"), not a
**seed-vs-seed** argument. For Set B the placeholder was an uninspected
"grey smear"/"blob" (`art-review.md` lines 145-148), so "replace" clears a near-zero
bar and whichever seed was nominated wins by default. The 6-/10-way contest among
AI seeds is essentially **undocumented** across the table.

## Step 6 — Mechanical sanity check

- **Generation genuinely varied per family.** sha256 of the s42 `_sub` files across
  spider/ghost/mock_king/rat/golem are all distinct, and the six `mon_spider`
  seeds are six distinct hashes — the seed-42 dominance is **not** a copy/manifest
  bug; real different images were judged.
- **Win tally** (`gen-manifest.json`): seed 42 = **26 of 30**; the only non-42
  winners are `mon_moth`→7, `mon_candleking`→31, `mon_maldrec`→31, `scene_victory`→7.
- **The loss pattern is the tell.** Seed 42 lost exactly where a *genuine* deep
  contest was forced: two of the four 10-seed **showpieces** (candleking, maldrec)
  went to s31, the violet-contrast moth went to s7, and the victory scene went to
  s7. When judging actually discriminated between strong AI candidates, 42 did
  **not** automatically win. By my blind pixels, 42 should also have lost
  mock_king — which would drop it to **1 of 4 showpieces**. That is not the profile
  of a uniformly dominant seed; it is the profile of a default that wins when the
  contest is shallow and loses when it is deep.

---

## VERDICT

**Do NOT uphold the adjudication table as-is.** On a 3-contest blind sample I
disagree with **2 of 3** seed-42 wins (spider, mock_king), and in the third
(ghost) the winner is right but the recorded reasoning never engages the real
deciding factor. The common cause is structural: the adjudication documents
**AI > procedural**, not **seed42 > the AI field**, so the 26 seed-42 wins — most
of them "uncontested" in the sense that no seed-vs-seed reasoning was written —
carry **low evidentiary weight**. The dominance is at least partly an artifact of
shallow judging, not solely a strong seed (confirmed by 42 losing every contest
where deep judging was forced).

**Families that need re-adjudication** (re-judge existing candidates; no regen
needed — a better seed already exists in the set):

1. **mon_spider** → re-adjudicate; my pixels favor **s17** (true two-segment body +
   multi-eye cluster, the manifest's own stated key feature). Confidence: high that
   this deserves a second look; medium that s17 ultimately wins.
2. **mon_mock_king** (showpiece) → re-adjudicate on tile discipline + eyes; my
   pixels favor **s1**, with **s13** (best tiles) and **s23** (best glowing eyes) as
   the real contenders over s42. Confidence: high.

**Broader recommendation:** every Set B "replace" was decided against an
uninspected placeholder, so those ~9 seed-42 wins (and the Set A close calls)
should be **spot re-judged as explicit seed-vs-seed contests with written per-seed
reasoning.** This is independent of — and additive to — the four families the
director already ordered regenerated (mon_rat, mon_hound, mon_moth, mon_blob) for
being off-direction.

**Scope caveat:** I re-judged only 3 of 30 contests; I am not asserting all 26
seed-42 wins are wrong. I am asserting that (a) 2 of 3 sampled do not survive blind
re-judging, (b) the recorded reasoning systematically fails to document the
seed-vs-seed decision, and (c) that combination is sufficient to reject a blanket
"uphold" and to require targeted re-adjudication starting with mon_spider and
mon_mock_king.





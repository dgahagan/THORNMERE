# Audit-01 — Showpiece Boss Review

Independent art-review session. One bar: **"would this ship in 1985 as box / manual
art?"** (Bard's Tale-era Amiga/C64.)

**Method.** Judged from rendered PNGs of the *imported game data*
(`data/art/monsters3.json`, 96×80, 3 frames each) — not candidate files. Rendered
with `tools/artrender.js` into `dev/advisor/render/sp{1,2,4}x/`. Note: the renderer
writes `name.png` regardless of scale, so each scale must go to its own dir
(the delegation command's positional out-path is ignored — `out=` is required, and
it defaults to `art-review/`). Every frame viewed at 1× (ship size) and 4×;
Tallow King additionally at 2× per its flagship brief. The renderer composites
over the night background `#16121e` — relevant below.

Reference reads taken from `data/art/gen-manifest.json` (`subject`/`notes`) and
`data/monsters.json` flavor.

---

## 1. The Tallow King — `mon_candleking` (FLAGSHIP)

> Manifest: *"massive wax golem king, pale waxy body seated on candle throne, eight
> tall candle pillars flanking left and right, crown of blue flames on head, large
> sunken red ember eye-sockets, gaping mouth with wax teeth."* Notes: *"Blue-flame
> crown critical. Red ember eyes must read at 2×."*
> Bestiary: *"A king of rendered fat on a throne of wicks, crowned with seven flames."*

Renders: `sp4x/mon_candleking_{a,b,c}.png`, `sp2x/…`, `sp1x/…`.

**Key reads.**
- **Blue-flame crown — CRITICAL — lands at every scale.** A vivid cyan-to-white
  flame crest sits dead-center on the skull. It is the brightest, highest-chroma
  element in the frame and the eye goes to it first. Reads unmistakably at 1× as a
  blue cap, holds at 2×, and resolves into licking individual flames at 4×. This is
  the single best-executed read of the four showpieces.
- **Red ember eyes — must read at 2× — they do.** Two saturated red sockets sit
  just under the crown. At 2× they read clearly as a pair of glowing embers against
  the pale wax face; at 1× they survive as two red pips. Pass.
- **Wax body.** Pale cream/bone torso with warmer tan musculature and visible drip
  runs down the legs — reads as rendered fat / guttered wax, not generic flesh. Good.
- **Throne + flanking candle pillars.** Tall lit candles on candelabra frame both
  sides (red-tipped flames, dripping shafts), the figure hunched on a dark seat
  between them. The "throne of wicks" composition is legible at 1× as a symmetrical
  candle-flanked silhouette — strong box-art framing.
- "Gaping mouth with wax teeth" reads at 4× (snarling maw mid-face); collapses to a
  dark notch at 1×, which is fine.

**Silhouette.** Excellent. Symmetrical hunched mass between two vertical candle
columns, blue flame spiking above — instantly a throne-room boss even as a 96px
thumbnail.

**Palette / Amiga character.** Disciplined. Cool blue crown vs. warm candle-amber
vs. bone-white body is a clean three-way contrast in a limited ramp; no muddy
mid-tones, no banding artifacts. Period-correct.

**Frame b/c eye-pulse coherence.** Coherent — reads as a pulse, not a smear. The
ember sockets brighten/shift and the crown flame flickers between frames while the
body stays locked; nothing tears or doubles. Animation will read as a living glow.

**Misses:** none material. (Bestiary says "seven flames"; the crown renders as a
unified blue crest rather than seven countable tongues — a flavor-text nicety, not a
box-art miss.)

### SHIP

This is genuine 1985 box art and earns flagship status. No re-prompt needed.

---

## 2. The Choir's Eldest — `mon_choir_eldest`

> Manifest: *"vast robed figure in black triangular robe filling frame, single giant
> concentric-ring eye dominating the hood with void center and blue iris and bright
> core and black pupil, dozens of tiny trapped faces across robe like imprisoned
> souls, green pendant gem, one skeletal clawed hand emerging."* Notes: *"Concentric
> eye is the defining feature. Trapped faces are secondary detail."*

Renders: `sp4x/mon_choir_eldest_{a,b,c}.png`, `sp1x/…`.

**This one does not hold together as a figure.** Two compounding failures:

1. **The robe is invisible.** The "black triangular robe filling the frame" is
   rendered in tones at or near the night background, so when composited over
   `#16121e` the robe *is* the background. There is no silhouette. What the eye
   actually sees is a loose **field of disembodied tan faces floating on black** —
   the "secondary detail" is the entire read, because the body that was supposed to
   contain them isn't there. It looks like a scatter of skulls, not a vast robed
   singer.
2. **The "giant" eye isn't giant.** The defining concentric-ring eye renders small
   (~a sixth of the frame) and floats *detached* at the top center with empty black
   between it and the face-field. The brief wants it "dominating the hood"; instead
   it reads as a small blue ring lost above a cloud of faces. The green pendant gem
   and skeletal hand (right edge) are present but, with no figure to anchor them,
   read as more free-floating debris.

At 1× it is a tiny blue ring over a smudge of dots — it does not read as a boss, or
as anything, at ship size.

**What works:** the eye's *internal* pulse is good — across a→b→c the core/pupil
opens and closes (bright tight core → dark center → wide black pupil) without
smearing. That coherent pulse is the one salvageable asset.

**Silhouette:** effectively none (see failure 1).
**Palette:** the few lit elements (blue eye, tan faces, green gem) are clean, but
discipline is moot when 70% of the intended subject renders as background.

**Misses, named for re-prompt:**
- The robe must carry **its own value separation from the night background** — give
  it a rim-lit edge / a near-black-but-not-background charcoal with a lighter hood
  and shoulder line so a silhouette exists when composited over `#16121e`.
- The concentric eye must be **2–3× larger and seated *in* the hood**, not floating
  above an empty gap — it should dominate, with the faces reading as texture *on the
  robe surface beneath it*, not as the primary subject.

### NOT BOX ART

The flagship's exact opposite: the defining feature is undersized and the figure
itself doesn't render. Needs a regeneration with robe value-contrast and a far
larger, hood-seated eye.

---

## 3. The Mockery King — `mon_mock_king`

> Manifest: *"squat blue glazed ceramic tile golem, body covered in blue tile pattern
> with gold grout lines, three gold crown prongs on head, wide rectangular glowing
> sky-blue eyes, round gold belly medallion, stubby branch arms."* Notes: *"Blue-gold
> tile body is the key read. Must look tiled/ceramic, not smooth."*
> Bestiary: *"A crowned lie with a court of one."*

Renders: `sp4x/mon_mock_king_{a,b,c}.png`, `sp1x/…`.

**Key reads.**
- **Three gold crown prongs — land** at every scale; three distinct gold spikes
  crest the head and survive to 1×.
- **Gold belly medallion — lands.** A round gold boss sits center-belly, clearly the
  focal ornament; reads at 1×.
- **Wide rectangular glowing eyes — land,** and they carry the animation (see pulse).
- **Blue + gold-grout body — lands, but as the weaker of the two key reads.** Gold
  lines do segment the body into panels and the blue/gold contrast is strong and
  period-clean. However the surface reads more like **gilt-edged blue plate armor /
  cloisonné than glazed *ceramic tile*** — the grout grid isn't regular enough, and
  the panels carry metallic-style highlights rather than the flat glaze the brief
  asks for. The "tiled, not smooth" instruction is only partly satisfied: it is
  not smooth, but it is not obviously *tile* either.

**Silhouette.** Strong — squat, broad-shouldered, crowned; an unmistakable stout
golem at 1×.

**Palette / Amiga character.** Clean two-hue (blue/gold) scheme with good value
range; reads as a confident limited palette. Period-correct.

**Frame b/c eye-pulse coherence.** Good and purposeful: a/b hold a normal eye, then
**frame c blows the rectangular eyes out to a bright sky-blue glare** — a clear
"eyes light up" pulse, coherent, no smear. Best use of the eye-pulse mechanic after
the Tallow King.

**Misses, named for re-prompt (minor):**
- Push the **grout into a regular grid of smaller square tiles** and flatten the
  per-panel highlights toward a matte glaze so the surface reads as ceramic, not
  plate. This is the only thing between it and an unqualified SHIP.

### SHIP-WITH-NOTES

Box-art quality and would ship; the one reservation is that the signature "ceramic
tile" texture reads closer to enameled armor. Optional polish, not a blocker.

---

## 4. Maldrec the Unsung — `mon_maldrec`

> Manifest: *"sinister sorcerer in black triangular robe, angular boxy face with
> violet glowing eyes and wide upturned grin, tall staff topped with bright blue orb,
> one arm raised in casting pose."* Notes: *"Violet eyes and blue orb are key. Staff
> must be prominent. Grin should read clearly."*
> Bestiary: *"The hedge-wizard the Founders would not let sing. He has waited three
> hundred years to be heard."*

Renders: `sp4x/mon_maldrec_{a,b,c}.png`, `sp1x/…`.

**Key reads.**
- **Violet glowing eyes — land.** A vivid magenta-violet pair burns under the hood,
  the highest-chroma facial element; reads at 1× as two purple pips. Pass.
- **Blue staff orb — lands and is prominent.** A large bright blue glowing sphere
  caps the staff on the figure's right; it's the second focal point after the eyes
  and reads strongly even at 1×. Exactly the "key" the brief wanted.
- **Staff — prominent.** Full-height shaft from orb to floor, clearly held. Good.
- **Readable grin — lands.** A wide upturned toothy grin sits under the eyes and
  reads as a sinister leer at 4×; survives as a light notch at 1×.
- **Casting pose.** Right arm thrown up and back — a clear "casting" gesture that
  adds box-art dynamism. Robe is the black triangular shape requested.

**Silhouette.** Reads via the strongest cues — hooded head, raised arm, and the
vertical orb-topped staff make a recognizable sorcerer pose at 1×. Note that, like
the Choir's Eldest, the **lower robe darkens nearly into the background** and the
hem is carried mostly by the two tan feet; unlike the Choir, the *upper* figure has
enough blue-grey rim light on hood and shoulders that the silhouette still holds.
The figure-into-darkness effect is period-appropriate here rather than fatal.

**Palette / Amiga character.** Disciplined — dark robe, violet eyes, blue orb, small
gold/tan accents (staff cap, feet, chain). Clean limited ramp, good focal contrast.

**Frame b/c eye-pulse coherence.** Coherent — the violet eyes pulse in intensity and
the orb glow shifts subtly across a→b→c while the pose holds; reads as a charging
caster, no smear.

**Misses, named for re-prompt (minor):**
- Lift the **lower-robe value** a notch (or add a faint hem rim-light) so the bottom
  third doesn't dissolve into `#16121e`; right now the feet do too much of the work
  anchoring the figure.
- The grin in frames a/b reads slightly **clenched/goofy** rather than menacing; a
  touch more asymmetry or a sneer curl would sharpen the "sinister" intent. Frame c
  already reads better.

### SHIP-WITH-NOTES

Genuine box art — all four key reads (violet eyes, blue orb, prominent staff,
readable grin) land at ship scale. The notes are polish: keep the lower robe from
melting into night, and make the grin meaner.

---

## Summary

| Showpiece | Key reads at 1× | Silhouette | Eye-pulse | Verdict |
|---|---|---|---|---|
| **Tallow King** (`mon_candleking`) | All land (crown, embers, candles) | Excellent | Coherent | **SHIP** |
| Choir's Eldest (`mon_choir_eldest`) | Fail — eye small, figure absent | None (robe = bg) | Eye pulse good | **NOT BOX ART** |
| Mockery King (`mon_mock_king`) | Land; tile reads as plate | Strong | Coherent (eyes flare) | **SHIP-WITH-NOTES** |
| Maldrec (`mon_maldrec`) | All land | Holds (upper); hem melts | Coherent | **SHIP-WITH-NOTES** |

**Headline:** the flagship delivers — the Tallow King is the strongest of the four
and reads as box art at every scale, blue-flame crown and ember eyes included. Two
others (Mockery King, Maldrec) ship with minor, named polish. **One regeneration is
warranted:** the Choir's Eldest, whose black robe composites into the night
background (no silhouette) and whose defining concentric eye renders too small and
detached. The recurring lesson across Choir and Maldrec: **a "black robe" subject
needs explicit value separation from the `#16121e` night background**, or the figure
disappears at composite time.

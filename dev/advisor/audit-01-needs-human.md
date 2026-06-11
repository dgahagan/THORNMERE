# Audit 01 — Decision Briefs for the Game Director

**Auditor:** independent advisor session (read-only outside `dev/advisor/`).
**Method:** art judged only from crushed/rendered PNGs viewed with the Read tool,
at and near true game scale. Montages and comparison images written under
`dev/advisor/render/`. Engine behaviour read from `src/`; palette/remap facts read
from `data/art/`. **Nothing decided here — these are recommendations for Dan.**

Covers the two open items in `NEEDS-HUMAN.md`:
1. PC portrait identity (warrior / rogue / caster / skald)
2. `mon_skeleton` grey-vs-gold bones

> **Process note (logged honestly):** `tools/artrender.js` ignores its outdir
> argument and always writes `art-review/mon_skeleton-sheet.png`. Running the
> command from the brief overwrote that tracked reference; I restored it with
> `git checkout` and instead rendered the imported skeleton myself with PIL into
> `dev/advisor/render/`. No tracked file is left modified (`git status` clean
> outside `dev/advisor/`). Flagging so a worker session doesn't hit the same trap.

---

## BRIEF 1 — PC portrait identity (who the player IS)

This is a **narrative/identity choice**, framed as such. Quality notes are included
only to rule out non-options. All four current picks are seed 42.

### The fact that reframes this whole decision

The four PC portraits are **not single fixed faces.** Each chosen base sprite is
the root of a **five-ancestry palette-remap family** in `data/art/people.json`:

| Ancestry | Remap of base skin/hair | Reads as |
|----------|-------------------------|----------|
| **Vael** | none — base identity | the literal chosen-seed face |
| **Korrun** | parchment→honey, honey→amberwood, umber→peat | warmer / deeper tan |
| **Fennick** | umber→leather | subtle warm shift |
| **Aldari** | parchment→chalk, honey→bone, umber→slate-dark | pale / ashen / fae |
| **Halfwyld** | umber→moss, shadow→moss-deep, deep-blue→fen-green | green-touched / wild |

So **the player picks ancestry at creation**, and the engine recolours the base.
Two consequences for this decision:

1. **"Skin tone" is not locked by the seed choice.** The chosen seed sets the
   **Vael (default) look**; the other four ancestries are derived from it. Picking
   a medium-tan base (like s42) does not deny pale options — Aldari lightens it.
2. **Hard technical constraint:** the remaps key off palette indices **13
   (parchment), 12 (honey), 9 (umber)**. Any chosen base *must* keep its skin in
   that warm ramp or the ancestry recolours break. I verified the current s42
   imports satisfy this — all four use indices {13,12,11,9} for skin
   (rogue starts at 12, no 13, because the hood shadows the lightest tone; the
   Aldari honey→bone step still lightens it). **If Dan swaps any archetype to a
   different seed, that seed must be re-checked for skin-ramp compatibility before
   import.** This is the one place a "just re-pick a seed" instinct can silently
   break the ancestry system.

**Renders:** per archetype, `dev/advisor/render/pc_<arch>_4x.png` (all 6 seeds,
4× preview) and `pc_<arch>_1x.png` (true 32×40 game scale, crushed then upscaled
×5 for viewing). All current picks survive the 1× crush — no archetype is forced
to drop its chosen seed on legibility grounds.

---

### Warrior — `pc_warrior_*` (sub16)
*Subject: plate-mail shoulder armour, strong determined face, short hair, intense eyes.*
*Manifest note: "Plate mail grey; face warm tones. No magic colour."*

All six survive 1×. Every seed is a clean, legible knight; this is the strongest
family of the four (no weak options).

- **s3** — brown short hair, light-tan skin, warm fur/leather collar, stern. Reads young.
- **s7** — brown hair, light skin, visible plate shoulders, neutral expression.
- **s11** — fair/blond hair, very light skin, full gorget with blue undertrim, strong jaw. The most "classic paladin."
- **s17** — brown hair, tan skin, plate + blue trim. Balanced, unremarkable in a good way.
- **s23** — warm tan, plate, slightly softer/rounder face.
- **s42 (current)** — the **darkest, warmest skin** of the set, short/shaved hair, most shadowed and grizzled, a small gold accent on the pauldron. Reads oldest and most "veteran."

**Identity read:** s42 is the only non-light-skinned warrior and the most weathered.
If the intended default hero is a seasoned, darker-skinned veteran, s42 is the
distinctive pick. If the default should be an archetypal everyman knight, s11 or s7
are cleaner reads. Minor quality note: s42's gold pauldron flirts with the "no magic
colour / plate grey" note, but it reads as a gold trim, not a glow — not
disqualifying.

> **Recommendation:** **Keep s42** if you want the party's default warrior to read
> as a hardened veteran with darker skin (good diversity default, and Aldari/pale
> ancestry still available to players who want it). **Switch to s11** only if you
> want the default warrior to be the textbook bright-plate knight.

---

### Rogue — `pc_rogue_*` (sub12)
*Subject: hooded dark leather, sharp watchful angular eyes, calculating, shadowed face under hood.*
*Manifest note: "Reject any candidate whose face doesn't survive crush at 1x."*

This is the family where 1× legibility actually bites — every option is a face
inside a hood shadow, so contrast matters. All six *do* survive, but with a spread.

- **s3** — gaunt, sharp, face catches warm light; eyes read. Lean and severe.
- **s7** — warm tan, defined nose, the most lit/handsome face; clearest read of the set.
- **s11** — stubbled/scruffy, warm, slightly busier.
- **s17** — balanced, well-lit, very clear face; reads cleanly at 1×.
- **s23** — softer features, tan, reads slightly more androgynous/feminine.
- **s42 (current)** — the **most shadowed and ambiguous** face, cooler tone, eyes
  catch the light under a deep hood. Most "mysterious / gender-ambiguous." At 1× it
  is on the darker end of the set but the eyes still carry it.

**Identity read:** s42 leans hardest into the rogue fantasy (face you can't quite
read), at a small legibility cost. s7 and s17 are the safest faces if you want the
rogue to be clearly visible. s23 is the option if you want the default rogue to read
more feminine.

> **Recommendation:** **Keep s42** — for the rogue specifically, the shadowed,
> ambiguous face *is* the archetype, and it clears the 1× bar. If you'd rather the
> rogue's face be unmistakable at a glance (it's the only archetype where the hood
> fights legibility), **s17** is the strongest clear-faced alternative.

---

### Caster — `pc_caster_*` (sub14)
*Subject: wide-sleeved robe, luminous magical eyes, flowing hair, arcane focus amulet.*
*Manifest note: "Blue arcane eyes are the distinguishing mark. Warm skin tones."*

All six carry the **glowing blue eyes + blue gem amulet** — the mark survives 1×
beautifully on every seed (the blue pops against warm skin). The family splits by
hair colour into two distinct identities:

- **Blonde/golden-haired (s3, s7, s11, s23)** — long wavy fair hair, warm light
  skin, reads strongly feminine, sorceress-of-light vibe. s7 and s3 are the cleanest.
- **Dark-haired (s17, s42)** — s17 and **s42 (current)** both have dark straight
  hair, cooler/paler skin, darker robe; read more androgynous and more "classic
  arcane scholar." s42 is the more severe of the two.

**Identity read:** the choice here is mostly **hair colour / gender presentation**,
not quality — all are excellent. s42 (dark-haired, cooler) is the most genre-neutral
"mage." The blonde seeds read more overtly feminine and lighter in mood.

> **Recommendation:** **Keep s42** if you want the default caster to read as a
> dark-haired, slightly austere arcanist (most androgynous, most "any-gender mage").
> Choose a **blonde seed (s7)** instead if you specifically want the default caster
> to read as a bright, overtly feminine sorceress. This is purely a tone call — no
> option is weaker.

---

### Skald — `pc_skald_*` (sub15)
*Subject: layered travelling garb, expressive open face, holding/wearing a small drum or lyre, performer's confident look.*
*Manifest note: "Green accent in garb to distinguish from warrior. Warm expressive face."*

These are busier (head, shoulders, **and** an instrument), so the face occupies less
of the sprite — faces are smaller but all still read at 1×.

- **s3** — long-haired, holding a lyre, lean, warm. Face small but legible.
- **s7** — bearded, round drum/lute, layered garb. Classic travelling bard.
- **s11** — younger, short hair, hands clasped; face decent size.
- **s17** — the one clearly **feminine** skald: softer features, long framing hair;
  reads well and appears to carry a green garb accent (matches the manifest note).
- **s23** — bearded, broad, fur garb; "viking warrior-poet."
- **s42 (current)** — bearded, warm-toned, leather/chain, confident, instrument in
  hand. Solid masculine bard-warrior; the strongest "skald" silhouette.

**Identity read:** s42 is the best *bard-warrior* read (beard + instrument + layered
armour). **Caveat to verify:** the manifest asked for a **green garb accent to
separate skald from warrior**, and in the s42 render the garb reads brown/leather/gold
— the green differentiation is weak. Skald-vs-warrior separation currently rests on
the beard + instrument, not colour. s17 is the option if you want a feminine default
skald (and appears to better satisfy the green-accent note).

> **Recommendation:** **Keep s42** as the default skald (best bard-warrior identity),
> **but** have a worker session confirm at 1× whether warrior-s42 and skald-s42 are
> distinct enough side by side given both are warm brown/gold — if they read too
> similar, either re-pick the skald toward a greener seed or add a green garb accent
> in a touch-up. Switch to **s17** if you want a feminine default skald.

---

### Cross-archetype consistency

- **Rendering style is consistent** across all four families — same crush, same
  lighting, same head-and-shoulders framing. No mismatched-style outliers.
- **No two archetypes read as the same person** at the current s42 picks. Closest
  pair is **warrior-s42 vs skald-s42** (both warm-toned, masculine) — distinguished
  by the skald's beard + instrument + longer hair. Worth a deliberate side-by-side
  check (see skald recommendation). The caster (dark hair, blue eyes) and rogue
  (hooded) are unmistakably distinct.
- **Gender presentation is not uniform** at the current picks: warrior/skald/rogue-s42
  read masculine-to-androgynous, caster-s42 reads androgynous. If a uniform default
  presentation is desired, that's a deliberate choice to make now; if variety is fine,
  the current set already spans it. **Remember every face is ancestry-recoloured but
  not gender-swapped** — gender presentation of the default is fixed by the seed, skin
  tone is not.

> ### ⬛ RECOMMENDATION BLOCK — Brief 1 (PC identity)
>
> **Default position: keep all four s42 picks.** They are a coherent, legible,
> diverse default party and every one survives the 1× crush. The s42 set reads as:
> veteran darker-skinned warrior, shadowed ambiguous rogue, dark-haired austere
> caster, bearded bard-warrior skald.
>
> **Decisions only Dan can make (narrative, not quality):**
> 1. **Warrior** — keep darker-skinned veteran (s42) vs textbook bright knight (s11)?
> 2. **Caster** — keep dark-haired austere mage (s42) vs overtly feminine blonde sorceress (s7)?
> 3. **Skald** — keep s42, but resolve the **green-accent / warrior-similarity** note
>    (verify side-by-side; touch-up or re-pick if too close).
> 4. **Rogue** — keep shadowed-ambiguous s42 (recommended) vs clearest face (s17)?
>
> **Hard constraint for the worker session if ANY seed is swapped:** confirm the new
> seed's skin uses palette indices {13, 12, 11, 9}, or the five-ancestry remap system
> breaks. The current s42 picks all pass this check.

---

## BRIEF 2 — `mon_skeleton`: grey bones vs gold bones

### 1. What the flavor text actually says

The skeleton portrait is used by exactly **one** monster, `bonechatter`
(`data/monsters.json`):

```
"id": "bonechatter", "name": "Bonechatter", "tier": 1, "undead": true,
"portrait": "skeleton",
"flavor": "It talks all through the fight. None of it is words."
```

Searched all of `data/` for skeleton text — this is the only flavor string. **It
says nothing about bone colour, gold, gilding, curses, or ancient warriors.** It's a
clattering, chattering low-tier undead (tier 1, the weakest rank, 2d6 HP). There is
**no "golden curse" or "crypt-king" angle in the writing** to justify gold bones — the
fiction points to an ordinary, almost comic, rattling skeleton.

For reference, the **manifest's own intent** also wanted grey-ish bone, not gold bone:
- `subject`: "yellowed bone skull… visible ribcage… holding a **gold sword**"
- `notes`: "**Bone whites (bone/chalk/honey).** Dark hollow sockets. **Gold sword accent.**"

So the design of record is **bone-white bones with a gold *sword* accent.** The gold
was meant to be the *weapon*, not the skeleton.

### 2. What actually got imported (rendered from game data)

`dev/advisor/render/skel_compare.png` (procedural grey reference vs imported s42) and
`skel_gold_1x.png` (imported, true game scale). Pixel histogram of the imported
`mon_skeleton_a` sprite:

```
 29 gold        1311 px      6 bone     0 px
 28 gold-dark    623 px      7 chalk    0 px
 30 candle        48 px
 12 honey         23 px   →  ~1,982 gold-ramp px, ZERO bone/chalk px
 13 parchment      3 px
  2 shadow       137 px (sockets/background)
  3 slate-dark    39 px (the sword)
```

The allowed palette **included bone (6) and chalk (7)** — the model simply used none
of them. The bones are gold; the only grey in the sprite is the **sword**, which went
slate-dark. **The intended gold/grey assignment is literally inverted:** procedural =
grey bones + gold sword; imported s42 = **gold bones + grey sword.** The "gold sword
accent" is gone — it became a grey sword that nearly disappears.

### 3. "Just re-pick a different seed" does not work

`dev/advisor/render/skel_allseeds_1x.png` — **all six seeds (s3, s7, s11, s17, s23,
s42) rendered fully gold-boned.** The gold is a property of the prompt ("yellowed bone
skull" + a palette where the gold ramp was available and dominant), not of any seed.
There is **no bone-white candidate to swap to.** Notably, s3/s7/s11/s17/s23 all raise a
**gold** sword that blends into the gold bones (accent lost); **s42 is the only seed
whose sword went grey**, so paradoxically s42 is the *most legible* of the gold set —
its sword reads as a separate object. If the gold identity is accepted, s42 is the
correct seed within it.

### 4. Engine consequence of gold bones — distance shading

This is the part automation can speak to concretely. Monster sprites are
**distance-shaded** in combat by walking the palette `shade[]` chain up to 4 steps
darker (`src/ui/renderer.js` `shadeLevel`, `src/ui/fb.js` `shaded`). The two bone
colours behave very differently under that chain:

```
GREY bones:  chalk7 → bone6 → stone5 → slate4 → slate-dark3 → shadow2 → night1 → black0
             (a 7-step NEUTRAL ramp — purpose-built for depth; stays "bone" as it darkens)

GOLD bones:  candle30 → gold29 → gold-dark28 → blood-dark24 → black0
             (only 3-4 steps, and step 3 DEAD-ENDS into blood-dark, a dark RED)
```

`dev/advisor/render/skel_gold_shadeladder.png` shows this directly: at distance-shade
level 2 the gold skeleton turns **dark blood-red**, and at level 3 it's nearly black.
So at normal combat range the gold skeleton does not read as "gold" *or* "bone" — it
reads as a **maroon/blood-red** figure, then black. A grey skeleton would ride a clean
neutral ramp and stay legibly skeletal at every depth. **Gold bones cost you depth
legibility; grey bones are what the engine's shading was designed around.**

(There is no tier/rank palette-swap system that reuses the skeleton — `variants` with
`remap` exist only for the 5 PC ancestries and 4 boss showpieces. So gold bones don't
break any *other* monster. The cost is confined to this sprite's own distance read.)

### 5. Quality is not the question — the AI sprite is better art

To be clear: the imported gold skeleton is a **genuine quality tier-jump** over the
procedural — anatomical skull, real ribcage, hollow sockets, vs the procedural's
stick-marionette geometry. The procedural grey sheet (`art-review/mon_skeleton-sheet.png`)
is **placeholder geometry, not a deployable option.** So the real choice is **not**
"gold AI vs grey procedural." It is:

- **(a)** accept the AI sprite's **gold** identity as-is, or
- **(b)** **regenerate the AI skeleton family** keeping the detailed portrait but
  forcing bones into the bone/chalk/honey ramp and reserving gold for the sword.

### Tradeoffs

| | Accept gold (a) | Regenerate toward grey (b) |
|---|---|---|
| **Fiction fit** | Weak — flavor is a comic rattling tier-1 undead, no gold/curse angle. Needs a flavor touch-up to justify. | Strong — matches flavor + manifest's own "bone whites" note. |
| **Cost** | Zero — already imported. | A GPU regen pass (Dan-run) + re-import + re-measure eye_pulse boxes. |
| **Combat legibility** | Shades to blood-red/black at range (loses "skeleton" read). | Clean neutral bone ramp at all depths. |
| **Gold-sword accent** | Lost (sword went grey). | Recovered (bones pale, sword gold pops). |
| **Risk** | Reads as golden idol / gilded relic — odd for the *weakest* undead. | Standard regen risk; family is otherwise good. |


> ### ⬛ RECOMMENDATION BLOCK — Brief 2 (skeleton bones)
>
> **Recommendation: (b) regenerate the family toward grey/bone-white bones —
> but it is a close, defensible call, and (a) is acceptable with a flavor touch-up.**
>
> **Why (b):** Three independent signals all point at grey, and none point at gold:
> 1. The flavor (`bonechatter`, tier-1, "talks all through the fight… none of it is
>    words") is a *comic, ordinary* rattling skeleton — no curse/gilding angle.
> 2. The manifest's own design of record already says **"bone whites (bone/chalk/
>    honey)… gold sword accent"** — gold bones are a *miss* against the written intent,
>    not a chosen redirection.
> 3. The engine penalises gold bones at range (shades to **blood-red → black**),
>    while grey rides the neutral bone ramp the shading was built for.
>
> The gold version isn't *bad art* — it's good art of the wrong creature (reads as a
> gilded relic / golden idol, which is strange for the weakest undead in the game).
>
> **If Dan picks (b)**, the worker session should, **before any GPU run, edit the
> manifest `subject` field** (per the project's hard rule that art-direction lives in
> the manifest, not chat). Suggested rewrite:
> > `"animated skeleton warrior, bleached bone-white and pale grey bones, chalk-coloured skull with dark hollow eye sockets, visible ribcage, exposed spine and hip joints, holding a single gold sword as the only gold accent"`
>
> …and de-emphasise gold in wording ("yellowed" was likely the trigger). Keep allowed
> indices but expect bones to land on 6/7 with 12 only as a warm shadow. After import,
> **re-measure the `eye` frame_region** (current box x32,y16,w32,h10 was fitted to the
> gold pixels) per the CLAUDE.md eye_pulse warning.
>
> **If Dan picks (a) — accept gold as-is** (valid if he likes the gilded look and
> wants zero regen cost): keep **seed 42 specifically** (it's the only one whose sword
> stayed grey, so the silhouette reads). Then have a worker session apply a one-line
> flavor touch-up so the gold is *intentional* rather than an unexplained oddity.
> Draft line for `bonechatter` in `data/monsters.json` (replacing the current flavor,
> or as an added bestiary note):
> > `"Grave-gilt and grinning. Someone dressed its bones in gold and it has not stopped boasting since."`
>
> This keeps the chatter-box character, explains the gold in-world, and turns the
> palette miss into a feature. (Note: this still leaves the distance-shading
> blood-red read — acceptable, just be aware of it.)
>
> **One-line summary for Dan:** *The skeleton came out gold, all six seeds; the
> fiction and the engine both want grey. Recommend a grey regen, but if you like the
> gold, keep s42 and let me add a line of flavor so it reads as deliberate gilding.*

---

## Artifacts produced (all under `dev/advisor/render/`)

| File | What |
|------|------|
| `pc_<warrior\|rogue\|caster\|skald>_4x.png` | all 6 seeds, 4× preview |
| `pc_<warrior\|rogue\|caster\|skald>_1x.png` | all 6 seeds, true 32×40 game scale |
| `skel_compare.png` | procedural grey (ref) vs imported gold s42, matched scale |
| `skel_gold_1x.png` / `skel_gold_4x.png` | imported skeleton from game data |
| `skel_gold_shadeladder.png` | gold bones under engine distance-shading (→ blood-red → black) |
| `skel_allseeds_1x.png` | all 6 skeleton seeds (all gold) |
| `pc_montage.py` / `skel_render.py` / `skel_compare.py` | render helpers |

*No files outside `dev/advisor/` were created or left modified. No git add/commit.*

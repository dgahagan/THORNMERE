# The Lay of Thornmere — Designer's Guide

**DESIGNER / DEVELOPER REFERENCE — NOT FOR PLAYERS.**
This document spoils the entire game. It exists to give future sessions a
bird's-eye view of the lore and the critical path, and to keep any new content
tonally and structurally consistent with what already ships.

- **Game:** *Thornmere — The Founding Song*, a Bard's Tale (1985)-faithful
  first-person dungeon crawler.
- **Scope of this doc:** the world's lore, the three dungeons, the quest spine,
  and the exact gates between a new start and victory.
- **Source of truth:** everything below is drawn from `data/maps/*.json`,
  `data/items.json`, `data/monsters.json`, `data/classes.json`,
  `src/core/services.js`, and `src/main.js`. When this doc and the data
  disagree, **the data wins** — fix the doc.

---

## 1. The Premise

Thornmere is a walled market town on a cold fen. For three hundred years the
**Founding Song**, rung from the town's **bell tower**, kept the *fen-wights*
out of the gates. The Song is carried in **Three Verses**, physical relics kept
in three sockets in the bell-tower door.

Last winter the hedge-wizard **Maldrec the Unsung** stole all three Verses in a
single night and carried them out onto the fen. Without them the wards are
failing — wights gather at the east gate at every new moon, the north gate is
sealed and undefended, and the Magistrate calls the dead bell "pending review."

The party's task: **recover the Three Verses and sing the gates whole.** Each
Verse is held by one of Maldrec's lieutenants, in one of three dungeons.

### The intro crawl (verbatim, `src/main.js:1768-1769`)

> THORNMERE, a walled market town on a cold fen. For three hundred years the
> Founding Song in the bell tower kept the fen-wights from the gates.
>
> Last winter the hedge-wizard MALDREC THE UNSUNG stole its Three Verses. The
> wards are failing. The Magistrate posts notices. The taverns talk.

### Tone

Folk-melancholy with a dry, ironic edge. The world treats *song* as load-bearing
magic — wards, doors, and the dead all respond to verses, notes, and the act of
singing (or, in Maldrec's case, **un**singing). Lore is delivered indirectly:
through "magic mouths" set in dungeon walls, boss-encounter narration, secret-room
finds, and tavern rumors. Keep new lore in this register — wry, oral-tradition,
preoccupied with music and being *remembered*. The recurring joke is that the
town is ungrateful and the Song is always being sung slightly wrong.

---

## 2. The World: Thornmere (town hub)

Map `data/maps/town.json` (id `town`). The overworld is the town itself —
navigated first-person, by signboard, like 1985. All services live here; there
is **no SP regeneration underground**, so the town is the pacing heartbeat
(delve → retreat → heal/recharge/level → delve).

| Building | Role | Notes |
|---|---|---|
| **Adventurers' Hall** | Create party, save | The starting building; save still works here in all modes. |
| **Greta's Provisioner** | Gear shop | Weapons, armor, torches, instruments. |
| **The Magistrate's Court / Review Board** | Level up, buy spell tiers, change class | **Leveling happens ONLY here** — never in the field. Spell tiers are bought whole. The Stormcaller→Riddlemaster chain happens here. |
| **Temple of the Quiet Flame** | Healing, cure conditions | Cures poison, drain, stoning, SP drain, fear — for gold. |
| **Roskva's Spark House** | Recharge spell points | The only SP refill. |
| **The Drowned Goose / The Hart & Hollow** | Taverns | Buy wine (restores Skald songs), hear rumors, rumor journal. |
| **The Boarded Tannery** | → **Sunken Undercroft** | Entry to Dungeon 1 (north row / "Coppers Row"). |
| **East Gate** | → **Howling Barrow** | Entry to Dungeon 2. |
| **The Bell Tower** | Verse sockets / Needle entry / **VICTORY** | Where the whole quest resolves. See §6. |
| **North Gate** | Sealed | Flavor only; guarded by two **Guardian Statues**. No access. |

**Town encounters** are light: Fen Strays and Footpads by day; Footpads,
Tavern Toughs, and Gate Wights by night. The night encounter set is itself
worldbuilding — the wards are thin enough that wights now wander the streets.

### Tavern rumors (verbatim, `src/core/services.js:112-121`)

These are the player's breadcrumb trail. They cycle in order. All seven:

1. *"The old tannery on Coppers Row is boarded for a reason. The cellar never flooded, friend — it drowned."* → points to Undercroft entry.
2. *"Maldrec the Unsung, they called him. Took the Three Verses from the bell tower in one night, and the gate-wards have been dying ever since."* → the central hook.
3. *"A candle-king squats below the tannery, fat on three hundred years of tallow. He hums something he should not know."* → Tallow King (Verse One).
4. *"East over the fen, the mounds sing of an evening. My gran said the Choir keeps what it is given — and keeps what it isn't, too."* → the Barrow / Choir (Verse Two).
5. *"No one has rung the founding bell since the Verses went. Door's sealed. The Magistrate calls it 'pending review.'"* → the bell-tower win condition.
6. *"Wights at the east gate again last new-moon. The wards are thin as tavern beer."* → stakes / failing wards.
7. *"They say only a Riddlemaster can open doors that eat wizards whole. Never met one. The Review Board would know how it's done."* → the Riddlemaster gate (see §5).

---

## 3. The Three Verses (quest relics)

The three MacGuffins. Each is a quest item (`data/items.json:126-131`), dropped
by a boss, and slotted at the bell tower. Their flavor encodes which dungeon
they come from and hints at the next.

| Verse | Flavor (verbatim) | Held by | Where |
|---|---|---|---|
| **The First Verse** | "A sheet of hammered tin, pierced with note-holes. It hums against the skin." | Tallow King | Undercroft, level 2 |
| **The Second Verse** | "A knotted cord of grave-silk. Run it through the fingers and the melody climbs." | Choir's Eldest | Barrow, level 3 |
| **The Third Verse** | "A sliver of bell-bronze, still warm. The Song's ending, and its beginning." | Maldrec the Unsung | Needle, level 4 |

Note the material progression — **tin → grave-silk → bell-bronze** — and that
the third is described as "the Song's ending, and its beginning," closing the loop.

---

## 4. The Three Dungeons

Three dungeons, escalating in depth and gimmick. Each holds **one secret room
with a unique item**, several **magic mouths** (free lore + tactical hints),
and ends in a **boss who drops a Verse**. Riddle-locked doors gate progress in
the first two; the third adds anti-magic and teleporter chaos plus the final
Riddlemaster seal.

Recurring maze mechanics (all data-driven per cell): secret doors (search with
`E`), spinners (silently rotate the party — desync the automap), teleporters,
dark zones (need torch/light), anti-magic zones (fizzle casting, strip active
effects), trap squares (crumble/gas/spike/pit), riddle doors (type the answer),
and stairs.

---

### 4.1 The Sunken Undercroft — *Verse One*

Entry: **The Boarded Tannery**. Theme: a drowned cellar-system under the town —
rotted brick, wet sheen, the dark deepening with depth. Two levels.

**Through-line:** the tanners sealed the flooded cellar; it didn't stay sealed.
Below squats the **Tallow King**, a thing of rendered fat grown fat on three
centuries of tallow, crowned with seven candle-flames, holding the First Verse
in his molten fist.

**Level 1 — Drowned Cellars** (`undercroft1.json`, dark)
- **Riddle door** — *"Each night I die to light the hall, and my king wears seven of me for a crown. Name me."* Answer: **candle / flame** (hint: "Answer as a chandler would").
- **Magic mouths:** the wax "remembers what the river forgot"; the riddle hint; *"The tanners sealed the cellar. The cellar did not agree to stay sealed."*
- **Secret room (17,2):** a smuggler's nook — Greatcandle, 2× Healing Draught, 120g.
- Stairs up → town; stairs down → Undercroft 2.

**Level 2 — The Old Crypts** (`undercroft2.json`, dark)
- **BOSS — The Tallow King** (cell 3,17). Encounter text: *"A vaulted hall ankle-deep in warm wax. Ten thousand candle-stubs burn blue. On a throne of wicks sits the TALLOW KING, and the First Verse hums in his molten fist."* Summons Tallow Acolytes/Crawlers; phase-summons at 50% HP.
  - **Victory drop — Verse One** + 500g. Victory text seeds the next dungeon: *"…THE FIRST VERSE. As it cools, a whisper: 'The second sleeps east, under the singing mounds.'"*
- **Secret room (17,3):** **Tallowbrand** — a sword "burning without heat" (2d6+2), + 200g.
- Mouths warn to "bring a light he cannot eat" (i.e. true-seeing / Eyebright vs. his fear/illusion).

**Designer notes:** This is the tutorial dungeon. README pegs the Tallow King as
a level 5–6 fight. The "candle/flame" riddle is the gentlest of the three. Keep
the candle/wax/tallow motif consistent if expanding here.

---

### 4.2 The Howling Barrow — *Verse Two*

Entry: **East Gate**. Theme: wind-haunted burial mounds on the fen — singing
stones, wind galleries, hollow stone voices. Three levels.

**Through-line:** the mounds "sing in rounds." A **Choir of Hollow Men** keeps
what it's given (and what it isn't), conducted by the ancient **Choir's Eldest**,
which wears the Second Verse as a grave-silk cord at its throat. Barrow level 2+
introduces **anti-magic zones** and the **wind** riddle.

**Level 1 — Outer Mounds** (`barrow1.json`)
- Mouths: the mounds sing in rounds; a spinner warning (*"Walk widdershins where the wind turns you"*); *"The Choir keeps what it stole. The Eldest keeps the Choir."*
- **Secret room (18,17):** **Wardshield** — "rim ringed with a verse of the Founding Song" (AC bonus, +2 saves), +300g.
- Stairs up → town (East Gate); down → Barrow 2.

**Level 2 — The Wind Galleries** (`barrow2.json`, dark + anti-magic zone)
- **Riddle door** — *"I sing through every mound yet own no mouth; I touch all faces and hold no shape. What am I?"* Answer: **wind / air** (hint: "It is howling at you now").
- Mouth lore: *"The sorcerers were buried with their books. The books did the digging out."* (seeds the Barrow Sorcerer / undead-caster enemies).
- **Secret room (16,16):** 2× Thunder Flask, Strong Draught, +350g.

**Level 3 — Hall of the Choir** (`barrow3.json`, dark + anti-magic zone)
- **BOSS — The Choir's Eldest** (cell 18,4). Encounter text: *"A round hall of standing stones, each carved with an open mouth. The CHOIR OF HOLLOW MEN stands in ranks, and at the centre, vast and patient, THE CHOIR'S ELDEST raises one hand. The grave-silk cord of the Second Verse hangs at its throat."* Summons Hollow Men at 50% HP; mouth warns "Stand not in the front rank when the Eldest draws breath" (its AoE "held note").
  - **Victory drop — Verse Two** + 1200g. Victory text seeds Dungeon 3: *"'The third is in the Needle. The Needle's door is your own bell tower, and it will not open to the unriddled.'"*
- **Secret room (17,17):** **Cantor's Fork** — black bone instrument, +3 song power, +400g. (A Skald upgrade — note the design intent that the bard gets meaningfully stronger mid-game.)

**Designer notes:** Mid-game difficulty spike. The "unriddled" line is the
explicit foreshadow of the Riddlemaster gate. Motif: wind, hollow mouths,
choirs, the dead that won't stop singing.

---

### 4.3 Maldrec's Needle — *Verse Three* (final dungeon)

Entry: **The Bell Tower**, but only after Verses One & Two are slotted (see §6).
Theme: an anti-magic tower that is "taller on the inside, and deeper than tall" —
glass, mirrors, copying-rooms where Maldrec endlessly (and wrongly) transcribes
the stolen Verses. Four levels, saturated with **anti-magic zones**, **teleporters**,
and **spinners**.

**Through-line:** Maldrec the Unsung has spent three hundred years copying the
Verses he can't make sing, growing worse with every wrong copy. The tower's
servants are glass revenants, rune golems, illusion weavers, and **Maldrec's
Hands/Images** (his own multiplied selves). The top floor is sealed by seven
riddles at once — passable only by a **Riddlemaster**.

**Level 1 — The Threshold** (`needle1.json`, anti-magic zones)
- Mouths: *"You climb by going in. The Needle is taller on the inside, and deeper than tall."* and *"The master copies the Verses over and over. He cannot make them sing. It has made him worse."*
- Stairs up → town (Bell Tower); down → Needle 2.

**Level 2 — The Copying Floors** (`needle2.json`, anti-magic + dark zones)
- Lore: *"Every copy is a little wronger. The wrongness has to live somewhere."*
- **Secret room (17,4):** **Fen-Warden's Mail** — taken from "the east gate's last captain" (good armor), +500g. (Ties back to the failing east-gate wards.)

**Level 3 — The Gauntlet** (`needle3.json`, anti-magic + dark zones)
- **Riddle door** — *"I answer in your own voice, yet I never speak first. What am I?"* Answer: **echo** (hint: "Shout into the stairwell and listen").
- **Secret room (18,18):** **Stormpike** — a lightning-scarred spear (2d8+2), +700g.

**Level 4 — The Unsung Sanctum** (`needle4.json`, anti-magic zones)
- **SEAL DOOR (cell 11,17) — RIDDLEMASTER ONLY.** *"A door of grey glass, graven with seven interlocking riddles… Only a RIDDLEMASTER could hold seven answers in one breath."* No Riddlemaster → cannot reach Maldrec. This is the game's hard gate (see §5).
- **BOSS — Maldrec the Unsung** (cell 11,19). Encounter text: *"The top of the Needle is open to a sky that is wrong. At a lectern of black glass stands MALDREC THE UNSUNG, three hundred years of rejection in his eyes, the Third Verse chained to his wrist. 'At last,' he says. 'An audience.'"*
  - Two phases: at 75% HP he splits into **Maldrec's Images** ("the room is suddenly full of Maldrecs"); at 45% HP he speaks a stolen Verse and the Needle sends Rune Golems + Maldrec's Hands. Mouths advise *"Trust only what survives being seen"* (true-seeing kills his illusory copies) and *"When he begins to unsing, stop being polite."*
  - **Victory drop — Verse Three** + 2000g. Victory text: *"…every stone in the Needle sounds a true note. The bronze sliver unchains itself… Take the three Verses to the bell tower of Thornmere, and sing the gates whole."*
- **Secret room (2,18):** **Needle Shard** — a knife (3d4+2, high crit) from Maldrec's shame-walled first workshop, + 2× Strong Draught, +800g.

**Designer notes:** Maldrec is the thematic payoff — the villain is a *bad
artist* who couldn't be remembered, so he stole the thing everyone remembers.
His mechanics (copies, illusions, un-singing/SP-drain, anti-magic everywhere)
all dramatize "a wrongness that has to live somewhere." The true-seeing counter
is foreshadowed three times (Tallow King → mouths → here).

---

## 5. The Riddlemaster Gate (the non-obvious requirement)

This is the single most important thing for a new designer to understand,
because it is the only progression gate that isn't "win a fight," and a new
player can wall themselves off the ending without realizing it.

To pass the Needle 4 seal door and reach Maldrec, the party needs **at least one
character of the Riddlemaster class.** Class data: `data/classes.json`.

The class-change chain (all done at the **Review Board**; class change **resets
level to 1 but keeps every spell already learned**):

1. Start as **Hexen** or **Lorist** (the two starting arcane schools).
2. Buy up to **tier 5** in that school.
3. Change class to **Stormcaller** (the hidden third school). Requires tier 5 in Hexen *or* Lorist (`changeRequires: { anySchoolTier: 5, schools: ["hexen","lorist"] }`).
4. As Stormcaller, advance to **tier 6 in two different schools** (`changeRequires: { twoSchoolsTier: 6 }`).
5. Change class to **Riddlemaster** — "Last of the four doors… may learn every school, and the Needle will not open without one."

The chain is hinted by rumor #7 and by the Choir's Eldest victory line ("it will
not open to the unriddled"). **If you add or alter classes, preserve this chain
or the game becomes unwinnable.** The logic-test suite explicitly covers the
class-change chain to Riddlemaster (see `test/`), so changes here will surface
as test failures — treat that as the guardrail working.

---

## 6. The Win Condition (bell-tower logic)

All of this lives in `belltowerMode()` and `victoryMode()` in `src/main.js`
(~1527 and ~1900). The bell-tower door has **three sockets**; behavior depends
on which Verses the party carries (checked live via `partyHasItem`):

| State | Door text / available action |
|---|---|
| No Verses | *"A sealed door graven with three empty sockets. It does not move, and never will, until the stolen Verses return."* |
| Verse 1 only | *"A sealed door graven with three sockets. One Verse alone is not a song."* |
| Verses 1 **and** 2 (`needleOpen` not yet set) | *"The sealed door bears three sockets. Two of your Verses hum in answer."* → **"Set the two Verses in their sockets"** sets `game.flags.needleOpen = true`; the seal cracks and **a stair rises onto the fen into the Needle.** This is how Dungeon 3 is unlocked. |
| `needleOpen` set, all 3 Verses not yet held | Option to **"Climb into Maldrec's Needle"** appears at the bell tower. |
| All three Verses | *"Three sockets. Three Verses. The bell above is holding its breath."* → **"PERFORM THE FOUNDING SONG"** → `victoryMode()`. |

`victoryMode()` sets `game.flags.won = true`, saves, plays the victory fanfare,
and shows the end screen (roster + days-on-the-road + gold).

### Victory text (verbatim, `src/main.js:1907-1922`)

> You set tin, silk and bronze into their sockets. The Skald raises the first
> note — and the bell tower answers, and the walls answer the bell, and the fen
> itself goes still to listen.
>
> The wards close over Thornmere like healed skin. Far out on the marsh, the
> Needle straightens, just a little, as if forgiven.
>
> The Magistrate strikes a medal. Greta extends credit. In two taverns at once,
> someone is already singing it wrong.

(Failure end-state exists too — `THE FEN HAS WON. / so passes the company` —
shown on a total party wipe, `src/main.js:1888-1896`.)

---

## 7. The Critical Path (new start → victory)

The minimum spine, in order. Sub-steps in town (heal/recharge/level/save)
repeat throughout and are omitted for brevity.

1. **Adventurers' Hall** — create six characters. Proven party: Blade, Blade, Warden, Skald, Hexen, Lorist. Save.
2. **Greta's** — gear up; **buy torches** (the Undercroft is dark). Reed pipe for the Skald.
3. **Review Board** — buy starting spell tiers (Hexen + Lorist tier 1 give attack + free light).
4. **Drowned Goose** — drink for rumors; they point at the boarded tannery.
5. **Sunken Undercroft (via Tannery)** — clear L1, solve the **candle** riddle, descend, kill the **Tallow King** on L2 → **Verse One**.
6. **Howling Barrow (via East Gate)** — clear L1–2, solve the **wind** riddle, descend to L3, kill the **Choir's Eldest** → **Verse Two**.
7. **Bell Tower** — set Verses 1 & 2 in their sockets → `needleOpen`; a stair to the **Needle** appears.
8. **Riddlemaster prep** (can be done any time after step 5–6, at the Review Board): take a caster Hexen/Lorist → tier 5 → **Stormcaller** → tier 6 in two schools → **Riddlemaster**. *Without this you cannot finish.* (See §5.)
9. **Maldrec's Needle** — climb from the bell tower, descend L1→L4, solve the **echo** riddle on L3, pass the **Riddlemaster seal door** on L4, kill **Maldrec** → **Verse Three**.
10. **Bell Tower** — with all three Verses, **PERFORM THE FOUNDING SONG** → victory.

**Optional but rewarded:** the six unique secret-room items (Tallowbrand,
Wardshield, Cantor's Fork, Fen-Warden's Mail, Stormpike, Needle Shard) — one per
relevant level. The Cantor's Fork in particular is a real Skald power spike.

---

## 8. Bosses & Lieutenants (quick reference)

| Boss | Dungeon / cell | Tier | Drop | Signature mechanic |
|---|---|---|---|---|
| **Tallow King** | Undercroft 2 (3,17) | 3 | Verse One, 500g | Wax-flood AoE; summons Crawlers at 50%; fear/glare (true-seeing counter) |
| **Choir's Eldest** | Barrow 3 (18,4) | 4 | Verse Two, 1200g | "Held note" AoE (don't crowd the front rank); drain; summons Hollow Men at 50% |
| **Maldrec the Unsung** | Needle 4 (11,19) | 5 | Verse Three, 2000g | Splits into illusory copies (75%); summons golems/hands (45%); Unsinging SP-drain; 40% magic resist; behind the Riddlemaster seal |

Full stat blocks live in `data/monsters.json`. The three guardians + Maldrec
each have large "showpiece" portraits (the art tests enforce 48×48+ for them).

---

## 9. AOE & Combat Magic

Area-of-effect is central to the magic system and intentionally mirrors the
original Bard's Tale. Source: `data/spells.json` (`target` + `effect` fields);
**34 spells** are AOE. There are **two AOE scopes**, the classic "kill-group vs.
kill-all" split:

- **`group`** — hits one entire monster group (every member of it). 21 spells.
- **`allgroups`** — hits *every* monster group on the field at once. 13 spells.
  These are the premium top-tier nukes, exactly as in 1985.

(For reference, the full `target` set in the data is: `foe` single-target,
`group`, `allgroups`, `ally`, `party` (party-wide buffs/heals), `summon`,
`none`.)

### Damage-AOE power curve

Single-group spells at low tiers, board-clears at the top. Representative ladder:

| Spell | School | Tier | Scope | SP | Damage |
|---|---|---|---|---|---|
| Cinder Lash | Hexen | 2 | group | 3 | 1d6 |
| Emberfall | Hexen | 3 | group | 5 | 2d6 |
| Thundercrack | Storm | 3 | group | 6 | 3d6 |
| Sunburst | Lorist | 4 | group | 8 | 4d6 (**×2 vs undead**) |
| Rain of Ruin | Hexen | 5 | **allgroups** | 9 | 3d6 |
| Tempest | Storm | 5 | **allgroups** | 10 | 4d6 |
| Black Sun | Hexen | 6 | **allgroups** | 13 | 4d8 |
| Maelstrom | Storm | 6 | **allgroups** | 13 | 5d8 |
| Last Judgement | Lorist | 7 | **allgroups** | 16 | 6d8 (**×2 vs undead**) |
| Sky's Wrath | Storm | 7 | **allgroups** | 18 | 7d8 (**+ stun**) |

### School identity (preserve when balancing)

- **Storm is the dedicated AOE artillery school** — most all-group spells and the
  biggest top-end (Sky's Wrath, 7d8 + stun). This reinforces *why* the
  Stormcaller→Riddlemaster chain (§5) matters: it's also the route to the best
  board-clears.
- **Lorist AOE carries anti-undead riders** (`undeadDouble` on Sunburst, Last
  Judgement) — thematically pointed, since two of three dungeons (Undercroft,
  Barrow) are wall-to-wall undead.
- **Hexen** spans both — fire/dread damage plus the non-damage AOE control.

### Non-damage AOE

AOE isn't only nukes. There is group/all-group **fear** (e.g. Terror Absolute,
`allgroups`, save −4), **stun**, **silence**, and **debuffs** — crowd control
that scales the same group → allgroups way.

### Enemies use AOE against the party (the mirror)

The bosses' signature spells are party-wide AOE: Tallow King's **Waxflood**
(2d6 party), Choir's Eldest **Crescendo** (3d8 party), Maldrec's **Stolen
Thunder** (4d8 party). This is why the Choir's Eldest "held note" warning about
crowding the front rank matters — it's an AOE positioning puzzle.

### Counter: anti-magic zones

The Needle is riddled with **anti-magic zones** (also present in Barrow 2–3),
which fizzle casting and strip active effects. This is the deliberate brake on
caster/AOE dominance in the late game — players can't simply board-clear their
way up the final tower. **Keep this counter intact** if you add stronger AOE.

---

## 10. Bestiary

Complete roster from `data/monsters.json` (**57 entries**: ~40 hostiles + 3
bosses + 13 player summons + Maldrec's illusory image). Every monster already
ships with flavor text, quoted below — **do not invent new lore for existing
monsters; extend in this voice if you add more.**

### Reading the stats

- **AC counts down from 10.** Lower is harder to hit; negative AC (Maldrec −2,
  several T5s) means you need to-hit buffs or save-based spells, not raw swings.
- **Group** is the dice for *how many appear at once* — this is the game's main
  difficulty lever. `2d4`/`2d3`/`1d6` swarms are a real threat by volume even at
  low tier, and are the textbook case for **AOE** (§9): a Cinder Lash on a pack
  of eight rats out-values any single-target spell. Solo entries (`1`) are
  elites/bosses.
- **HP** is dice (e.g. `4d8`); bosses use fixed pools (`60d1`, `190d1`).
- **Tag key:**
  `💀 undead` (immune to poison; takes **×2** from Lorist holy AOE — Sunburst,
  Last Judgement);
  `caster` (has spells — kill or **Silence** first);
  `MRn` (magic resist n% — favor *physical* damage);
  `regen n` (heals each round — **burst it down**, fire by flavor);
  `illusion` (dies instantly to **true-seeing**);
  `poison / drain / SP-drain / fear / petrify` (status the attack inflicts —
  the Temple of the Quiet Flame cures all of them afterward).

The default answer really is "attack, attack, attack" for the low-tier swarms —
the notes below are for when it isn't.

### Town & Fen (the streets, day/night)

The wards are failing, so the streets themselves now spawn fights — light, but
thematic. Encounter set lives in `town.json` (day/night weighting).

| Monster · *lore* | T | HP | AC | Grp | Attacks & tags | How to handle |
|---|---|---|---|---|---|---|
| **Footpad** · *Works the night streets. Prefers customers already down.* | 1 | 1d8 | 8 | 1d4 | cosh 1d4 | Trivial; swing. Night-weighted. |
| **Fen Stray** · *Half-wild dogs that slunk in when the gates last failed.* | 1 | 1d6 | 9 | 1d4 | bite 1d4 | Trivial; swarms slightly — fine to melee. |
| **Tavern Tough** · *Has opinions about strangers and a stool to express them with.* | 1 | 2d8 | 8 | 1d3 | fist 1d6 | Trivial; swing. |
| **Gate-Wight** · *It presses at the failing wards each night, testing.* | 2 | 3d8 | 6 | 1d2 | chill touch 1d8 **+drain** 💀 | First real threat: **drains levels** — kill fast, cure at Temple. |

### The Sunken Undercroft (Verse One)

Tutorial dungeon. Lots of poison and the early swarms; the undead here feed
Lorist holy AOE.

| Monster · *lore* | T | HP | AC | Grp | Attacks & tags | How to handle |
|---|---|---|---|---|---|---|
| **Fen Rat** · *Wet fur, yellow teeth, and a grudge the size of the marsh.* | 1 | 1d6 | 9 | 2d4 | bite 1d3 | **Swarm** — AOE bait, otherwise harmless. |
| **Grave Mite** · *Dines below the headstones, not fussy about freshness.* | 1 | 1d4 | 8 | 2d4 | nip 1d2 **+poison** | Swarm + poison; AOE to clear before it stacks. |
| **Mirefang** · *Half eel, half hound, all appetite.* | 1 | 2d4 | 8 | 1d4 | bite 1d6 | Melee; modest. |
| **Cellar Creep** · *Eight legs, patient as rot, fond of low ceilings.* | 1 | 2d4 | 8 | 1d4 | fangs 1d4 **+poison** | Poison pack — clear quickly. |
| **Fen Adder** · *A brown ribbon of bad luck.* | 1 | 1d8 | 7 | 1d3 | strike 1d3 **+poison** | Low HP, drops fast; mind the poison. |
| **Rust Grub** · *It eats iron and excuses.* | 1 | 2d6 | 9 | 1d4 | gnaw 1d4 | Harmless; swing. (Flavor warns of metal-eating.) |
| **Crypt Thief** · *Robs the dead for a living and the living for variety.* | 1 | 2d8 | 7 | 1d3 | knife 1d6 · sling 1d4@40 | Has **ranged** — closes value of advancing; carries the best gold (3d8). |
| **Sodden Dead** · *Drowned when the water rose. Still down there. Still patient.* | 1 | 2d8 | 9 | 1d4 | cold grasp 1d6 💀 | Undead — Lorist AOE doubles; else melee. |
| **Bonechatter** · *It talks all through the fight. None of it is words.* | 1 | 2d6 | 7 | 1d6 | claw 1d6 💀 | **Big undead swarm** (1d6) — holy AOE is ideal. |
| **Tallow Crawler** · *Render a hundred candles, give the wax a hunger.* | 1 | 3d6 | 9 | 1d3 | scalding grip 1d8 | Tankier; the Tallow King's adds (phase-summon). |
| **Wisplight** · *A lamp nobody is carrying, looking for a mind to sip.* | 1 | 1d6 | 5 | 1d3 | draining glow 1d2 **+SP-drain** | Low HP but **drains SP** — kill first to protect casters. |
| **Mire-Spawn** · *The fen made a fist and taught it to walk.* | 2 | 4d8 | 7 | 1d2 | smash 2d6 | Hard-hitting bruiser; focus-fire. |
| **Tallow Acolyte** · *Shaved head, waxed skin, eyes like guttering flames.* | 2 | 3d6 | 6 | 1d3 | dripping cudgel 1d6 · **caster** (Scald, Calling of Wax) @40 | **Caster** — Silence or kill first; also the King's adds. |

### The Howling Barrow (Verse Two)

Undead-heavy with the first serious casters and the regenerating troll. Lorist
holy AOE shines; bring Silence and single-target burst for the casters.

| Monster · *lore* | T | HP | AC | Grp | Attacks & tags | How to handle |
|---|---|---|---|---|---|---|
| **Moor Hound** · *Runs the barrow-tops at dusk, singing to no moon.* | 2 | 3d8 | 6 | 2d3 | bite 2d4 | **Fast pack** (2d3) — AOE before they all land. |
| **Fen Lurker** · *Mud-coloured folk who tithe to whatever walks the fen.* | 2 | 4d8 | 7 | 1d4 | spear 1d8 · stone 1d6@40 | Ranged + numbers; close or AOE. |
| **Tomb Spider** · *Webs of grave-silk, strung between the honoured dead.* | 2 | 3d8 | 6 | 1d3 | fangs 1d8 **+poison** | Poison; clear the pack. |
| **Wind Shrieker** · *The wind over the barrows, given beak and grievance.* | 2 | 3d8 | 4 | 1d3 | talons 1d8 · shriek 1d6@50 **+fear** | **Fear at range** — can scatter your line; kill fast or resist fear. |
| **Barrow Wight** · *Buried with its honours. Wants yours.* | 2 | 4d8 | 5 | 1d4 | cold hand 1d8 **+drain** 💀 | **Drain in numbers** — dangerous; holy AOE + focus. |
| **Hollow Man** · *A man-shaped absence; the wind uses it for a flute.* | 2 | 4d8 | 6 | 2d3 | empty embrace 2d4 **+fear** 💀 | **Fear swarm** (2d3) — the Choir's rank-and-file; AOE + anti-fear. |
| **Grave Worm** · *It has eaten kings and remembers none of them.* | 3 | 6d8 | 6 | 1d2 | maw 2d8 **+poison** | High HP, big poison bite; focus-fire. |
| **Peat Troll** · *Cut it and the bog fills the wound.* | 3 | 7d8 | 5 | 1d2 | club 2d8 · **regen 3** | **Regenerates** — burst it down in one turn; don't let it heal. |
| **Fen Hag** · *She knew your name before you said it.* | 3 | 5d8 | 4 | 1d2 | nails 1d8 · **caster** (Marshfire, False Company) @45 | **Caster + summoner** — Silence/kill first or face adds. |
| **Barrow Sorcerer** · *Buried alive by choice, with his library.* | 3 | 5d8 | 5 | 1d2 | knife 1d6 · **caster** (Wind of Graves, Raising Word) @50 💀 | **Raises more undead** — priority kill; holy AOE. |
| **Mistcaller** · *What it calls was never in the mist until called.* | 3 | 4d8 | 4 | 1d2 | fog hand 1d8 · **caster** (Choir of Fog, Whitemurk) @55 | **High cast chance** — Silence first. |
| **Wight Lord** · *First into the mound by rank, first out by hunger.* | 3 | 8d8 | 3 | 1 | barrow blade 2d8 **+drain** 💀 | **Elite drainer**, low AC — buff to-hit, focus, cure drain after. |
| **Hollow Cantor** · *It keeps the Choir in tune.* | 3 | 6d8 | 4 | 1d2 | bone fork 1d8 · **caster** (Discord, Swelling Verse) @50 💀 | The Eldest's lieutenants; **caster undead** — Silence + holy AOE. |

### Maldrec's Needle (Verse Three)

The hardest roster: high HP, very low AC, SP-drain everywhere, anti-magic zones
that turn your own AOE off, a magic-immune golem, a petrifier, and illusions.
Physical damage and true-seeing matter more here than spells.

| Monster · *lore* | T | HP | AC | Grp | Attacks & tags | How to handle |
|---|---|---|---|---|---|---|
| **Spirelash** · *The Needle grew these the way towers grow ivy.* | 4 | 8d8 | 2 | 1d3 | stone tail 3d6 | Fast, hard to hit; buff accuracy. |
| **Glass Revenant** · *A scholar who looked too long into the windows.* | 4 | 7d8 | 2 | 1d3 | shard hand 2d8 **+SP-drain** 💀 | **Drains SP in packs** — kill before casters are emptied; holy AOE. |
| **Needle Scribe** · *Copies the stolen Verses, wrong on purpose.* | 4 | 6d8 | 3 | 1d3 | pen-knife 1d8 **+SP-drain** · **caster** (Redaction) @45 | SP-drain + caster — Silence/kill first. |
| **Basilisk Moth** · *Beautiful, like an accident about to happen.* | 4 | 5d8 | 3 | 1d3 | petrifying dust 1d6 **+petrify** | **Petrifies** — single most dangerous trash; kill at range *before* it acts, cure stone at Temple. |
| **Storm Sentinel** · *Armour with weather inside it.* | 4 | 8d8 | 2 | 1d2 | halberd 2d8 · **caster** (Sentinel's Arc) @40 | Durable caster-bruiser; focus + Silence. |
| **Rune Golem** · *Every rune on its hide is a word Maldrec stole.* | 4 | 10d8 | 1 | 1d2 | graven fist 3d8 · **MR60** | **60% magic resist** — spells mostly bounce; **hit it with weapons**. |
| **Illusion Weaver** · *Its loom is strung with things you were sure you saw.* | 4 | 6d8 | 2 | 1d2 | spindle 2d6 · **caster** (Loom of Lies, Threadcut) @60 | Spawns illusions — **true-seeing** clears its fakes; kill the weaver. |
| **Pit Horror** · *Maldrec dug too deep and fed what he found.* | 5 | 12d8 | 0 | 1d2 | crushing maw 4d8 | Huge HP + damage; focus-fire, defend the front. |
| **Fell Chorister** · *Sings the Founding Song backwards, one ruined word at a time.* | 5 | 8d8 | 1 | 1d3 | wrong note 2d8@40 **+fear** · **caster** (Stolen Verse) @45 💀 | **Ranged fear + caster pack** — anti-fear, Silence, holy AOE. |
| **Hand of Maldrec** · *Five swore the oath. He only ever needed the one.* | 5 | 10d8 | 0 | 1d2 | rune-sword 3d8 · iron word 2d6@60 | Elite melee+ranged; Maldrec's phase-2 adds. Focus-fire. |
| **Maldrec's Image** · *He was always fondest of his own company.* | 4 | 1d1 | 2 | 1 | imagined fire 3d6@60 | **Illusion** — 1 HP, hits hard at range; **true-seeing deletes the lot**, otherwise pop them fast. |

### Bosses

Full encounter narration is in §4; mechanics summarized in §8. Stat lines:

| Boss | T | HP | AC | Attacks | Casts | Phases |
|---|---|---|---|---|---|---|
| **The Tallow King** · *A king of rendered fat on a throne of wicks, crowned with seven flames.* | 3 | 60 | 3 | molten fist 3d6 · candle-glare 1d4@30 **+fear** | Waxflood @30 | 1 (summons Crawlers @50%) |
| **The Choir's Eldest** · *It was singing before the town had walls. It intends to finish the piece.* 💀 | 4 | 80 | 1 | held note 3d8@50 **+fear** · conductor's hand 2d8 **+drain** | Crescendo @35 | 1 (summons Hollow Men @50%) |
| **Maldrec the Unsung** · *The hedge-wizard the Founders would not let sing. Waited three hundred years to be heard.* | 5 | 190 | −2 | the Unsinging 3d8@90 **+SP-drain** · staff 2d10 | Stolen Thunder, Verse of Ruin @55 · **MR40** | 3 (75%: illusory copies · 45%: golems + Hands) |

**Boss handling, generally:** they front-load AOE on your party (see §9 mirror),
summon adds at phase thresholds, and carry status (fear/drain/SP-drain) — so:
keep the back rank topped up, save dispel/cure for after, bring **true-seeing**
for the Tallow King's glare and Maldrec's copies, and for Maldrec favor
**physical** burst (MR40) while clearing his images.

### Player summons (your own creatures)

13 entries with `xp:0, gold:0, summons:true` — these are what the party's own
summon spells call (§9). They occupy a party slot (or the Remastered 7th slot);
one at a time, recasting dismisses the old one. Map (`data/spells.json`):

| Summon · *lore* | School · Tier | HP | AC | Attack | Role |
|---|---|---|---|---|---|
| **Smoke Hound** · *A hound of soot that bites with borrowed teeth.* | Hexen · 2 | 3d6 | 6 | soot bite 1d8 | Early chaff blocker |
| **Mirrorkin** · *Your reflection, peeled off and put to work.* | Hexen · 3 | 4d8 | 4 | mirrored blade 2d6 | Mid melee |
| **Fetch** · *A grey errand-thing that pretends, very hard, to be dangerous. It is.* | Hexen · 4 | 6d8 | 3 | grey hand 2d8 | Durable melee |
| **Shadowtwin** · *Walks a little behind, where you cannot quite see it smile.* | Hexen · 5 | 8d8 | 1 | dark stroke 3d8 | Strong melee |
| **Mockery King** · *A crowned lie with a court of one.* | Hexen · 6 | 10d8 | 0 | sceptre 4d8 | Heavy melee |
| **Legion of Smoke** · *One shape made of many, none real, all angry.* | Hexen · 7 | 14d8 | −1 | hundred hands 5d8 | Hexen capstone bruiser |
| **Marsh Stalker** · *Something patient that answers from under the brown water.* | Lorist · 3 | 4d8 | 5 | reed-spear 2d6 | Mid melee |
| **Old Host Warrior** · *A soldier of the Founding, still under orders.* | Lorist · 5 | 8d8 | 1 | founding blade 3d8 | Strong melee |
| **Dawn Champion** · *The Founding sends its best, this once.* | Lorist · 7 | 12d8 | −2 | first-light blade 4d8 | Lorist capstone front-line |
| **Storm Wisp** · *A small weather, on your side.* | Storm · 3 | 3d8 | 4 | static snap 2d6@30 | **Ranged** chip |
| **Thunderhead** · *A cloud with a grudge and a place to put it.* | Storm · 4 | 8d8 | 2 | grounded bolt 3d8@60 | **Ranged** artillery |
| **Cyclone** · *Hold court. The wind is your bailiff.* | Storm · 5 | 11d8 | 0 | spinning wall 4d8 | Melee bruiser |
| **Crown of Storms** · *The third school's masterwork: weather that loves you.* | Storm · 7 | 15d8 | −2 | coronation bolt 5d8@90 | Storm capstone, long range |

Note the school identities carry into summons: **Hexen** has the deepest ladder
(6 illusory bodies, tier 2→7), **Lorist** summons the righteous Founding dead
(3, holy-themed), **Storm** brings the only **ranged** summons (artillery).

---

## 11. Consistency Checklist for New Content

When adding or editing content, keep these invariants true:

- **The three-Verse spine is load-bearing.** Don't relocate a Verse without
  updating the boss drop, the bell-tower socket logic, and the data-integrity
  test that asserts all three Verses are placed.
- **The Riddlemaster gate must remain reachable** (the class chain in §5).
  Anything touching `classes.json` or the Review Board risks it; the logic
  suite covers the chain.
- **Lore is delivered indirectly** — prefer magic mouths, encounter narration,
  secret-room flavor, and rumors over exposition dumps. Match the wry,
  song-obsessed, oral-tradition tone.
- **Motif discipline per dungeon:** Undercroft = wax/candle/tallow/drowning;
  Barrow = wind/hollow mouths/choirs/the singing dead; Needle = glass/mirrors/
  copies/anti-magic/un-singing.
- **Foreshadow forward.** Each boss victory line names the next destination;
  preserve that chaining if you reorder anything.
- **True-seeing is the through-line counter** to fear/illusion (Tallow King →
  Maldrec). Keep illusion enemies answerable by it.
- **Town pacing:** no SP regen underground; the town loop (heal/recharge/level/
  save) is the intended rhythm. Don't add field-leveling or underground SP refill
  casually — it would flatten the core loop.
- **Judge art from rendered PNGs**, edit data files (not code) for content, and
  follow the repo's incremental-write / commit-per-phase rules in `CLAUDE.md`.

---

*Compiled from game data at the state of branch `polish-pass-ui-gameplay`. If the
maps, items, classes, or bell-tower logic change, re-derive this doc from source —
the data is authoritative.*

# THORNMERE — The Founding Song

A complete, playable, classic first-person dungeon crawler in the style of the
1985 originals — solid, colorful bitmap graphics in the manner of the Amiga
era: a textured maze viewport with palette distance-shading, an **animated
monster portrait window**, signboards you navigate by, a synthesized chiptune
soundtrack, and full mouse support beside the keyboard. All content — the town
of Thornmere, the three dungeons, 50+ monsters, 84 spells, 7 songs, 60+ items,
every sprite and every melody — is original, and lives in editable text data
files.

> The hedge-wizard **Maldrec the Unsung** has stolen the Three Verses of the
> Founding Song that ward Thornmere's gates against the fen-wights. Recover
> them — from the Sunken Undercroft, the Howling Barrow, and Maldrec's Needle —
> and sing the gates whole.

## Stack justification

Vanilla JavaScript (ES modules) + HTML5 Canvas, **zero dependencies, no build
step, no binary assets**. The game renders to a 320×240 indexed-color
framebuffer (a `Uint8Array` of palette indices) scaled 2× with
nearest-neighbor — chunky square pixels, exactly like the hardware it imitates.
The DOM handles the text panels and mouse buttons; `localStorage` provides the
save system and audio settings; WebAudio synthesizes every note and sound
effect from pattern data at runtime. Because the game core (`src/core/`) is
pure logic with no DOM access, the same modules run under `node --test` for
the automated test suite. Install friction is one command: any static file
server runs it, and the only requirements are a browser and Node (for
tests/tools).

## Install & run

```sh
npm start          # = python3 -m http.server 8377  (or: npx serve)
# then open http://127.0.0.1:8377/
npm test           # logic + art + audio data integrity suites
```

No accounts, no network access, no downloads — everything is in this repo.
**All audio is synthesized in code; all art is text-grid pixel data. Nothing
is downloaded, and there are no binary assets to credit — every sprite and
melody is original to this repo.**

## Screenshots (what you should see)

- **Town street by day**: timber-and-plaster facades under a dithered blue
  sky, pictorial signboards hanging over shop doors (a boot for Greta's, a
  drowned goose for the tavern), and the street hazing out with distance.
- **The Sunken Undercroft by torchlight**: rotted brick walls with moss
  stains, wet sheen on the floor, each step of depth a darker palette ramp
  until the dark swallows the corridor.
- **Combat**: the lead monster group as an animated 2-frame portrait in a
  carved frame; the dungeon guardians and Maldrec get large showpiece
  portraits.
- **The roster**: a portrait chip and class icon beside every name, with
  condition colors — wounded yellow, critical red, poisoned green, stoned
  grey, dead dark-red.

## Keys

| Exploring | |
|---|---|
| `↑` / `W` | step forward |
| `←` `→` / `A` `D` | turn left / right |
| `↓` / `S` | about-face |
| `E` | search the walls for secret doors |
| `C` | cast a spell |
| `P` | play / stop a bard song |
| `U` | use an item (potions, scrolls, chalk…) |
| `T` | light a torch (quick) |
| `L` | look (re-read the cell, re-use stairs) |
| `1–6` | character sheet: equip, trade, drop |
| `O` | options: master/music/effects volume, mute (persisted) |
| `Q` | quit to menu (autosaves — labelled modern mercy) |
| `?` | help |
| `Esc` | back out of any menu |

**Mouse:** everything answers to the mouse as well — the command bar shows
every available action as a button (with its hotkey), menu lines and roster
rows click, arrows over the viewport move and turn the party, the wheel
scrolls the event log, and clicking the viewport hurries combat narration. A
full playthrough is possible without touching the keyboard, and equally
without touching the mouse.

| In combat (orders per character) | |
|---|---|
| `A` attack (pick a group) | `D` defend (AC bonus) |
| `C` cast (pick spell + target) | `S` sing (Skald, one round) |
| `H` hide in shadows (Knave) | `U` use an item |
| `V` party advances 10' | `R` the party runs |
| `Space` | hurry the narration |

**Debug:** add `?debug=1` to the URL, then `M` toggles an automap overlay
(off by default — the base game is true to 1985: bring graph paper).
`?seed=N` gives a reproducible run.

## Beginner's primer

1. **Walk forward into the Adventurers' Hall** and (C)reate six characters.
   A proven first party: **Blade, Blade, Warden, Skald, Hexen, Lorist** —
   front three take the hits, Skald sings, two casters behind.
   Korrun make brutal Blades; Aldari make the best casters; reroll until your
   front-liners have ST/CN 15+.
2. **(S)ave**, leave, and shop at **Greta's Provisioner** (east of the Hall):
   broadswords and leather for the front rank, a shortsword and *reed pipe*
   for the Skald, daggers and robes for the casters, **and torches** — the
   Undercroft is dark.
3. The **Review Board** (Magistrate's Court) sells spell tiers: buy
   **Hexen tier 1** (Ash Dart) and **Lorist tier 1** (Mending Word, Scholar's
   Glow) — then you can light the dark for free.
4. Listen to rumors at **The Drowned Goose** (2g). They point at the boarded
   tannery on the north row.
5. **The Boarded Tannery → descend.** Light a torch (`T`). Fight a few packs,
   grab a chest or two, and run home before HP and SP run dry. There is no SP
   regeneration underground.
6. Back in town: heal at the **Temple of the Quiet Flame**, recharge SP at
   **Roskva's Spark House**, level up at the **Review Board** (leveling only
   happens there — never in the field), wine for the Skald at a tavern,
   **save at the Hall**.
7. Repeat. The riddle-door's answer is something a chandler would say. The
   Tallow King below is a level-5–6 fight; bring Eyebright or nothing false.

The long game: Verses One and Two open the **bell tower**; the Needle is
anti-magic-riddled and teleporter-mad; its top floor will not open without a
**Riddlemaster** (Hexen/Lorist → tier 5 → change class to Stormcaller → tier 6
in two schools → Riddlemaster, at the Review Board; class change resets level
but keeps every spell). Perform the Founding Song at the bell tower with all
three Verses to win.

## The shape of the game

- **Stats** ST/IQ/DX/CN/LK (3–18 + race): melee damage, spell points, AC &
  missile aim, hit points, saving throws. **AC counts down from 10.**
- **Combat**: up to 4 monster groups at 10'–90'; melee reaches 10', missiles
  and spells have ranges; groups advance every round. Orders are collected for
  the whole party, then resolved in DX-influenced initiative, narrated
  line-by-line. Poison, level drain, stoning, SP drain and fear are real —
  the Temple cures all of it, for gold.
- **Magic**: three schools (Hexen, Lorist, Stormcaller), 7 tiers × 4 spells
  each, bought whole-tier at the Review Board. Anti-magic zones fizzle
  casting and strip your active effects. Summons (and illusions — true
  seeing kills illusions, both yours and theirs) occupy a party slot.
- **Songs**: 7 Skald songs, each with an exploration effect (persistent) and
  a one-round combat effect. Songs-per-day = Skald level; tavern wine
  restores them. No instrument, no song.
- **The maze**: secret doors, spinners, teleporters, darkness zones,
  anti-magic zones, magic mouths, trap squares, riddle-locked doors (type the
  answer), stairs — all data-driven per cell. Dungeons are dark: torches and
  light spells set your view radius, and the palette ramps darker with every
  step of depth. Secret doors are drawn as ordinary wall until found. Each
  dungeon hides at least one secret room with a unique item.

## The ten-minute playtest tour

A scripted walk that shows off everything new. Start a fresh game (`?seed=7`
for the canonical tour).

1. **The street** *(art: facades + signboards)* — Turn right at the start and
   walk east along the row: Greta's boot-sign, then the scales of the
   Magistrate's Court. Navigation-by-signboard, like 1985. Note the day sky
   dithering toward the horizon and the street hazing with distance. Hover
   the viewport: movement arrows appear — **do this leg mouse-only**.
2. **Muster at the Hall** *(portraits)* — walk forward into the Hall, create
   a party (Blade, Blade, Warden, Skald, Hexen, Lorist) — each newcomer picks
   a **face** at creation; watch the portrait window while you choose. SAVE.
3. **Shop mouse-only** *(mouse parity)* — into Greta's: portrait vignette of
   the shop inside the viewport; buy broadswords, leather, a reed pipe and
   torches clicking only menu lines and command-bar buttons. The gold jingle
   plays per purchase.
4. **Songs back to back** *(the audio centerpiece)* — outside, press `P` and
   start the **Wayfarer's March** (brisk marching pulse); walk a few steps,
   then switch to the **Graveman's Dirge** (slow, low, funeral drums). The
   active-song note pulses in the status panel. Two unmistakably different
   tunes, switched without a click or pop.
5. **The Undercroft** *(textured maze + distance shading)* — north row, the
   Boarded Tannery, descend. Light a torch (`T`): rotted brick, moss, wet
   sheen on the floor, three steps of visible depth each darker than the
   last. Let the torch die once to see the dark close in to one dim step.
6. **A fight** *(animated portrait + combat theme)* — wander until BATTLE:
   the combat theme kicks in, the lead group's portrait idles at 2 fps in its
   carved frame. Order an attack by clicking the buttons. If the Skald sings,
   her song plays a one-round flourish over the theme.
7. **Poison** *(condition colors)* — find a gas trap (or let a fen adder
   bite): the poisoned name turns **green** in the roster; at low HP names go
   **yellow**, then **red**.
8. **Victory fanfare** *(audio finale)* — win the fight: the combat theme
   gives way to the victory jingle and the loot lines glow gold in the log.
   Then back to town — heal at the Temple (chime), level at the Review Board
   (rising arpeggio), save at the Hall.
9. **Options** — press `O`: drop the music to taste; reload the page and
   confirm it stuck.
10. **The automap check** *(debug)* — add `?debug=1` and press `M` for the
    overlay if you've lost the graph paper.

## Editing content (no code required)

Everything the engine reads lives in `data/`:

```
data/races.json      data/classes.json    data/items.json
data/spells.json     data/songs.json      data/monsters.json
data/maps/*.json     ← generated, committed
data/art/*.json      ← every sprite, texture and animation (text grids)
data/audio/*.json    ← every melody and sound effect (note patterns)
```

### The art pipeline (hand-edit any sprite)

All art is **text-grid pixel maps**. A sprite is rows of characters; a legend
maps each character to one of the **32 master palette colors**
(`data/art/palette.json`); `-1` is transparent:

```json
"fx_chest": {
  "w": 16, "h": 12,
  "legend": { ".": -1, "w": 9, "O": 11, "i": 3, "L": 29 },
  "rows": [
    "..wwwwwwwwwwww..",
    ".wOOOiOOOOiOOOw.",
    "..."
  ]
}
```

Open the file, change the characters, reload the page — that's the whole
pipeline. Rules: every row must be exactly `w` characters, there must be `h`
rows, and every character must appear in the legend (`node tools/artcheck.js`
checks all of it; `npm test` includes the same checks plus coverage — every
monster, building, special and character archetype must resolve to art).

- **Animations** are frame lists with per-frame duration:
  `"anims": { "fx_mouth_anim": { "frames": [{ "sprite": "fx_mouth", "ms": 320 }, …] } }`.
  Idle loops run at 2–4 fps, period-correct.
- **Variants** map a game id to a base sprite plus a palette remap — the 1985
  palette-swap trick: `"moor_hound": { "base": "mon_hound", "remap": { "10": 3 } }`
  turns the leather-brown hound slate-dark. Every monster in the bestiary
  resolves through one.
- The **sprite preview page** (`/dev.html` while the server runs) renders the
  complete art set — palette, every sprite, live animations, every variant
  with its remap applied — and flags anything broken or any monster without
  art. Bad art is visible at a glance and fixable per-sprite.
- Wall textures are 16×16 tiles per area (`data/art/textures.json`), chosen in
  `data/art/styles.json` along with floor/ceiling/sky treatments. Secret doors
  render the plain wall tile until found — by design.

### The audio pipeline (hand-edit any melody)

`data/audio/music.json` holds every piece of music as note patterns: a token
is `note:sixteenths` (`c4:2`, `f#3:1`) or `r:n` for a rest, played by a
`square`, `pulse`, `tri` or `noise` voice with a simple envelope — a
SID/Paula-flavored synth (`src/audio/synth.js`). Each of the **7 bard songs**
has its own recognizable looping melody (played while the song is active in
exploration — learn to tell the Confounding Jig from the Graveman's Dirge by
ear) plus a one-round combat flourish; the Skald's instrument quality detunes
the timbre slightly. There's a town theme with a sparser night variant, a
distinct drone per dungeon (sinking lower with each depth), a combat theme,
a victory fanfare, a death sting and a title theme. `data/audio/sfx.json`
holds every sound effect as a synth recipe. Music ducks under effects;
volumes and mute live in the in-game options (`O`) and persist.

Maps are emitted by `npm run genmaps` (`tools/genmaps.js`): layouts come from
seeded maze generation; stairs, bosses, riddles, mouths, zones, secret rooms
and encounter tables are hand-authored specs in that file. The generator
asserts full connectivity and that each riddle door actually gates its stairs.

Dev tools: `node tools/balance.js` (win-rate simulation across the campaign),
`node tools/drive.js <combat|shop|riddle|boss|review|victory>` (Playwright UI
scenarios, uses the globally-installed @playwright/mcp's browser),
`test/smoke.html` (in-page scripted run under headless Chrome),
`node tools/artcheck.js` (sprite validation), `/dev.html` (sprite preview).

## Tests

`npm test` covers three suites:

- **Logic** (unchanged from the wireframe era): combat resolution and boss
  phases, leveling math and the class-change chain to Riddlemaster, save/load
  round-tripping the entire game state mid-delve, map traversal (walls both
  sides, spinners, teleporters, riddle gating, perimeter integrity), and data
  integrity (84 spells, every referenced monster/item exists, the three
  Verses are placed).
- **Art** (`test/art.test.js`): every sprite's text grid matches its legend
  and dimensions; every monster in the bestiary resolves to a portrait; the
  three dungeon guardians and Maldrec have 48×48+ showpieces; every town
  building has a signboard and interior; every special has furniture art;
  magic mouths animate; every race × archetype × face has a character
  portrait; every class has an icon; every area has wall/door textures.
- **Audio** (`test/audio.test.js`): every pattern parses, tracks within a
  pattern agree on length (loops can't drift), all 7 bard songs have distinct
  loops plus flourishes and match `data/songs.json`, all themes exist, and the
  full SFX set is well-formed.

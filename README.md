# THORNMERE — The Founding Song

A complete, playable, classic first-person dungeon crawler in the style of the
1985 originals: vector-wireframe maze, six-slot marching order, spell codes,
bard songs, graph paper strongly encouraged. All content — the town of
Thornmere, the three dungeons, 50+ monsters, 84 spells, 7 songs, 60+ items —
is original, and lives in editable JSON data files.

> The hedge-wizard **Maldrec the Unsung** has stolen the Three Verses of the
> Founding Song that ward Thornmere's gates against the fen-wights. Recover
> them — from the Sunken Undercroft, the Howling Barrow, and Maldrec's Needle —
> and sing the gates whole.

## Stack justification

Vanilla JavaScript (ES modules) + HTML5 Canvas, **zero dependencies, no build
step, no assets**. Canvas line-drawing is the natural medium for an authentic
single-point-perspective wireframe viewport (filled-black polygons drawn
far-to-near give exact occlusion, the same trick the originals used); the DOM
handles the text panels; `localStorage` provides the save system; and because
the game core (`src/core/`) is pure logic with no DOM access, the same modules
run under `node --test` for the automated test suite. Install friction is one
command: any static file server runs it, and the only requirements are a
browser and Node (for tests/tools).

## Install & run

```sh
npm start          # = python3 -m http.server 8377  (or: npx serve)
# then open http://127.0.0.1:8377/
npm test           # 27 tests: combat, leveling, save round-trip, maze/walls, data integrity
```

No accounts, no network access, no downloads — everything is in this repo.

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
| `Q` | quit to menu (autosaves — labelled modern mercy) |
| `?` | help |
| `Esc` | back out of any menu |

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
  light spells set your view radius. Each dungeon hides at least one secret
  room with a unique item.

## Editing content (no code required)

Everything the engine reads lives in `data/`:

```
data/races.json      data/classes.json    data/items.json
data/spells.json     data/songs.json      data/monsters.json
data/maps/*.json     ← generated, committed
```

Maps are emitted by `npm run genmaps` (`tools/genmaps.js`): layouts come from
seeded maze generation; stairs, bosses, riddles, mouths, zones, secret rooms
and encounter tables are hand-authored specs in that file. The generator
asserts full connectivity and that each riddle door actually gates its stairs.

Dev tools: `node tools/balance.js` (win-rate simulation across the campaign),
`node tools/drive.js <combat|shop|riddle|boss|review|victory>` (Playwright UI
scenarios, uses the globally-installed @playwright/mcp's browser),
`test/smoke.html` (in-page scripted run under headless Chrome).

## Tests

`npm test` covers the pure-logic core: combat resolution and boss phases,
leveling math and the class-change chain to Riddlemaster, save/load
round-tripping the entire game state mid-delve, map traversal (walls both
sides, spinners, teleporters, riddle gating, perimeter integrity), and data
integrity (84 spells, every referenced monster/item exists, the three Verses
are placed).

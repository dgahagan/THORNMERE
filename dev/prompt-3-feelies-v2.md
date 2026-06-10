# PROMPT 3 of 3 — "The Feelies": manual, cloth map, and command card (v2)

**Model: Sonnet** (`/model sonnet`).
**Run last, in a fresh session** — after the Pixel Fidelity and Remastered-QoL passes — so the manual's generated tables reflect final data, the Command Card includes the new QoL keys and mode screen, and cover art reuses final-resolution sprites.

Paste everything below this line.

---

Classic 1985 boxed games shipped with physical "feelies": a printed manual and a cloth/paper map of the city. Recreate that experience for this game as **print-quality PDFs generated from the repo**, modeled on The Bard's Tale's original manual and Skara Brae map — plus two small in-game additions that support them. Game logic and balance must not change.

## Ground rules

- **Re-read the codebase and data files first**, especially town map data, races, classes, spells, songs, shop inventory, and the Remastered/Legacy toggle set.
- **No external assets.** PDFs are generated programmatically by a repo script (e.g. `scripts/build-feelies`) using whatever PDF library fits the stack. The build must be deterministic and documented in the README. Output to `feelies/` (gitignore the PDFs, keep the generator and source data).
- **Single source of truth:** every table in the manual (race stat modifiers, class descriptions, spell lists with codes/costs, song list, starting shop stock and prices, the Remastered/Legacy toggle table) must be **generated from the game's actual data files**, never hand-retyped — so the manual can never drift from the game. Flavor prose is hand-written; numbers are pulled.
- **Spoiler policy is a hard requirement** (see below) with an automated check.
- Long hand-written prose (the manual's flavor chapters) is written **incrementally, section by section, to source files on disk** — the standing rule: generated content is always verifiable on disk as it accumulates.

## Deliverable 1: The Town Map (1-page landscape PDF, "cloth map" style)

A parchment-style map of Thornmere in the spirit of the original Skara Brae map: weathered tan background, decorative border, a title cartouche ("THORNMERE — as surveyed for the Magistrate, in the year of the Quiet Flame"), simple stylized building shapes with roofs (drawn vector art is fine — evocative cartography, not photorealism), and a legend.

- **Geometry comes from the town data file.** Streets, blocks, walls, and gates on the map must match the actual in-game grid (add a test that validates legend locations against the data). Stylize freely; don't fabricate layout.
- **Name the streets.** Add evocative street names to the town data (e.g. Tallow Row, Wickfen Lane, Bellward, the Gran Mere) — a couple dozen names with the fen-folklore voice. Label them on the map.
- **Legend marks public knowledge only:** the Adventurers' Hall, Greta's Provisioner, the Temple of the Quiet Flame, Roskva's Spark House, both taverns (named), the city gates, guardian statues, and the bell tower. Maldrec's Needle is drawn as a visible landmark looming at the edge ("wonder what's in there?" energy) — marked but not explained.
- **Deliberately omitted, exactly as the original omitted the Review Board:** the Review Board location (the manual will say the Magistrate's Court keeps no signboard — seek it out), the boarded tannery (drawn as just another anonymous building), any hint of the Undercroft entrance, and the Howling Barrow (at most, an ominous note at the east map edge: "the fen — travelers do not linger"). No dungeon content of any kind.

## Deliverable 2: The Manual (~20–28 page PDF)

Modeled directly on the original Bard's Tale manual: part friendly orientation, part reference, written in a warm in-universe-adjacent voice with dry humor, **with small hints and clues interspersed throughout the text** (in the original style — e.g. a passing mention of which tavern serves the wine a Skald needs). Structure:

1. **Cover** — title art reusing the game's final pixel-art assets, "Tales of the Fen, Volume I" framing.
2. **About this game / the three goals** — complete the quest, build characters who can survive it, explore everything.
3. **A Quick Overview** — orientation for beginners, quick-start for veterans; references the Command Card and the pre-built party; one short paragraph on Remastered vs. Legacy mode selection at New Game.
4. **Characters** — the five races with flavor paragraphs and their **stat modifier table** (generated); the stats and what each governs; all eight starting classes with honest strengths/limitations and each class's **prime stat(s)** noted; the class-change path toward Stormcaller and Riddlemaster explained as the original explained Sorcerer/Wizard/Archmage (mechanics clear, mystique intact).
5. **Places** — the Hall (the only place to form a party), shops, temple, taverns, Spark House, the gates, day/night dangers; a thumbnail of the map; the Review Board teased but not located.
6. **Exploration** — movement, light and torches, searching, time passing, the automap (and how spinners can fool it), a frank warning that in Legacy mode dungeon mapping is the player's job ("each maze is a 22 by 22 grid; go to every square"), and that finding the entrances always is.
7. **The Combat System** — ranks and reach, the 4-groups-at-distance model, every combat command explained, running, loot and traps, the summon slot under both modes.
8. **The Magic System** — the schools and their personalities, SP and regeneration (daylight, the Spark House), how spells are learned at level-up, class-change rules.
9. **Spell lists** — full listings for **all three schools**, exactly as the original listed every school: tier by tier, each spell's code, name, SP cost, range, and a one-to-two line description (generated from data). The Riddlemaster's unique capstones are listed by name only, "spoken of in no book sold openly."
10. **Songs of the Skald** — all seven songs with poetic descriptions of their effects in exploration vs. combat (effects described, exact numbers withheld), instruments, songs-per-day, and the wine.
11. **Spell Key Glossary** — the quick-reference table of all spell codes (generated).
12. **Tips from the Underground** — a page of veteran hints in the original's voice: party composition advice, save habits, a couple of genuinely useful obscure tips.
13. **Items** — **beginning equipment only**: Greta's standard stock with prices (generated), armor/weapon basics, who can use what. Explicitly no rare, unique, or dungeon-found items — those "must be discovered."
14. **Back page** — the keybinding reference duplicated small, and credits ("all art and music made of text").

No bestiary section (the original had none). Common creatures may be name-dropped in flavor text and hints, but no monster list, stats, or boss information.

## Deliverable 3: Command Summary Card (1-page PDF, two columns)

The "inside the album cover" card: every keystroke and mouse action (including automap and options keys), the character creation flow in 6 steps, the New Game mode screen, how to start/load, and the party roster column abbreviations decoded. Dense, scannable, period reference-card layout.

## Spoiler policy (enforced)

The map and manual must NEVER contain: riddle answers, secret door or teleporter locations, dungeon maps or coordinates, the location of the Review Board / tannery / Undercroft entrance / Barrow path, guardian or boss names beyond vague rumor, unique item names, or quest structure beyond "the Verses ward the gates and have been stolen."
- Add an automated **spoiler lint** test: it walks the generated manual/map text and fails if any riddle answer string, secret-flagged location name, unique item name, or boss name from the data files appears. Maintain an allowlist for names that are legitimately public (Maldrec is publicly known as the town's disgraced hedge-wizard; the Verses are public legend).

## Deliverable 4: In-game character creation upgrades

- **Race selection screen:** alongside each race, display its stat bonuses and penalties explicitly (e.g. `Korrun  +2 ST  +2 CN  −1 IQ`) plus its one-line flavor text — visible before confirming, pulled from the same data the manual tables use.
- **Class selection screen:** for each class, show a short role description and its **prime stat(s)** clearly marked (e.g. `Strider — prime: DX` ... `Hexen — prime: IQ`), with a hint of what the prime stat improves. Add the prime-stat field to class data; the manual's Characters chapter uses the same field.
- **Pre-built starter party:** seed the Adventurers' Hall with a ready-made, sensibly equipped level-1 party of six (give them a charming name in the fen voice — the original's was "*A* Team"), so a new player can be in the Undercroft in two minutes. Mention them in the manual's Quick Overview.

## Acceptance criteria

- One documented command builds all three PDFs deterministically; PDFs open correctly and are print-sane (margins, legible at A4/Letter).
- All numeric/tabular content in the PDFs is generated from game data — add a test that changes a spell's SP cost in data and confirms the regenerated manual reflects it.
- Map legend positions validate against town data; street names exist in data, appear on the map, and display in the in-game status strip when standing on a named street.
- Spoiler lint passes, and a manual read-through confirms the tone: helpful on systems, silent on secrets.
- Race and class screens show modifiers/prime stats; the pre-built party loads, is legally equipped, and can fight.
- Existing full test suite still green; no game logic changes.
- README gains a "Feelies" section: how to build, what's included, and a note encouraging printing the map.

Finish with a short tour: the build command, page numbers worth admiring in the manual, and the two-minute new-player path using the pre-built party and the Command Card.

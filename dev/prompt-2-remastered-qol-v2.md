# PROMPT 2 of 3 — "Remastered / Legacy" QoL features (v2)

**Model: Sonnet** (`/model sonnet`). Optional: `/model opusplan` if you want stronger plan-phase reasoning on the automap desync and inventory abstraction — Opus plans, Sonnet executes.
**Run in a fresh session, after the Pixel Fidelity pass.**

Paste everything below this line.

---

The game is complete and playable, with the high-fidelity art pass done. Now add a **Remastered / Legacy** feature system modeled on what Krome Studios did for The Bard's Tale Trilogy (2018): a set of modern quality-of-life features, each individually toggleable, where turning them all off ("Legacy") reproduces the game exactly as it plays today.

## Ground rules

- **Start by re-reading the codebase.** Review the architecture, data schemas, and save format before changing anything. Match the existing code style and keep all new behavior data/config-driven where the existing design does so.
- **Legacy is the baseline, not a port.** Every feature below must be implemented as a toggle layered on top of current behavior. With all toggles off, the game must behave bit-for-bit as it does now — the existing test suite must still pass untouched, and the renderer/UI must look identical.
- **Mode selection at New Game.** When starting a new game, present a mode screen: **Remastered** (all QoL on), **Legacy** (all off), or **Custom** (per-toggle checklist). Toggles are recorded in the save file. Most can be changed later from the in-game options menu, but mark **XP curve** and **inventory model** as locked-at-creation (changing them mid-game would corrupt balance and item state).
- **Save compatibility.** Version the save format. Existing saves must load and be treated as Legacy with the changeable toggles available. Add a save-migration test.
- Work in phases, committing and keeping the game runnable after each: (1) settings framework + mode screen + save versioning, (2) automap, (3) save-anywhere + inventory, (4) remaining toggles, (5) tests + README + balance check.

## The QoL features (each its own toggle)

### 1. Automap
The flagship feature. Promote the existing debug automap into a real player-facing system:
- The map reveals **only visited cells**, persisted per dungeon level in the save file.
- Two views: a compact **corner overlay** on the main screen (`M` cycles off → overlay → full-screen) and a **full-screen map** showing walls, doors, discovered stairs/specials, party position, and facing arrow.
- Render it in the game's pixel aesthetic as a **parchment-style line map** — inked lines and small glyphs on a parchment ground using the master palette, like a player's own graph-paper map drawn fair. Annotate discovered specials with small symbols and a legend.
- Honest interactions with maze tricks: darkness zones record as visited but show no wall detail; an undetected **spinner or teleporter desyncs the map** (it keeps drawing from where the party *believes* it is) until the party re-enters known, correctly-aligned territory or casts the compass/location spell, which re-syncs it. This preserves the disorientation gameplay instead of letting the automap trivialize it.
- The location/coordinates spell displays coordinates and, with automap on, recenters/re-syncs the map.

### 2. Save anywhere
- Allow saving from the camp/party menu at any time, including mid-dungeon — but never mid-combat-resolution (between rounds only).
- Keep the Adventurers' Hall save as the canonical "safe" save; add **3 manual slots + 1 autosave** slot. Autosave on dungeon-level transitions and on quit.
- Legacy off-state: exactly today's behavior (Hall save + the labeled autosave-on-quit mercy feature).

### 3. Shared party inventory
- Toggle between today's **individual inventories** and a **shared 40-slot party pool** with pooled gold.
- In shared mode, any character can use or equip from the pool (class restrictions still apply), loot goes straight to the pool, and there's a single "use item" flow without needing to equip first for usable items (potions, wands, horns).
- Because this is locked at creation, write the inventory layer behind one interface with two implementations rather than scattering conditionals.

### 4. Reduced XP curve
- A "Remastered leveling" toggle that lowers XP-to-level requirements by roughly 35–45%, tuned so that fully exploring each dungeon keeps the party on-curve for the next one with little or no grinding. State the exact multiplier in the README and in a data file, not hardcoded.
- Locked at creation. Recheck the balance acceptance criteria from the base build under both curves and adjust the README's beginner primer accordingly.

### 5. Item durability: charges instead of breakage chance
- Wherever the base game gives limited-use items a per-use percentage chance to be consumed or break, the Remastered toggle replaces that with **visible fixed charges** (shown in inventory, e.g. `Horn of Embers [3]`). Define charge counts in the item data files.

### 6. Summons don't cost a party slot
- Remastered toggle: summoned monsters and recruited specials occupy a dedicated **7th "special" slot** rendered above the roster, instead of consuming one of the six character slots. Legacy keeps today's slot-stealing behavior. Combat targeting, marching-order math, and AoE effects must handle the 7th slot correctly under the toggle.

### 7. In-game reference (always on — not a toggle)
- A help screen (`?`) listing all keybindings and mouse actions.
- Spell and song browsers: at the Review Board and in the camp menu, show full descriptions (cost, range, duration, effect) for known spells/songs. Keep the 4-letter spell codes as the fast path for veterans; add a selectable list as the slow path.
- Item descriptions visible at shops and in inventory once identified.
- Tavern rumor recap: a small quest journal page listing rumors heard and Verses recovered. Keep it terse and diegetic ("Things overheard"), not a modern quest tracker with objectives.

## Acceptance criteria

- Mode screen works; Remastered, Legacy, and Custom all start correctly, and the options menu shows locked toggles as locked with a one-line reason.
- Full Legacy run is behaviorally identical to the pre-change game; existing tests pass unmodified.
- Automap: overlay and full-screen views render correctly in the parchment style; visited-cell persistence round-trips through save/load; spinner/teleporter desync and compass-spell re-sync demonstrably work (add a test for the desync logic).
- Save-anywhere round-trips complete game state from mid-dungeon, including automap data and active song/spell effects, across all 4 slots.
- Shared-inventory mode: buy, loot, trade, equip, and use-from-pool all function; individual mode untouched.
- New tests cover: save migration from the old format, XP curve selection, charge-based item depletion, and 7th-slot combat targeting.
- README updated: a "Remastered vs. Legacy" section listing every toggle, its default in each mode, and which are locked at creation.

Finish with an updated 10-minute playtest script that demonstrates: mode selection, the automap overlay and a spinner desync + compass re-sync, a mid-dungeon save/load, using a potion from the shared pool, and a summon sitting in the 7th slot during a fight.

The base game is complete, playable, and mechanically sound. This pass upgrades **presentation and input only** — graphics, animation, audio, color, and mouse support — to match the look and feel of The Bard's Tale (1985) on the Amiga, which used solid, colorful bitmap graphics and an animated portrait window, not wireframes. Game logic, balance, data schemas, and content must not change.

## Ground rules

- **Re-read the codebase first.** Identify the render layer, input layer, and main loop. Plan how to swap the wireframe renderer for the new one behind the same interface so game logic is untouched. The existing logic test suite must pass unmodified.
- **No external assets, ever.** No downloaded images, fonts, or audio files. All art is authored in-repo as data (see Art Pipeline) and all audio is synthesized in code. Everything remains editable as text.
- Keep movement and input response instant. Animation and audio must never block or delay a keystroke.
- Work in phases, runnable after each: (1) framebuffer + palette + textured maze renderer, (2) portrait window + monster/building art, (3) UI color pass + mouse support, (4) animation, (5) audio engine + music/SFX, (6) polish + README + playtest script.

## Rendering: authentic 1985 bitmap look

- Render the game to a **low-resolution internal framebuffer** (pick something period-plausible, e.g. 320×200 or 384×240), then scale to the window with **nearest-neighbor only** — chunky pixels, no smoothing, no sub-pixel anything. Maintain integer scaling with letterboxing so pixels stay square.
- **Fixed master palette of 32 colors**, Amiga-flavored (rich mid-tones, a few strong saturated accents, proper dark steps for depth shading). Define it once in a data file; all art references palette indices, never raw RGB.
- **The maze viewport becomes solid and textured:**
  - Walls are filled surfaces with **tile textures** — at minimum: town stone, tannery brick/rot (Undercroft), barrow earth-and-bone (Howling Barrow), dressed spire stone (Maldrec's Needle). Doors get distinct door art; secret doors look identical to walls until found.
  - **Distance shading:** each depth step renders with a darker palette ramp (use dithering between ramp steps for the period look). Light radius interacts with this — low light pulls the dark ramp closer; darkness zones black out beyond one step.
  - Distinct **floor and ceiling** treatments per area (e.g. wet sheen rows in the Undercroft, open night/day sky in town).
  - Town facades: when facing a known building, render its exterior in the viewport — signboard art for Greta's, the taverns, the temple, the Hall, the Spark House, plus generic house/boarded-up variants. The signboards make navigation-by-sight possible, like the original.
- **Day/night in town:** sky palette and street shading shift by time of day if a day/night cycle exists; otherwise add a simple dusk palette for flavor at the gates.

## The portrait window (signature feature)

Restore the original's animated picture window as a dedicated panel (carve space per the existing layout — top-center or within the viewport frame during events):
- **Encounters:** an animated portrait of the lead monster group, looping at 2–4 frames. When multiple groups are present, show the nearest/most dangerous, with the others named in text.
- **Town:** portrait of the building being faced or entered (interior vignette while in a shop menu).
- **Specials:** statues, magic mouths, the Verses, stairs — each gets a small piece of art; magic mouths animate while speaking.
- **Victory screen** gets a proper full-window illustration.

## Art pipeline (how the art gets made)

- Author every sprite/texture as a **text-grid pixel map** in data files: rows of characters, each character mapping to a palette index via a per-sprite legend. Human-readable, diffable, hand-editable, and easy for you to author carefully. Example:

  ```
  legend: {".": transparent, "#": 4, "o": 12, "x": 28}
  ..##..
  .#oo#.
  #oxxo#
  ```
- Build a tiny **sprite preview/dev page** (debug flag) that renders every sprite, texture, and animation in a grid with names — so bad art is visible at a glance and fixable per-sprite.
- **Animations** are arrays of frames with per-frame duration; idle loops run at 2–4 fps (period-correct chunkiness, also less art to draw).
- **Palette-swap families** are the expected trick for monster coverage, exactly as 1985 did it: draw ~15–20 base monster portraits across the themed families (vermin, mire-spawn, undead, wights, fen-beasts, sorcerers, constructs, bosses) and define tier variants as palette remaps + name (e.g. Mirefang → Blackfang → Elder Mirefang). Every monster in the bestiary must resolve to a portrait. The three dungeon guardians and Maldrec each get **unique, larger, more detailed portraits** — these are the showpieces, spend real effort there.
- **Character art:** add a small portrait per race × archetype (a dozen or so head-and-shoulders sprites with palette-swap variants) chosen at character creation, shown on the character sheet and as a tiny chip beside the name in the roster. Class icons next to the class column.
- Item icons are optional; if added, keep them to shops/inventory and 8×8 or 16×16.

## UI color & polish pass

- Apply the palette to the chrome: titled panel borders, a **compass rose** glyph near the facing text, and the active-song note rendered as a small animated icon while a song plays.
- **Roster condition colors**, like the original: healthy = default, wounded = yellow, critical = red, poisoned = green, paralyzed/stoned = grey, dead = dark red with strikethrough-style treatment. SP column tinted for casters.
- Combat narration gets light color coding (party actions, enemy actions, damage numbers, loot) — readable, not rainbow soup.
- Fill the message window's dead space contextually: current square description, shop stock, or last few events; never a large empty box.

## Mouse support (full parity with keyboard)

- The bottom command bar becomes real **buttons**: hover state, click to invoke, showing the hotkey on the button. Context-sensitive (combat shows combat commands).
- **Click-to-act everywhere:** click a viewport edge/arrow overlay (or the compass) to move/turn; click a roster row to open that character's sheet; click a monster group line to target it; click menu items in shops, the Review Board, spell/song lists, and dialogs; click-to-confirm prompts. Scroll wheel scrolls the message log.
- Keyboard remains 100% sufficient — every mouse action keeps its keystroke, and the help screen lists both.

## Audio: synthesized chiptune engine

- Write a small **synth engine** (square/pulse, triangle, and noise voices with simple envelopes — think SID/Paula-adjacent) targeting the stack's native audio API. All music and SFX are defined as **note/pattern data files**, not audio files.
- **Bard songs are the centerpiece:** each of the 7 songs gets its own distinct, recognizable 4–8 bar looping melody that plays for as long as the song is active in exploration, and a one-round flourish version in combat. A player should learn to identify the song by ear. The Skald's instrument quality may vary timbre (different voice/detune per instrument tier) as a nice touch.
- **Music:** a short town theme (with a sparser night variant if day/night exists), a low ambient drone-loop per dungeon (distinct per dungeon, tension rising with depth), a combat theme, a victory fanfare, a grim party-death sting, and a title-screen theme.
- **SFX:** footsteps (surface-dependent), door open/secret door rumble, stairs, hits/misses/criticals, each spell school gets a signature cast sound, trap springs, chest open, gold jingle, level-up chime, temple heal, tavern murmur loop.
- **Mixing & controls:** independent music/SFX volume sliders and a master mute in an options screen, persisted in config. Music ducks slightly under SFX. Nothing plays until first user input if the platform requires a gesture to start audio.

## Acceptance criteria

- All existing logic tests pass unmodified; a scripted Legacy-style playthrough (create party → shop → dungeon 1 → fight → save) behaves identically to before, just prettier and louder.
- Every monster, building, and special resolves to art — add a test that walks the bestiary/locations data and fails on any missing sprite reference, and another that validates every sprite's text-grid against its legend and dimensions.
- The sprite preview page shows the complete art set with no broken entries.
- Mouse-only playthrough is possible: a tester can do the full 10-minute tour without touching the keyboard, and keyboard-only remains fully possible.
- Each bard song is audibly distinct; toggling songs switches melodies cleanly without clicks/pops; all volume controls work and persist.
- Performance: instant input response and smooth rendering at the chosen internal resolution; no animation jank during combat text scroll.
- README updated: new screenshots section description, audio credits note ("all audio synthesized"), options documentation, and the art pipeline documented well enough that I can hand-edit a sprite.

Finish with an updated 10-minute playtest script that shows off: the textured Undercroft with distance shading, a town facade with signboard, an animated monster portrait in combat, condition colors after taking poison, a mouse-only shop visit, two different bard songs back to back, and the combat theme into the victory fanfare.
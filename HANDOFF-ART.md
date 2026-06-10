# HANDOFF: missing monster portrait art (set B)

## Status

The presentation upgrade is complete except for **one art file**:
`data/art/monsters2.json` — nine monster portrait families covering 22
bestiary entries. The agent assigned to it was stopped before it wrote
anything (cost control). Everything else ships: the other 11 families
(`data/art/monsters.json`), the four 48×48 boss showpieces
(`data/art/monsters3.json`), characters, signs, interiors, scenes, textures.

**Known-red test** (`npm test`): exactly one, until this file exists —

- `art » every monster in the bestiary resolves to a portrait` (22 ids below)

Current suite status: **41 pass / 1 fail**, and `node tools/artcheck.js`
reports OK (96 sprites, 17 anims, 75 variants).

**Runtime behavior meanwhile:** the game does not break. A monster without
art shows a framed `?` placeholder in the portrait window
(`src/ui/renderer.js` → `artBox`), and combat falls back from
`resolveVariant(monster.id)` to `resolveVariant('mon_' + monster.portrait)`.

## What to author

One file, `data/art/monsters2.json`, in the standard format (see
**`dev/ART_SPEC.md`** — format, the 32-color palette, style rules,
validation). Per family: two 32×32 frames (`mon_<family>_a` / `_b`, frame B a
1–2px idle delta), one anim `mon_<family>` (2 frames, ~400ms), and a
`variants` entry per monster id (palette remap for tier flavor; `{}` for the
baseline id).

| family | look | bestiary ids (tier) |
|---|---|---|
| `sorcerer` | robed cult sorcerer, pointed cowl, staff, raised hand | tallow_acolyte (t2, candle-gold trim) · barrow_sorcerer (t3, bone/grey) · hollow_cantor (t3, grey/violet) · needle_scribe (t4, blue/violet) |
| `ghost` | ragged shroud-wight, hollow eyes, howling mouth, floating hem | gate_wight (t2) · barrow_wight (t2, green glow) · mistcaller (t3, blue) · glass_revenant (t4, pale blue/chalk) · fetch (t3, violet) · shadowtwin (t4, near-black) |
| `bird` | gaunt carrion storm-bird, wings half-spread, open beak | wind_shrieker (t2) |
| `hag` | wild hair, hooked nose, clawed fingers raised | fen_hag (t3) · illusion_weaver (t4, violet) |
| `knight` | armored revenant, closed helm, notched sword, kite shield | wight_lord (t3, green-glow eyes) · storm_sentinel (t4, blue) · maldrec_hand (t5, violet) · old_host_warrior (t4, bone/gold) · dawn_champion (t5, gold) |
| `choir` | three hooded singers, open black mouths, taller center figure | fell_chorister (t5, dark) — note: choir_eldest already has its unique 48×48 showpiece |
| `gargoyle` | horned stone gargoyle, folded wings, fanged grin | spirelash (t4) |
| `golem` | blocky rune golem, glowing chest rune (frame B: rune pulse) | rune_golem (t4) |
| `moth` | basilisk moth, huge wings whose eye-spots STARE | basilisk_moth (t4) |

## Style reference

Match the quality and conventions of the finished sets:

- `data/art/monsters.json` — set A (rat, hound, zombie, skeleton, brute…):
  solid silhouettes with a dark edge, 3-tone shading, one saturated accent,
  characterful posture, ~85% canvas fill.
- `data/art/monsters3.json` — the showpieces (Tallow King, Choir's Eldest,
  Mock King, Maldrec) for the upper bound of detail.

## Verify

```sh
node tools/artcheck.js     # dims/legends/refs — must be OK, zero errors
npm test                   # the bestiary-coverage test goes green
# visual: npm start → http://127.0.0.1:8377/dev.html  (full art grid,
# live animations, variant remaps, coverage line at the bottom)
```

The loader (`src/ui/art.js`) already lists `monsters2` in `SPRITE_DOCS` —
drop the file in and reload; no code changes needed.

*Process note for next time: have art agents write their file incrementally
(after each family) and run `node tools/artcheck.js` between families, so
progress is verifiable from outside.*

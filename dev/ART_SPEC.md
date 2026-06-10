# THORNMERE art pipeline spec (for art authors)

All art is **text-grid pixel maps** in JSON files under `data/art/`. No binary
assets, ever. Each file has this shape:

```json
{
  "comment": "what this file holds",
  "sprites": {
    "mon_rat_a": {
      "w": 32, "h": 32,
      "legend": { ".": -1, "o": 2, "f": 10, "F": 11, "e": 26, "c": 6 },
      "rows": [ "................................", "..32 chars per row, h rows.." ]
    }
  },
  "anims": {
    "mon_rat": { "frames": [ { "sprite": "mon_rat_a", "ms": 400 }, { "sprite": "mon_rat_b", "ms": 400 } ] }
  },
  "variants": {
    "fen_rat": { "base": "mon_rat", "remap": {} },
    "dire_rat": { "base": "mon_rat", "remap": { "10": 9, "11": 10 } }
  }
}
```

- `legend` maps one character to one **palette index** (below); `-1` = transparent.
- Every row must be exactly `w` characters; there must be exactly `h` rows.
- `variants` resolve a game id to a base sprite/anim plus a palette remap
  (JSON keys are strings: `"10": 9` recolors palette 10 → 9).
- Remap only indices that actually appear in the base sprite.

## Validate constantly

```sh
node tools/artcheck.js     # dims, legends, palette ranges, anim/variant refs
```

Your file MUST pass before you are done. Iterate on your grids by reading them —
the text grid IS the preview; squint at it.

## The 32-color palette

| idx | name | hex | | idx | name | hex |
|----|------|-----|-|----|------|-----|
| 0 | black | #000000 | | 16 | fen-green | #3e8434 |
| 1 | night | #16121e | | 17 | leaf | #72c04c |
| 2 | shadow | #2c2836 | | 18 | pale-leaf | #b4e284 |
| 3 | slate-dark | #46424f | | 19 | abyss-blue | #101c3c |
| 4 | slate | #6a6675 | | 20 | deep-blue | #1e3c74 |
| 5 | stone | #928e9e | | 21 | sky-blue | #3a6cb8 |
| 6 | bone | #c4c2cc | | 22 | day-sky | #68a8e4 |
| 7 | chalk | #eeeef2 | | 23 | mist-blue | #a8d2ec |
| 8 | peat | #241710 | | 24 | blood-dark | #3c0e12 |
| 9 | umber | #482c1a | | 25 | blood | #84222a |
| 10 | leather | #74482a | | 26 | ember | #c84032 |
| 11 | amberwood | #a06e3c | | 27 | flame | #ee7a4e |
| 12 | honey | #cc9a58 | | 28 | gold-dark | #8a5c18 |
| 13 | parchment | #ecc890 | | 29 | gold | #d8a224 |
| 14 | moss-deep | #122410 | | 30 | candle | #f8d878 |
| 15 | moss | #265222 | | 31 | violet | #8a52c8 |

Ramps (dark→light): grays 1-2-3-4-5-6-7 · warm 8-9-10-11-12-13 ·
greens 14-15-16-17-18 · blues 19-20-21-22-23 · reds 24-25-26-27 ·
golds 28-29-30. Use ramp neighbors for shading.

## Style rules (1985 Amiga, The Bard's Tale look)

1. **Solid filled shapes** on transparent background — no wireframe, no
   stippled noise. Cluster pixels ≥2×2; single stray pixels read as dirt.
2. **Dark silhouette edge**: outline the figure in 1 (night) or 8 (peat) so it
   pops off any backdrop.
3. **Three-tone shading** per material (shadow/base/highlight from one ramp),
   light from the upper-left.
4. **Big readable silhouette**: exaggerate the identifying feature (jaws, claws,
   cowl, crown, glowing eyes). The player must recognize it at a glance.
5. Eyes/glows use saturated accents (26 ember, 30 candle, 31 violet, 21 blue).
6. **Animation frame B is a small delta** of frame A: shift a limb/jaw/flame
   1–2px, blink eyes, sway. Do not redraw the figure. Idle loops run at
   2–4 fps (`ms` 280–480).
7. Portraits are head-and-torso, filling ~85% of the canvas, facing the viewer
   or 3/4 view.
8. Tier variants get meaner with palette remaps: higher tier = darker/redder/
   colder. Keep remaps to 2–4 entries.

Do not modify any file other than the one(s) assigned to you. Do not change
palette.json, game data, or code.

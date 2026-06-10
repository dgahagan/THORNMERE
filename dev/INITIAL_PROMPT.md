PROMPT — "Art Pipeline v2.1": AI-assisted sprite production for The Lay of Thornmere
Model: Sonnet (/model sonnet). Run in a fresh session in the project root.
Paste everything below this line.

The Pixel Fidelity pass is COMPLETE — all art families exist at target density, produced by procedural generators (tools/gen_monsters_a.js, gen_monsters_b.js, gen_showpieces.js), committed through step 5b, with PIPELINE-HANDOFF.md describing the final state. Separately, we have proven a local AI image-generation pipeline (dev/pixel-art/) whose output may exceed the procedural art for organic subjects. Your job: build the production tooling for that pipeline, then adjudicate, family by family, which art source wins — and replace only where AI output is clearly better. You are pipeline engineer, art director, and judge.
Read first, in order

PIPELINE-HANDOFF.md — the prior session's closing state and integration notes.
art-review.md and the contact sheets in art-review/ — what exists and what was judged.
dev/Prompt_art_pipeline.md — the original pipeline spec (this prompt supersedes its Deliverable 4).
dev/pixel-art/test2.py, recrush.py, and candidates/ — the proven generator. brute_s42_sub16.png is the AI-quality benchmark; brute_s7_full.png vs brute_s7_sub16.png shows why per-sprite sub-palettes matter.

Environment (critical)
This session runs inside a distrobox WITHOUT GPU access. Every generation run MUST be invoked through the host:
distrobox-host-exec bash -lc 'source ~/pixelart-venv/bin/activate && cd <repo>/dev/pixel-art && python3 <script>'
Verify with distrobox-host-exec nvidia-smi before the first batch; fail loudly and stop if the GPU is not visible. Generation costs ~1.5s/image — be generous with candidates. Everything else (crushing, importing, inspecting PNGs, tests) runs normally in this container.
Standing rules
Incremental writes for all generated-content files; commit per family; contemporaneous logging in art-review.md; judge only rendered/crushed PNGs, never raws or text grids; mode-tagged filenames; loud failures on empty/invalid config. A review log with zero rejections will not be believed.
Key design facts to preserve

Per-sprite sub-palettes are recorded art direction. Each AI sprite quantizes against an explicit allowed-index list (e.g. the brute's tusk streaking is fixed by dropping index 27 — decisions like this go in the manifest notes). This kills hue-bleed and preserves the palette-swap tier mechanic.
One verbatim style suffix per art class so each class reads as one artist. Subject prompts vary; style strings never do.
Determinism. Seeds recorded; any sprite regenerable bit-for-bit from its manifest entry.

Deliverable 1: tools/import_sprite.py
Bridge from a chosen candidate PNG into the game's text-grid format:

Args: source PNG, sprite id, target dims, allowed indices, destination art file, background handling (near-black → background/transparent index, threshold configurable).
Emits text grid + legend in exactly the existing format, idempotently (re-import replaces).
Auto-runs legend/dimension validation on what it wrote; fails loudly on mismatch.
Frame derivation: AI portraits are single frames; idle frames are derived programmatically for perfect registration — composable effects per manifest entry: eye_pulse (brighten marked eye region one ramp step), breathe (shift torso region 1px), flicker. Regions are rect or color-key selections recorded in the manifest. Showpieces currently have 3 frames; AI replacements must match their frame count via these effects.

Deliverable 2: data/art/gen-manifest.json
One entry per AI-produced or AI-candidate sprite: id, art class, subject prompt, style-suffix key, dims, allowed indices, seeds generated, chosen seed, frame-effect config, status (pending/candidates/chosen/imported/kept-procedural), and notes. This is the production record and the regeneration source of truth.
Deliverable 3: dev/pixel-art/generate.py
Batch generator reading the manifest: for each pending sprite, generate N candidate seeds (default 6; showpieces 10+) via the host-exec bridge, write raw + sub-palette-crushed previews to candidates/, update status incrementally after every sprite. Refactor shared logic out of test2.py into one module rather than copy-pasting.
Deliverable 4: The adjudication (the heart of this session)
Work family by family; commit after each:

For each monster family: render the existing procedural art's contact sheet, generate AI candidates from subject prompts you write from the bestiary flavor text, crush them, and judge side by side at game scale. Three verdicts allowed: replace (AI clearly better — import it), kept-procedural (existing art holds up — record why), or retry (adjust prompt/allowed-list once, then decide). Log every verdict with one line of reasoning.
Showpieces get AI candidates regardless (Tallow King, Choir's Eldest, Mock King, Maldrec): 10+ seeds each, careful curation, side-by-side against the procedural versions. These are the game's portfolio pieces — the bar is "would ship in 1985 as box art."
Facades, interiors, scenes, title/victory illustrations: same adjudication, per-class style suffixes.
Character portraits (~32×40): same; reject any candidate whose face doesn't survive the crush at 1×.
Anything you're torn on goes in NEEDS-HUMAN.md with the contenders' filenames — flag and move on.

Wall/floor/ceiling textures and small UI icons are NOT adjudicated — procedural/hand-authored stays (generated images don't tile).
Acceptance criteria

Full suite green; original 27 logic tests unmodified; bestiary coverage and dimension tests pass; zero placeholders.
Every family has a recorded verdict; every imported AI sprite is fully traceable in the manifest; spot-check three by regenerating from manifest and confirming identical output.
import_sprite round-trip test: import a candidate, render from game data, compare to the crushed preview — pixel-identical.
Frame effects verified live in-game (eye pulse visible at 2–4 fps in a combat encounter); showpiece frame counts preserved.
Contact sheets regenerated; art-review.md shows contemporaneous verdicts; NEEDS-HUMAN.md present (even if short).
README: pipeline documented end-to-end — host-exec bridge, generate/curate/import workflow, how to add a monster later with one manifest entry.

Finish with: final contact sheets, the per-family verdict table, NEEDS-HUMAN.md, and before/after captures of the three standard scenes (Undercroft corridor, combat with portrait, Greta's facade).
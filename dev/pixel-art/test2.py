#!/usr/bin/env python3
"""test2.py — generate candidate monster portraits and crush them to the game palette.

Usage:
  python3 test2.py peek     print the palette as numbered swatches, then exit
  python3 test2.py          generate one image per seed and crush each one

Outputs to ./candidates/:
  <name>_s<seed>_raw.png            the 480x400 model output
  <name>_s<seed>_sub<N>.png         crushed with the N-color sub-palette

Shared logic lives in pixelcore.py.  Edit ALLOWED, SUBJECT, SEEDS here;
do not duplicate the palette/crush functions.
"""
import sys
from pathlib import Path

# --------------- config ---------------
USE_LORA = False
SEEDS    = [7, 11, 23, 42]
NAME     = "brute"
TARGET   = (96, 80)
GEN_W, GEN_H = 480, 400
PREVIEW_SCALE = 4

PALETTE_PATH = Path(__file__).resolve().parents[2] / "data" / "art" / "palette.json"

SUBJECT = ("hulking swamp troll brute, mossy green skin, tusked underbite, "
           "hunched shoulders, glowing red eyes")
STYLE   = ("pixel art, upper body monster portrait, close-up, facing viewer, "
           "fantasy dungeon crawler monster, 16-bit Amiga style, limited palette, "
           "solid black background, game asset")
PROMPT  = f"{SUBJECT}, {STYLE}"

ALLOWED = [0, 1, 2, 3, 6, 7, 13, 14, 15, 16, 17, 18, 24, 25, 26, 27]
# ---------------------------------------

from pixelcore import (
    load_palette, validate_allowed, mode_tag,
    palette_image, crush, save_preview,
)


def peek(rgb: list) -> None:
    print(f"{len(rgb)} colors in {PALETTE_PATH}:\n")
    for i, (r, g, b) in enumerate(rgb):
        print(f"\x1b[48;2;{r};{g};{b}m      \x1b[0m  {i:2d}  rgb({r:3d},{g:3d},{b:3d})")
    print("\nList the indices you want in ALLOWED.")


def main() -> None:
    rgb = load_palette(PALETTE_PATH)

    if len(sys.argv) > 1 and sys.argv[1] == "peek":
        peek(rgb)
        return

    validate_allowed(ALLOWED, len(rgb))
    tag = mode_tag(ALLOWED)
    print(f"palette: {len(rgb)} colors — mode: {tag}")

    import torch
    from diffusers import Flux2KleinPipeline

    pipe = Flux2KleinPipeline.from_pretrained(
        "black-forest-labs/FLUX.2-klein-4B", torch_dtype=torch.bfloat16)
    pipe.enable_model_cpu_offload()
    if USE_LORA:
        pipe.load_lora_weights("Limbicnation/pixel-art-lora")

    out = Path("candidates")
    out.mkdir(exist_ok=True)

    for seed in SEEDS:
        img = pipe(prompt=PROMPT, num_inference_steps=4, guidance_scale=1.0,
                   height=GEN_H, width=GEN_W,
                   generator=torch.Generator("cpu").manual_seed(seed)).images[0]
        img.save(out / f"{NAME}_s{seed}_raw.png")

        q = crush(img, rgb, ALLOWED, target=TARGET)
        save_preview(q, out / f"{NAME}_s{seed}_{tag}.png", target=TARGET, scale=PREVIEW_SCALE)
        print(f"seed {seed:>3}: raw + {tag} crush written")

    print(f"\ndone — eyeball candidates/{NAME}_s*_{tag}.png")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""test_tiling.py — does the local FLUX.2-klein support seamless/tileable output?

The standard "make any diffusers model tile" trick: set every Conv2d layer's
padding_mode to 'circular' so the latent space wraps at the edges. This script
generates the SAME texture twice — once normally (control) and once with circular
padding — and writes a 2×2 tiled montage of each so you can eyeball the seams.

Run on the host (GPU), from dev/pixel-art/:
  source ~/pixelart-venv/bin/activate
  python3 test_tiling.py

Then look at dev/pixel-art/tiling-test/:
  - *_control_2x2.png  : normal generation, tiled 2×2 (expect visible seams)
  - *_circular_2x2.png : circular padding, tiled 2×2
If the circular 2×2 has NO visible seams (the texture wraps continuously across
the tile boundaries), FLUX can tile via circular padding → textures are viable.
If seams persist, it doesn't tile this way → keep the procedural textures.
"""
import torch
from diffusers import Flux2KleinPipeline
from PIL import Image
from pathlib import Path

OUT = Path("tiling-test"); OUT.mkdir(exist_ok=True)
W = H = 512
SEED = 42
PROMPTS = {
    "stonewall": "seamless tileable stone wall texture, fitted grey masonry blocks, mortar lines, flat orthographic, evenly lit, no border, no vignette",
    "cobbles":   "seamless tileable cobblestone floor texture, rounded grey stones, flat top-down, evenly lit, no border",
}

def set_circular(pipe, enabled: bool) -> int:
    mode = "circular" if enabled else "zeros"
    n = 0
    for comp in (getattr(pipe, "vae", None), getattr(pipe, "transformer", None)):
        if comp is None:
            continue
        for m in comp.modules():
            if isinstance(m, torch.nn.Conv2d):
                m.padding_mode = mode
                n += 1
    return n

def tile2x2(img: Image.Image) -> Image.Image:
    w, h = img.size
    c = Image.new("RGB", (w * 2, h * 2))
    for dx in (0, w):
        for dy in (0, h):
            c.paste(img, (dx, dy))
    return c

def main():
    print("Loading FLUX.2-klein-4B …")
    pipe = Flux2KleinPipeline.from_pretrained(
        "black-forest-labs/FLUX.2-klein-4B", torch_dtype=torch.bfloat16
    )
    pipe.enable_model_cpu_offload()

    def gen(prompt):
        return pipe(
            prompt=prompt, num_inference_steps=4, guidance_scale=1.0,
            height=H, width=W,
            generator=torch.Generator("cpu").manual_seed(SEED),
        ).images[0]

    n_conv = sum(1 for c in (pipe.vae, getattr(pipe, "transformer", None)) if c
                 for m in c.modules() if isinstance(m, torch.nn.Conv2d))
    print(f"Found {n_conv} Conv2d layers in vae+transformer.")

    for name, prompt in PROMPTS.items():
        print(f"[{name}] control (zeros padding) …")
        set_circular(pipe, False)
        img = gen(prompt)
        img.save(OUT / f"{name}_control.png")
        tile2x2(img).save(OUT / f"{name}_control_2x2.png")

        print(f"[{name}] circular padding …")
        set_circular(pipe, True)
        img = gen(prompt)
        img.save(OUT / f"{name}_circular.png")
        tile2x2(img).save(OUT / f"{name}_circular_2x2.png")
        set_circular(pipe, False)  # restore

    print("Done. Compare *_control_2x2.png vs *_circular_2x2.png in dev/pixel-art/tiling-test/.")
    print("Seams gone in the circular version => FLUX can tile. Seams remain => keep procedural textures.")

if __name__ == "__main__":
    main()

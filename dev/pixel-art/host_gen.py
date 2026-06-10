#!/usr/bin/env python3
"""host_gen.py — GPU-side image generator for the Thornmere AI art pipeline.

Reads a JSON request file, loads FLUX.2-klein-4B ONCE, then generates all
requested images.  Run from the repo root via the distrobox-host-exec bridge:

  distrobox-host-exec bash -lc \\
    'source ~/pixelart-venv/bin/activate && \\
     cd /path/to/repo/dev/pixel-art && \\
     python3 host_gen.py gen_request.json'

Request JSON schema:
  {
    "entries": [
      {
        "name":    "mon_sorcerer_s7",
        "prompt":  "hooded cult mage ..., pixel art, ...",
        "seed":    7,
        "gen_w":   480,
        "gen_h":   400,
        "out":     "candidates/mon_sorcerer_s7_raw.png"
      },
      ...
    ],
    "use_lora": false
  }

Existing output files are skipped (idempotent re-run).
"""
import json
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("usage: host_gen.py <request.json>")

    req_path = Path(sys.argv[1])
    if not req_path.exists():
        raise SystemExit(f"request file not found: {req_path}")

    req = json.loads(req_path.read_text())
    entries = req.get("entries", [])
    if not entries:
        print("host_gen: no entries in request — done")
        return

    # Skip entries whose outputs already exist
    todo = [e for e in entries if not Path(e["out"]).exists()]
    skipped = len(entries) - len(todo)
    if skipped:
        print(f"host_gen: skipping {skipped} already-generated image(s)")
    if not todo:
        print("host_gen: all outputs exist — done")
        return

    use_lora = req.get("use_lora", False)
    print(f"host_gen: loading FLUX.2-klein-4B (lora={use_lora}) …")
    import torch
    from diffusers import Flux2KleinPipeline

    pipe = Flux2KleinPipeline.from_pretrained(
        "black-forest-labs/FLUX.2-klein-4B", torch_dtype=torch.bfloat16
    )
    pipe.enable_model_cpu_offload()
    if use_lora:
        pipe.load_lora_weights("Limbicnation/pixel-art-lora")

    print(f"host_gen: generating {len(todo)} image(s) …")
    Path("candidates").mkdir(exist_ok=True)

    for i, e in enumerate(todo, 1):
        out = Path(e["out"])
        print(f"  [{i}/{len(todo)}] seed={e['seed']:>3}  {out.name}")
        img = pipe(
            prompt=e["prompt"],
            num_inference_steps=4,
            guidance_scale=1.0,
            height=e["gen_h"],
            width=e["gen_w"],
            generator=torch.Generator("cpu").manual_seed(e["seed"]),
        ).images[0]
        out.parent.mkdir(parents=True, exist_ok=True)
        img.save(out)

    print("host_gen: done.")


if __name__ == "__main__":
    main()

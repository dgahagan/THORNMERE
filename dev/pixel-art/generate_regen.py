#!/usr/bin/env python3
"""generate_regen.py — audit-01 W4/W6 regeneration batch.

Identical to generate.py / generate_feral.py except CANDIDATES_DIR points to
candidates-regen-v2/ so these raws and crushed PNGs never clobber the v1
candidates/ set. Processes manifest entries whose status == "regenerating"
(currently mon_choir_eldest [W4] and mon_skeleton [W6] — director-approved
subjects already locked into the manifest).

Usage (from within distrobox, dev/pixel-art/):
  python3 generate_regen.py --dry-run            # preview prompts + plan, no GPU
  python3 generate_regen.py                       # both regenerating entries
  python3 generate_regen.py --id mon_skeleton     # one entry
  python3 generate_regen.py --id mon_choir_eldest

GPU is only touched when generating (bridged to the host via distrobox-host-exec);
crushing and manifest writes run in this container. After this completes, a worker
session builds comparison sheets for human adjudication — winners are NOT
self-picked (the lesson of the v1 'too cute' / box-art misses).
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PIXELART_DIR = Path(__file__).resolve().parent
MANIFEST_PATH = REPO / "data" / "art" / "gen-manifest.json"
PALETTE_PATH = REPO / "data" / "art" / "palette.json"
CANDIDATES_DIR = PIXELART_DIR / "candidates-regen-v2"
REQUEST_PATH = PIXELART_DIR / "gen_request_regen.json"

sys.path.insert(0, str(PIXELART_DIR))
from pixelcore import (
    load_palette, crush, save_preview, validate_allowed, mode_tag,
)
from PIL import Image


def load_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        raise SystemExit(f"Manifest not found: {MANIFEST_PATH}")
    return json.loads(MANIFEST_PATH.read_text())


def save_manifest(manifest: dict) -> None:
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + '\n')


def build_prompt(entry: dict, style_suffixes: dict) -> str:
    key = entry["style_suffix_key"]
    if key not in style_suffixes:
        raise SystemExit(f"Unknown style_suffix_key '{key}' in entry '{entry['id']}'")
    return f"{entry['subject']}, {style_suffixes[key]}"


def generate_and_crush(entries: list[dict], manifest: dict, dry_run: bool) -> None:
    rgb = load_palette(PALETTE_PATH)
    style_suffixes = manifest["style_suffixes"]
    gen_dims = manifest.get("gen_dims", {})
    preview_scale = manifest.get("preview_scale", 4)
    CANDIDATES_DIR.mkdir(exist_ok=True)

    request_entries = []
    for entry in entries:
        prompt = build_prompt(entry, style_suffixes)
        seeds = entry.get("seeds_to_generate")
        if not seeds:
            raise SystemExit(
                f"Entry '{entry['id']}' has no seeds_to_generate — fill the manifest."
            )
        gw, gh = gen_dims.get(entry["art_class"], [480, 400])
        for seed in seeds:
            raw_path = CANDIDATES_DIR / f"{entry['id']}_s{seed}_raw.png"
            request_entries.append({
                "name":  f"{entry['id']}_s{seed}",
                "prompt": prompt,
                "seed":  seed,
                "gen_w": gw,
                "gen_h": gh,
                "out":   str(raw_path),
            })

    n_total = len(request_entries)
    n_need  = sum(1 for r in request_entries if not Path(r["out"]).exists())
    print(f"Plan: {n_total} image(s) across {len(entries)} entries "
          f"({n_total - n_need} already exist, {n_need} to generate)")

    if dry_run:
        for r in request_entries:
            exists = "OK" if Path(r["out"]).exists() else "GEN"
            print(f"  [{exists}] s={r['seed']:>3}  {Path(r['out']).name}")
            print(f"       {r['prompt'][:90]}…")
        return

    if n_need > 0:
        REQUEST_PATH.write_text(json.dumps({"entries": request_entries, "use_lora": False}))
        host_cmd = (
            f"source ~/pixelart-venv/bin/activate && "
            f"cd {PIXELART_DIR} && "
            f"python3 host_gen.py {REQUEST_PATH}"
        )
        print("Invoking host GPU …")
        result = subprocess.run(["distrobox-host-exec", "bash", "-lc", host_cmd])
        if result.returncode != 0:
            raise SystemExit(f"host_gen.py exited with code {result.returncode}")
    else:
        print("All raws already exist — skipping host generation.")

    print("Crushing raws …")
    for entry in entries:
        allowed = entry.get("allowed") or None
        if allowed is not None:
            validate_allowed(allowed, len(rgb))
        tag   = mode_tag(allowed)
        target = tuple(entry["dims"])
        seeds  = entry["seeds_to_generate"]

        done: list[int] = []
        for seed in seeds:
            raw_path = CANDIDATES_DIR / f"{entry['id']}_s{seed}_raw.png"
            if not raw_path.exists():
                print(f"  WARNING: missing raw {raw_path.name} — skipping")
                continue
            q = crush(Image.open(raw_path), rgb, allowed, target=target)
            crush_path = CANDIDATES_DIR / f"{entry['id']}_s{seed}_{tag}.png"
            save_preview(q, crush_path, target=target, scale=preview_scale)
            done.append(seed)
            print(f"  {entry['id']} s={seed:>3}: {crush_path.name}")

        entry["seeds_generated"] = done
        if entry.get("status") == "regenerating":
            entry["status"] = "candidates"
        save_manifest(manifest)
        print(f"  {entry['id']}: {len(done)}/{len(seeds)} seeds → status={entry['status']}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--id",      help="Process only this manifest entry id")
    ap.add_argument("--force",   action="store_true",
                    help="Process entry even if status != regenerating")
    ap.add_argument("--dry-run", action="store_true",
                    help="Print plan without generating or crushing")
    args = ap.parse_args()

    manifest = load_manifest()
    entries  = manifest.get("entries", [])

    if args.id:
        entries = [e for e in entries if e["id"] == args.id]
        if not entries:
            raise SystemExit(f"No manifest entry with id '{args.id}'")
    elif not args.force:
        entries = [e for e in entries if e.get("status") == "regenerating"]

    if not entries:
        print("No entries to process.  Use --force to re-process existing ones.")
        return

    ids = [e["id"] for e in entries]
    print(f"Processing {len(entries)} entry/entries: {ids}")
    generate_and_crush(entries, manifest, dry_run=args.dry_run)


if __name__ == "__main__":
    main()

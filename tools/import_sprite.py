#!/usr/bin/env python3
"""import_sprite.py — Bridge from an AI candidate PNG into the game text-grid format.

Modes
-----
  Manifest mode (recommended):
    python3 tools/import_sprite.py --manifest-entry mon_sorcerer
      Reads all config from data/art/gen-manifest.json; chosen_seed must be set.

  Explicit mode:
    python3 tools/import_sprite.py \\
        --src  dev/pixel-art/candidates/mon_sorcerer_s42_sub17.png \\
        --id   mon_sorcerer \\
        --dest data/art/monsters2.json \\
        --w 96 --h 80 \\
        --allowed 0,1,2,3,6,7,8,9,10,11,12,13,19,20,24,25,26 \\
        [--bg-indices 0,1]            # default 0,1 → transparent
        [--preview-scale 4]           # PNG is N× the sprite dims; auto-detected
        [--effects b:eye_pulse]       # derive frame_b via these effects
        [--eye-region 30,28,36,12]    # x,y,w,h in sprite pixels
        [--torso-region 20,50,56,24]

After writing, the tool re-reads what it wrote and validates dimensions,
legend consistency, and palette range — failing loudly on any mismatch.

Frame derivation
----------------
--effects  b:eye_pulse             → frame_b = eye_pulse(frame_a)
--effects  b:eye_pulse,breathe     → frame_b = eye_pulse then breathe
--effects  b:eye_pulse,c:eye_pulse → b from a, c from a (used for showpieces)

eye_pulse   Brighten every pixel in the eye region one step up its palette chain.
breathe     Shift every pixel in the torso region 1 px downward.
"""
import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
PIXELART_DIR = REPO / "dev" / "pixel-art"
MANIFEST_PATH = REPO / "data" / "art" / "gen-manifest.json"
PALETTE_PATH = REPO / "data" / "art" / "palette.json"

sys.path.insert(0, str(PIXELART_DIR))
from pixelcore import load_palette, nearest_palette_idx, BRIGHTEN

from PIL import Image

SYMBOL_POOL = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
)


# ---------------------------------------------------------------------------
# PNG → pixel index grid
# ---------------------------------------------------------------------------

def png_to_indices(
    src: Path,
    target_w: int,
    target_h: int,
    rgb: list,
    allowed: list[int] | None,
    bg_indices: set[int],
    preview_scale: int | None = None,
) -> list[list[int]]:
    """Load *src*, resize to target, map each pixel to its nearest palette index.

    Pixels whose index falls in *bg_indices* are returned as -1 (transparent).
    If *allowed* is given, any pixel mapping outside allowed ∪ {bg_indices} is
    a hard error (means the wrong PNG was passed in).
    """
    img = Image.open(src).convert("RGB")
    iw, ih = img.size

    # Auto-detect scale: PNG dimensions must be an integer multiple of target
    if preview_scale is None:
        sx, sy = iw // target_w, ih // target_h
        if sx != sy or sx == 0 or iw % target_w != 0 or ih % target_h != 0:
            raise SystemExit(
                f"PNG size {iw}×{ih} is not a clean multiple of target "
                f"{target_w}×{target_h} — pass --preview-scale explicitly."
            )
        preview_scale = sx

    if (iw, ih) != (target_w * preview_scale, target_h * preview_scale):
        raise SystemExit(
            f"PNG size {iw}×{ih} does not match "
            f"{target_w}×{target_h} × scale {preview_scale}."
        )

    img = img.resize((target_w, target_h), Image.NEAREST)

    rows: list[list[int]] = []
    errors: list[str] = []
    for y in range(target_h):
        row: list[int] = []
        for x in range(target_w):
            r, g, b = img.getpixel((x, y))
            idx = nearest_palette_idx(r, g, b, rgb)
            if idx in bg_indices:
                row.append(-1)
            else:
                if allowed is not None and idx not in allowed:
                    errors.append(f"({x},{y}): idx={idx} not in allowed")
                row.append(idx)
        rows.append(row)

    if errors:
        sample = errors[:5]
        raise SystemExit(
            f"Pixel(s) outside allowed sub-palette (wrong PNG?):\n"
            + "\n".join(f"  {e}" for e in sample)
            + (f"\n  … and {len(errors)-5} more" if len(errors) > 5 else "")
        )
    return rows


# ---------------------------------------------------------------------------
# Index grid → sprite dict (legend + rows)
# ---------------------------------------------------------------------------

def _assign_symbols(indices_flat: list[int]) -> dict[int, str]:
    """Map unique non-background indices to single-char symbols."""
    used = sorted(set(i for i in indices_flat if i != -1))
    if len(used) > len(SYMBOL_POOL):
        raise SystemExit(
            f"Too many unique palette indices ({len(used)}); max is {len(SYMBOL_POOL)}."
        )
    return {idx: SYMBOL_POOL[k] for k, idx in enumerate(used)}


def build_sprite(
    rows_idx: list[list[int]],
    w: int,
    h: int,
    idx_to_sym: dict[int, str] | None = None,
) -> tuple[dict, dict[int, str]]:
    """Return (sprite_dict, idx_to_sym) where sprite_dict is ready for JSON."""
    if idx_to_sym is None:
        flat = [v for row in rows_idx for v in row]
        idx_to_sym = _assign_symbols(flat)

    legend = {".": -1}
    for idx, sym in idx_to_sym.items():
        legend[sym] = idx

    text_rows = []
    for y_row in rows_idx:
        text_rows.append("".join("." if v == -1 else idx_to_sym[v] for v in y_row))

    return {"w": w, "h": h, "legend": legend, "rows": text_rows}, idx_to_sym


# ---------------------------------------------------------------------------
# Frame effects
# ---------------------------------------------------------------------------

def apply_eye_pulse(
    rows_idx: list[list[int]],
    w: int,
    h: int,
    region: dict,
) -> list[list[int]]:
    """Brighten palette index of every non-background pixel in *region* by one step."""
    x0 = region.get("x", 0)
    y0 = region.get("y", 0)
    rw = region.get("w", w)
    rh = region.get("h", h)
    result = [list(row) for row in rows_idx]
    for y in range(max(0, y0), min(y0 + rh, h)):
        for x in range(max(0, x0), min(x0 + rw, w)):
            idx = result[y][x]
            if idx == -1:
                continue
            result[y][x] = BRIGHTEN.get(idx, idx)
    return result


def apply_breathe(
    rows_idx: list[list[int]],
    w: int,
    h: int,
    region: dict,
) -> list[list[int]]:
    """Shift torso region 1 px downward (bottom row pushed out, top row → transparent)."""
    x0 = region.get("x", 0)
    y0 = region.get("y", 0)
    rw = region.get("w", w)
    rh = region.get("h", h)
    result = [list(row) for row in rows_idx]
    x1 = min(x0 + rw, w)
    y1 = min(y0 + rh, h)
    for y in range(y1 - 1, y0, -1):
        for x in range(x0, x1):
            result[y][x] = result[y - 1][x]
    for x in range(x0, x1):
        result[y0][x] = -1
    return result


EFFECT_FNS = {
    "eye_pulse": apply_eye_pulse,
    "breathe":   apply_breathe,
}


def derive_frame(
    base_idx: list[list[int]],
    effects: list[str],
    w: int,
    h: int,
    regions: dict,
) -> list[list[int]]:
    """Apply a sequence of named effects to produce a derived frame."""
    current = [list(row) for row in base_idx]
    for eff in effects:
        fn = EFFECT_FNS.get(eff)
        if fn is None:
            raise SystemExit(f"Unknown effect '{eff}'. Known: {list(EFFECT_FNS)}")
        # Choose region: eye_pulse → eye, breathe → torso
        region = regions.get("eye" if eff == "eye_pulse" else "torso", {})
        current = fn(current, w, h, region)
    return current


# ---------------------------------------------------------------------------
# JSON merge helpers
# ---------------------------------------------------------------------------

def load_art_doc(path: Path) -> dict:
    if path.exists():
        return json.loads(path.read_text())
    return {"sprites": {}, "anims": {}, "variants": {}}


def save_art_doc(path: Path, doc: dict) -> None:
    path.write_text(json.dumps(doc, indent=2))


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_sprite(name: str, sp: dict, n_palette: int) -> None:
    """Re-validate a sprite dict; raises SystemExit on any problem."""
    errors = []
    w, h = sp.get("w", 0), sp.get("h", 0)
    legend = sp.get("legend", {})
    rows = sp.get("rows", [])

    if len(rows) != h:
        errors.append(f"row count {len(rows)} != h={h}")
    for ch, idx in legend.items():
        if idx != -1 and not (0 <= idx < n_palette):
            errors.append(f"legend '{ch}' → {idx} out of palette range")
    for y, row in enumerate(rows):
        if len(row) != w:
            errors.append(f"row {y} width {len(row)} != w={w}")
        for ch in row:
            if ch not in legend:
                errors.append(f"row {y}: char '{ch}' not in legend")

    if errors:
        msg = "\n  ".join(errors)
        raise SystemExit(f"Validation FAILED for {name}:\n  {msg}")
    print(f"  validate {name}: PASS  ({w}×{h}, {len(legend)-1} colors)")


# ---------------------------------------------------------------------------
# Main import logic
# ---------------------------------------------------------------------------

def import_from_config(
    src: Path,
    sprite_id: str,        # e.g. "mon_sorcerer"  (no _a/_b suffix)
    dest: Path,
    w: int,
    h: int,
    rgb: list,
    allowed: list[int] | None,
    bg_indices: set[int],
    preview_scale: int | None,
    frame_effects: dict,   # {"b": ["eye_pulse"], "c": ["eye_pulse","eye_pulse"]}
    frame_regions: dict,   # {"eye": {...}, "torso": {...}}
    frame_ms: dict,        # {"a": 400, "b": 400, "c": 300}
) -> None:
    n_pal = len(rgb)

    print(f"Loading {src.name} → {sprite_id} ({w}×{h})")
    rows_idx = png_to_indices(src, w, h, rgb, allowed, bg_indices, preview_scale)

    # Build frame_a
    sprite_a, idx_to_sym = build_sprite(rows_idx, w, h)
    name_a = f"{sprite_id}_a"

    # Build derived frames
    derived: dict[str, dict] = {}
    for suffix, effects in sorted(frame_effects.items()):
        derived_idx = derive_frame(rows_idx, effects, w, h, frame_regions)
        # Re-use idx_to_sym, possibly extended for new brightened indices
        all_idxs = set(v for row in derived_idx for v in row if v != -1)
        extra = all_idxs - set(idx_to_sym)
        for new_idx in sorted(extra):
            free = next(
                s for s in SYMBOL_POOL if s not in set(idx_to_sym.values())
            )
            idx_to_sym[new_idx] = free

        # Rebuild legend from (possibly extended) idx_to_sym
        sp, _ = build_sprite(derived_idx, w, h, idx_to_sym)
        derived[f"{sprite_id}_{suffix}"] = sp

    # Merge into art doc
    doc = load_art_doc(dest)
    doc.setdefault("sprites", {})[name_a] = sprite_a
    for dname, dsp in derived.items():
        doc["sprites"][dname] = dsp

    # Build / update anim entry
    frame_names = [name_a] + [f"{sprite_id}_{s}" for s in sorted(frame_effects)]
    anim_ms = {name_a: frame_ms.get("a", 400)}
    for s in sorted(frame_effects):
        anim_ms[f"{sprite_id}_{s}"] = frame_ms.get(s, 400)

    if len(frame_names) > 1:
        doc.setdefault("anims", {})[sprite_id] = {
            "frames": [{"sprite": fn, "ms": anim_ms[fn]} for fn in frame_names]
        }
    else:
        # Single-frame sprites: ensure no stale anim; keep variants intact
        doc.setdefault("anims", {}).pop(sprite_id, None)

    # Ensure variants section exists (even if empty)
    doc.setdefault("variants", {})

    save_art_doc(dest, doc)
    print(f"Saved {dest.relative_to(REPO)}")

    # Validate written sprites
    reload = json.loads(dest.read_text())
    sp_map = reload.get("sprites", {})
    for sname in [name_a] + list(derived):
        if sname not in sp_map:
            raise SystemExit(f"BUG: {sname} not found after write")
        validate_sprite(sname, sp_map[sname], n_pal)


# ---------------------------------------------------------------------------
# Effects / region parsing helpers
# ---------------------------------------------------------------------------

def parse_effects(effects_strs: list[str]) -> dict:
    """Parse ['b:eye_pulse', 'b:breathe', 'c:eye_pulse'] → {'b': ['eye_pulse','breathe'], ...}"""
    result: dict[str, list[str]] = {}
    for s in effects_strs:
        if ":" not in s:
            raise SystemExit(f"--effects must be <frame>:<effect>, got '{s}'")
        suffix, eff = s.split(":", 1)
        result.setdefault(suffix, []).append(eff)
    return result


def parse_region(s: str) -> dict:
    """Parse 'x,y,w,h' string into region dict."""
    parts = [int(v) for v in s.split(",")]
    if len(parts) != 4:
        raise SystemExit(f"Region must be 'x,y,w,h', got '{s}'")
    return {"x": parts[0], "y": parts[1], "w": parts[2], "h": parts[3]}


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--manifest-entry", metavar="ID",
                    help="Read all config from gen-manifest.json entry with this id")
    ap.add_argument("--src",  help="Source crushed PNG")
    ap.add_argument("--id",   help="Sprite family id (e.g. mon_sorcerer)")
    ap.add_argument("--dest", help="Destination art JSON file")
    ap.add_argument("--w",    type=int, help="Target sprite width")
    ap.add_argument("--h",    type=int, help="Target sprite height")
    ap.add_argument("--allowed", help="Comma-sep allowed palette indices")
    ap.add_argument("--bg-indices", default="0,1",
                    help="Palette indices mapped to transparent (default: 0,1)")
    ap.add_argument("--preview-scale", type=int, default=None,
                    help="PNG is N× the sprite size (auto-detected if omitted)")
    ap.add_argument("--effects", action="append", default=[],
                    metavar="FRAME:EFFECT",
                    help="e.g. 'b:eye_pulse' — may be repeated")
    ap.add_argument("--eye-region",   help="x,y,w,h for eye_pulse")
    ap.add_argument("--torso-region", help="x,y,w,h for breathe")
    args = ap.parse_args()

    rgb = load_palette(PALETTE_PATH)
    n_pal = len(rgb)

    if args.manifest_entry:
        # --- Manifest mode ---
        if not MANIFEST_PATH.exists():
            raise SystemExit(f"Manifest not found: {MANIFEST_PATH}")
        manifest = json.loads(MANIFEST_PATH.read_text())
        entry = next((e for e in manifest["entries"] if e["id"] == args.manifest_entry), None)
        if entry is None:
            raise SystemExit(f"No manifest entry '{args.manifest_entry}'")

        if entry.get("chosen_seed") is None:
            raise SystemExit(
                f"Entry '{args.manifest_entry}' has no chosen_seed set. "
                f"Inspect candidates, set chosen_seed in the manifest, then re-run."
            )

        allowed = entry.get("allowed") or None
        tag = "full" if allowed is None else f"sub{len(allowed)}"
        seed = entry["chosen_seed"]
        src = PIXELART_DIR / "candidates" / f"{entry['id']}_s{seed}_{tag}.png"
        if not src.exists():
            raise SystemExit(f"Chosen candidate not found: {src}")

        sprite_id = entry["id"]
        dest = REPO / entry["art_file"]
        w, h = entry["dims"]
        bg_indices = set(entry.get("bg_indices", [0, 1]))
        frame_effects = entry.get("frame_effects", {})
        frame_regions = entry.get("frame_regions", {})
        frame_ms = entry.get("frame_ms", {"a": 400, "b": 400, "c": 300})
        preview_scale = args.preview_scale

    else:
        # --- Explicit mode ---
        missing = [f for f, v in [
            ("--src", args.src), ("--id", args.id), ("--dest", args.dest),
            ("--w", args.w),     ("--h", args.h),
        ] if not v]
        if missing:
            raise SystemExit(f"Explicit mode requires: {', '.join(missing)}")

        src = Path(args.src)
        sprite_id = args.id
        dest = Path(args.dest)
        w, h = args.w, args.h
        allowed = [int(x) for x in args.allowed.split(",")] if args.allowed else None
        bg_indices = {int(x) for x in args.bg_indices.split(",")}
        frame_effects = parse_effects(args.effects) if args.effects else {}
        frame_regions = {}
        if args.eye_region:
            frame_regions["eye"]   = parse_region(args.eye_region)
        if args.torso_region:
            frame_regions["torso"] = parse_region(args.torso_region)
        frame_ms = {"a": 400, "b": 400, "c": 300}
        preview_scale = args.preview_scale

    if not src.exists():
        raise SystemExit(f"Source PNG not found: {src}")

    if allowed is not None:
        from pixelcore import validate_allowed
        validate_allowed(allowed, n_pal)

    import_from_config(
        src=src,
        sprite_id=sprite_id,
        dest=dest,
        w=w, h=h,
        rgb=rgb,
        allowed=allowed,
        bg_indices=bg_indices,
        preview_scale=preview_scale,
        frame_effects=frame_effects,
        frame_regions=frame_regions,
        frame_ms=frame_ms,
    )

    # After import, update manifest status if in manifest mode
    if args.manifest_entry:
        manifest = json.loads(MANIFEST_PATH.read_text())
        for e in manifest["entries"]:
            if e["id"] == args.manifest_entry:
                e["status"] = "imported"
                break
        MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))
        print(f"Manifest: {args.manifest_entry} → status=imported")

    print("import_sprite: DONE")


if __name__ == "__main__":
    main()

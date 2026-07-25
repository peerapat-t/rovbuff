from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from models import PlayerItems

# ── Layout constants (calibrated for 2868×1320) ───────────────────────────────
_REF_W, _REF_H   = 2868, 1320
# Per-side slot geometry: (first slot x, slot box size, y offset).
# The red side renders its slots slightly larger and shifted, so each side
# carries its own calibration.
_SIDES           = [
    (703, 82, 0),    # blue team
    (1881, 84, 4),   # red team
]
_SLOT_PITCH      = 99     # distance between slot left edges
_SLOTS           = 6
_ROW_Y_CENTERS   = [369, 538, 707, 876, 1045]

_THUMB           = 64     # resize target for comparison
_CORR_THRESHOLD  = 0.40   # minimum correlation to accept a match
_BLANK_STD       = 30.0   # below this pixel std a slot is considered empty

_ICON_DIR = Path(__file__).resolve().parents[1] / "item_img"


def _normalize_channels(arr: np.ndarray) -> np.ndarray:
    """Z-score each RGB channel independently.

    Slot backgrounds are tinted by team color (blue vs purple); per-channel
    normalization cancels the tint so correlation reflects the icon artwork.
    """
    out = np.empty_like(arr)
    for c in range(3):
        ch = arr[..., c]
        std = ch.std()
        out[..., c] = (ch - ch.mean()) / (std if std > 1e-6 else 1.0)
    return out


def _to_unit_vector(arr: np.ndarray) -> np.ndarray:
    flat = _normalize_channels(arr).flatten()
    norm = float(np.linalg.norm(flat))
    return flat / (norm if norm > 1e-6 else 1.0)


def _load_icons() -> tuple[list[str], np.ndarray]:
    """Return icon names and a matrix of unit vectors (one row per icon)."""
    if not _ICON_DIR.exists():
        return [], np.empty((0, _THUMB * _THUMB * 3), dtype=np.float32)
    names: list[str] = []
    vectors: list[np.ndarray] = []
    for p in _ICON_DIR.iterdir():
        if p.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp"):
            continue
        try:
            arr = np.array(
                Image.open(p).convert("RGB").resize((_THUMB, _THUMB), Image.LANCZOS),
                dtype=np.float32,
            )
        except Exception:
            continue
        names.append(p.stem)
        vectors.append(_to_unit_vector(arr))
    if not names:
        return [], np.empty((0, _THUMB * _THUMB * 3), dtype=np.float32)
    return names, np.stack(vectors)


_ICON_NAMES, _ICON_MATRIX = _load_icons()


def _crop_slots(img: Image.Image) -> list[list[np.ndarray | None]]:
    """
    Return 10 player slot lists: blue rows 0-4 then red rows 5-9.
    Each list has 6 slot arrays (or None if out of bounds).
    Coordinates scale proportionally to handle any resolution.
    """
    w, h = img.size
    sx, sy = w / _REF_W, h / _REF_H

    result: list[list[np.ndarray | None]] = []
    for x_ref, size_ref, dy_ref in _SIDES:
        sw = int(size_ref * sx)
        sh = int(size_ref * sy)
        for yc_ref in _ROW_Y_CENTERS:
            yc = int((yc_ref + dy_ref) * sy)
            y1 = yc - sh // 2
            y2 = y1 + sh
            slots: list[np.ndarray | None] = []
            for s in range(_SLOTS):
                x1 = int((x_ref + s * _SLOT_PITCH) * sx)
                x2 = x1 + sw
                if x1 < 0 or y1 < 0 or x2 > w or y2 > h:
                    slots.append(None)
                    continue
                arr = np.array(
                    img.crop((x1, y1, x2, y2))
                    .convert("RGB")
                    .resize((_THUMB, _THUMB), Image.LANCZOS),
                    dtype=np.float32,
                )
                slots.append(arr)
            result.append(slots)
    return result


def _best_match(slot: np.ndarray) -> str | None:
    if not _ICON_NAMES:
        return None
    if slot.flatten().std() < _BLANK_STD:  # blank / empty slot
        return None
    scores = _ICON_MATRIX @ _to_unit_vector(slot)
    best_index = int(np.argmax(scores))
    if float(scores[best_index]) < _CORR_THRESHOLD:
        return None
    return _ICON_NAMES[best_index]


def extract_items(
    image_path: str,
    overview_players: list,
    confirmed_names: list[str],
) -> list[PlayerItems]:
    img = Image.open(image_path)
    slots_grid = _crop_slots(img)

    hero_map: dict[str, str] = {p.player_name: p.hero_name for p in overview_players}

    results: list[PlayerItems] = []
    for idx, slots in enumerate(slots_grid):
        name = confirmed_names[idx] if idx < len(confirmed_names) else f"Player {idx + 1}"
        items = [m for s in slots if s is not None for m in [_best_match(s)] if m]
        results.append(PlayerItems(
            player_name=name,
            hero_name=hero_map.get(name, ""),
            items_name_list=items,
        ))
    return results

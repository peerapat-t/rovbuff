"""Framework-agnostic extraction pipeline.

Holds the orchestration that turns 4 screenshots of one game into the 7
result tables, plus image archiving. Consumed by the FastAPI OCR backend
(api.py) so the extraction logic lives in exactly one place.
"""
from __future__ import annotations

import json as _json
import shutil
import uuid
from pathlib import Path

import pandas as pd
from openai import OpenAI

from extractors import (
    derive_side_mapping,
    extract_dmg,
    extract_game_data,
    extract_gold,
    extract_items,
    extract_oth_dmg,
    extract_overview,
)

APP_DIR = Path(__file__).resolve().parent
IMG_DB_ROOT = APP_DIR / "data" / "img_db"

# Page slot captions (index 0-3 → Page 1-4) and the ordered result-table keys.
PAGE_CAPTIONS = [
    "Overview (K/D/A, score, items)",
    "Damage to heroes / taken",
    "Gold / jungle / last hits",
    "Disable / heal / tower dmg",
]

CSV_NAMES = [
    "game_data_table.csv",
    "overview_data_table.csv",
    "item_list_table.csv",
    "side_mapping_table.csv",
    "dmg_table.csv",
    "gold_table.csv",
    "oth_dmg_table.csv",
]

TAB_LABELS = [
    "Game Info", "Overview", "Items", "Side Mapping",
    "Damage", "Gold", "Other Damage",
]


# ── Image staging and archiving ───────────────────────────────────────────────

def new_game_id() -> str:
    return uuid.uuid4().hex[:12]


def write_images_to_dir(img_dir: Path, images: list[tuple[str, bytes]]) -> list[str]:
    """Write the 4 page images (ordered Page 1-4) into ``img_dir``."""
    img_dir.mkdir(parents=True, exist_ok=False)
    image_paths: list[str] = []
    try:
        for idx, (name, data) in enumerate(images, start=1):
            ext = Path(name).suffix.lower() or ".png"
            dest = img_dir / f"img{idx:02d}{ext}"
            dest.write_bytes(data)
            image_paths.append(str(dest))
    except Exception:
        if img_dir.exists():
            shutil.rmtree(img_dir)
        raise

    return image_paths


def save_images(game_id: str, images: list[tuple[str, bytes]]) -> Path:
    """Archive the 4 page images (ordered Page 1-4) to data/img_db/<game_id>/."""
    img_dir = IMG_DB_ROOT / game_id
    write_images_to_dir(img_dir, images)
    return img_dir


def cleanup_image_dir(raw_path: str | Path) -> None:
    """Delete an unsaved image dir, guarding against paths outside img_db."""
    img_dir = Path(raw_path).resolve()
    try:
        img_dir.relative_to(IMG_DB_ROOT.resolve())
    except ValueError:
        return
    if img_dir.exists():
        shutil.rmtree(img_dir)


# ── DataFrame builders ──────────────────────────────────────────────────────

def build_all_dfs(game_id: str, extracted: dict) -> dict[str, pd.DataFrame]:
    gd = extracted["game_data"]

    df_game = pd.DataFrame([{
        "game_id": game_id,
        "name_duration": gd.name_duration,
        "datetime": gd.datetime,
        "is_victory": gd.is_victory,
        "blue_kills": gd.blue_kills,
        "red_kills": gd.red_kills,
    }])

    df_overview = pd.DataFrame([{
        "game_id": game_id,
        "player_name": p.player_name,
        "hero_name": p.hero_name,
        "fantasy_score": p.fantasy_score,
        "kill": p.kill,
        "death": p.death,
        "assist": p.assist,
        "golds": p.golds,
    } for p in extracted["overview"]])

    df_items = pd.DataFrame([{
        "game_id": game_id,
        "player_name": p.player_name,
        "hero_name": p.hero_name,
        "items_name_list": _json.dumps(p.items_name_list, ensure_ascii=False),
    } for p in extracted["items"]])

    df_side = pd.DataFrame([{
        "game_id": game_id,
        "player_name": p.player_name,
        "side_blue_or_red": p.side_blue_or_red,
    } for p in extracted["side_mapping"]])

    df_dmg = pd.DataFrame([{
        "game_id": game_id,
        "player_name": p.player_name,
        "hero_name": p.hero_name,
        "dmg_to_heroes": p.dmg_to_heroes,
        "dmg_taken": p.dmg_taken,
        "participation": p.participation,
    } for p in extracted["dmg"]])

    df_gold = pd.DataFrame([{
        "game_id": game_id,
        "player_name": p.player_name,
        "hero_name": p.hero_name,
        "gold_tol": p.gold_tol,
        "gold_jungle": p.gold_jungle,
        "last_hit": p.last_hit,
    } for p in extracted["gold"]])

    df_oth = pd.DataFrame([{
        "game_id": game_id,
        "player_name": p.player_name,
        "hero_name": p.hero_name,
        "dmg_disable": p.dmg_disable,
        "dmg_heal": p.dmg_heal,
        "dmg_to_tw": p.dmg_to_tw,
    } for p in extracted["oth_dmg"]])

    return {
        "game_data_table.csv": df_game,
        "overview_data_table.csv": df_overview,
        "item_list_table.csv": df_items,
        "side_mapping_table.csv": df_side,
        "dmg_table.csv": df_dmg,
        "gold_table.csv": df_gold,
        "oth_dmg_table.csv": df_oth,
    }


# ── Extraction orchestration ──────────────────────────────────────────────────

def extract_game(
    client: OpenAI,
    image_paths: list[str],
    player_hints: list[str],
) -> dict:
    """Run all extractors over the 4 page images (ordered Page 1-4)."""
    phase1 = [
        (0, extract_game_data, "game_data", "Page 1 → game_data_table"),
        (0, extract_overview, "overview", "Page 1 → overview_data_table"),
    ]
    phase2 = [
        (1, extract_dmg, "dmg", "Page 2 → dmg_table"),
        (2, extract_gold, "gold", "Page 3 → gold_table"),
        (3, extract_oth_dmg, "oth_dmg", "Page 4 → oth_dmg_table"),
    ]

    extracted: dict = {}

    for img_idx, fn, key, label in phase1:
        try:
            extracted[key] = fn(client, image_paths[img_idx], player_hints)
        except Exception as exc:
            raise RuntimeError(f"{label}: {exc}") from exc

    confirmed_names = [player.player_name for player in extracted["overview"]]

    # Sides come from overview row order (rows 1-5 blue, 6-10 red) — no LLM call.
    side_label = "Page 1 → side_mapping_table"
    try:
        extracted["side_mapping"] = derive_side_mapping(confirmed_names)
    except Exception as exc:
        raise RuntimeError(f"{side_label}: {exc}") from exc

    items_label = "Page 1 → item_list_table"
    try:
        extracted["items"] = extract_items(
            image_paths[0],
            overview_players=extracted["overview"],
            confirmed_names=confirmed_names,
        )
    except Exception as exc:
        raise RuntimeError(f"{items_label}: {exc}") from exc

    for img_idx, fn, key, label in phase2:
        try:
            extracted[key] = fn(
                client,
                image_paths[img_idx],
                confirmed_names=confirmed_names,
            )
        except Exception as exc:
            raise RuntimeError(f"{label}: {exc}") from exc

    return extracted


# ── JSON (de)serialization for the API review step ────────────────────────────

def dfs_to_tables(all_dfs: dict[str, pd.DataFrame]) -> dict[str, list[dict]]:
    """Convert the result DataFrames to JSON-serializable records, keyed by table id."""
    return {name: df.to_dict(orient="records") for name, df in all_dfs.items()}


def tables_to_dfs(tables: dict[str, list[dict]]) -> dict[str, pd.DataFrame]:
    """Rebuild the result DataFrames from JSON records (the reviewed/edited tables)."""
    return {name: pd.DataFrame(rows) for name, rows in tables.items()}

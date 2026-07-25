"""FastAPI API for RoV screenshot extraction and match persistence.

Run locally:
    uvicorn api:app --reload --port 8000
"""
from __future__ import annotations

import json
import hmac
import os
import re
import traceback
from pathlib import Path
from tempfile import TemporaryDirectory

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from openai import OpenAI
from pydantic import BaseModel

load_dotenv()

from db import (  # noqa: E402
    delete_game,
    get_all_records,
    get_game_owner,
    init_db,
    insert_game,
    rebuild_payoff,
)
from pipeline import (  # noqa: E402
    CSV_NAMES,
    IMG_DB_ROOT,
    PAGE_CAPTIONS,
    TAB_LABELS,
    build_all_dfs,
    cleanup_image_dir,
    dfs_to_tables,
    extract_game,
    new_game_id,
    save_images,
    tables_to_dfs,
    write_images_to_dir,
)

APP_DIR = Path(__file__).resolve().parent
CONFIG_DIR = APP_DIR / "config"
# Per-profile guides live here: config/player_guides/<username>.txt
PLAYER_GUIDES_DIR = CONFIG_DIR / "player_guides"

# Comma-separated list of allowed frontend origins (defaults to Next dev server).
ALLOWED_ORIGINS = os.getenv("ROVBUFF_FRONTEND_ORIGINS", "http://localhost:3000").split(",")
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")

app = FastAPI(title="RoVBuff OCR Extractor API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()


def require_internal_key(x_rovbuff_internal_key: str = Header(default="")) -> None:
    expected = os.getenv("ROVBUFF_INTERNAL_API_KEY", "dev-internal-key")
    if not x_rovbuff_internal_key or not hmac.compare_digest(x_rovbuff_internal_key, expected):
        raise HTTPException(status_code=401, detail="Invalid internal API key")


def _normalize_username(user: str) -> str:
    cleaned = (user or "").strip()
    if not USERNAME_RE.fullmatch(cleaned):
        raise HTTPException(status_code=400, detail="Invalid user")
    return cleaned


def _player_guide_path(user: str) -> Path:
    return PLAYER_GUIDES_DIR / f"{_normalize_username(user)}.txt"


def _parse_guide(path: Path) -> list[str]:
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    return [line.strip() for line in lines if line.strip() and not line.strip().startswith("#")]


def _load_player_hints(user: str) -> list[str]:
    """Load the signed-in user's guided in-game names."""
    return _parse_guide(_player_guide_path(user))


def _openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured on the server")
    return OpenAI(api_key=api_key)


async def _read_pages(pages: list[UploadFile]) -> list[tuple[str, bytes]]:
    return [(p.filename or f"page{i}.png", await p.read()) for i, p in enumerate(pages, 1)]


# ── Schemas ───────────────────────────────────────────────────────────────────

class TableMeta(BaseModel):
    keys: list[str]
    labels: list[str]
    captions: list[str]


class ExtractResponse(BaseModel):
    game_id: str
    tables: dict[str, list[dict]]
    meta: TableMeta


# ── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict:
    return {"ok": True, "openai": bool(os.getenv("OPENAI_API_KEY"))}


@app.get("/config/players")
def config_players(user: str, _auth: None = Depends(require_internal_key)) -> dict:
    """The user's guided player-name list (ground truth the model snaps reads to)."""
    return {"players": _load_player_hints(_normalize_username(user))}


class PlayersConfig(BaseModel):
    players: list[str]


@app.post("/config/players")
def save_config_players(
    user: str,
    cfg: PlayersConfig,
    _auth: None = Depends(require_internal_key),
) -> dict:
    """Persist the user's guided player-name list to its own profile file."""
    lines = [p.strip() for p in cfg.players if p.strip()]
    path = _player_guide_path(_normalize_username(user))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    return {"ok": True, "count": len(lines)}


@app.post("/extract", response_model=ExtractResponse)
async def extract(
    uploaded_by: str = Form(...),
    page1: UploadFile = File(...),
    page2: UploadFile = File(...),
    page3: UploadFile = File(...),
    page4: UploadFile = File(...),
    _auth: None = Depends(require_internal_key),
) -> ExtractResponse:
    uploaded_by = _normalize_username(uploaded_by)

    hints = _load_player_hints(uploaded_by)

    client = _openai_client()
    pages = [page1, page2, page3, page4]
    images = await _read_pages(pages)

    game_id = new_game_id()
    try:
        with TemporaryDirectory(prefix=f"rovbuff_{game_id}_") as tmp:
            image_paths = write_images_to_dir(Path(tmp) / game_id, images)
            extracted = extract_game(client, image_paths, hints)
            all_dfs = build_all_dfs(game_id, extracted)
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Extraction failed: {exc}") from exc

    return ExtractResponse(
        game_id=game_id,
        tables=dfs_to_tables(all_dfs),
        meta=TableMeta(keys=CSV_NAMES, labels=TAB_LABELS, captions=PAGE_CAPTIONS),
    )


@app.post("/save")
async def save(
    uploaded_by: str = Form(...),
    game_id: str = Form(...),
    tables: str = Form(...),
    page1: UploadFile = File(...),
    page2: UploadFile = File(...),
    page3: UploadFile = File(...),
    page4: UploadFile = File(...),
    _auth: None = Depends(require_internal_key),
) -> dict:
    uploaded_by = _normalize_username(uploaded_by)
    if not game_id.strip():
        raise HTTPException(status_code=400, detail="game_id is required")
    if get_game_owner(game_id) is not None:
        raise HTTPException(status_code=409, detail="Game is already saved")

    try:
        parsed_tables = json.loads(tables)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="tables must be valid JSON") from exc

    try:
        all_dfs = tables_to_dfs(parsed_tables)
        images = await _read_pages([page1, page2, page3, page4])
        img_dir = save_images(game_id, images)
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Save failed: {exc}") from exc

    try:
        insert_game(game_id, all_dfs, img_dir, uploaded_by)
    except Exception as exc:
        cleanup_image_dir(img_dir)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Save failed: {exc}") from exc

    try:
        rebuild_payoff()
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Save failed: {exc}") from exc

    return {"ok": True, "game_id": game_id}


@app.get("/history")
def history(user: str, _auth: None = Depends(require_internal_key)) -> list[dict]:
    user = _normalize_username(user)
    records = get_all_records(uploaded_by=user)
    for rec in records:
        # Resolve from the current archive root so records created before an app
        # folder rename do not keep pointing at an obsolete absolute path.
        img_dir = IMG_DB_ROOT / rec["game_id"]
        files = sorted(p.name for p in img_dir.glob("img*.*")) if img_dir.exists() else []
        rec["image_files"] = files
    return records


@app.delete("/games/{game_id}")
def remove_game(
    game_id: str,
    user: str,
    _auth: None = Depends(require_internal_key),
) -> dict:
    user = _normalize_username(user)
    owner = get_game_owner(game_id)
    if owner is None:
        raise HTTPException(status_code=404, detail="Game not found")
    if owner != user:
        raise HTTPException(status_code=403, detail="You can only delete your own games")
    delete_game(game_id)
    return {"ok": True}


@app.get("/images/{game_id}/{filename}")
def image(
    game_id: str,
    filename: str,
    user: str,
    _auth: None = Depends(require_internal_key),
) -> FileResponse:
    user = _normalize_username(user)
    owner = get_game_owner(game_id)
    if owner is None:
        raise HTTPException(status_code=404, detail="Game not found")
    if owner != user:
        raise HTTPException(status_code=403, detail="You can only view your own game images")

    # Resolve and confirm the path stays within the game's image folder.
    base = (IMG_DB_ROOT / game_id).resolve()
    target = (base / filename).resolve()
    try:
        target.relative_to(base)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")
    if not target.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(target)

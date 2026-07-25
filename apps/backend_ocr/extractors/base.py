from __future__ import annotations

import base64
import os
from pathlib import Path
from typing import TypeVar

from openai import OpenAI
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


_HERO_GUIDE_PATH = Path(__file__).resolve().parent.parent / "config" / "hero_name_guide.txt"


def _load_hero_catalog() -> list[str]:
    """Canonical hero names - the ground-truth list the model must snap reads to."""
    try:
        lines = _HERO_GUIDE_PATH.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        return []
    return [line.strip() for line in lines if line.strip() and not line.strip().startswith("#")]


def _build_hero_name_rules() -> str:
    heroes = _load_hero_catalog()
    catalog = "\n".join(f"  - {h}" for h in heroes)
    return f"""
Hero name rules - MANDATORY, override what the screen seems to spell:

Authoritative hero catalog (every hero_name you output MUST be one of these):
{catalog}

1. The catalog above is the source of truth. Hero-name text on the end-screen is small and
   frequently misread - always map what you see to the closest catalog entry.
2. Match loosely: ignore case and spacing; allow OCR errors (rn<->m, l<->I<->1, 0<->O, ii<->ri<->rr, vv<->w, etc.).
3. If a read resembles a catalog entry at all -> output EXACTLY the catalog spelling.
   (e.g. reads like "Tirro", "Tlorro", "Teero", "Toro" -> "Teeri"; "Ormar" -> "Ormarr".)
4. Pick the single best match; if two are close, choose the one with the most character overlap.
5. Only output a name absent from the catalog if it truly resembles none of them.
6. Special case: if a hero is shown or recognized as "text1878", output "Bijan".
"""


HERO_NAME_RULES = _build_hero_name_rules()


def _model_name(default: str = "gpt-4.1") -> str:
    model = os.getenv("MODEL_NAME", default).strip() or default
    return model.split(":", 1)[1] if model.startswith("openai:") else model


def _encode_image(path: str) -> tuple[str, str]:
    ext = Path(path).suffix.lower()
    media_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }
    media_type = media_map.get(ext, "image/jpeg")
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    return b64, media_type


def call_vision(
    client: OpenAI,
    image_path: str,
    prompt: str,
    response_model: type[T],
) -> T:
    """Vision request with Structured Outputs: the reply is parsed and
    validated directly into `response_model`."""
    b64, media_type = _encode_image(image_path)
    response = client.beta.chat.completions.parse(
        model=_model_name(),
        response_format=response_model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{b64}",
                            "detail": "high",
                        },
                    },
                ],
            }
        ],
        max_tokens=4096,
    )
    message = response.choices[0].message
    if message.parsed is None:
        raise RuntimeError(
            f"Model returned no structured output: {message.refusal or 'empty response'}"
        )
    return message.parsed



def build_player_hint_block(player_hints: list[str]) -> str:
    """Hint block used on page 1 (overview) when true names are not yet known."""
    if not player_hints:
        return ""
    lines = "\n".join(f'  - "{name}"' for name in player_hints)
    return f"""
CRITICAL — Pre-verified player name list (treat as ground truth):
{lines}

Player name rules — MANDATORY, override everything else:
1. The list above is the authoritative source. It is always more reliable than what you see on screen.
2. For EVERY player name you extract, first check if it matches any entry in the list.
   - Match loosely: ignore case, ignore special characters (_, -, ., spaces, unicode symbols).
   - Allow OCR errors: 0↔O, 1↔l↔I, rn↔m, vv↔w, etc.
3. If there is ANY reasonable match → output EXACTLY the spelling from the list. Do not use what the screen shows.
4. If two entries are similar, pick the one with the most character overlap.
5. ONLY use a name not from the list if it has absolutely no resemblance to any entry.
6. NEVER output a garbled, uncertain, or partially-read name when a list entry could be the answer.
"""


def build_confirmed_names_block(confirmed_names: list[str]) -> str:
    """Authoritative block used on pages 2-4 where names were already extracted from page 1."""
    if not confirmed_names:
        return ""
    lines = "\n".join(f'  {i+1}. "{name}"' for i, name in enumerate(confirmed_names))
    return f"""
MANDATORY — Confirmed player names (verified from page 1, character-perfect):
{lines}

Rules — NO EXCEPTIONS:
1. Every player_name field in your output MUST be copied CHARACTER FOR CHARACTER from the list above.
2. Do NOT read player names from the screen on this page — use only the list above.
3. Match each row you see to the closest name in the list (same position or visual similarity).
4. Do not add, remove, or change even a single character, space, or symbol.
5. If you are unsure which list entry matches a row, use position order (row 1 → entry 1, etc.).
"""

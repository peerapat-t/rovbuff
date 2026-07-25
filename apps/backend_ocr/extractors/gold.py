from __future__ import annotations

from openai import OpenAI

from models import GoldExtraction, PlayerGold
from extractors.base import (
    HERO_NAME_RULES,
    build_confirmed_names_block,
    call_vision,
)


PROMPT = """
You are extracting gold statistics from a ROV (Arena of Valor) game end-screen.
This tab shows: total gold earned, jungle gold, and last hits for all 10 players.

Field meanings:
- gold_tol: total gold earned
- gold_jungle: gold earned from jungle
- last_hit: number of minion last hits

Rules:
- Include all 10 players.
- Remove comma separators from large numbers.
"""


def extract_gold(
    client: OpenAI,
    image_path: str,
    confirmed_names: list[str],
) -> list[PlayerGold]:
    prompt = PROMPT + HERO_NAME_RULES + build_confirmed_names_block(confirmed_names)
    return call_vision(client, image_path, prompt, GoldExtraction).gold_list

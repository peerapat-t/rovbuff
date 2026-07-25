from __future__ import annotations

from openai import OpenAI

from models import OverviewExtraction, PlayerOverview
from extractors.base import HERO_NAME_RULES, call_vision, build_player_hint_block


PROMPT = """
You are extracting per-player overview stats from a ROV (Arena of Valor) end-screen overview page.
Focus ONLY on: player name, hero, fantasy score, kills, deaths, assists, and total gold.

Rules:
- Include all 10 players (5 blue + 5 red).
- CRITICAL — row order: list the blue team (left side) players top-to-bottom FIRST,
  then the red team (right side) players top-to-bottom. Positions 1-5 must be blue,
  positions 6-10 must be red. Never reorder rows; team sides are derived from this order.
- Remove comma separators (e.g. "12,345" → 12345).
"""


def extract_overview(
    client: OpenAI,
    image_path: str,
    player_hints: list[str] = [],
) -> list[PlayerOverview]:
    prompt = PROMPT + HERO_NAME_RULES + build_player_hint_block(player_hints)
    return call_vision(client, image_path, prompt, OverviewExtraction).overview_list

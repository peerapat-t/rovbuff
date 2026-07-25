from __future__ import annotations

from openai import OpenAI

from models import DmgExtraction, PlayerDmg
from extractors.base import (
    HERO_NAME_RULES,
    build_confirmed_names_block,
    call_vision,
)


PROMPT = """
You are extracting damage statistics from a ROV (Arena of Valor) game end-screen.
This tab shows: damage dealt to heroes, damage taken, and kill participation for all 10 players.

Field meanings:
- dmg_to_heroes: total damage dealt to heroes
- dmg_taken: total damage taken
- participation: kill participation as decimal float (e.g. 0.75 for 75%)

Rules:
- Include all 10 players.
- Convert participation percentage to decimal: 75% → 0.75.
- Remove comma separators from large numbers.
"""


def extract_dmg(
    client: OpenAI,
    image_path: str,
    confirmed_names: list[str],
) -> list[PlayerDmg]:
    prompt = PROMPT + HERO_NAME_RULES + build_confirmed_names_block(confirmed_names)
    return call_vision(client, image_path, prompt, DmgExtraction).dmg_list

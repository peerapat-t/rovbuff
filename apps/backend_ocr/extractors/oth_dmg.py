from __future__ import annotations

from openai import OpenAI

from models import OthDmgExtraction, PlayerOthDmg
from extractors.base import (
    HERO_NAME_RULES,
    build_confirmed_names_block,
    call_vision,
)


PROMPT = """
You are extracting special combat statistics from a ROV (Arena of Valor) game end-screen.
This tab shows: crowd-control/disable damage, healing done, and damage to towers for all 10 players.

Field meanings:
- dmg_disable: crowd-control / disable damage
- dmg_heal: total healing done
- dmg_to_tw: damage dealt to towers/structures

Rules:
- Include all 10 players.
- Remove comma separators from large numbers.
"""


def extract_oth_dmg(
    client: OpenAI,
    image_path: str,
    confirmed_names: list[str],
) -> list[PlayerOthDmg]:
    prompt = PROMPT + HERO_NAME_RULES + build_confirmed_names_block(confirmed_names)
    return call_vision(client, image_path, prompt, OthDmgExtraction).oth_dmg_list

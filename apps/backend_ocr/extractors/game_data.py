from __future__ import annotations

from openai import OpenAI

from models import GameData
from extractors.base import call_vision, build_player_hint_block


PROMPT = """
You are extracting game summary info from a ROV (Arena of Valor) end-screen overview page.
Focus ONLY on: game duration, date/time, whether "VICTORY" is shown, and total kills per side.

Field meanings:
- name_duration: game duration as MM:SS string
- datetime: date and time exactly as shown on screen
- is_victory: true if the word "VICTORY" is visibly shown in the screenshot (blue/left side won), false if "DEFEAT" is shown instead
- blue_kills: total kills by blue team
- red_kills: total kills by red team
"""


def extract_game_data(
    client: OpenAI,
    image_path: str,
    player_hints: list[str] = [],
) -> GameData:
    prompt = PROMPT + build_player_hint_block(player_hints)
    return call_vision(client, image_path, prompt, GameData)

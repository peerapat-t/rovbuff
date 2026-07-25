from __future__ import annotations

from pydantic import BaseModel, Field, field_validator
from typing import List


# ── Page 1 ────────────────────────────────────────────────────────────────────

class GameData(BaseModel):
    name_duration: str = Field(description="Game duration, e.g. '23:45'")
    datetime: str = Field(description="Date and time of the game")
    is_victory: bool
    blue_kills: int
    red_kills: int


class PlayerOverview(BaseModel):
    player_name: str
    hero_name: str
    fantasy_score: float
    kill: int
    death: int
    assist: int
    golds: int


class PlayerItems(BaseModel):
    player_name: str
    hero_name: str
    items_name_list: List[str]


class PlayerSide(BaseModel):
    player_name: str
    side_blue_or_red: str

    @field_validator("side_blue_or_red")
    def normalize_side(v: str) -> str:
        v = v.lower().strip()
        if v not in ("blue", "red"):
            raise ValueError(f"side must be 'blue' or 'red', got '{v}'")
        return v


# ── Page 2 ────────────────────────────────────────────────────────────────────

class PlayerDmg(BaseModel):
    player_name: str
    hero_name: str
    dmg_to_heroes: int
    dmg_taken: int
    participation: float  # stored as 0.0–1.0

    @field_validator("participation", mode="before")
    def parse_participation(v) -> float:
        if isinstance(v, str):
            val = float(v.strip().rstrip("%"))
            return val / 100 if val > 1 else val
        val = float(v)
        return val / 100 if val > 1 else val


# ── Page 3 ────────────────────────────────────────────────────────────────────

class PlayerGold(BaseModel):
    player_name: str
    hero_name: str
    gold_tol: int
    gold_jungle: int
    last_hit: int


# ── Page 4 ────────────────────────────────────────────────────────────────────

class PlayerOthDmg(BaseModel):
    player_name: str
    hero_name: str
    dmg_disable: int
    dmg_heal: int
    dmg_to_tw: int


# ── Structured Outputs response wrappers ─────────────────────────────────────

class OverviewExtraction(BaseModel):
    overview_list: List[PlayerOverview] = Field(
        description="All 10 players: blue team rows top-to-bottom first, then red team rows top-to-bottom"
    )


class DmgExtraction(BaseModel):
    dmg_list: List[PlayerDmg]


class GoldExtraction(BaseModel):
    gold_list: List[PlayerGold]


class OthDmgExtraction(BaseModel):
    oth_dmg_list: List[PlayerOthDmg]

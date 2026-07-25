from __future__ import annotations

from models import PlayerSide


def derive_side_mapping(confirmed_names: list[str]) -> list[PlayerSide]:
    """Derive team sides from overview row order.

    The overview extractor returns players in fixed on-screen order:
    rows 1-5 are the blue (left) team, rows 6-10 the red (right) team.
    """
    if len(confirmed_names) != 10:
        raise ValueError(
            f"Expected 10 confirmed player names, got {len(confirmed_names)}"
        )
    return [
        PlayerSide(
            player_name=name,
            side_blue_or_red="blue" if index < 5 else "red",
        )
        for index, name in enumerate(confirmed_names)
    ]

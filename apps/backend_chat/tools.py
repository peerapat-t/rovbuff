from __future__ import annotations

import json
from collections import defaultdict
from itertools import combinations
from typing import Any, Callable

from db import get_game_conn

RECENT_GAME_LIMIT = 50


def as_json(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False, default=str)


def _rows(sql: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
    with get_game_conn() as conn:
        return [dict(r) for r in conn.execute(sql, params).fetchall()]


def _one(sql: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
    with get_game_conn() as conn:
        row = conn.execute(sql, params).fetchone()
    return dict(row) if row else None


def _resolve_player_name(uploaded_by: str, player_name: str | None) -> str | None:
    cleaned = (player_name or "").strip()
    if not cleaned:
        return None
    row = _one(
        """
        SELECT o.player_name
          FROM overview_data o JOIN game_data g USING (game_id)
         WHERE g.uploaded_by = ? AND o.player_name = ? COLLATE NOCASE
         GROUP BY o.player_name
         ORDER BY COUNT(*) DESC
         LIMIT 1
        """,
        (uploaded_by, cleaned),
    )
    return str(row["player_name"]) if row else None


def _resolve_hero_name(uploaded_by: str, hero_name: str | None) -> str | None:
    cleaned = (hero_name or "").strip()
    if not cleaned:
        return None
    row = _one(
        """
        SELECT o.hero_name
          FROM overview_data o JOIN game_data g USING (game_id)
         WHERE g.uploaded_by = ? AND o.hero_name = ? COLLATE NOCASE
         GROUP BY o.hero_name
         ORDER BY COUNT(*) DESC
         LIMIT 1
        """,
        (uploaded_by, cleaned),
    )
    return str(row["hero_name"]) if row else None


def _player_candidates(
    uploaded_by: str,
    *,
    hero_name: str | None = None,
    limit: int = 10,
) -> list[dict[str, Any]]:
    clauses = ["g.uploaded_by = ?"]
    params: list[Any] = [uploaded_by]
    if hero_name:
        clauses.append("o.hero_name = ?")
        params.append(hero_name)
    params.append(max(1, min(limit, 30)))
    return _rows(
        f"""
        SELECT o.player_name, COUNT(*) games
          FROM overview_data o JOIN game_data g USING (game_id)
         WHERE {' AND '.join(clauses)}
         GROUP BY o.player_name
         ORDER BY games DESC, o.player_name
         LIMIT ?
        """,
        tuple(params),
    )


def _hero_candidates(uploaded_by: str, limit: int = 15) -> list[dict[str, Any]]:
    return _rows(
        """
        SELECT o.hero_name, COUNT(*) games
          FROM overview_data o JOIN game_data g USING (game_id)
         WHERE g.uploaded_by = ?
         GROUP BY o.hero_name
         ORDER BY games DESC, o.hero_name
         LIMIT ?
        """,
        (uploaded_by, max(1, min(limit, 40))),
    )


def _parse_items(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        return [str(x) for x in parsed if not str(x).startswith("Unknown")] if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        return []


def _split_matchups(
    rows: list[dict[str, Any]],
    *,
    limit: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    top_n = max(1, min(limit, 50))
    strong = sorted(
        (row for row in rows if float(row["win_rate"]) > 0.5),
        key=lambda row: (-row["win_rate"], -row["games"], row["enemy_hero"]),
    )[:top_n]
    weak = sorted(
        (row for row in rows if float(row["win_rate"]) < 0.5),
        key=lambda row: (row["win_rate"], -row["games"], row["enemy_hero"]),
    )[:top_n]
    neutral = sorted(
        (row for row in rows if float(row["win_rate"]) == 0.5),
        key=lambda row: (-row["games"], row["enemy_hero"]),
    )[:top_n]
    return strong, weak, neutral


def _duration_minutes(raw: str | None) -> float:
    try:
        parts = [float(part) for part in str(raw or "").split(":")]
    except ValueError:
        return 0.0
    if len(parts) == 2:
        return parts[0] + parts[1] / 60
    if len(parts) == 3:
        return parts[0] * 60 + parts[1] + parts[2] / 60
    return 0.0


def _detailed_rows(
    uploaded_by: str,
    *,
    player_name: str | None = None,
    hero_name: str | None = None,
    game_id: str | None = None,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    clauses = ["g.uploaded_by = ?"]
    params: list[Any] = [uploaded_by]
    if player_name:
        clauses.append("o.player_name = ?")
        params.append(player_name)
    if hero_name:
        clauses.append("o.hero_name = ?")
        params.append(hero_name)
    if game_id:
        clauses.append("o.game_id = ?")
        params.append(game_id)
    limit_sql = ""
    if limit is not None:
        limit_sql = "LIMIT ?"
        params.append(max(1, min(int(limit), 100)))
    rows = _rows(
        f"""
        SELECT o.game_id, g.datetime, g.name_duration, g.is_victory,
               g.blue_kills, g.red_kills,
               o.player_name, o.hero_name, s.side_blue_or_red side,
               o.fantasy_score, o.kill, o.death, o.assist, o.golds,
               d.dmg_to_heroes, d.dmg_taken, d.participation,
               gl.gold_tol, gl.gold_jungle, gl.last_hit,
               od.dmg_heal, od.dmg_disable, od.dmg_to_tw,
               il.items_name_list
          FROM overview_data o
          JOIN game_data g USING (game_id)
          JOIN side_mapping s USING (game_id, player_name)
          JOIN dmg d USING (game_id, player_name)
          JOIN gold gl USING (game_id, player_name)
          JOIN oth_dmg od USING (game_id, player_name)
          LEFT JOIN item_list il USING (game_id, player_name)
         WHERE {' AND '.join(clauses)}
         ORDER BY g.datetime DESC, o.game_id, s.side_blue_or_red, o.fantasy_score DESC
         {limit_sql}
        """,
        tuple(params),
    )
    for row in rows:
        row["result"] = (
            "win"
            if (row["side"] == "blue" and bool(row["is_victory"]))
            or (row["side"] == "red" and not bool(row["is_victory"]))
            else "loss"
        )
        row["kda"] = (
            row["kill"] + row["assist"]
            if not row["death"]
            else (row["kill"] + row["assist"]) / row["death"]
        )
        row["items"] = _parse_items(row.pop("items_name_list", None))
    return rows


def _average(rows: list[dict[str, Any]], key: str) -> float:
    return sum(float(row.get(key) or 0) for row in rows) / len(rows) if rows else 0.0


def _performance_stats(rows: list[dict[str, Any]]) -> dict[str, Any]:
    games = len(rows)
    wins = sum(row.get("result") == "win" for row in rows)
    avg_kills = _average(rows, "kill")
    avg_deaths = _average(rows, "death")
    avg_assists = _average(rows, "assist")
    gold_per_minute = [
        float(row.get("gold_tol") or 0) / minutes
        for row in rows
        if (minutes := _duration_minutes(row.get("name_duration"))) > 0
    ]
    win_minutes = [
        _duration_minutes(row.get("name_duration"))
        for row in rows
        if row.get("result") == "win" and _duration_minutes(row.get("name_duration")) > 0
    ]
    loss_minutes = [
        _duration_minutes(row.get("name_duration"))
        for row in rows
        if row.get("result") == "loss" and _duration_minutes(row.get("name_duration")) > 0
    ]
    return {
        "games": games,
        "wins": wins,
        "losses": games - wins,
        "win_rate": wins / games if games else 0.0,
        "avg_fantasy": _average(rows, "fantasy_score"),
        "avg_kills": avg_kills,
        "avg_deaths": avg_deaths,
        "avg_assists": avg_assists,
        "avg_kda": avg_kills + avg_assists if avg_deaths == 0 else (avg_kills + avg_assists) / avg_deaths,
        "avg_scoreboard_gold": _average(rows, "golds"),
        "avg_damage": _average(rows, "dmg_to_heroes"),
        "avg_damage_taken": _average(rows, "dmg_taken"),
        "avg_participation": _average(rows, "participation"),
        "avg_gold": _average(rows, "gold_tol"),
        "avg_jungle_gold": _average(rows, "gold_jungle"),
        "avg_last_hits": _average(rows, "last_hit"),
        "avg_healing": _average(rows, "dmg_heal"),
        "avg_disable": _average(rows, "dmg_disable"),
        "avg_tower": _average(rows, "dmg_to_tw"),
        "avg_gold_per_minute": sum(gold_per_minute) / len(gold_per_minute) if gold_per_minute else 0.0,
        "avg_win_duration_minutes": sum(win_minutes) / len(win_minutes) if win_minutes else 0.0,
        "avg_loss_duration_minutes": sum(loss_minutes) / len(loss_minutes) if loss_minutes else 0.0,
    }


def _likely_roles(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    role_rows = _rows("SELECT hero_name, possible_role_sorted FROM hero_role", ())
    role_map = {
        row["hero_name"]: [role.strip() for role in (row["possible_role_sorted"] or "").split(",") if role.strip()]
        for row in role_rows
    }
    scores: dict[str, float] = defaultdict(float)
    weights = (1.0, 0.6, 0.35)
    for row in rows:
        for index, role in enumerate(role_map.get(row["hero_name"], [])):
            scores[role] += weights[index] if index < len(weights) else 0.2
    total = sum(scores.values())
    return [
        {"role": role, "share": score / total if total else 0.0}
        for role, score in sorted(scores.items(), key=lambda item: (-item[1], item[0]))[:3]
    ]


def _daily_consistency(rows: list[dict[str, Any]]) -> dict[str, Any]:
    days: dict[str, dict[str, Any]] = {}
    for row in rows:
        raw = str(row.get("datetime") or "")
        date_key = raw[:10].replace("/", "-")
        if not date_key:
            continue
        day = days.setdefault(date_key, {"date": date_key, "games": 0, "wins": 0, "fantasy_total": 0.0})
        day["games"] += 1
        day["wins"] += int(row.get("result") == "win")
        day["fantasy_total"] += float(row.get("fantasy_score") or 0)
    values = []
    for day in days.values():
        values.append(
            {
                "date": day["date"],
                "games": day["games"],
                "wins": day["wins"],
                "losses": day["games"] - day["wins"],
                "win_rate": day["wins"] / day["games"],
                "avg_fantasy": day["fantasy_total"] / day["games"],
            }
        )
    values.sort(key=lambda day: day["date"])
    best = max(values, key=lambda day: (day["win_rate"], day["games"]), default=None)
    worst = min(values, key=lambda day: (day["win_rate"], -day["games"]), default=None)
    busiest = max(values, key=lambda day: (day["games"], day["win_rate"]), default=None)
    return {"days_played": len(values), "best_day": best, "toughest_day": worst, "busiest_day": busiest, "days": values}


def _hero_matchup_payload(
    uploaded_by: str,
    hero_name: str,
    *,
    limit: int = 10,
    min_games: int = 1,
) -> dict[str, Any]:
    rows = _rows(
        """
        SELECT enemy_hero, SUM(games_vs) games, SUM(wins_vs) wins,
               SUM(games_vs) - SUM(wins_vs) losses,
               CAST(SUM(wins_vs) AS REAL) / SUM(games_vs) win_rate
          FROM payoff
         WHERE uploaded_by = ? AND own_hero = ?
         GROUP BY enemy_hero
        HAVING SUM(games_vs) >= ?
        """,
        (uploaded_by, hero_name, max(1, min_games)),
    )
    strong, weak, neutral = _split_matchups(rows, limit=limit)
    return {
        "hero": hero_name,
        "strong_against": strong,
        "weak_against": weak,
        "neutral_matchups": neutral,
        "matchup_count": len(rows),
        "data_note": (
            "Aggregated from this uploader's match history across all team players. "
            "These are team-level opponent associations, not proven lane counters or causation."
        ),
    }


def make_feature_tools(uploaded_by: str) -> list[Callable[..., str]]:
    from langchain.tools import tool

    @tool
    def player_profile_tool(player_name: str | None = None) -> str:
        """Player Profile calculated from the player's 50 most recent games: combat/economy/utility averages, likely roles, match history, daily consistency, top heroes, durations, gold/min, and overall strong/weak matchups."""
        if not player_name:
            return as_json(
                {
                    "error": "in-game player_name is required; do not infer it from the login account",
                    "candidate_players": _player_candidates(uploaded_by),
                }
            )
        requested_player = player_name
        player_name = _resolve_player_name(uploaded_by, player_name)
        if not player_name:
            return as_json(
                {
                    "error": "in-game player not found",
                    "requested_player": requested_player,
                    "candidate_players": _player_candidates(uploaded_by),
                }
            )
        history = _detailed_rows(
            uploaded_by,
            player_name=player_name,
            limit=RECENT_GAME_LIMIT,
        )

        by_hero: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in history:
            by_hero[row["hero_name"]].append(row)
        top_heroes = [
            {"hero": hero, **_performance_stats(rows)}
            for hero, rows in by_hero.items()
        ]
        top_heroes.sort(key=lambda row: (-row["games"], -row["wins"], row["hero"]))

        payoff = _rows(
            """
            SELECT enemy_hero, games_vs games, wins_vs wins, losses_vs losses,
                   CAST(wins_vs AS REAL) / games_vs win_rate
              FROM payoff
             WHERE uploaded_by = ? AND player_name = ? AND own_hero = 'ALL'
             ORDER BY win_rate DESC, games DESC
            """,
            (uploaded_by, player_name),
        )
        strong, weak, neutral = _split_matchups(payoff, limit=5)
        return as_json(
            {
                "player": player_name,
                "history_scope": f"Latest {RECENT_GAME_LIMIT} games for this player",
                "stats": _performance_stats(history),
                "likely_roles": _likely_roles(history),
                "heroes_played": [row["hero"] for row in top_heroes],
                "top_heroes": top_heroes[:8],
                "match_history": history,
                "daily_consistency": _daily_consistency(history),
                "overall_matchups": {
                    "strong_against": strong,
                    "weak_against": weak,
                    "neutral_matchups": neutral,
                },
            }
        )

    @tool
    def player_stats_tool(sort_by: str = "avg_fantasy", limit: int = 10) -> str:
        """Player Stats page. Rank players by any visible metric: games, wins, win_rate, fantasy, KDA, kills/deaths/assists, damage/taken, participation, total/jungle gold, last hits, healing, disable, tower, or gold_per_minute."""
        rows = _detailed_rows(uploaded_by)
        by_player: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in rows:
            by_player[row["player_name"]].append(row)
        players = [
            {
                "player": player,
                "heroes_played": sorted({row["hero_name"] for row in history}),
                **_performance_stats(history),
            }
            for player, history in by_player.items()
        ]
        allowed = {
            "games", "wins", "win_rate", "avg_fantasy", "avg_kda", "avg_kills",
            "avg_deaths", "avg_assists", "avg_damage", "avg_damage_taken",
            "avg_participation", "avg_gold", "avg_jungle_gold", "avg_last_hits",
            "avg_healing", "avg_disable", "avg_tower", "avg_gold_per_minute",
        }
        key = sort_by if sort_by in allowed else "avg_fantasy"
        ascending = key == "avg_deaths"
        players.sort(key=lambda row: (row[key], row["games"], row["player"]), reverse=not ascending)
        return as_json({"sort_by": key, "players": players[:max(1, min(limit, 30))]})

    @tool
    def match_history_tool(
        player_name: str | None = None,
        hero_name: str | None = None,
        include_scoreboards: bool = False,
    ) -> str:
        """Practice History: the 50 most recent games, optionally filtered by player/hero. Returns matching per-game player history; set include_scoreboards=true to include each returned game's scoreboard and final items."""
        if player_name:
            requested_player = player_name
            player_name = _resolve_player_name(uploaded_by, player_name)
            if not player_name:
                return as_json(
                    {
                        "error": "in-game player not found",
                        "requested_player": requested_player,
                        "candidate_players": _player_candidates(uploaded_by),
                    }
                )
        if hero_name:
            requested_hero = hero_name
            hero_name = _resolve_hero_name(uploaded_by, hero_name)
            if not hero_name:
                return as_json(
                    {
                        "error": "hero not found in this uploader's history",
                        "requested_hero": requested_hero,
                        "candidate_heroes": _hero_candidates(uploaded_by),
                    }
                )
        clauses = ["g.uploaded_by = ?"]
        params: list[Any] = [uploaded_by]
        if player_name and hero_name:
            clauses.append(
                "EXISTS (SELECT 1 FROM overview_data ox WHERE ox.game_id = g.game_id AND ox.player_name = ? AND ox.hero_name = ?)"
            )
            params.extend((player_name, hero_name))
        elif player_name:
            clauses.append("EXISTS (SELECT 1 FROM overview_data ox WHERE ox.game_id = g.game_id AND ox.player_name = ?)")
            params.append(player_name)
        elif hero_name:
            clauses.append("EXISTS (SELECT 1 FROM overview_data oh WHERE oh.game_id = g.game_id AND oh.hero_name = ?)")
            params.append(hero_name)
        params.append(RECENT_GAME_LIMIT)
        rows = _rows(
            f"""
            SELECT g.game_id, g.datetime, g.name_duration, g.is_victory, g.blue_kills, g.red_kills,
                   GROUP_CONCAT(o.player_name || ':' || o.hero_name, ', ') players
              FROM game_data g
              JOIN overview_data o USING (game_id)
             WHERE {' AND '.join(clauses)}
             GROUP BY g.game_id
             ORDER BY g.datetime DESC, g.game_id DESC
             LIMIT ?
            """,
            tuple(params),
        )
        payload: dict[str, Any] = {
            "game_count": len(rows),
            "history_limit": RECENT_GAME_LIMIT,
            "games": rows,
        }
        if player_name:
            payload["player_history"] = _detailed_rows(
                uploaded_by,
                player_name=player_name,
                hero_name=hero_name,
                limit=RECENT_GAME_LIMIT,
            )
        if include_scoreboards:
            payload["scoreboards"] = {
                row["game_id"]: _detailed_rows(uploaded_by, game_id=row["game_id"])
                for row in rows
            }
        return as_json(payload)

    @tool
    def game_detail_tool(game_id: str) -> str:
        """Game Detail: scoreboard, damage/gold/heal/tower stats, items, MVP for one game_id."""
        game_id = (game_id or "").strip()
        game = _one("SELECT * FROM game_data WHERE game_id = ? AND uploaded_by = ?", (game_id, uploaded_by))
        if not game:
            recent = _rows(
                "SELECT game_id, datetime FROM game_data WHERE uploaded_by = ? ORDER BY datetime DESC LIMIT 10",
                (uploaded_by,),
            )
            return as_json({"error": "game not found", "requested_game_id": game_id, "recent_games": recent})
        players = _detailed_rows(uploaded_by, game_id=game_id)
        mvp = max(players, key=lambda p: p["fantasy_score"], default=None)
        return as_json({"game": game, "mvp": mvp, "players": players})

    @tool
    def all_heroes_tool(sort_by: str = "games", limit: int = 12) -> str:
        """Full All Heroes table: rank heroes by games, wins, win rate, fantasy, KDA/K/D/A, damage, participation, or gold; includes team players who used each hero."""
        history = _detailed_rows(uploaded_by)
        by_hero: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in history:
            by_hero[row["hero_name"]].append(row)
        heroes = [
            {
                "hero": hero,
                "players": sorted({row["player_name"] for row in rows}),
                **_performance_stats(rows),
            }
            for hero, rows in by_hero.items()
        ]
        allowed = {
            "games", "wins", "win_rate", "avg_fantasy", "avg_kda", "avg_kills",
            "avg_deaths", "avg_assists", "avg_damage", "avg_participation", "avg_gold",
        }
        key = sort_by if sort_by in allowed else "games"
        ascending = key == "avg_deaths"
        heroes.sort(key=lambda row: (row[key], row["games"], row["hero"]), reverse=not ascending)
        return as_json({"sort_by": key, "heroes": heroes[:max(1, min(limit, 40))]})

    @tool
    def hero_detail_tool(hero_name: str) -> str:
        """Complete Hero Detail page: roles, meta, best team players, common final builds, and strong/weak matchups."""
        requested_hero = hero_name
        hero_name = _resolve_hero_name(uploaded_by, hero_name)
        if not hero_name:
            return as_json(
                {
                    "error": "hero not found in this uploader's history",
                    "requested_hero": requested_hero,
                    "candidate_heroes": _hero_candidates(uploaded_by),
                }
            )
        history = _detailed_rows(uploaded_by, hero_name=hero_name)
        role = _one("SELECT possible_role_sorted FROM hero_role WHERE hero_name = ?", (hero_name,))
        roles = [value.strip() for value in (role["possible_role_sorted"] if role else "").split(",") if value.strip()]

        by_player: dict[str, list[dict[str, Any]]] = defaultdict(list)
        build_map: dict[tuple[str, ...], dict[str, Any]] = {}
        for row in history:
            by_player[row["player_name"]].append(row)
            build = tuple(row["items"])
            entry = build_map.setdefault(build, {"items": list(build), "games": 0, "wins": 0})
            entry["games"] += 1
            entry["wins"] += int(row["result"] == "win")

        players = []
        for player, rows in by_player.items():
            stats = _performance_stats(rows)
            players.append(
                {
                    "player": player,
                    "games": stats["games"],
                    "wins": stats["wins"],
                    "losses": stats["losses"],
                    "win_rate": stats["wins"] / stats["games"] if stats["games"] else 0.0,
                    "avg_fantasy": stats["avg_fantasy"],
                }
            )
        players.sort(key=lambda row: (-row["games"], -row["win_rate"], -row["avg_fantasy"]))

        builds = []
        for entry in build_map.values():
            entry["losses"] = entry["games"] - entry["wins"]
            entry["win_rate"] = entry["wins"] / entry["games"] if entry["games"] else 0.0
            builds.append(entry)
        builds.sort(key=lambda row: (-row["games"], -row["wins"], row["items"]))

        matchups = _rows(
            """
            SELECT enemy_hero, SUM(games_vs) games, SUM(wins_vs) wins,
                   SUM(games_vs) - SUM(wins_vs) losses,
                   CAST(SUM(wins_vs) AS REAL) / SUM(games_vs) win_rate
              FROM payoff
             WHERE uploaded_by = ? AND own_hero = ?
             GROUP BY enemy_hero
            """,
            (uploaded_by, hero_name),
        )
        strong, weak, neutral = _split_matchups(matchups, limit=8)
        return as_json(
            {
                "hero": hero_name,
                "roles": roles,
                "meta": _performance_stats(history),
                "best_players": players[:8],
                "common_final_builds": builds[:8],
                "matchups": {
                    "strong_against": strong,
                    "weak_against": weak,
                    "neutral_matchups": neutral,
                    "all": matchups,
                },
                "limitations": "Builds are final loadouts; item timing/order is unavailable. Matchups are team-level co-occurrence.",
            }
        )

    @tool
    def draft_helper_tool(enemy_heroes_csv: str, min_games: int = 1) -> str:
        """Complete Draft Helper: recommend own heroes against selected enemy lineup with aggregate win rate, coverage, games, and per-enemy matchup breakdown. enemy_heroes_csv is comma-separated."""
        min_games = max(1, int(min_games))
        requested = [h.strip() for h in (enemy_heroes_csv or "").split(",") if h.strip()][:5]
        enemies: list[str] = []
        unknown_heroes: list[str] = []
        for value in requested:
            resolved = _resolve_hero_name(uploaded_by, value)
            if resolved and resolved not in enemies:
                enemies.append(resolved)
            elif not resolved:
                unknown_heroes.append(value)
        if not enemies:
            return as_json(
                {
                    "error": "no known enemy heroes provided",
                    "unknown_heroes": unknown_heroes,
                    "candidate_heroes": _hero_candidates(uploaded_by),
                }
            )
        placeholders = ",".join("?" for _ in enemies)
        rows = _rows(
            f"""
            SELECT own_hero, SUM(games_vs) games, SUM(wins_vs) wins,
                   COUNT(DISTINCT enemy_hero) coverage,
                   CAST(SUM(wins_vs) AS REAL) / SUM(games_vs) win_rate
              FROM payoff
             WHERE uploaded_by = ? AND own_hero <> 'ALL' AND enemy_hero IN ({placeholders})
             GROUP BY own_hero
            HAVING games >= ? AND own_hero NOT IN ({placeholders})
             ORDER BY win_rate DESC, coverage DESC, games DESC
             LIMIT 12
            """,
            tuple([uploaded_by, *enemies, min_games, *enemies]),
        )
        own_heroes = [row["own_hero"] for row in rows]
        breakdown: dict[str, list[dict[str, Any]]] = defaultdict(list)
        if own_heroes:
            own_marks = ",".join("?" for _ in own_heroes)
            enemy_marks = ",".join("?" for _ in enemies)
            detail_rows = _rows(
                f"""
                SELECT own_hero, enemy_hero, SUM(games_vs) games, SUM(wins_vs) wins,
                       SUM(games_vs) - SUM(wins_vs) losses,
                       CAST(SUM(wins_vs) AS REAL) / SUM(games_vs) win_rate
                  FROM payoff
                 WHERE uploaded_by = ?
                   AND own_hero IN ({own_marks})
                   AND enemy_hero IN ({enemy_marks})
                 GROUP BY own_hero, enemy_hero
                """,
                (uploaded_by, *own_heroes, *enemies),
            )
            for detail in detail_rows:
                breakdown[detail["own_hero"]].append(detail)
        for row in rows:
            row["per_enemy"] = sorted(
                breakdown.get(row["own_hero"], []),
                key=lambda detail: enemies.index(detail["enemy_hero"]),
            )
        return as_json(
            {
                "enemy_heroes": enemies,
                "unknown_heroes": unknown_heroes,
                "min_games": min_games,
                "recommendations": rows,
            }
        )

    @tool
    def player_combo_tool(group_size: int = 2, min_games: int = 1, player_name: str | None = None) -> str:
        """Player Combo page: player combinations that win together. Use group_size 2, 3, or 5; optionally require one player. Returns games/W/L/win rate."""
        try:
            group_size = int(group_size)
        except (TypeError, ValueError):
            return as_json({"error": "group_size must be 2, 3, or 5"})
        if group_size not in (2, 3, 5):
            return as_json({"error": "group_size must be 2, 3, or 5", "requested_group_size": group_size})
        min_games = max(1, int(min_games))
        if player_name:
            requested_player = player_name
            player_name = _resolve_player_name(uploaded_by, player_name)
            if not player_name:
                return as_json(
                    {
                        "error": "in-game player not found",
                        "requested_player": requested_player,
                        "candidate_players": _player_candidates(uploaded_by),
                    }
                )
        rows = _rows(
            """
            SELECT sm.game_id, sm.side_blue_or_red side, sm.player_name,
                   CASE WHEN (sm.side_blue_or_red='blue' AND g.is_victory=1)
                          OR (sm.side_blue_or_red='red' AND g.is_victory=0)
                        THEN 1 ELSE 0 END won
              FROM side_mapping sm JOIN game_data g USING (game_id)
             WHERE g.uploaded_by = ?
             ORDER BY sm.game_id, sm.side_blue_or_red, sm.player_name
            """,
            (uploaded_by,),
        )
        teams: dict[str, dict[str, Any]] = {}
        for row in rows:
            key = f"{row['game_id']}::{row['side']}"
            entry = teams.setdefault(key, {"players": [], "won": bool(row["won"])})
            entry["players"].append(row["player_name"])
        from itertools import combinations
        agg: dict[tuple[str, ...], dict[str, Any]] = {}
        for team in teams.values():
            for combo in combinations(sorted(set(team["players"])), group_size):
                if player_name and player_name not in combo:
                    continue
                entry = agg.setdefault(combo, {"players": combo, "games": 0, "wins": 0})
                entry["games"] += 1
                entry["wins"] += 1 if team["won"] else 0
        out = [
            {
                **v,
                "losses": v["games"] - v["wins"],
                "win_rate": v["wins"] / v["games"],
            }
            for v in agg.values()
            if v["games"] >= min_games
        ]
        out.sort(key=lambda x: (-x["win_rate"], -x["games"]))
        return as_json({"group_size": group_size, "groups": out[:20]})

    @tool
    def hero_combo_tool(group_size: int = 2, min_games: int = 1, hero_name: str | None = None) -> str:
        """Hero Combo page: hero combinations of size 2, 3, or 5 that win together; optionally require one hero. Returns games/W/L/win rate."""
        try:
            group_size = int(group_size)
        except (TypeError, ValueError):
            return as_json({"error": "group_size must be 2, 3, or 5"})
        if group_size not in (2, 3, 5):
            return as_json({"error": "group_size must be 2, 3, or 5", "requested_group_size": group_size})
        min_games = max(1, int(min_games))
        if hero_name:
            requested_hero = hero_name
            hero_name = _resolve_hero_name(uploaded_by, hero_name)
            if not hero_name:
                return as_json(
                    {
                        "error": "hero not found in this uploader's history",
                        "requested_hero": requested_hero,
                        "candidate_heroes": _hero_candidates(uploaded_by),
                    }
                )
        rows = _rows(
            """
            SELECT o.game_id, s.side_blue_or_red side, o.hero_name,
                   CASE WHEN (s.side_blue_or_red='blue' AND g.is_victory=1)
                          OR (s.side_blue_or_red='red' AND g.is_victory=0)
                        THEN 1 ELSE 0 END won
              FROM overview_data o
              JOIN side_mapping s USING (game_id, player_name)
              JOIN game_data g USING (game_id)
             WHERE g.uploaded_by = ?
            """,
            (uploaded_by,),
        )
        teams: dict[str, dict[str, Any]] = {}
        for row in rows:
            key = f"{row['game_id']}::{row['side']}"
            entry = teams.setdefault(key, {"heroes": [], "won": bool(row["won"])})
            entry["heroes"].append(row["hero_name"])
        agg: dict[tuple[str, ...], dict[str, Any]] = {}
        for team in teams.values():
            for combo in combinations(sorted(set(team["heroes"])), group_size):
                if hero_name and hero_name not in combo:
                    continue
                entry = agg.setdefault(combo, {"heroes": combo, "games": 0, "wins": 0})
                entry["games"] += 1
                entry["wins"] += 1 if team["won"] else 0
        out = [
            {
                **v,
                "losses": v["games"] - v["wins"],
                "win_rate": v["wins"] / v["games"],
            }
            for v in agg.values()
            if v["games"] >= min_games
        ]
        out.sort(key=lambda x: (-x["win_rate"], -x["games"]))
        return as_json({"group_size": group_size, "groups": out[:20]})

    @tool
    def hero_matchup_tool(hero_name: str, limit: int = 10, min_games: int = 1) -> str:
        """Hero matchup history without needing a player name. Use for questions like 'Violet ชนะทางตัวไหน'. Returns strong/weak enemy heroes with raw win rates and game counts."""
        requested_hero = hero_name
        hero_name = _resolve_hero_name(uploaded_by, hero_name)
        if not hero_name:
            return as_json(
                {
                    "error": "hero not found in this uploader's history",
                    "requested_hero": requested_hero,
                    "candidate_heroes": _hero_candidates(uploaded_by),
                }
            )
        return as_json(
            _hero_matchup_payload(
                uploaded_by,
                hero_name,
                limit=limit,
                min_games=min_games,
            )
        )

    @tool
    def player_matchup_tool(player_name: str, own_hero: str = "ALL", limit: int = 10) -> str:
        """Player Matchup Payoff page: strong/weak enemy heroes for one player, either across ALL heroes or filtered to a specific own_hero, with games/W/L and win rate."""
        if (own_hero or "").strip().upper() == "ALL":
            own_hero = "ALL"
        else:
            requested_hero = own_hero
            own_hero = _resolve_hero_name(uploaded_by, own_hero)
            if not own_hero:
                return as_json(
                    {
                        "error": "hero not found in this uploader's history",
                        "requested_hero": requested_hero,
                        "candidate_heroes": _hero_candidates(uploaded_by),
                    }
                )
        requested_player = player_name
        player_name = _resolve_player_name(uploaded_by, player_name)
        if not player_name:
            payload: dict[str, Any] = {
                "error": "in-game player not found; login display names are not player names",
                "requested_player": requested_player,
                "candidate_players": _player_candidates(
                    uploaded_by,
                    hero_name=None if own_hero == "ALL" else own_hero,
                ),
            }
            if own_hero != "ALL":
                payload["team_hero_matchup_fallback"] = _hero_matchup_payload(
                    uploaded_by, own_hero, limit=limit
                )
            return as_json(payload)
        rows = _rows(
            """
            SELECT enemy_hero, games_vs games, wins_vs wins, losses_vs losses,
                   CAST(wins_vs AS REAL) / games_vs win_rate
              FROM payoff
             WHERE uploaded_by = ? AND player_name = ? AND own_hero = ?
            """,
            (uploaded_by, player_name, own_hero),
        )
        strong, weak, neutral = _split_matchups(rows, limit=limit)
        payload = {
            "player": player_name,
            "own_hero": own_hero,
            "strong_against": strong,
            "weak_against": weak,
            "neutral_matchups": neutral,
            "data_note": "Team-level opponent co-occurrence, not a proven lane counter.",
        }
        if not rows and own_hero != "ALL":
            payload["team_hero_matchup_fallback"] = _hero_matchup_payload(
                uploaded_by, own_hero, limit=limit
            )
        return as_json(payload)

    @tool
    def daily_consistency_tool(player_name: str) -> str:
        """Daily Consistency heatmap data for one player: every played day plus days played, best, toughest, and busiest day."""
        requested_player = player_name
        player_name = _resolve_player_name(uploaded_by, player_name)
        if not player_name:
            return as_json(
                {
                    "error": "in-game player not found",
                    "requested_player": requested_player,
                    "candidate_players": _player_candidates(uploaded_by),
                }
            )
        history = _detailed_rows(uploaded_by, player_name=player_name)
        return as_json({"player": player_name, **_daily_consistency(history)})

    @tool
    def player_comparison_tool(player_a: str, player_b: str) -> str:
        """Full Player Comparison page: compare combat, economy, KDA, utility, fantasy/W-L, likely roles, and normalized performance radar for two players."""
        requested_a, requested_b = player_a, player_b
        player_a = _resolve_player_name(uploaded_by, player_a)
        player_b = _resolve_player_name(uploaded_by, player_b)
        if not player_a or not player_b:
            return as_json(
                {
                    "error": "one or both in-game players not found",
                    "requested_player_a": requested_a,
                    "requested_player_b": requested_b,
                    "resolved_player_a": player_a,
                    "resolved_player_b": player_b,
                    "candidate_players": _player_candidates(uploaded_by),
                }
            )
        all_rows = _detailed_rows(uploaded_by)
        by_player: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in all_rows:
            by_player[row["player_name"]].append(row)
        all_stats = {player: _performance_stats(rows) for player, rows in by_player.items()}

        radar_keys = {
            "KDA": "avg_kda",
            "Damage": "avg_damage",
            "Gold": "avg_gold",
            "Healing": "avg_healing",
            "Disable": "avg_disable",
            "Tower": "avg_tower",
        }

        def profile(player: str) -> dict[str, Any]:
            stats = all_stats[player]
            radar = {}
            for label, key in radar_keys.items():
                maximum = max(float(candidate[key]) for candidate in all_stats.values())
                radar[label] = round(float(stats[key]) / maximum * 100) if maximum > 0 else 0
            return {
                "player": player,
                "stats": stats,
                "likely_roles": _likely_roles(by_player[player]),
                "heroes_played": sorted({row["hero_name"] for row in by_player[player]}),
                "radar_relative_to_roster": radar,
            }

        return as_json(
            {
                "player_a": profile(player_a),
                "player_b": profile(player_b),
                "metric_groups": {
                    "combat": ["avg_damage", "avg_damage_taken", "avg_participation"],
                    "economy": ["avg_gold", "avg_jungle_gold", "avg_last_hits", "avg_gold_per_minute"],
                    "kda": ["avg_kda", "avg_kills", "avg_deaths", "avg_assists"],
                    "utility": ["avg_healing", "avg_disable", "avg_tower"],
                },
                "note": "Cross-role comparisons are directional unless roles and hero selections are similar.",
            }
        )

    @tool
    def search_tool(query: str, limit: int = 8) -> str:
        """Global search: find players, heroes, game IDs, and app pages."""
        query = (query or "").strip()
        if not query:
            return as_json({"error": "search query is required"})
        limit = max(1, min(int(limit), 30))
        q = f"%{query}%"
        players = _rows(
            """
            SELECT o.player_name label, 'player' type, COUNT(*) games
              FROM overview_data o JOIN game_data g USING (game_id)
             WHERE g.uploaded_by = ? AND o.player_name LIKE ?
             GROUP BY o.player_name
             LIMIT ?
            """,
            (uploaded_by, q, limit),
        )
        heroes = _rows(
            """
            SELECT o.hero_name label, 'hero' type, COUNT(*) games
              FROM overview_data o JOIN game_data g USING (game_id)
             WHERE g.uploaded_by = ? AND o.hero_name LIKE ?
             GROUP BY o.hero_name
             LIMIT ?
            """,
            (uploaded_by, q, limit),
        )
        games = _rows(
            """
            SELECT game_id label, 'game' type, datetime
              FROM game_data
             WHERE uploaded_by = ? AND game_id LIKE ?
             LIMIT ?
            """,
            (uploaded_by, q, limit),
        )
        pages = [
            {"label": "Player Stats", "type": "page", "href": "/player-stats"},
            {"label": "Match History", "type": "page", "href": "/match-history"},
            {"label": "All Heroes", "type": "page", "href": "/all-heroes"},
            {"label": "Player Combo", "type": "page", "href": "/player-combo"},
            {"label": "Hero Combo", "type": "page", "href": "/hero-combo"},
            {"label": "Draft Helper", "type": "page", "href": "/draft-helper"},
            {"label": "Player Comparison", "type": "page", "href": "/player-comparison"},
            {"label": "Coach Chat", "type": "page", "href": "/coach-chat"},
        ]
        page_hits = [p for p in pages if query.lower() in p["label"].lower()]
        return as_json({"players": players, "heroes": heroes, "games": games, "pages": page_hits})

    return [
        player_profile_tool,
        player_stats_tool,
        match_history_tool,
        game_detail_tool,
        all_heroes_tool,
        hero_detail_tool,
        draft_helper_tool,
        player_combo_tool,
        hero_combo_tool,
        hero_matchup_tool,
        player_matchup_tool,
        daily_consistency_tool,
        player_comparison_tool,
        search_tool,
    ]

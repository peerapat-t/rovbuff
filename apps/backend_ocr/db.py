from __future__ import annotations

import shutil
import sqlite3
import os
from datetime import datetime
from pathlib import Path

import pandas as pd

APP_DIR = Path(__file__).resolve().parent
REPO_ROOT = APP_DIR.parent.parent
DATA_DIR = APP_DIR / "data"
IMG_DB_ROOT = DATA_DIR / "img_db"
DEFAULT_DB_PATH = DATA_DIR / "rovbuff.db"
DB_ENV_VAR = "ROVBUFF_DB_PATH"

# Required owner for any unscoped match rows found during schema validation.
UNSCOPED_OWNER = os.getenv("ROVBUFF_LEGACY_OWNER", "admin")

_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS game_data (
    game_id       TEXT PRIMARY KEY,
    name_duration TEXT,
    datetime      TEXT,
    is_victory    INTEGER,
    blue_kills    INTEGER,
    red_kills     INTEGER,
    uploaded_by   TEXT
);
CREATE TABLE IF NOT EXISTS overview_data (
    game_id       TEXT,
    player_name   TEXT,
    hero_name     TEXT,
    fantasy_score REAL,
    kill          INTEGER,
    death         INTEGER,
    assist        INTEGER,
    golds         INTEGER,
    PRIMARY KEY (game_id, player_name)
);
CREATE TABLE IF NOT EXISTS item_list (
    game_id         TEXT,
    player_name     TEXT,
    hero_name       TEXT,
    items_name_list TEXT,
    PRIMARY KEY (game_id, player_name)
);
CREATE TABLE IF NOT EXISTS side_mapping (
    game_id          TEXT,
    player_name      TEXT,
    side_blue_or_red TEXT,
    PRIMARY KEY (game_id, player_name)
);
CREATE TABLE IF NOT EXISTS dmg (
    game_id       TEXT,
    player_name   TEXT,
    hero_name     TEXT,
    dmg_to_heroes INTEGER,
    dmg_taken     INTEGER,
    participation REAL,
    PRIMARY KEY (game_id, player_name)
);
CREATE TABLE IF NOT EXISTS gold (
    game_id     TEXT,
    player_name TEXT,
    hero_name   TEXT,
    gold_tol    INTEGER,
    gold_jungle INTEGER,
    last_hit    INTEGER,
    PRIMARY KEY (game_id, player_name)
);
CREATE TABLE IF NOT EXISTS oth_dmg (
    game_id     TEXT,
    player_name TEXT,
    hero_name   TEXT,
    dmg_disable INTEGER,
    dmg_heal    INTEGER,
    dmg_to_tw   INTEGER,
    PRIMARY KEY (game_id, player_name)
);
CREATE TABLE IF NOT EXISTS payoff (
    uploaded_by  TEXT,
    player_name  TEXT,
    own_hero     TEXT,
    enemy_hero   TEXT,
    games_vs     INTEGER,
    wins_vs      INTEGER,
    losses_vs    INTEGER,
    win_pct_vs   REAL,
    loss_pct_vs  REAL,
    PRIMARY KEY (uploaded_by, player_name, own_hero, enemy_hero)
);
CREATE TABLE IF NOT EXISTS hero_role (
    hero_name            TEXT PRIMARY KEY,
    possible_role_sorted TEXT
);
CREATE TABLE IF NOT EXISTS records (
    game_id          TEXT PRIMARY KEY,
    date_data_record TEXT,
    img_db_loc       TEXT
);
"""


def resolve_db_path() -> Path:
    raw = os.getenv(DB_ENV_VAR)
    if not raw:
        return DEFAULT_DB_PATH
    path = Path(raw).expanduser()
    if not path.is_absolute():
        # Relative overrides are resolved from the OCR backend app dir, matching
        # the default location (apps/backend_ocr/data/).
        path = APP_DIR.joinpath(path)
    return path.resolve()


DB_PATH = resolve_db_path()


def _resolve_img_path(raw_path: str) -> Path | None:
    if not raw_path:
        return None
    path = Path(raw_path).expanduser()
    if not path.is_absolute():
        path = REPO_ROOT.joinpath(path)
    return path.resolve()


def _is_within_dir(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def _delete_img_dir(raw_path: str) -> None:
    img_path = _resolve_img_path(raw_path)
    if img_path is None or not img_path.exists():
        return

    img_root = IMG_DB_ROOT.resolve()
    if not _is_within_dir(img_path, img_root):
        raise ValueError(f"Refusing to delete image path outside img_db root: {img_path}")

    shutil.rmtree(img_path)


def _write_game_tables(
    conn: sqlite3.Connection,
    game_id: str,
    all_dfs: dict[str, pd.DataFrame],
    recorded_at: str,
    img_dir: Path,
    uploaded_by: str,
) -> None:
    df = all_dfs["game_data_table.csv"]
    r = df.iloc[0]
    conn.execute(
        "INSERT OR REPLACE INTO game_data VALUES (?,?,?,?,?,?,?)",
        (game_id, r["name_duration"], r["datetime"],
         int(bool(r["is_victory"])), int(r["blue_kills"]), int(r["red_kills"]),
         uploaded_by),
    )

    for _, row in all_dfs["overview_data_table.csv"].iterrows():
        conn.execute(
            "INSERT OR REPLACE INTO overview_data VALUES (?,?,?,?,?,?,?,?)",
            (game_id, row["player_name"], row["hero_name"],
             float(row["fantasy_score"]), int(row["kill"]),
             int(row["death"]), int(row["assist"]), int(row["golds"])),
        )

    for _, row in all_dfs["item_list_table.csv"].iterrows():
        conn.execute(
            "INSERT OR REPLACE INTO item_list VALUES (?,?,?,?)",
            (game_id, row["player_name"], row["hero_name"], str(row["items_name_list"])),
        )

    for _, row in all_dfs["side_mapping_table.csv"].iterrows():
        conn.execute(
            "INSERT OR REPLACE INTO side_mapping VALUES (?,?,?)",
            (game_id, row["player_name"], row["side_blue_or_red"]),
        )

    for _, row in all_dfs["dmg_table.csv"].iterrows():
        conn.execute(
            "INSERT OR REPLACE INTO dmg VALUES (?,?,?,?,?,?)",
            (game_id, row["player_name"], row["hero_name"],
             int(row["dmg_to_heroes"]), int(row["dmg_taken"]), float(row["participation"])),
        )

    for _, row in all_dfs["gold_table.csv"].iterrows():
        conn.execute(
            "INSERT OR REPLACE INTO gold VALUES (?,?,?,?,?,?)",
            (game_id, row["player_name"], row["hero_name"],
             int(row["gold_tol"]), int(row["gold_jungle"]), int(row["last_hit"])),
        )

    for _, row in all_dfs["oth_dmg_table.csv"].iterrows():
        conn.execute(
            "INSERT OR REPLACE INTO oth_dmg VALUES (?,?,?,?,?,?)",
            (game_id, row["player_name"], row["hero_name"],
             int(row["dmg_disable"]), int(row["dmg_heal"]), int(row["dmg_to_tw"])),
        )

    conn.execute(
        "INSERT OR REPLACE INTO records VALUES (?,?,?)",
        (game_id, recorded_at, str(img_dir.resolve())),
    )


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _ensure_payoff_columns(conn: sqlite3.Connection) -> None:
    """Ensure payoff contains the result-count columns used by analytics."""
    cols = {row[1] for row in conn.execute("PRAGMA table_info(payoff)").fetchall()}
    altered = False
    if "wins_vs" not in cols:
        conn.execute("ALTER TABLE payoff ADD COLUMN wins_vs INTEGER")
        altered = True
    if "losses_vs" not in cols:
        conn.execute("ALTER TABLE payoff ADD COLUMN losses_vs INTEGER")
        altered = True
    if altered:
        conn.execute("""
            UPDATE payoff
               SET wins_vs   = CAST(ROUND(win_pct_vs  / 100.0 * games_vs) AS INTEGER),
                   losses_vs = CAST(ROUND(loss_pct_vs / 100.0 * games_vs) AS INTEGER)
             WHERE wins_vs IS NULL
        """)


def _ensure_game_owner_column(conn: sqlite3.Connection) -> None:
    """Ensure every match has the uploader field required for data scoping."""
    cols = {row[1] for row in conn.execute("PRAGMA table_info(game_data)").fetchall()}
    if "uploaded_by" not in cols:
        conn.execute("ALTER TABLE game_data ADD COLUMN uploaded_by TEXT")
    conn.execute(
        "UPDATE game_data SET uploaded_by = ? WHERE uploaded_by IS NULL OR uploaded_by = ''",
        (UNSCOPED_OWNER,),
    )


def _payoff_requires_uploader_scope(conn: sqlite3.Connection) -> bool:
    """Return whether payoff must be recreated with uploader scoping."""
    exists = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='payoff'"
    ).fetchone()
    if not exists:
        return False
    cols = {row[1] for row in conn.execute("PRAGMA table_info(payoff)").fetchall()}
    return "uploaded_by" not in cols


def init_db() -> None:
    with get_conn() as conn:
        # Payoff is derived data and can be recreated whenever its scope is invalid.
        needs_payoff_rebuild = _payoff_requires_uploader_scope(conn)
        if needs_payoff_rebuild:
            conn.execute("DROP TABLE payoff")

        conn.executescript(_CREATE_SQL)
        _ensure_payoff_columns(conn)
        _ensure_game_owner_column(conn)

    # Repopulate payoff after recreating its uploader scope.
    if needs_payoff_rebuild:
        rebuild_payoff()


def insert_game(
    game_id: str,
    all_dfs: dict[str, pd.DataFrame],
    img_dir: Path,
    uploaded_by: str,
) -> None:
    """Insert or replace all tables for one game in a single transaction."""
    with get_conn() as conn:
        _write_game_tables(
            conn,
            game_id=game_id,
            all_dfs=all_dfs,
            recorded_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            img_dir=img_dir,
            uploaded_by=uploaded_by,
        )


def delete_game(game_id: str) -> None:
    """Delete all data for a game, remove its image folder, and rebuild payoff."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT 1 FROM records WHERE game_id = ?", (game_id,)
        ).fetchone()
        if row:
            _delete_img_dir(str(IMG_DB_ROOT / game_id))

        for table in ("overview_data", "item_list", "side_mapping",
                      "dmg", "gold", "oth_dmg", "records"):
            conn.execute(f"DELETE FROM {table} WHERE game_id = ?", (game_id,))
        conn.execute("DELETE FROM game_data WHERE game_id = ?", (game_id,))

    rebuild_payoff()


def rebuild_payoff() -> None:
    """Recompute payoff matrix from DB and replace payoff table."""
    with get_conn() as conn:
        overview  = pd.read_sql("SELECT * FROM overview_data",  conn)
        side_map  = pd.read_sql("SELECT * FROM side_mapping",   conn)
        game_data = pd.read_sql("SELECT * FROM game_data",      conn)

    if overview.empty:
        with get_conn() as conn:
            conn.execute("DELETE FROM payoff")
        return

    game_data["is_victory"] = game_data["is_victory"].astype(bool)

    df = (
        overview
        .merge(side_map[["game_id", "player_name", "side_blue_or_red"]],
               on=["game_id", "player_name"], how="left")
        .merge(game_data[["game_id", "is_victory", "uploaded_by"]], on="game_id", how="left")
    )

    df["won"] = (
        ((df["side_blue_or_red"] == "blue") &  df["is_victory"]) |
        ((df["side_blue_or_red"] == "red")  & ~df["is_victory"])
    )

    # Each game has a single uploader, so payoff is partitioned per uploader:
    # a player only ever sees matchups computed from their own uploaded games.
    player_cols = df[["game_id", "uploaded_by", "player_name", "hero_name",
                       "side_blue_or_red", "won"]]
    hero_cols = (
        df[["game_id", "hero_name", "side_blue_or_red"]]
        .drop_duplicates()
        .rename(columns={"hero_name": "enemy_hero", "side_blue_or_red": "enemy_side"})
    )

    pairs = player_cols.merge(hero_cols, on="game_id")
    pairs = pairs[pairs["side_blue_or_red"] != pairs["enemy_side"]]

    if pairs.empty:
        with get_conn() as conn:
            conn.execute("DELETE FROM payoff")
        return

    def _agg(grp_cols: list[str], own_hero_label: str) -> pd.DataFrame:
        out = (
            pairs.groupby(grp_cols)
            .agg(games_vs=("game_id", "count"), wins_vs=("won", "sum"))
            .reset_index()
        )
        if own_hero_label != "__hero_name__":
            out.insert(out.columns.get_loc("player_name") + 1, "own_hero", own_hero_label)
        else:
            out.rename(columns={"hero_name": "own_hero"}, inplace=True)
        return out

    agg_all  = _agg(["uploaded_by", "player_name", "enemy_hero"],              "ALL")
    agg_hero = _agg(["uploaded_by", "player_name", "hero_name", "enemy_hero"], "__hero_name__")
    agg = pd.concat([agg_all, agg_hero], ignore_index=True)

    agg["wins_vs"]    = agg["wins_vs"].astype(int)
    agg["losses_vs"]  = agg["games_vs"] - agg["wins_vs"]
    agg["win_pct_vs"] = (agg["wins_vs"] / agg["games_vs"] * 100).round(1)
    agg["loss_pct_vs"]= (agg["losses_vs"] / agg["games_vs"] * 100).round(1)

    agg = agg.sort_values(
        ["uploaded_by", "player_name", "own_hero", "win_pct_vs"],
        ascending=[True, True, True, False],
    ).reset_index(drop=True)

    rows = [
        (r["uploaded_by"], r["player_name"], r["own_hero"], r["enemy_hero"],
         int(r["games_vs"]), int(r["wins_vs"]), int(r["losses_vs"]),
         float(r["win_pct_vs"]), float(r["loss_pct_vs"]))
        for _, r in agg.iterrows()
    ]
    with get_conn() as conn:
        conn.execute("DELETE FROM payoff")
        conn.executemany("INSERT INTO payoff VALUES (?,?,?,?,?,?,?,?,?)", rows)


def get_all_records(uploaded_by: str) -> list[dict]:
    """Return one uploader's records ordered newest first."""
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT r.game_id,
                   r.date_data_record,
                   r.img_db_loc,
                   g.datetime      AS game_datetime,
                   g.name_duration AS game_duration,
                   g.uploaded_by   AS uploaded_by
              FROM records r
              LEFT JOIN game_data g ON g.game_id = r.game_id
             WHERE g.uploaded_by = ?
             ORDER BY r.date_data_record DESC
            """,
            (uploaded_by,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_game_owner(game_id: str) -> str | None:
    """Return the uploader of a game, or None if the game does not exist."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT uploaded_by FROM game_data WHERE game_id = ?", (game_id,)
        ).fetchone()
    return row["uploaded_by"] if row else None

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from coach_styles import CoachStyle, normalize_coach_style

APP_DIR = Path(__file__).resolve().parent

# Chat history (threads + messages) lives in THIS backend's own data dir.
DEFAULT_CHAT_DB_PATH = APP_DIR / "data" / "chat.db"
CHAT_DB_ENV_VAR = "ROVBUFF_CHAT_DB_PATH"

# Chat tools read match data from the OCR service's database.
DEFAULT_GAME_DB_PATH = APP_DIR.parent / "backend_ocr" / "data" / "rovbuff.db"
GAME_DB_ENV_VAR = "ROVBUFF_DB_PATH"


def _resolve_db_path(env_var: str, default: Path) -> Path:
    raw = os.getenv(env_var)
    if not raw:
        return default
    path = Path(raw).expanduser()
    if not path.is_absolute():
        path = APP_DIR.joinpath(path)
    return path.resolve()


CHAT_DB_PATH = _resolve_db_path(CHAT_DB_ENV_VAR, DEFAULT_CHAT_DB_PATH)
GAME_DB_PATH = _resolve_db_path(GAME_DB_ENV_VAR, DEFAULT_GAME_DB_PATH)


def now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def _connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def get_conn() -> sqlite3.Connection:
    """Connection to the chat-history DB (threads + messages)."""
    return _connect(CHAT_DB_PATH)


def get_game_conn() -> sqlite3.Connection:
    """Connection to the shared game DB (read by chat tools)."""
    return _connect(GAME_DB_PATH)


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS chat_threads (
                thread_id   TEXT PRIMARY KEY,
                uploaded_by TEXT NOT NULL,
                title       TEXT NOT NULL,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS chat_messages (
                message_id    TEXT PRIMARY KEY,
                thread_id     TEXT NOT NULL,
                uploaded_by   TEXT NOT NULL,
                role          TEXT NOT NULL,
                content       TEXT NOT NULL,
                metadata_json TEXT,
                created_at    TEXT NOT NULL,
                FOREIGN KEY (thread_id) REFERENCES chat_threads(thread_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS profile_settings (
                uploaded_by TEXT PRIMARY KEY,
                coach_style TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_chat_threads_user_updated
                ON chat_threads(uploaded_by, updated_at DESC);

            CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created
                ON chat_messages(thread_id, created_at);
            """
        )


def get_coach_style(uploaded_by: str) -> CoachStyle:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT coach_style FROM profile_settings WHERE uploaded_by = ?",
            (uploaded_by,),
        ).fetchone()
    return normalize_coach_style(row["coach_style"] if row else None)


def set_coach_style(uploaded_by: str, style: str) -> CoachStyle:
    normalized = normalize_coach_style(style)
    ts = now_iso()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO profile_settings (uploaded_by, coach_style, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(uploaded_by) DO UPDATE SET
                coach_style = excluded.coach_style,
                updated_at = excluded.updated_at
            """,
            (uploaded_by, normalized, ts),
        )
    return normalized


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return dict(row)


def message_row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    item = row_to_dict(row)
    try:
        item["metadata"] = json.loads(item.pop("metadata_json") or "{}")
    except json.JSONDecodeError:
        item["metadata"] = {}
    return item


def create_thread(uploaded_by: str, title: str | None = None) -> dict[str, Any]:
    thread_id = new_id("thread")
    ts = now_iso()
    clean_title = (title or "New chat").strip()[:80] or "New chat"
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO chat_threads VALUES (?, ?, ?, ?, ?)",
            (thread_id, uploaded_by, clean_title, ts, ts),
        )
        row = conn.execute(
            "SELECT * FROM chat_threads WHERE thread_id = ?",
            (thread_id,),
        ).fetchone()
    return row_to_dict(row)


def list_threads(uploaded_by: str) -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT thread_id, uploaded_by, title, created_at, updated_at
              FROM chat_threads
             WHERE uploaded_by = ?
             ORDER BY updated_at DESC
            """,
            (uploaded_by,),
        ).fetchall()
    return [row_to_dict(r) for r in rows]


def get_thread(thread_id: str, uploaded_by: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM chat_threads WHERE thread_id = ? AND uploaded_by = ?",
            (thread_id, uploaded_by),
        ).fetchone()
    return row_to_dict(row) if row else None


def delete_thread(thread_id: str, uploaded_by: str) -> bool:
    """Delete a thread and its messages (scoped to the owner). Returns True if a
    thread was removed. Messages are removed explicitly as well as via ON DELETE
    CASCADE, so it works regardless of PRAGMA foreign_keys state."""
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM chat_messages WHERE thread_id = ? AND uploaded_by = ?",
            (thread_id, uploaded_by),
        )
        cur = conn.execute(
            "DELETE FROM chat_threads WHERE thread_id = ? AND uploaded_by = ?",
            (thread_id, uploaded_by),
        )
        return cur.rowcount > 0


def add_exchange(
    thread_id: str,
    uploaded_by: str,
    user_content: str,
    assistant_content: str,
    assistant_metadata: dict[str, Any] | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Persist one completed user/assistant exchange in a single transaction."""
    user_message_id = new_id("msg")
    assistant_message_id = new_id("msg")
    ts = now_iso()
    metadata_json = json.dumps(assistant_metadata or {}, ensure_ascii=False)

    with get_conn() as conn:
        thread = conn.execute(
            "SELECT title FROM chat_threads WHERE thread_id = ? AND uploaded_by = ?",
            (thread_id, uploaded_by),
        ).fetchone()
        if not thread:
            raise ValueError("Thread not found")

        conn.execute(
            "INSERT INTO chat_messages VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_message_id, thread_id, uploaded_by, "user", user_content, "{}", ts),
        )
        conn.execute(
            "INSERT INTO chat_messages VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                assistant_message_id,
                thread_id,
                uploaded_by,
                "assistant",
                assistant_content,
                metadata_json,
                ts,
            ),
        )

        if thread["title"] == "New chat":
            title = user_content.strip().replace("\n", " ")
            if len(title) > 56:
                title = title[:53].rstrip() + "..."
            conn.execute(
                """
                UPDATE chat_threads
                   SET title = ?, updated_at = ?
                 WHERE thread_id = ? AND uploaded_by = ?
                """,
                (title or "New chat", ts, thread_id, uploaded_by),
            )
        else:
            conn.execute(
                """
                UPDATE chat_threads
                   SET updated_at = ?
                 WHERE thread_id = ? AND uploaded_by = ?
                """,
                (ts, thread_id, uploaded_by),
            )

        user_row = conn.execute(
            "SELECT * FROM chat_messages WHERE message_id = ?",
            (user_message_id,),
        ).fetchone()
        assistant_row = conn.execute(
            "SELECT * FROM chat_messages WHERE message_id = ?",
            (assistant_message_id,),
        ).fetchone()

    return message_row_to_dict(user_row), message_row_to_dict(assistant_row)


def list_messages(thread_id: str, uploaded_by: str, limit: int = 80) -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT message_id, thread_id, uploaded_by, role, content, metadata_json, created_at
              FROM (
                    SELECT rowid AS message_order,
                           message_id, thread_id, uploaded_by, role,
                           content, metadata_json, created_at
                      FROM chat_messages
                     WHERE thread_id = ? AND uploaded_by = ?
                     ORDER BY created_at DESC, rowid DESC
                     LIMIT ?
                   ) AS recent
             ORDER BY created_at ASC, message_order ASC
            """,
            (thread_id, uploaded_by, max(1, int(limit))),
        ).fetchall()
    return [message_row_to_dict(row) for row in rows]


from __future__ import annotations

import hmac
import os
import re
from dataclasses import dataclass

from fastapi import Header, HTTPException

USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")


@dataclass(frozen=True)
class ChatUser:
    username: str


def _normalize_username(user: str) -> str:
    cleaned = (user or "").strip()
    if not USERNAME_RE.fullmatch(cleaned):
        raise HTTPException(status_code=400, detail="Invalid user")
    return cleaned


def require_internal_user(
    x_rovbuff_internal_key: str = Header(default=""),
    x_rovbuff_user: str = Header(default=""),
) -> ChatUser:
    expected = os.getenv("ROVBUFF_INTERNAL_API_KEY", "dev-internal-key")
    if not x_rovbuff_internal_key or not hmac.compare_digest(x_rovbuff_internal_key, expected):
        raise HTTPException(status_code=401, detail="Invalid internal API key")
    username = _normalize_username(x_rovbuff_user)
    return ChatUser(username=username)

from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.responses import StreamingResponse

APP_DIR = Path(__file__).resolve().parent
load_dotenv(APP_DIR / ".env")
load_dotenv(APP_DIR.parent / "backend_ocr" / ".env", override=False)

from agent import stream_agent  # noqa: E402
from auth import ChatUser, require_internal_user  # noqa: E402
from coach_styles import is_coach_style, list_coach_style_options  # noqa: E402
from db import (  # noqa: E402
    CHAT_DB_PATH,
    add_exchange,
    create_thread,
    delete_thread,
    get_coach_style,
    get_thread,
    init_db,
    list_messages,
    list_threads,
    set_coach_style,
)

ALLOWED_ORIGINS = os.getenv("ROVBUFF_FRONTEND_ORIGINS", "http://localhost:3000").split(",")

app = FastAPI(title="RoVBuff Chat Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateThreadRequest(BaseModel):
    title: str | None = None


class SendMessageRequest(BaseModel):
    content: str


class CoachStyleRequest(BaseModel):
    coachStyle: str


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "db_path": str(CHAT_DB_PATH),
        "db_exists": CHAT_DB_PATH.exists(),
        "openai": bool(os.getenv("OPENAI_API_KEY")),
    }


@app.get("/threads")
def threads(user: ChatUser = Depends(require_internal_user)) -> list[dict]:
    return list_threads(user.username)


@app.get("/profile/coach-style")
def coach_style_profile(user: ChatUser = Depends(require_internal_user)) -> dict:
    return {
        "coachStyle": get_coach_style(user.username),
        "options": list_coach_style_options(),
    }


@app.post("/profile/coach-style")
def update_coach_style(
    req: CoachStyleRequest,
    user: ChatUser = Depends(require_internal_user),
) -> dict:
    if not is_coach_style(req.coachStyle):
        raise HTTPException(status_code=400, detail="Invalid coachStyle")
    saved = set_coach_style(user.username, req.coachStyle)
    return {
        "ok": True,
        "coachStyle": saved,
        "options": list_coach_style_options(),
    }


@app.post("/threads")
def new_thread(req: CreateThreadRequest, user: ChatUser = Depends(require_internal_user)) -> dict:
    return create_thread(user.username, req.title)


@app.delete("/threads/{thread_id}")
def remove_thread(thread_id: str, user: ChatUser = Depends(require_internal_user)) -> dict:
    if not delete_thread(thread_id, user.username):
        raise HTTPException(status_code=404, detail="Thread not found")
    return {"ok": True, "thread_id": thread_id}


@app.get("/threads/{thread_id}/messages")
def messages(thread_id: str, user: ChatUser = Depends(require_internal_user)) -> list[dict]:
    if not get_thread(thread_id, user.username):
        raise HTTPException(status_code=404, detail="Thread not found")
    return list_messages(thread_id, user.username)


def _sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"


@app.post("/threads/{thread_id}/messages/stream")
def send_message_stream(
    thread_id: str,
    req: SendMessageRequest,
    user: ChatUser = Depends(require_internal_user),
) -> StreamingResponse:
    if not get_thread(thread_id, user.username):
        raise HTTPException(status_code=404, detail="Thread not found")

    question = req.content.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Message is required")

    history = list_messages(thread_id, user.username)

    def events():
        # Flush headers and establish the stream before model/tool work begins.
        yield _sse("status", {"status": "thinking"})
        try:
            for event in stream_agent(
                username=user.username,
                history=history,
                question=question,
                style=get_coach_style(user.username),
            ):
                if event["type"] == "delta":
                    yield _sse("delta", {"content": event["content"]})
                    continue

                _, assistant = add_exchange(
                    thread_id,
                    user.username,
                    question,
                    event["answer"],
                    event["metadata"],
                )
                yield _sse(
                    "done",
                    {
                        "message": assistant,
                        "thread": get_thread(thread_id, user.username),
                    },
                )
        except Exception as exc:
            yield _sse("error", {"detail": f"Chat agent failed: {exc}"})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

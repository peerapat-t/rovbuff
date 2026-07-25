from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterator

from dotenv import load_dotenv

from prompts import CoachStyle, DEFAULT_COACH_STYLE, build_chat_system_prompt
from tools import make_feature_tools

APP_DIR = Path(__file__).resolve().parent
load_dotenv(APP_DIR / ".env")
load_dotenv(APP_DIR.parent / "backend_ocr" / ".env", override=False)


def _model_name() -> str:
    model = (
        os.getenv("MODEL_NAME")
        or os.getenv("ROVBUFF_CHAT_MODEL")
        or "openai:gpt-4.1-mini"
    ).strip()
    if ":" not in model and model.startswith(("gpt-", "o")):
        return f"openai:{model}"
    return model


@lru_cache(maxsize=256)
def _cached_agent(username: str, style: CoachStyle, model: str) -> Any:
    """Reuse the compiled agent while keeping account-scoped tools isolated."""
    from langchain.agents import create_agent

    return create_agent(
        model=model,
        tools=make_feature_tools(username),
        system_prompt=build_chat_system_prompt(style=style),
    )


def _agent_and_messages(
    *,
    username: str,
    history: list[dict[str, Any]],
    question: str,
    style: CoachStyle,
) -> tuple[Any, list[dict[str, str]], str]:
    model = _model_name()
    agent = _cached_agent(username, style, model)

    history_window = history[-30:]
    # Ignore an orphaned user message created before exchanges became atomic.
    if (
        history_window
        and history_window[-1].get("role") == "user"
        and str(history_window[-1].get("content", "")).strip() == question.strip()
    ):
        history_window = history_window[:-1]

    messages = [
        {"role": str(msg["role"]), "content": str(msg["content"])}
        for msg in history_window
        if msg["role"] in ("user", "assistant")
    ]
    messages.append({"role": "user", "content": question})
    return agent, messages, model


def _stream_text(message: Any) -> str:
    """Return only user-visible text from an agent message chunk."""
    content = getattr(message, "content", "")
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""
    parts: list[str] = []
    for block in content:
        if isinstance(block, dict) and block.get("type") in ("text", "output_text"):
            parts.append(str(block.get("text", "")))
    return "".join(parts)


def stream_agent(
    *,
    username: str,
    history: list[dict[str, Any]],
    question: str,
    style: CoachStyle = DEFAULT_COACH_STYLE,
) -> Iterator[dict[str, Any]]:
    """Yield visible answer deltas followed by one final metadata event."""
    agent, messages, model = _agent_and_messages(
        username=username,
        history=history,
        question=question,
        style=style,
    )

    answer_parts: list[str] = []
    tool_calls: list[dict[str, Any]] = []
    active_tool_indexes: dict[int, int] = {}

    for message, stream_metadata in agent.stream(
        {"messages": messages},
        stream_mode="messages",
    ):
        # Tool output also travels through the message stream. Only model chunks
        # are user-visible; otherwise raw database JSON would flash in the chat.
        if stream_metadata.get("langgraph_node") != "model":
            continue

        for call_chunk in getattr(message, "tool_call_chunks", None) or []:
            index = int(call_chunk.get("index") or 0)
            name = call_chunk.get("name")
            if name:
                active_tool_indexes[index] = len(tool_calls)
                tool_calls.append(
                    {
                        "name": str(name),
                        "id": call_chunk.get("id"),
                        "args": str(call_chunk.get("args") or ""),
                    }
                )
            elif index in active_tool_indexes and call_chunk.get("args"):
                tool_calls[active_tool_indexes[index]]["args"] += str(call_chunk["args"])

        text = _stream_text(message)
        if text:
            answer_parts.append(text)
            yield {"type": "delta", "content": text}

    answer = "".join(answer_parts) or "ขออภัยครับ ผมยังตอบคำถามนี้ไม่ได้จากข้อมูลที่มี"
    yield {
        "type": "done",
        "answer": answer,
        "metadata": {
            "model": model,
            "coach_style": style,
            "tool_calls": tool_calls,
        },
    }

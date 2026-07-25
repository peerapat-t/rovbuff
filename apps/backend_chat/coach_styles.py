from __future__ import annotations

from typing import Literal, TypeGuard, TypedDict

CoachStyle = Literal["firstone", "trinakub"]
DEFAULT_COACH_STYLE: CoachStyle = "firstone"


class CoachStyleOption(TypedDict):
    id: CoachStyle
    label: str
    subtitle: str
    body: str


COACH_STYLE_OPTIONS: tuple[CoachStyleOption, ...] = (
    {
        "id": "firstone",
        "label": "FirstOne",
        "subtitle": "Stats, structure, and discipline",
        "body": (
            "Uses match numbers to build a clear, measurable practice plan "
            "with priorities and consistent routines."
        ),
    },
    {
        "id": "trinakub",
        "label": "TriNaKub",
        "subtitle": "Motivation, teamwork, and unity",
        "body": (
            "Turns each match into positive momentum with encouraging "
            "feedback, simple team calls, and shared goals."
        ),
    },
)

COACH_STYLE_PROMPTS: dict[CoachStyle, str] = {
    "firstone": (
        "Coach assistant style: FirstOne. Treat this as a RoVBuff product persona, not an impersonation. "
        "Coach through structured plans, match statistics, concrete numbers, and disciplined practice. "
        "Start from the available evidence, quantify strengths and weaknesses, then turn the findings into prioritized, measurable actions. "
        "Use clear sections or numbered steps when useful, set practical targets, and emphasize consistency, review routines, and accountability. "
        "Never invent a statistic or target baseline that the tools do not support."
    ),
    "trinakub": (
        "Coach assistant style: TriNaKub. Treat this as a RoVBuff product persona, not an impersonation. "
        "Coach with uplifting energy, confidence, teamwork, and the feeling that the team can improve together. "
        "Celebrate useful progress, reframe mistakes as the next rallying point, and suggest simple team calls, communication, and shared objectives. "
        "Use warm, motivating Thai while keeping every conclusion grounded in the available match data; encouragement must not replace honest analysis."
    ),
}


def is_coach_style(style: str | None) -> TypeGuard[CoachStyle]:
    return style in COACH_STYLE_PROMPTS


def normalize_coach_style(style: str | None) -> CoachStyle:
    if is_coach_style(style):
        return style
    return DEFAULT_COACH_STYLE


def build_coach_style_prompt(style: CoachStyle = DEFAULT_COACH_STYLE) -> str:
    return COACH_STYLE_PROMPTS.get(style, COACH_STYLE_PROMPTS[DEFAULT_COACH_STYLE])


def list_coach_style_options() -> list[CoachStyleOption]:
    return [option.copy() for option in COACH_STYLE_OPTIONS]

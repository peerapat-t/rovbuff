# RoVBuff Chat Backend

FastAPI service for streaming, data-backed Coach Chat. Every request is scoped
to the authenticated uploader passed by the Next.js server. Login usernames
and display names are not exposed to the model as in-game identities.

## Runtime

```powershell
cd apps/backend_chat
pip install -r requirements.txt
python -m uvicorn api:app --reload --port 8002
```

Create `apps/backend_chat/.env`:

```dotenv
OPENAI_API_KEY=sk-...
MODEL_NAME=gpt-4.1-mini
ROVBUFF_INTERNAL_API_KEY=replace-me
```

| Variable | Default | Purpose |
|---|---|---|
| `ROVBUFF_DB_PATH` | `../backend_ocr/data/rovbuff.db` | Read-only match and analytics database |
| `ROVBUFF_CHAT_DB_PATH` | `data/chat.db` | Chat threads and messages |
| `MODEL_NAME` | `openai:gpt-4.1-mini` | LangChain chat model |
| `ROVBUFF_INTERNAL_API_KEY` | `dev-internal-key` | Internal request authentication |
| `ROVBUFF_FRONTEND_ORIGINS` | `http://localhost:3000` | Allowed frontend origins |

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Service, database, and model-key status |
| `GET` | `/profile/coach-style` | Load the user's selected Coach and available options |
| `POST` | `/profile/coach-style` | Save the user's selected Coach |
| `GET` | `/threads` | List the signed-in user's threads |
| `POST` | `/threads` | Create a thread |
| `DELETE` | `/threads/{thread_id}` | Delete an owned thread and its messages |
| `GET` | `/threads/{thread_id}/messages` | Load an owned thread's messages |
| `POST` | `/threads/{thread_id}/messages/stream` | Stream a Coach response, then save the completed exchange |

The streaming endpoint uses Server-Sent Events:

- `status` confirms the stream is open;
- `delta` carries visible answer text;
- `done` carries the persisted assistant message and updated thread;
- `error` reports a failure after streaming has started; the exchange is not
  saved.

Tool output is never sent as visible text. The user question, completed
assistant message, and tool metadata are persisted atomically immediately
before `done`. A failed generation leaves neither half of the exchange in the
database.

The Chat database contains `chat_threads`, `chat_messages`, and
`profile_settings`. The last table keeps each account's selected Coach style.
The API loads the latest 80 persisted messages in chronological order; the
agent uses the most recent 30 as model context. Compiled agents are cached by
account, Coach style, and model while account-scoped tools remain isolated.

## Coaches

- `firstone` is the default and emphasizes statistics, measurable plans, and discipline.
- `trinakub` emphasizes motivation, teamwork, communication, and shared goals.

Definitions live in `coach_styles.py`. Each account's selection is stored in
the `profile_settings` table in the Chat database and loaded by the Chat
backend before each response.

## Analytics Tools

- `player_profile_tool` — player stats, roles, the latest 50 matching games, consistency, hero selection, and matchups
- `player_stats_tool` — sortable player metrics
- `match_history_tool` — the latest 50 matches, optionally filtered by player or hero
- `game_detail_tool` — one complete scoreboard, chart data, MVP, and final items
- `all_heroes_tool` — All Heroes metrics
- `hero_detail_tool` — roles, performance, players, final-build patterns, and matchups
- `draft_helper_tool` — historical matchup recommendations for Draft Helper
- `player_combo_tool` — two-, three-, or five-player combinations
- `hero_combo_tool` — two-, three-, or five-hero combinations
- `hero_matchup_tool` — team-level hero matchup history
- `player_matchup_tool` — one player's matchup history
- `daily_consistency_tool` — played days and consistency summaries
- `player_comparison_tool` — full player comparison and normalized radar values
- `search_tool` — players, heroes, games, and application pages

All calculations use rows owned by the signed-in uploader. Matchup results are
historical team-level associations, not proven lane counters. Build results are
final-loadout associations and do not contain purchase timing or order. Win
rate is the raw `wins / games` value and is returned with game count; no
Bayesian or sample-adjusted score is used.

Player-specific questions require a user-confirmed in-game name. If the user
speaks in the first person without identifying that name, the Coach asks before
calling a player tool. Account usernames are never substituted.

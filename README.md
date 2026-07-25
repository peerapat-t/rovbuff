# RoVBuff

RoVBuff is a local-first personal coaching and match analytics platform for
RoV / Arena of Valor. A player uploads screenshots from matches they already
play, verifies the extracted scoreboard data, and builds a private history for
reviewing performance over time.

The product is designed for individual players. Account names only scope data;
they are never assumed to be in-game player names.

## Current Features

- Extract one match from four post-game screenshots.
- Review and edit every extracted table before saving.
- Keep matches, screenshots, settings, and chat history scoped by account.
- Browse match scoreboards, Match Charts, final items, and MVP results.
- Analyze player form, hero selection, builds, matchups, and daily consistency.
- Explore two-, three-, or five-player and hero combinations.
- Compare players and use historical matchup data in the Draft Helper.
- Ask Coach Chat questions in Thai using account-scoped stored match data.
- Stream Coach Chat responses token by token.

RoVBuff does not generate an automatic AI match summary. AI is used for
screenshot extraction and for on-demand Coach Chat responses.

## Coaches

Coach Chat has two selectable personalities:

| Coach | Approach |
|---|---|
| FirstOne | Structured plans based on statistics, concrete numbers, measurable practice, and discipline |
| TriNaKub | Encouraging coaching centered on teamwork, communication, shared goals, and momentum |

FirstOne is the default. For first-person questions such as “Who do I win with
most?”, Coach Chat asks for the user's in-game name before running a
player-specific analysis. It never substitutes the login username.

## Architecture

RoVBuff contains three local services:

```text
Browser
  |
  v
Next.js frontend :3000
  |-- server-side analytics reads ----> game SQLite
  |-- upload/config proxy -----------> OCR FastAPI :8000
  `-- streaming chat proxy ----------> Chat FastAPI :8002
                                          |-- reads game SQLite
                                          `-- writes chat SQLite
```

| Service | Path | Default URL | Responsibility |
|---|---|---:|---|
| Frontend | `apps/frontend` | `http://localhost:3000` | Authentication, upload/review UI, analytics pages, profile settings, and backend proxies |
| OCR backend | `apps/backend_ocr` | `http://localhost:8000` | Screenshot extraction, validation, screenshot archive, match persistence, and payoff rebuilds |
| Chat backend | `apps/backend_chat` | `http://localhost:8002` | Streaming tool-backed coaching and chat-thread persistence |

Coach definitions and each account's selected style live in `apps/backend_chat`.

## Data Storage

| Data | Default location |
|---|---|
| Match and analytics data | `apps/backend_ocr/data/rovbuff.db` |
| Saved screenshots | `apps/backend_ocr/data/img_db/<game_id>/` |
| Upload test fixtures | `apps/backend_ocr/data/example_upload/` |
| Chat threads and messages | `apps/backend_chat/data/chat.db` |
| Player-name guides | `apps/backend_ocr/config/player_guides/<username>.txt` |
| Coach selection | `apps/backend_chat/data/chat.db` |

The frontend and Chat backend read the match database. Only the OCR backend
writes match records and rebuilds the derived `payoff` table. The Chat backend
stores conversation history separately.

## Match Extraction

Each upload requires exactly four screenshots in this order:

| Page | Results tab | Extracted data |
|---|---|---|
| 1 | Overview | Result, duration, time, players, heroes, Fantasy Score, K/D/A, scoreboard gold, items, and team side |
| 2 | Damage | Hero damage, damage taken, and participation |
| 3 | Gold | Total gold, jungle gold, and last hits |
| 4 | Other Damage | Disable, healing, and tower damage |

The images can be reordered before extraction. Page 1 and pages 2–4 use OpenAI
Structured Outputs for their respective tables; final items are recognized
locally from the item-icon catalog. The user can correct all extracted values
before the match and screenshots are saved.

## Analytics Conventions

- Win rate is the raw value `wins / games`; no Bayesian or sample-adjusted score
  is used.
- Game count is always shown with win rate so the sample size remains visible.
- Matchup data describes historical team-level results, not proven lane
  counters.
- Hero build patterns use final saved loadouts only; purchase order and timing
  are not available.
- Coach Chat player-profile and match-history tools inspect at most the latest
  50 matching games.
- Profile Match History shows 10 matches per page and keeps all four archived
  screenshots available for every match.

## Main Routes

| Route | Purpose |
|---|---|
| `/` | Product overview |
| `/login` | Sign in |
| `/profile` | Upload, paginated Match History, recognized names, and Coach selection |
| `/match-history` | Complete match history |
| `/match-history/[id]` | Scoreboard, Match Charts, and final items |
| `/player-stats` | Player statistics |
| `/player-stats/[name]` | Player profile, trends, consistency, and matchups |
| `/all-heroes` | All Heroes analytics |
| `/all-heroes/[name]` | Hero performance, players, builds, and matchups |
| `/player-combo` | Player combination performance |
| `/hero-combo` | Hero combination performance |
| `/draft-helper` | Historical Draft Helper |
| `/player-comparison` | Player comparison |
| `/coach-chat` | Streaming personal Coach Chat |

## Technology

| Area | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Recharts |
| Data | SQLite, better-sqlite3, pandas, SQL aggregations |
| OCR backend | FastAPI, Pydantic, Pillow, OpenAI Structured Outputs |
| Chat backend | FastAPI, LangChain, OpenAI models, Server-Sent Events |

## Run Locally

Run each service in a separate terminal.

```powershell
cd apps/backend_ocr
pip install -r requirements.txt
python -m uvicorn api:app --reload --port 8000
```

```powershell
cd apps/backend_chat
pip install -r requirements.txt
python -m uvicorn api:app --reload --port 8002
```

```powershell
cd apps/frontend
npm install
npm run dev
```

Set `OPENAI_API_KEY` in each Python backend's `.env`, then open
`http://localhost:3000`.

## Environment Variables

| Variable | Service | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | OCR, Chat | Model access |
| `MODEL_NAME` | OCR, Chat | Per-service model override |
| `ROVBUFF_DB_PATH` | OCR, Chat, Frontend | Match database override; use an absolute path when sharing one override |
| `ROVBUFF_CHAT_DB_PATH` | Chat | Chat-history database override |
| `ROVBUFF_API_URL` | Frontend | OCR backend URL |
| `ROVBUFF_CHAT_URL` | Frontend | Chat backend URL |
| `ROVBUFF_INTERNAL_API_KEY` | All services | Authenticates internal frontend-to-backend requests |
| `ROVBUFF_AUTH_SECRET` | Frontend | Signs login sessions |
| `ROVBUFF_USERS_JSON` | Frontend | Production usernames, display names, and password hashes |
| `ROVBUFF_FRONTEND_ORIGINS` | OCR, Chat | Allowed browser origins |

Production deployments must set strong values for the internal API key and
authentication secret, and must provide `ROVBUFF_USERS_JSON`.

## Repository Layout

```text
ROVBUFF/
|-- README.md
|-- DESIGN.md
`-- apps/
    |-- frontend/             Next.js application and server-side API proxies
    |-- backend_ocr/          Screenshot extraction and match persistence
    `-- backend_chat/         Coach definitions, settings, streaming chat, and analytics tools
```

The visual system and component conventions are documented separately in
`DESIGN.md`.

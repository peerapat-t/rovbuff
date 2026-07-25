# RoVBuff OCR Backend

FastAPI service that extracts, reviews, and persists one RoV match from four
post-game screenshots. The Next.js Profile page is the user-facing client.

Extraction does not save a match immediately. It returns editable tables;
screenshots and data are committed only after the user confirms the review.

## Runtime

```powershell
cd apps/backend_ocr
pip install -r requirements.txt
python -m uvicorn api:app --reload --port 8000
```

Create `apps/backend_ocr/.env`:

```dotenv
OPENAI_API_KEY=sk-...
MODEL_NAME=gpt-4.1
ROVBUFF_INTERNAL_API_KEY=replace-me
```

Interactive API documentation is available at `http://localhost:8000/docs`.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Service and model-key status |
| `GET` | `/config/players?user=` | Load one account's recognized player names |
| `POST` | `/config/players?user=` | Save one account's recognized player names |
| `POST` | `/extract` | Extract editable tables from `page1` through `page4` |
| `POST` | `/save` | Save reviewed tables and archive the four screenshots |
| `GET` | `/history?user=` | List one account's saved matches |
| `DELETE` | `/games/{game_id}?user=` | Delete an owned match and rebuild matchup data |
| `GET` | `/images/{game_id}/{filename}?user=` | Read one archived screenshot after ownership validation |

All routes except `/health` require the internal API key. Usernames are
validated before they are used for data ownership or guide filenames.

## Required Screenshots

| Page | Results tab | Extracted data |
|---|---|---|
| 1 | Overview | Result, duration, datetime, player names, heroes, Fantasy Score, K/D/A, scoreboard gold, items, and team side |
| 2 | Damage | Hero damage, damage taken, and participation |
| 3 | Gold | Total gold, jungle gold, and last hits |
| 4 | Other Damage | Disable, healing, and tower damage |

The frontend can reorder the four pages before extraction.

## Extraction Pipeline

| Dataset | Source | Method |
|---|---|---|
| `game_data` | Page 1 | OpenAI Structured Outputs |
| `overview_data` | Page 1 | OpenAI Structured Outputs |
| `item_list` | Page 1 | Local crop matching against `item_img/` |
| `side_mapping` | Page 1 | Derived from overview order: rows 1–5 blue, rows 6–10 red |
| `dmg` | Page 2 | OpenAI Structured Outputs |
| `gold` | Page 3 | OpenAI Structured Outputs |
| `oth_dmg` | Page 4 | OpenAI Structured Outputs |

Page 1 player names become authoritative inputs for pages 2–4. Hero names are
normalized against `config/hero_name_guide.txt`. Each account's recognized
player names are stored in `config/player_guides/<username>.txt`; an account
without a guide simply starts with an empty list.

Temporary extraction images are deleted after each request. Confirmed images
are archived under `data/img_db/<game_id>/`.

## Upload Test Fixtures

`data/example_upload/` is a permanent test-fixture directory. Its screenshots
are grouped in ascending sets of four and follow the required Page 1 through
Page 4 upload order. Do not treat this directory as disposable runtime data.

## Persistence

The default match database is `data/rovbuff.db`, overridable with
`ROVBUFF_DB_PATH`. A confirmed match writes these tables in one transaction:

- `game_data`
- `overview_data`
- `item_list`
- `side_mapping`
- `dmg`
- `gold`
- `oth_dmg`
- `records`

The derived `payoff` table is rebuilt after save or delete. It stores scoped
player/hero matchup aggregates used by Draft Helper, matchup views, and Chat
tools. `hero_role` stores the optional hero-role catalog.

## Source Layout

```text
apps/backend_ocr/
|-- api.py              FastAPI routes and request validation
|-- pipeline.py         Extraction orchestration and image storage
|-- db.py               Schema validation, persistence, deletion, payoff rebuild
|-- models.py           Pydantic extraction schemas
|-- extractors/         Vision prompts, item matching, and side derivation
|-- config/             Hero catalog and per-user player-name guides
|-- item_img/           Local item-icon catalog
`-- data/               SQLite database and confirmed screenshot archive
```

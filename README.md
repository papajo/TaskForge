# TaskForge — Crowdsourced Microtask Platform for ML Workflows & BPO

TaskForge is a Mechanical Turk–style two-sided marketplace connecting **Requesters** with **Workers** for microtask jobs: ML data collection/annotation/HITL validation, and business-process microtasks like content moderation, categorization, and data collection.

See `prd-taskforge.md` for the PRD and implementation plan.

## Quick start

```bash
# Backend (port 12001)
cd backend
pip install -r requirements.txt
python -m app.seed          # idempotent seed; creates demo users + HITs
python -m uvicorn app.main:app --host 0.0.0.0 --port 12001

# Frontend (port 12000)
cd frontend
npm install
npm run dev -- --port 12000
```

The Vite dev server proxies `/api` → `localhost:12001`.

## Demo accounts

- `alice` / `alice123` — requester
- `bob` / `bob123` — worker
- `carol` / `carol123` — worker

## Task types

- `bounding-box` — image annotation with draggable labeled boxes (canvas)
- `classification` / `categorization` — label each item
- `moderation` — approve/reject each item
- `data-collection` — form fields per item
- `hitl-validation` — review model prediction and accept/correct (chainable via import endpoint)

## ML loop (HITL)

1. Requester pastes predictions JSON (export from your model): `POST /import/predictions` → creates an `hitl-validation` HIT.
2. Workers accept/correct → requester approves → export via `GET /export/{id}?format=json|csv` (COCO-like for bounding-box HITs).
3. Approved exports feed back into retraining. Loop repeats.

## API sketch

- `POST /auth/register|login` → token
- `POST /hits`, `GET /hits/mine`, `GET /hits/available`, `GET /hits/{id}`, `POST /hits/{id}/close`
- `POST /assignments/{hit_id}/accept`, `POST /assignments/{id}/submit`, `GET /assignments/mine`
- `POST /assignments/{id}/{approve|reject}` (requester), `GET /wallet`
- `GET /export/{id}?format=json|csv`, `POST /import/predictions`, `GET /hits/{id}/consensus`
- `POST /quizzes`, `GET /quizzes`, `GET /quizzes/{id}/take`, `POST /quizzes/{id}/submit` — qualification quizzes (requesters create, workers take, HITs can require a pass)

## Qualification quizzes

Requesters build multiple-choice quizzes (`/quizzes`) and can attach one to a HIT. Workers must pass before accepting; failures can be retried. The marketplace shows the gating reason and a direct "Take quiz" shortcut.

## CSV item upload

On the Create-HIT form you can upload a CSV file instead of pasting JSON. Headers `id,text` or `id,url`; each non-header row becomes an item.

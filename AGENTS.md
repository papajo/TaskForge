# TaskForge project knowledge

## What this is
A Mechanical Turk–style crowdsourcing platform for ML workflows (annotation, HITL validation, bounding boxes) and BPO microtasks (moderation, categorization, data collection). See `prd-taskforge.md`.

## Stack & ports
- Backend: FastAPI + SQLAlchemy + SQLite (file `backend/taskforge.db`), port **12001**. Token auth via HMAC-signed payload (see `backend/app/security.py`).
- Frontend: React + Vite (dev server proxies `/api` to localhost:12001), port **12000**. Router + Tailwind (v3). Dark slate theme, emerald accent.
- Access hosts: port 12000 = work-1 URL (frontend), port 12001 = work-2 URL (backend).

## Layout
- `backend/app/main.py` — FastAPI app, CORS, router mounts.
- `backend/app/models.py` — User, HIT, Assignment, LedgerEntry, Quiz, QuizResult.
- `backend/app/tasks.py` — task-type registry (bounding-box, classification, categorization, moderation, data-collection, hitl-validation) + server-side answer validation.
- `backend/app/routers/{auth,hits,assignments,extra,quizzes}.py` — endpoints; `routers/deps.py` for auth + approval-rate + quiz-passed helpers.
- `backend/app/seed.py` — idempotent demo seed (users: alice/bob/carol, password `<name>123`, plus a `Quiz` and a bbox HIT gated on it).
- `frontend/src/api.js` — fetch client w/ bearer token; `frontend/src/App.jsx` routes.
- `frontend/src/components/` — Header, Login, RequesterDashboard, CreateHIT, HITDetail, Marketplace, TaskWorkspace, MyWork, Wallet, ImportPredictions, QuizManager, QuizTake, BoundingBoxCanvas.

## Useful commands
- Seed (idempotent, skips if 'alice' exists): `cd backend && python -m app.seed`
- Reset demo data: kill server, `rm backend/taskforge.db`, then seed + restart.
- Server-side tests (no pytest): run sequences with `fastapi.testclient` (needs `httpx`).

## Patterns & gotchas
- Wallets are computed from LedgerEntry rows (auditability).
- Answer validation duplicated server-side in `tasks.py`; UI validation is a nicety only.
- Bounding-box export is COCO-like (images/categories/annotations); other types are generic JSON/CSV.
- Qualification gates at accept time: approval-rate threshold plus required quiz (QuizResult.best passed) both checked in `routers/deps.py`.
- `hitl-validation` HITs store per-item `prediction` from `POST /import/predictions`.
- HIT status: published→closed; Assignment status: accepted→submitted→approved|rejected.

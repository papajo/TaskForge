# PRD: TaskForge — Crowdsourced Microtask Platform for ML Workflows & Business Process Outsourcing

## 1. Introduction

TaskForge is a two-sided microtask marketplace (modeled on Amazon Mechanical Turk) that connects **Requesters** (businesses, ML engineers, researchers) with **Workers** (on-demand human task performers). Requesters decompose large jobs — ML data annotation, model validation, content moderation, categorization, web data collection — into small, independent "HITs" (Human Intelligence Tasks). Workers complete those tasks through guided task UIs; results flow back into the requester's business processes and ML pipelines. The platform covers the two headline use cases:

1. **Machine Learning workflows** — collecting and annotating training data at scale (including bounding-box annotation for computer vision), and Human-in-the-Loop (HITL) validation loops where human feedback validates and retrains models.
2. **Business Process Outsourcing (BPO)** — transforming overwhelming work into manageable microtasks: web/social content moderation, product/image categorization, and data collection from websites or other resources.

## 2. Goals

- Let requesters create, publish, monitor, and close microtask jobs end-to-end.
- Let workers browse available HITs, complete them in fit-for-purpose task UIs, and earn simulated payments.
- Support six task types natively: **bounding-box annotation**, **image/text classification**, **categorization**, **content moderation**, **data collection (form fill)**, **HITL model validation** (review/correct model predictions).
- Provide quality controls: qualification requirements, overlapping/consensus assignments, gold checks, and requester review (approve/reject).
- Make results exportable for ML pipelines (JSON/CSV; COCO-style export for bounding boxes) and importable model predictions for HITL loops.
- Keep a simple simulated wallet ledger so payments, bonuses, and balances are auditable.

## 3. User Stories

### Requester-side

#### US-001: Account and role selection
**Description:** As a user, I want an account with a requester or worker role so the platform shows me the right portal.

**Acceptance Criteria:**
- [ ] Sign-up/login screen with role choice (requester/worker)
- [ ] Session persists across refresh
- [ ] Workers cannot see requester-only actions, and vice versa

#### US-002: Create HIT with task template
**Description:** As a requester, I want to create a HIT by choosing a task type, writing instructions, setting reward and assignments, and attaching items (images/text URLs) so workers know exactly what to do.

**Acceptance Criteria:**
- [ ] HIT creation wizard supports all six task types
- [ ] Fields: title, description/instructions, reward (credits), assignments per HIT, qualification (min approval %, optional tags), items payload
- [ ] Validation prevents publishing with missing fields or fewer than 1 assignment

#### US-003: Publish, monitor, and close HITs
**Description:** As a requester, I want a dashboard listing my HITs with live assignment/submission counts so I can track progress.

**Acceptance Criteria:**
- [ ] HIT list shows status, completed vs. target counts, spend
- [ ] HIT detail page lists each submission with worker and answer payload
- [ ] Requester can close a HIT; closed HITs accept no new assignments

#### US-004: Review submissions (approve/reject)
**Description:** As a requester, I want to approve or reject each submission so only good work is paid.

**Acceptance Criteria:**
- [ ] Pending submissions show approve/reject actions with optional feedback
- [ ] Approved submissions credit the worker's wallet; rejected do not
- [ ] Worker approval-rate stats update on the decision

#### US-005: ML export and HITL import
**Description:** As an ML engineer, I want to export approved annotations (JSON/CSV; COCO-style for bounding boxes) and import model predictions as HITL validation HITs so human corrections can retrain my model.

**Acceptance Criteria:**
- [ ] Export endpoint returns approved submissions per HIT in structured JSON/CSV; bounding-box HITs export COCO-like records (image, boxes, labels)
- [ ] Import endpoint accepts prediction payloads and creates a chainable validation HIT
- [ ] Exported data is downloadable from the requester dashboard

### Worker-side

#### US-006: Browse and accept available HITs
**Description:** As a worker, I want to browse open HITs I'm qualified for and accept an assignment so I can start work.

**Acceptance Criteria:**
- [ ] Marketplace lists available HITs with reward, time estimate hint (title/instructions), and assignments remaining
- [ ] Qualification gating hides or blocks ineligible HITs (below min approval rate requirement)
- [ ] Accepting a HIT creates an in-progress assignment (one assignment per worker per HIT)

#### US-007: Task-specific UIs
**Description:** As a worker, I want a fit-for-purpose UI per task type (e.g., canvas with draggable bounding boxes, moderation approve/reject buttons) so tasks are quick and unambiguous.

**Acceptance Criteria:**
- [ ] Bounding-box renderer: draw/move/delete labeled boxes on an image canvas; box list shows label choices
- [ ] Classification/categorization/moderation renderers: single/multi-choice inputs
- [ ] Data collection renderer: form with labeled fields
- [ ] HITL validation renderer: shows a model prediction (or pre-drawn boxes) for accept/correct
- [ ] All renderers validate required answers before submission

#### US-008: Submit and get paid
**Description:** As a worker, I want to submit my assignment and see my pending/approved earnings so I trust the system.

**Acceptance Criteria:**
- [ ] Submission transitions assignment to submitted with answer payload
- [ ] Approved assignments move credits from pending to available balance in the wallet view
- [ ] My submitted work lists decisions and requester feedback

#### US-009: Wallet and stats
**Description:** As a worker, I want a wallet page showing available/pending balance and my approval rate so I can track earnings and standing.

**Acceptance Criteria:**
- [ ] Wallet shows pending and available totals plus ledger entries (task credits, decisions)
- [ ] Approval rate = approved / (approved + rejected) across submissions

### Quality & HITL loop

#### US-010: Consensus and qualification
**Description:** As a requester, I want overlapping assignments (e.g., 2–3 workers per HIT) and qualification thresholds to control quality.

**Acceptance Criteria:**
- [ ] HIT targets N assignments; each worker can take it once
- [ ] Qualification rules block unqualified workers at accept time
- [ ] Dashboard surfaces agreement for overlapping submissions (for classification-type inputs)

#### US-011: HITL revalidation chain
**Description:** As an ML engineer, I want corrected annotations from validation HITs to export cleanly for retraining, closing the human-in-the-loop cycle.

**Acceptance Criteria:**
- [ ] Validation submissions record accepted-vs-corrected results
- [ ] Export includes final corrected labels/boxes for pipeline consumption

## 4. Functional Requirements

- FR-1: Authentication: role-based (requester/worker) sessions via signed bearer token; a seed demo environment includes pre-made users.
- FR-2: HIT lifecycle: `draft → published → closed`; only published HITs accept assignments; only closed/published HITs show in requester dashboards appropriately.
- FR-3: Assignment lifecycle: `accepted → submitted → approved|rejected`; one assignment per worker per HIT; assignment block prevented when HIT is closed/full.
- FR-4: Six task types registered as renderers and validators: `bounding-box`, `classification`, `categorization`, `moderation`, `data-collection`, `hitl-validation`.
- FR-5: Bounding-box renderer records boxes `{label, x, y, w, h}` plus optional per-item metadata.
- FR-6: Qualification supports a minimum approval rate and optional free-form requirement tags; enforced at assignment-accept time.
- FR-7: Requester approval/rejection flips assignment status and mutates worker wallet (credits on approve) and approval stats.
- FR-8: Wallet ledger records every credit/debit decision; balances are computed from ledger entries (auditability).
- FR-9: Approved-submission export to JSON/CSV; bounding-box HITs export COCO-like annotations.
- FR-10: HITL import: prediction payload (classification label probabilities, or pre-drawn boxes) becomes an `hitl-validation` HIT preserving the source HIT/item references.
- FR-11: Consensus/qualification summary visible on HIT detail for overlapping submissions.
- FR-12: Frontend polls/serves available HIT counts, and hitting "accept" more than the target is blocked server-side.

## 5. Non-Goals (Out of Scope)

- Real payment rails, KYC, or taxation — wallets are simulated credits.
- No real-time websockets; polling or refresh-on-action is acceptable.
- No image hosting/CDN — requesters paste image URLs; demo seeds use public sample images.
- No file upload pipeline (CSV upload of items) in v1 — items are pasted as JSON arrays (paste format documented in UI).
- No full qualification test framework — thresholds and tags only.
- No multi-tenant org structures, teams, or API keys.
- No admin/moderation dashboard beyond requester review.

## 6. Design Considerations

- Two portals in one SPA: a top-level role gate routes to the Requester Dashboard or Worker Marketplace.
- Marketplace card shows reward prominently (credits), assignment slots, and requirement badges.
- Task workspace: instruction panel on the left, task renderer in the center, stroke shortcuts where relevant; bounding-box uses SVG overlay with labeled handles.
- Requester dashboard tables: status chips (published/closed), progress bars (N/M completed), and per-submission review actions inline.
- Palette: dense dark-neutral UI with a single accent (teal/emerald) per the frontend components; readable at data-table density.

## 7. Technical Considerations

- **Backend:** FastAPI + SQLAlchemy + SQLite (file DB per default for easy reset), served on **port 12001** with permissive CORS for the SPA.
- **Frontend:** React (Vite) SPA on **port 12000**, fetch-based API client, role-gated routes, Tailwind for styling.
- **Security:** passwords hashed (pbkdf2 via passlib or equivalent); tokens signed with a secret stored in an env var.
- **ML export determinism:** export derives only from `approved` submissions.
- **Data:** seed script creates demo requester, demo workers, sample HITs of every task type, and sample assignments/submissions.
- **Public ingress:** proxy hosts (`work-1` → 12000 SPA, `work-2` → 12001 API) are the supported access points.

## 8. Success Metrics

- A requester can publish a HIT to the marketplace in under 2 minutes using the wizard.
- A worker completes a classification/moderation item in under 15 seconds and a bounding-box item in under 60 seconds (median on seed tasks).
- 100% of approved submissions are exportable (no schema failures); bounding-box exports match COCO field names.
- HITL cycle demonstrable: import model predictions → validation HITs → corrected export, in under 5 clicks per item batch.

## 9. Open Questions / Assumptions

- **Assumption:** Single-tenant demo with role-based accounts instead of a full multi-tenant SaaS org model (choose A: minimal-viable-but-complete single environment). A multi-tenant org structure is a candidate v2 scope.
- **Assumption:** Simulated wallets and public-URL images (option: real payments/file uploads are explicitly non-goals).
- Should qualification include a true quiz-based test before task access, or is threshold-only acceptable for v1?
- Should CSV upload of items be prioritized over paste-JSON for v1?
- Preferred export schema beyond COCO-like keys for other task types, if a downstream ML pipeline exists?

---

## Implementation Plan

1. **Phase 1 — Foundations:** backend scaffold (FastAPI, SQLAlchemy models, auth/roles), frontend scaffold (Vite + React + Tailwind), role gate, wallet model.
2. **Phase 2 — Marketplace core:** HIT CRUD, assignment accept, task renderers (generic + bounding-box canvas), submission flow with server-side validation.
3. **Phase 3 — Quality & review:** pending queues, approve/reject with feedback, qualification gating, consensus summary.
4. **Phase 4 — ML loop:** JSON/CSV export, COCO-like export, predictions-import to `hitl-validation` HITs, corrected-result export.
5. **Phase 5 — Polish & verify:** seed script, demo flows (end-to-end bounding box + HITL), wallets/stats pages, README. Ports 12000 (SPA) and 12001 (API) with CORS open.

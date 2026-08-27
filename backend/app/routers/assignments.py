import json
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Assignment, HIT, LedgerEntry, User
from ..tasks import validate_answer
from .deps import current_user, quiz_passed, worker_approval_rate

router = APIRouter(prefix="/assignments", tags=["assignments"])


class SubmitBody(BaseModel):
    answers: dict


class ReviewBody(BaseModel):
    feedback: str | None = None


def assignment_update(db: Session, assignment: Assignment):
    return {
        "id": assignment.id,
        "hit_id": assignment.hit_id,
        "status": assignment.status,
        "answers": json.loads(assignment.answers_json or "null"),
        "feedback": assignment.feedback,
        "submitted_at": assignment.submitted_at,
        "reviewed_at": assignment.reviewed_at,
    }


@router.post("/{hit_id}/accept")
def accept(hit_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "worker":
        raise HTTPException(403, "workers only")
    hit = db.query(HIT).filter(HIT.id == hit_id).first()
    if not hit:
        raise HTTPException(404, "HIT not found")
    if hit.status != "published":
        raise HTTPException(400, "HIT is closed")
    stats = worker_approval_rate(db, user.id)
    if hit.min_approval_rate is not None and (stats["score"] is None or stats["score"] < hit.min_approval_rate):
        raise HTTPException(403, "qualification threshold not met")
    if hit.required_quiz_id is not None and not quiz_passed(db, user.id, hit.required_quiz_id):
        raise HTTPException(403, "quiz qualification not passed")
    existing = db.query(Assignment).filter(Assignment.hit_id == hit_id, Assignment.worker_id == user.id).first()
    if existing:
        raise HTTPException(400, "already assigned")
    taken = db.query(Assignment).filter(Assignment.hit_id == hit_id).count()
    if taken >= hit.target_assignments:
        raise HTTPException(400, "no assignments remaining")
    assignment = Assignment(hit_id=hit_id, worker_id=user.id, status="accepted")
    db.add(assignment)
    db.commit()
    return assignment_update(db, assignment)


@router.post("/{assignment_id}/submit")
def submit(assignment_id: int, body: SubmitBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(404, "assignment not found")
    if user.role != "worker" or assignment.worker_id != user.id:
        raise HTTPException(403, "not your assignment")
    if assignment.status != "accepted":
        raise HTTPException(400, "already submitted")
    hit = db.query(HIT).filter(HIT.id == assignment.hit_id).first()
    labels = json.loads(hit.labels_json or "[]")
    form_fields = json.loads(hit.form_fields_json) if hit.form_fields_json else []
    err = validate_answer(hit.task_type, body.answers, labels, form_fields)
    if err:
        raise HTTPException(400, err)
    items = json.loads(hit.items_json or "[]")
    item_ids = {str(i.get("id")) for i in items}
    if {str(k) for k in body.answers.keys()} != item_ids:
        raise HTTPException(400, "answers must cover every item exactly once")
    assignment.answers_json = json.dumps(body.answers)
    assignment.status = "submitted"
    assignment.submitted_at = int(time.time())
    db.commit()
    return assignment_update(db, assignment)


@router.get("/mine")
def my_assignments(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "worker":
        raise HTTPException(403, "workers only")
    rows = db.query(Assignment).filter(Assignment.worker_id == user.id).order_by(Assignment.id.desc()).all()
    hits = {h.id: h.title for h in db.query(HIT).all()}
    out = []
    for a in rows:
        data = assignment_update(db, a)
        data["hit_title"] = hits.get(a.hit_id)
        out.append(data)
    return out


@router.post("/{assignment_id}/{decision}")
def review(assignment_id: int, decision: str, body: ReviewBody | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "requester":
        raise HTTPException(403, "requesters only")
    status_map = {"approve": "approved", "reject": "rejected"}
    if decision not in status_map:
        raise HTTPException(400, "decision must be approve or reject")
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(404, "assignment not found")
    hit = db.query(HIT).filter(HIT.id == assignment.hit_id).first()
    if hit.requester_id != user.id:
        raise HTTPException(403, "not your HIT")
    if assignment.status != "submitted":
        raise HTTPException(400, "only submitted assignments can be reviewed")
    assignment.status = status_map[decision]
    assignment.reviewed_at = int(time.time())
    if body and body.feedback:
        assignment.feedback = body.feedback
    if decision == "approve":
        db.add(LedgerEntry(user_id=assignment.worker_id, assignment_id=assignment.id, amount_cents=hit.reward_cents, kind="credit"))
    db.commit()
    return assignment_update(db, assignment)

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Assignment, HIT, User
from ..tasks import TASK_TYPES, parse_items
from .deps import current_user, worker_approval_rate

router = APIRouter(prefix="/hits", tags=["hits"])


class CreateHITBody(BaseModel):
    title: str
    description: str
    instructions: str
    task_type: str
    reward_cents: int = 1
    target_assignments: int = 1
    min_approval_rate: int | None = None
    required_tags: str | None = None
    items: list = []
    labels: list = []
    form_fields: list | None = None


def hit_counts(db: Session, hit_id: int):
    assignments = db.query(Assignment).filter(Assignment.hit_id == hit_id).all()
    submitted = [a for a in assignments if a.status in ("submitted", "approved", "rejected")]
    pending = [a for a in assignments if a.status == "submitted"]
    approved = [a for a in assignments if a.status == "approved"]
    return {
        "total": len(assignments),
        "submitted": len(submitted),
        "pending_review": len(pending),
        "approved": len(approved),
    }


def hit_dict(db: Session, hit: HIT):
    counts = hit_counts(db, hit.id)
    payload = {
        "id": hit.id,
        "requester_id": hit.requester_id,
        "title": hit.title,
        "description": hit.description,
        "instructions": hit.instructions,
        "task_type": hit.task_type,
        "reward_cents": hit.reward_cents,
        "target_assignments": hit.target_assignments,
        "min_approval_rate": hit.min_approval_rate,
        "required_tags": hit.required_tags,
        "status": hit.status,
        "created_at": hit.created_at,
        "counts": counts,
        "remaining": max(hit.target_assignments - counts["total"], 0),
        "items": json.loads(hit.items_json or "[]"),
        "labels": json.loads(hit.labels_json or "[]"),
        "form_fields": json.loads(hit.form_fields_json) if hit.form_fields_json else None,
    }
    return payload


@router.post("")
def create_hit(body: CreateHITBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "requester":
        raise HTTPException(403, "only requesters create HITs")
    if body.task_type not in TASK_TYPES:
        raise HTTPException(400, f"task_type must be one of {TASK_TYPES}")
    if not body.title.strip() or not body.description.strip() or not body.instructions.strip():
        raise HTTPException(400, "title, description and instructions are required")
    if body.target_assignments < 1:
        raise HTTPException(400, "target_assignments must be at least 1")
    if body.reward_cents < 1:
        raise HTTPException(400, "reward must be at least 1 credit")
    try:
        items = parse_items(json.dumps(body.items))
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not items:
        raise HTTPException(400, "at least one item required")
    hit = HIT(
        requester_id=user.id,
        title=body.title.strip(),
        description=body.description,
        instructions=body.instructions,
        task_type=body.task_type,
        reward_cents=body.reward_cents,
        target_assignments=body.target_assignments,
        min_approval_rate=body.min_approval_rate,
        required_tags=body.required_tags,
        items_json=json.dumps(body.items),
        labels_json=json.dumps(body.labels),
        form_fields_json=json.dumps(body.form_fields) if body.form_fields else None,
    )
    db.add(hit)
    db.commit()
    return hit_dict(db, hit)


@router.get("/mine")
def my_hits(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "requester":
        raise HTTPException(403, "requester only")
    hits = db.query(HIT).filter(HIT.requester_id == user.id).order_by(HIT.id.desc()).all()
    return [hit_dict(db, h) for h in hits]


@router.get("/available")
def available_hits(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "worker":
        raise HTTPException(403, "worker only")
    stats = worker_approval_rate(db, user.id)
    result = []
    hits = db.query(HIT).filter(HIT.status == "published").order_by(HIT.id.desc()).all()
    my_assignments = db.query(Assignment).filter(Assignment.worker_id == user.id).all()
    mine_by_hit = {a.hit_id for a in my_assignments}
    for h in hits:
        counts = hit_dict(db, h)
        qualified = True
        reason = None
        if h.min_approval_rate is not None and (stats["score"] is None or stats["score"] < h.min_approval_rate):
            qualified = False
            reason = f"requires {h.min_approval_rate}% approval rate"
        if h.id in mine_by_hit:
            qualified = False
            reason = "already assigned"
        if counts["remaining"] <= 0:
            qualified = False
            reason = "no assignments left"
        item = hit_dict(db, h)
        item["eligible"] = qualified
        item["block_reason"] = reason
        result.append(item)
    return result


@router.get("/{hit_id}")
def hit_detail(hit_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    hit = db.query(HIT).filter(HIT.id == hit_id).first()
    if not hit:
        raise HTTPException(404, "HIT not found")
    data = hit_dict(db, hit)
    if user.role == "requester" and hit.requester_id == user.id:
        assignments = db.query(Assignment).filter(Assignment.hit_id == hit.id).all()
        workers = {u.id: u.username for u in db.query(User).all()}
        data["submissions"] = [
            {
                "id": a.id,
                "worker": workers.get(a.worker_id, str(a.worker_id)),
                "worker_id": a.worker_id,
                "status": a.status,
                "answers": json.loads(a.answers_json or "null"),
                "feedback": a.feedback,
                "submitted_at": a.submitted_at,
                "reviewed_at": a.reviewed_at,
            }
            for a in assignments
        ]
    return data


@router.post("/{hit_id}/close")
def close_hit(hit_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    hit = db.query(HIT).filter(HIT.id == hit_id).first()
    if not hit:
        raise HTTPException(404, "HIT not found")
    if user.role != "requester" or hit.requester_id != user.id:
        raise HTTPException(403, "only the owning requester can close")
    hit.status = "closed"
    db.commit()
    return hit_dict(db, hit)

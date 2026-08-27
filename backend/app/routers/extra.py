import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Assignment, HIT, LedgerEntry, User
from ..tasks import TASK_TYPES
from .deps import current_user, worker_approval_rate

router = APIRouter(tags=["extra"])


@router.get("/wallet")
def wallet(user: User = Depends(current_user), db: Session = Depends(get_db)):
    entries = db.query(LedgerEntry).filter(LedgerEntry.user_id == user.id).order_by(LedgerEntry.id.desc()).all()
    total = sum(e.amount_cents for e in entries)
    stats = None
    if user.role == "worker":
        stats = worker_approval_rate(db, user.id)
    return {
        "balance_cents": total,
        "stats": stats,
        "entries": [
            {"id": e.id, "assignment_id": e.assignment_id, "amount_cents": e.amount_cents, "kind": e.kind}
            for e in entries
        ],
    }


def build_export(db: Session, hit: HIT, fmt: str):
    approved = db.query(Assignment).filter(
        Assignment.hit_id == hit.id, Assignment.status == "approved"
    ).all()
    labels = json.loads(hit.labels_json or "[]")
    items = json.loads(hit.items_json or "[]")
    if hit.task_type == "bounding-box":
        annotations = {cat: idx + 1 for idx, cat in enumerate(labels)}
        images = []
        records = []
        rid = 1
        for item in items:
            images.append({"id": item["id"], "file_name": item.get("url", item.get("text", ""))})
        for assignment in approved:
            answers = json.loads(assignment.answers_json or "{}")
            for item_id, boxes in answers.items():
                for b in boxes:
                    records.append({
                        "id": rid,
                        "image_id": item_id,
                        "category_id": annotations.get(b.get("label")),
                        "bbox": [b.get("x"), b.get("y"), b.get("w"), b.get("h")],
                        "segmentation": [],
                    })
                    rid += 1
        payload = {
            "images": images,
            "categories": [{"id": v, "name": k} for k, v in annotations.items()],
            "annotations": records,
        }
    else:
        records = []
        for assignment in approved:
            answers = json.loads(assignment.answers_json or "{}")
            records.append({"assignment_id": assignment.id, "worker": assignment.worker_id, "answers": answers})
        payload = {"hit_id": hit.id, "task_type": hit.task_type, "records": records}
    if fmt == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        if hit.task_type == "bounding-box":
            writer.writerow(["image_id", "label", "x", "y", "w", "h"])
            for assignment in approved:
                answers = json.loads(assignment.answers_json or "{}")
                for item_id, boxes in answers.items():
                    for b in boxes:
                        writer.writerow([item_id, b.get("label"), b.get("x"), b.get("y"), b.get("w"), b.get("h")])
        else:
            writer.writerow(["assignment_id", "worker", "answers"])
            for assignment in approved:
                writer.writerow([assignment.id, assignment.worker_id, json.dumps(json.loads(assignment.answers_json or "{}"))])
        buf.seek(0)
        return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=hit{hit.id}-export.csv"})
    return payload


@router.get("/export/{hit_id}")
def export_hit(hit_id: int, format: str = "json", user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "requester":
        raise HTTPException(403, "requesters only")
    hit = db.query(HIT).filter(HIT.id == hit_id).first()
    if not hit or hit.requester_id != user.id:
        raise HTTPException(404, "HIT not found")
    if format not in ("json", "csv"):
        raise HTTPException(400, "format must be json or csv")
    return build_export(db, hit, format)


class ImportBody(BaseModel):
    title: str
    description: str
    instructions: str
    reward_cents: int = 1
    target_assignments: int = 1
    min_approval_rate: int | None = None
    required_tags: str | None = None
    predictions: list


@router.post("/import/predictions")
def import_predictions(body: ImportBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "requester":
        raise HTTPException(403, "requesters only")
    if not body.predictions:
        raise HTTPException(400, "predictions list must not be empty")
    items = []
    for p in body.predictions:
        if not isinstance(p, dict) or "item_id" not in p:
            raise HTTPException(400, "each prediction needs item_id")
        value = {"id": p["item_id"], "prediction": p}
        if "url" in p:
            value["url"] = p["url"]
        if "text" in p:
            value["text"] = p["text"]
        items.append(value)
    hit = HIT(
        requester_id=user.id,
        title=body.title.strip(),
        description=body.description,
        instructions=body.instructions,
        task_type="hitl-validation",
        reward_cents=body.reward_cents,
        target_assignments=body.target_assignments,
        min_approval_rate=body.min_approval_rate,
        required_tags=body.required_tags,
        items_json=json.dumps(items),
        labels_json=json.dumps(sorted({p.get("label") for p in body.predictions if p.get("label")} | set())),
        form_fields_json=None,
    )
    db.add(hit)
    db.commit()
    db.refresh(hit)
    return {
        "id": hit.id,
        "task_type": "hitl-validation",
        "predictions": body.predictions,
    }


@router.get("/hits/{hit_id}/consensus")
def consensus(hit_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "requester":
        raise HTTPException(403, "requesters only")
    hit = db.query(HIT).filter(HIT.id == hit_id).first()
    if not hit or hit.requester_id != user.id:
        raise HTTPException(404, "HIT not found")
    if hit.task_type in ("classification", "categorization", "moderation"):
        relevant = db.query(Assignment).filter(Assignment.hit_id == hit.id, Assignment.status.in_(["submitted", "approved", "rejected"])).all()
        by_item = {}
        for a in relevant:
            answers = json.loads(a.answers_json or "{}")
            for item_id, value in answers.items():
                choice = value.get("decision") if hit.task_type == "moderation" and isinstance(value, dict) else value
                by_item.setdefault(item_id, []).append(choice)
        summary = {"total_items": len(by_item), "agreeing_items": 0, "items": {}}
        for item_id, choices in by_item.items():
            agree = len(set(choices)) == 1
            if agree:
                summary["agreeing_items"] += 1
            summary["items"][item_id] = {"choices": choices, "agreement": agree}
        return summary
    return {"total_items": 0, "items": {}, "note": "Consensus only supported for choice-based task types."}

import json

from .db import Base, SessionLocal, engine
from .models import Assignment, HIT, LedgerEntry, User
from .security import hash_password

Base.metadata.create_all(bind=engine)


def run():
    db = SessionLocal()
    if db.query(User).filter(User.username == "alice").first():
        return
    alice = User(username="alice", password_hash=hash_password("alice123"), role="requester")
    bob = User(username="bob", password_hash=hash_password("bob123"), role="worker")
    carol = User(username="carol", password_hash=hash_password("carol123"), role="worker")
    db.add_all([alice, bob, carol])
    db.commit()
    db.refresh(alice)
    db.refresh(bob)

    def hit(title, desc, instr, ttype, reward, target, items, labels=None, fields=None, approval=None, tags=None):
        h = HIT(
            requester_id=alice.id,
            title=title,
            description=desc,
            instructions=instr,
            task_type=ttype,
            reward_cents=reward,
            target_assignments=target,
            min_approval_rate=approval,
            required_tags=tags,
            items_json=json.dumps(items),
            labels_json=json.dumps(labels or []),
            form_fields_json=json.dumps(fields) if fields else None,
        )
        db.add(h)
        db.commit()
        db.refresh(h)
        return h

    bbox = hit(
        "Draw bounding boxes on street objects",
        "Annotate objects to train our computer vision model.",
        "Draw a box around every object from the label list. Use the tightest box that fully contains the object.",
        "bounding-box",
        30,
        5,
        [
            {"id": 1, "url": "https://picsum.photos/seed/street1/640/360"},
            {"id": 2, "url": "https://picsum.photos/seed/street2/640/360"},
        ],
        labels=["car", "pedestrian", "bicycle", "traffic sign"],
    )

    classification = hit(
        "Classify product sentiment",
        "Label customer review snippets for our NLP model.",
        "Read the snippet and choose the sentiment label.",
        "classification",
        5,
        3,
        [
            {"id": 1, "text": "This phone case is ugly, scratched after two days."},
            {"id": 2, "text": "Cable works perfectly, charges fast."},
            {"id": 3, "text": "Absolutely will order again. Five stars."},
        ],
        labels=["positive", "negative", "neutral"],
    )

    moderation = hit(
        "Moderate public comments",
        "Screen user-generated comments against our policy.",
        "Approve or reject each comment. Reject if it contains hate, spam, or personal data.",
        "moderation",
        4,
        4,
        [
            {"id": 1, "text": "Great video, really enjoyed it!"},
            {"id": 2, "text": "VI@GRA cheapest pills here . com"},
            {"id": 3, "text": "Call me at 555-123-4567 for details"},
        ],
        labels=["approve", "reject"],
    )

    collection = hit(
        "Collect restaurant websites",
        "Gather structured data from the restaurant pages below.",
        "Fill in all fields for each restaurant using its public web page.",
        "data-collection",
        15,
        3,
        [
            {"id": 1, "text": "OpenRestaurant dinner menu page"},
            {"id": 2, "text": "CityCafe homepage"},
        ],
        fields=["cuisine", "phone", "address"],
    )

    hitl = hit(
        "Validate object detector predictions (HITL)",
        "Our model pre-labeled objects; correct or accept its output.",
        "Accept predictions that are correct; correct boxes/labels when wrong.",
        "hitl-validation",
        25,
        3,
        [
            {"id": 1, "url": f"https://picsum.photos/seed/{7+1}/640/360", "prediction": {"label": "car", "confidence": 0.92}},
            {"id": 2, "url": f"https://picsum.photos/seed/{7+2}/640/360", "prediction": {"label": "bicycle", "confidence": 0.58}},
        ],
        labels=["car", "pedestrian", "bicycle", "traffic sign"],
    )

    # Bob completes one moderation submission; Alice approves to seed the wallet/stats.
    assignment = Assignment(hit_id=moderation.id, worker_id=bob.id, status="submitted", answers_json=json.dumps({
        "1": {"decision": "approve"}, "2": {"decision": "reject", "reason": "spam"}, "3": {"decision": "reject", "reason": "personal data"},
    }), submitted_at=1)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    assignment.status = "approved"
    db.add(LedgerEntry(user_id=bob.id, assignment_id=assignment.id, amount_cents=moderation.reward_cents, kind="credit"))
    db.commit()
    db.close()


if __name__ == "__main__":
    run()
    print("Seeded demo data: alice (requester), bob/carol (workers)")

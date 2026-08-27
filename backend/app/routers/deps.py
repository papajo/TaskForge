from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..security import read_token


def current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "missing token")
    payload = read_token(authorization.split(" ", 1)[1])
    if not payload:
        raise HTTPException(401, "invalid token")
    user = db.query(User).filter(User.id == payload["uid"]).first()
    if not user:
        raise HTTPException(401, "user not found")
    return user


def worker_approval_rate(db: Session, worker_id: int):
    from ..models import Assignment
    approved = db.query(Assignment).filter(Assignment.worker_id == worker_id, Assignment.status == "approved").count()
    rejected = db.query(Assignment).filter(Assignment.worker_id == worker_id, Assignment.status == "rejected").count()
    total = approved + rejected
    rate = round(100 * approved / total) if total else None
    return {"approved": approved, "rejected": rejected, "score": rate}


def quiz_passed(db: Session, worker_id: int, quiz_id: int) -> bool:
    from ..models import QuizResult
    result = db.query(QuizResult).filter(
        QuizResult.worker_id == worker_id,
        QuizResult.quiz_id == quiz_id,
        QuizResult.passed == 1,
    ).first()
    return result is not None

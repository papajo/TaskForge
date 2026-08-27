from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..security import create_token, hash_password, read_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthBody(BaseModel):
    username: str
    password: str
    role: str | None = None


@router.post("/register")
def register(body: AuthBody, db: Session = Depends(get_db)):
    role = body.role or "worker"
    if role not in ("requester", "worker"):
        raise HTTPException(400, "role must be requester or worker")
    if not body.username or not body.password:
        raise HTTPException(400, "username and password required")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(409, "username taken")
    user = User(username=body.username, password_hash=hash_password(body.password), role=role)
    db.add(user)
    db.commit()
    return {"token": create_token(user.id, user.role), "user": {"id": user.id, "username": user.username, "role": user.role}}


@router.post("/login")
def login(body: AuthBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "invalid credentials")
    return {"token": create_token(user.id, user.role), "user": {"id": user.id, "username": user.username, "role": user.role}}

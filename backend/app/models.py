import time
from sqlalchemy import Column, Integer, String, Text

from .db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # requester | worker


class HIT(Base):
    __tablename__ = "hits"
    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    instructions = Column(Text, nullable=False)
    task_type = Column(String, nullable=False)
    reward_cents = Column(Integer, nullable=False, default=1)
    target_assignments = Column(Integer, nullable=False, default=1)
    min_approval_rate = Column(Integer, nullable=True)
    required_tags = Column(String, nullable=True)
    required_quiz_id = Column(Integer, nullable=True)
    status = Column(String, nullable=False, default="published")  # published | closed
    items_json = Column(Text, nullable=False, default="[]")
    labels_json = Column(Text, nullable=False, default="[]")
    form_fields_json = Column(Text, nullable=True)
    created_at = Column(Integer, default=lambda: int(time.time()))


class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, index=True, nullable=False)
    title = Column(String, nullable=False)
    questions_json = Column(Text, nullable=False)  # [{q, options, answer}]
    pass_score_pct = Column(Integer, nullable=False, default=70)
    created_at = Column(Integer, default=lambda: int(time.time()))


class QuizResult(Base):
    __tablename__ = "quiz_results"
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, index=True, nullable=False)
    worker_id = Column(Integer, index=True, nullable=False)
    score_pct = Column(Integer, nullable=False)
    passed = Column(Integer, nullable=False)  # 1 | 0
    taken_at = Column(Integer, default=lambda: int(time.time()))


class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True, index=True)
    hit_id = Column(Integer, index=True, nullable=False)
    worker_id = Column(Integer, index=True, nullable=False)
    status = Column(String, nullable=False, default="accepted")  # accepted | submitted | approved | rejected
    answers_json = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)
    created_at = Column(Integer, default=lambda: int(time.time()))
    submitted_at = Column(Integer, nullable=True)
    reviewed_at = Column(Integer, nullable=True)


class LedgerEntry(Base):
    __tablename__ = "ledger"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    assignment_id = Column(Integer, nullable=True)
    amount_cents = Column(Integer, nullable=False)
    kind = Column(String, nullable=False)  # credit | debit | note
    created_at = Column(Integer, default=lambda: int(time.time()))

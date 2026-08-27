import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Quiz, QuizResult, User
from .deps import current_user

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


class QuizBody(BaseModel):
    title: str
    questions: list
    pass_score_pct: int = 70


def validate_questions(questions: list) -> list | None:
    if not questions:
        return "at least one question required"
    for q in questions:
        if not isinstance(q, dict) or not q.get("q"):
            return "each question needs a 'q' text"
        options = q.get("options")
        if not isinstance(options, list) or len(options) < 2:
            return f"question '{q.get('q')}' needs at least two options"
        if not isinstance(q.get("answer"), int) or not (0 <= q["answer"] < len(options)):
            return f"question '{q.get('q')}' has an invalid answer index"
    return None


@router.post("")
def create_quiz(body: QuizBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "requester":
        raise HTTPException(403, "requesters only")
    if not body.title.strip():
        raise HTTPException(400, "title required")
    if not (1 <= body.pass_score_pct <= 100):
        raise HTTPException(400, "pass_score_pct must be between 1 and 100")
    err = validate_questions(body.questions)
    if err:
        raise HTTPException(400, err)
    quiz = Quiz(creator_id=user.id, title=body.title.strip(), questions_json=json.dumps(body.questions), pass_score_pct=body.pass_score_pct)
    db.add(quiz)
    db.commit()
    return {"id": quiz.id, "title": quiz.title, "pass_score_pct": quiz.pass_score_pct, "questions": body.questions}


@router.get("")
def list_quizzes(user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(Quiz)
    if user.role == "requester":
        query = query.filter(Quiz.creator_id == user.id)
    quizzes = query.order_by(Quiz.id.desc()).all()
        # for workers, enrich with own result status
    results = []
    my_results = {}
    if user.role == "worker":
        for r in db.query(QuizResult).filter(QuizResult.worker_id == user.id).all():
            my_results[r.quiz_id] = {"score_pct": r.score_pct, "passed": bool(r.passed)}
    for q in quizzes:
        item = {"id": q.id, "title": q.title, "pass_score_pct": q.pass_score_pct, "question_count": len(json.loads(q.questions_json or "[]"))}
        if user.role == "worker":
            item["my_result"] = my_results.get(q.id)
        results.append(item)
    return results


class TakeAnswers(BaseModel):
    answers: list


@router.get("/{quiz_id}/take")
def take_quiz(quiz_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "worker":
        raise HTTPException(403, "workers only")
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "quiz not found")
    questions = [
        {"q": q.get("q"), "options": q.get("options")}
        for q in json.loads(quiz.questions_json or "[]")
    ]
    prior = db.query(QuizResult).filter(QuizResult.quiz_id == quiz_id, QuizResult.worker_id == user.id).first()
    return {
        "id": quiz.id,
        "title": quiz.title,
        "pass_score_pct": quiz.pass_score_pct,
        "questions": questions,
        "prior_result": {"score_pct": prior.score_pct, "passed": bool(prior.passed)} if prior else None,
    }


@router.post("/{quiz_id}/submit")
def submit_quiz(quiz_id: int, body: TakeAnswers, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "worker":
        raise HTTPException(403, "workers only")
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "quiz not found")
    questions = json.loads(quiz.questions_json or "[]")
    if len(body.answers) != len(questions):
        raise HTTPException(400, "answer every question")
    correct = 0
    for i, q in enumerate(questions):
        if body.answers[i] == q.get("answer"):
            correct += 1
    score_pct = round(100 * correct / len(questions)) if questions else 0
    passed = score_pct >= quiz.pass_score_pct
    existing = db.query(QuizResult).filter(QuizResult.quiz_id == quiz_id, QuizResult.worker_id == user.id).first()
    if existing:
        existing.score_pct = score_pct
        existing.passed = 1 if passed else 0
    else:
        db.add(QuizResult(quiz_id=quiz_id, worker_id=user.id, score_pct=score_pct, passed=1 if passed else 0))
    db.commit()
    return {"score_pct": score_pct, "passed": passed, "pass_score_pct": quiz.pass_score_pct, "correct": correct, "total": len(questions)}

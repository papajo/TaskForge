from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine
from .routers import assignments, auth, extra, hits, quizzes

Base.metadata.create_all(bind=engine)

app = FastAPI(title="TaskForge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(hits.router)
app.include_router(assignments.router)
app.include_router(extra.router)
app.include_router(quizzes.router)


@app.get("/health")
def health():
    return {"ok": True}

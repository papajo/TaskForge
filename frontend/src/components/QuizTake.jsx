import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";

export default function QuizTake() {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    api.takeQuiz(quizId).then((q) => { setQuiz(q); setAnswers(q.questions.map(() => null)); }).catch((e) => setError(e.message));
  }, [quizId]);

  async function submit(e) {
    e.preventDefault();
    if (answers.some((a) => a === null)) { setError("Answer every question"); return; }
    try {
      const res = await api.submitQuiz(quizId, answers);
      setResult(res);
    } catch (e2) {
      setError(e2.message);
    }
  }

  if (!quiz) return <div className="p-4 text-slate-400">{error || "Loading…"}</div>;

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-xl font-bold mb-2">{quiz.title}</h1>
        <p className={result.passed ? "text-emerald-400" : "text-red-400"}>
          Score {result.score_pct}% (needed {result.pass_score_pct}%) — {result.passed ? "passed" : "not passed"}
        </p>
        <p className="text-sm text-slate-400 mt-2">{result.correct} / {result.total} correct</p>
        <div className="flex gap-3 mt-4">
          {!result.passed && <button onClick={() => setResult(null)} className="bg-slate-800 px-4 py-2 rounded">Retry</button>}
          <button onClick={() => nav("/marketplace")} className="bg-emerald-600 px-4 py-2 rounded">Back to marketplace</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-1">{quiz.title}</h1>
      <p className="text-sm text-slate-400 mb-4">Passing score: {quiz.pass_score_pct}%</p>
      {quiz.prior_result && <p className="text-xs text-slate-500 mb-4">Previous attempt: {quiz.prior_result.score_pct}% ({quiz.prior_result.passed ? "passed" : "not passed"})</p>}
      <form onSubmit={submit} className="grid gap-3">
        {quiz.questions.map((q, qi) => (
          <div key={qi} className="bg-slate-900 border border-slate-800 rounded p-3">
            <p className="text-sm font-medium mb-2">{q.q}</p>
            {q.options.map((opt, oi) => (
              <label key={oi} className="flex items-center gap-2 text-sm py-0.5">
                <input type="radio" name={`q${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))} />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        ))}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="bg-emerald-600 hover:bg-emerald-500 p-2 rounded font-medium">Submit quiz</button>
      </form>
    </div>
  );
}

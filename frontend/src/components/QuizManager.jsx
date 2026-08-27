import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function QuizManager() {
  const [quizzes, setQuizzes] = useState([]);
  const [title, setTitle] = useState("");
  const [pass, setPass] = useState(70);
  const [questionsText, setQuestionsText] = useState("");
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  function load() {
    api.listQuizzes().then(setQuizzes).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  function example() {
    setQuestionsText(JSON.stringify([
      { q: "What makes a good bounding box?", options: ["cover the whole image", "tightly contain the object", "partially overlap"], answer: 1 },
      { q: "If spam, choose…", options: ["approve", "reject"], answer: 1 },
    ]));
    setHint("Questions: JSON array of {q, options, answer} where answer is the 0-based index of the correct option.");
  }

  async function create(e) {
    e.preventDefault();
    setError("");
    let questions;
    try {
      questions = JSON.parse(questionsText || "[]");
    } catch (e2) {
      setError(`Questions JSON invalid: ${e2.message}`);
      return;
    }
    try {
      await api.createQuiz(title, questions, Number(pass));
      setTitle("");
      setPass(70);
      setQuestionsText("");
      setHint("");
      load();
    } catch (e3) {
      setError(e3.message);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Qualification Quizzes</h1>
      <div className="grid gap-3 mb-6">
        {quizzes.map((q) => (
          <div key={q.id} className="bg-slate-900 border border-slate-800 rounded p-3 text-sm">
            <span className="font-medium">{q.title}</span>
            <span className="text-slate-400"> · {q.question_count} questions · pass at {q.pass_score_pct}%</span>
          </div>
        ))}
        {!quizzes.length && <p className="text-slate-500 text-sm">No quizzes yet. Create one below.</p>}
      </div>
      <h2 className="font-semibold mb-3">Create quiz</h2>
      <form onSubmit={create} className="grid gap-3">
        <input placeholder="Quiz title" required value={title} onChange={(e) => setTitle(e.target.value)} className="p-2 rounded bg-slate-800 border border-slate-700" />
        <label className="text-sm">Pass score (%)
          <input type="number" min="1" max="100" value={pass} onChange={(e) => setPass(e.target.value)} className="p-2 rounded bg-slate-800 border border-slate-700 w-24 ml-2" />
        </label>
        <label className="text-sm flex justify-between">Questions (JSON)
          <button type="button" onClick={example} className="text-emerald-400 text-xs">insert example</button>
        </label>
        <textarea rows={7} required value={questionsText} onChange={(e) => setQuestionsText(e.target.value)} className="p-2 rounded bg-slate-800 border border-slate-700 font-mono text-sm" placeholder='[{"q":"...","options":["a","b"],"answer":1}]' />
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="bg-emerald-600 hover:bg-emerald-500 p-2 rounded font-medium">Create quiz</button>
      </form>
    </div>
  );
}

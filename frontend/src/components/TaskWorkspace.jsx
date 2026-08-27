import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BoundingBoxCanvas from "./BoundingBoxCanvas.jsx";
import { api } from "../api.js";

export default function TaskWorkspace() {
  const { hitId, assignmentId } = useParams();
  const [hit, setHit] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    api.hit(hitId).then((data) => {
      setHit(data);
      // prefill answers shells
      const init = {};
      for (const item of data.items || []) {
        if (data.task_type === "bounding-box") init[item.id] = [];
        else if (data.task_type === "moderation") init[item.id] = { decision: "approve" };
        else if (data.task_type === "data-collection") init[item.id] = {};
        else if (data.task_type === "hitl-validation") init[item.id] = { decision: "accept" };
        else init[item.id] = "";
      }
      setAnswers(init);
    }).catch((e) => setError(e.message));
  }, [hitId]);

  function setItem(itemId, value) {
    setAnswers({ ...answers, [itemId]: value });
  }

  async function doSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.submit(assignmentId, answers);
      setDone(true);
      nav("/mywork");
    } catch (e2) {
      setError(e2.message);
    }
  }

  if (!hit) return <div className="p-4 text-slate-400">{error || "Loading..."}</div>;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-bold">{hit.title}</h1>
      <p className="text-slate-400 text-sm mb-4 whitespace-pre-wrap">{hit.instructions}</p>
      <form onSubmit={doSubmit} className="grid gap-6">
        {(hit.items || []).map((item) => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded p-4">
            {item.url && hit.task_type !== "bounding-box" && (
              <img src={item.url} alt="" className="max-w-xl rounded mb-3" />
            )}
            {item.text && <p className="mb-3 text-slate-200">{item.text}</p>}

            {hit.task_type === "bounding-box" && (
              <BoundingBoxCanvas item={item} labels={hit.labels || []} value={answers[item.id] || []} onChange={(v) => setItem(item.id, v)} />
            )}

            {["classification", "categorization"].includes(hit.task_type) && (
              <div className="flex gap-3 flex-wrap">
                {(hit.labels || []).map((label) => (
                  <label key={label} className="text-sm bg-slate-800 px-3 py-1 rounded">
                    <input type="radio" checked={answers[item.id] === label} onChange={() => setItem(item.id, label)} className="mr-1" />
                    {label}
                  </label>
                ))}
              </div>
            )}

            {hit.task_type === "moderation" && (
              <div className="flex gap-3 items-center flex-wrap">
                {["approve", "reject"].map((decision) => (
                  <label key={decision} className="text-sm bg-slate-800 px-3 py-1 rounded">
                    <input type="radio" checked={answers[item.id]?.decision === decision} onChange={() => setItem(item.id, { decision, reason: answers[item.id]?.reason })} className="mr-1" />
                    {decision}
                  </label>
                ))}
                <input placeholder="reject reason (optional)" value={answers[item.id]?.reason || ""} onChange={(e) => setItem(item.id, { ...answers[item.id], reason: e.target.value })} className="p-1 rounded bg-slate-800 border border-slate-700 text-sm" />
              </div>
            )}

            {hit.task_type === "data-collection" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {(hit.form_fields || []).map((field) => (
                  <label key={field} className="text-sm">
                    {field}
                    <input required value={answers[item.id]?.[field] || ""} onChange={(e) => setItem(item.id, { ...answers[item.id], [field]: e.target.value })} className="p-1 rounded bg-slate-800 border border-slate-700 w-full" />
                  </label>
                ))}
              </div>
            )}

            {hit.task_type === "hitl-validation" && (
              <div className="text-sm">
                <p className="mb-2 text-slate-400">
                  Model prediction: <span className="font-medium text-emerald-300">{item.prediction?.label}</span>
                  {item.prediction?.confidence != null && ` (confidence ${Math.round(item.prediction.confidence * 100)}%)`}
                </p>
                <div className="flex gap-3 items-center flex-wrap">
                  {["accept", "correct"].map((decision) => (
                    <label key={decision} className="bg-slate-800 px-3 py-1 rounded">
                      <input type="radio" checked={answers[item.id]?.decision === decision} onChange={() => setItem(item.id, { decision, correction: null })} className="mr-1" />
                      {decision}
                    </label>
                  ))}
                  {answers[item.id]?.decision === "correct" && (
                    <select value={answers[item.id]?.correction?.label || ""} onChange={(e) => setItem(item.id, { decision: "correct", correction: { label: e.target.value } })} className="p-1 rounded bg-slate-800 border border-slate-700">
                      <option value="">choose corrected label</option>
                      {(hit.labels || []).map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="bg-emerald-600 hover:bg-emerald-500 p-2 rounded font-medium w-fit">Submit work</button>
      </form>
      {done && <p className="text-emerald-400 mt-2">Submitted!</p>}
    </div>
  );
}

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function ImportPredictions() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [reward, setReward] = useState(10);
  const [assignments, setAssignments] = useState(1);
  const [predictionsText, setPredictionsText] = useState('');
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function doImport(e) {
    e.preventDefault();
    setError("");
    let predictions;
    try {
      predictions = JSON.parse(predictionsText || "[]");
    } catch (e2) {
      setError(`Predictions JSON invalid: ${e2.message}`);
      return;
    }
    try {
      const res = await api.import({
        title, description, instructions,
        reward_cents: Number(reward),
        target_assignments: Number(assignments),
        predictions,
      });
      nav(`/hits/${res.id}`);
    } catch (e3) {
      setError(e3.message);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-2">Import Model Predictions (HITL)</h1>
      <p className="text-sm text-slate-400 mb-4">
        Paste predictions JSON (e.g. {`[{"item_id":1,"url":"...","label":"car","confidence":0.9}]`}) to create a validation HIT for human review.
      </p>
      <form onSubmit={doImport} className="grid gap-3">
        <input required placeholder="HIT title" value={title} onChange={(e) => setTitle(e.target.value)} className="p-2 rounded bg-slate-800 border border-slate-700" />
        <textarea required placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="p-2 rounded bg-slate-800 border border-slate-700" />
        <textarea required placeholder="Instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} className="p-2 rounded bg-slate-800 border border-slate-700" />
        <div className="flex gap-4 text-sm">
          <label>Reward (credits) <input type="number" min="1" value={reward} onChange={(e) => setReward(e.target.value)} className="p-2 rounded bg-slate-800 border border-slate-700 w-24" /></label>
          <label>Assignments <input type="number" min="1" value={assignments} onChange={(e) => setAssignments(e.target.value)} className="p-2 rounded bg-slate-800 border border-slate-700 w-24" /></label>
        </div>
        <textarea rows={8} required value={predictionsText} onChange={(e) => setPredictionsText(e.target.value)} className="p-2 rounded bg-slate-800 border border-slate-700 font-mono text-sm" placeholder='[{"item_id":1,"url":"https://...","label":"car","confidence":0.92}]' />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="bg-emerald-600 hover:bg-emerald-500 p-2 rounded font-medium">Create HITL Validation HIT</button>
      </form>
    </div>
  );
}

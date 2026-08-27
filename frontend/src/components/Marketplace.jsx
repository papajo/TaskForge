import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function Marketplace() {
  const [hits, setHits] = useState([]);
  const [error, setError] = useState("");
  const nav = useNavigate();

  function load() {
    api.available().then(setHits).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function accept(id) {
    try {
      const assignment = await api.accept(id);
      nav(`/work/${id}/${assignment.id}`);
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Available HITs</h1>
      {error && <p className="text-red-400">{error}</p>}
      <div className="grid gap-3">
        {hits.map((h) => (
          <div key={h.id} className="bg-slate-900 border border-slate-800 rounded p-4 flex justify-between gap-4">
            <div>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="font-semibold">{h.title}</span>
                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded">{h.task_type}</span>
                {h.min_approval_rate != null && <span className="text-xs bg-indigo-700 px-2 py-0.5 rounded">requires {h.min_approval_rate}% approval</span>}
              </div>
              <p className="text-sm text-slate-400 mt-1">{h.description}</p>
              <p className="text-sm mt-2">reward <span className="text-emerald-400">{h.reward_cents}¢</span> · {h.remaining} slots left</p>
            </div>
            {h.eligible ? (
              <button onClick={() => accept(h.id)} className="shrink-0 bg-emerald-600 px-3 py-1 rounded hover:bg-emerald-500 h-fit">Accept</button>
            ) : (
              <span className="shrink-0 text-slate-500 text-sm h-fit">{h.block_reason}</span>
            )}
          </div>
        ))}
        {!hits.length && !error && <p className="text-slate-500">Nothing available right now.</p>}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function RequesterDashboard() {
  const [hits, setHits] = useState([]);
  const [error, setError] = useState("");

  function load() {
    api.mineHits().then(setHits).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function close(id) {
    try {
      await api.closeHit(id);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">My HITs</h1>
        <Link to="/create" className="bg-emerald-600 px-3 py-1 rounded hover:bg-emerald-500">New HIT</Link>
      </div>
      {error && <p className="text-red-400">{error}</p>}
      <div className="grid gap-3">
        {hits.map((h) => (
          <div key={h.id} className="bg-slate-900 border border-slate-800 rounded p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold">{h.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${h.status === "published" ? "bg-emerald-700" : "bg-slate-700"}`}>{h.status}</span>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded">{h.task_type}</span>
            </div>
            <p className="text-sm text-slate-400 mt-1">{h.description}</p>
            <div className="text-sm mt-2 flex gap-4 flex-wrap">
              <span>{h.counts.submitted}/{h.target_assignments} submitted</span>
              <span>{h.counts.pending_review} pending review</span>
              <span>{h.counts.approved} approved</span>
              <span>reward {h.reward_cents}¢</span>
            </div>
            <div className="mt-3 flex gap-4 text-sm">
              <Link to={`/hits/${h.id}`} className="text-emerald-400">Open</Link>
              {h.status === "published" && <button onClick={() => close(h.id)} className="text-yellow-400">Close</button>}
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/export/${h.id}?format=json`, { headers: { Authorization: `Bearer ${localStorage.getItem("tf_token")}` } });
                    const data = await res.json();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `hit-${h.id}-export.json`;
                    a.click();
                  } catch (e) {
                    alert(String(e));
                  }
                }}
                className="text-slate-300"
              >
                Export JSON
              </button>
            </div>
          </div>
        ))}
        {hits.length === 0 && <p className="text-slate-500">No HITs yet. Create one.</p>}
      </div>
    </div>
  );
}

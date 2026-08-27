import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, downloadExport } from "../api.js";

function ExportMenu({ hitId }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  async function pick(format) {
    setOpen(false);
    setBusy(true);
    try {
      await downloadExport(hitId, format);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="relative inline-block text-left">
      <button onClick={() => setOpen((o) => !o)} disabled={busy} className="text-slate-300 disabled:opacity-50">
        {busy ? "Exporting…" : "Export ▾"}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-28 rounded border border-slate-700 bg-slate-800 shadow">
          <button onClick={() => pick("json")} className="block w-full px-3 py-1 text-left text-sm hover:bg-slate-700">JSON</button>
          <button onClick={() => pick("csv")} className="block w-full px-3 py-1 text-left text-sm hover:bg-slate-700">CSV</button>
        </div>
      )}
    </div>
  );
}

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
              <ExportMenu hitId={h.id} />
            </div>
          </div>
        ))}
        {hits.length === 0 && <p className="text-slate-500">No HITs yet. Create one.</p>}
      </div>
    </div>
  );
}

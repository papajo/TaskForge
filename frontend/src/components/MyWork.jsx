import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function MyWork() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.myAssignments().then(setRows).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">My Work</h1>
      {error && <p className="text-red-400">{error}</p>}
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={r.id} className="bg-slate-900 border border-slate-800 rounded p-4">
            <div className="flex gap-3 items-center flex-wrap">
              <span className="font-medium">{r.hit_title}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${r.status === "approved" ? "bg-emerald-700" : r.status === "rejected" ? "bg-red-700" : "bg-yellow-700"}`}>{r.status}</span>
            </div>
            {r.feedback && <p className="text-sm mt-1 text-slate-400">Requester feedback: {r.feedback}</p>}
            <pre className="text-xs mt-2 bg-slate-950 p-2 rounded overflow-auto max-h-40">{JSON.stringify(r.answers, null, 2)}</pre>
          </div>
        ))}
        {!rows.length && <p className="text-slate-500">No assignments yet. Grab one from the marketplace.</p>}
      </div>
    </div>
  );
}

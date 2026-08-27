import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";

export default function HITDetail() {
  const { id } = useParams();
  const [hit, setHit] = useState(null);
  const [consensus, setConsensus] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [error, setError] = useState("");

  function load() {
    api.hit(id).then((data) => {
      setHit(data);
      if (["classification", "categorization", "moderation"].includes(data.task_type)) {
        api.consensus(id).then(setConsensus).catch(() => {});
      }
    }).catch((e) => setError(e.message));
  }

  useEffect(load, [id]);

  async function decide(aid, decision) {
    try {
      await api.review(aid, decision, feedback[aid] || null);
      setFeedback({ ...feedback, [aid]: "" });
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  if (!hit) return <div className="p-4 text-slate-400">{error || "Loading..."}</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{hit.title}</h1>
          <p className="text-slate-400 text-sm mt-1">{hit.description}</p>
        </div>
        {hit.status === "published" && (
          <button onClick={async () => { await api.closeHit(id); load(); }} className="bg-yellow-700 px-3 py-1 rounded text-sm">Close HIT</button>
        )}
      </div>
      <div className="mt-4 grid gap-2">
        <h2 className="font-semibold">Submissions</h2>
        {(hit.submissions || []).map((s) => (
          <div key={s.id} className="bg-slate-900 border border-slate-800 rounded p-3">
            <div className="flex gap-3 items-center flex-wrap">
              <span className="font-medium">{s.worker}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${s.status === "approved" ? "bg-emerald-700" : s.status === "rejected" ? "bg-red-700" : "bg-yellow-700"}`}>{s.status}</span>
              {s.status === "submitted" && (
                <span className="flex gap-2">
                  <button onClick={() => decide(s.id, "approve")} className="text-emerald-400 text-sm">Approve</button>
                  <button onClick={() => decide(s.id, "reject")} className="text-red-400 text-sm">Reject</button>
                </span>
              )}
            </div>
            <pre className="text-xs mt-2 bg-slate-950 p-2 rounded overflow-auto max-h-48">{JSON.stringify(s.answers, null, 2)}</pre>
            {s.status === "submitted" && (
              <input placeholder="optional feedback" value={feedback[s.id] || ""} onChange={(e) => setFeedback({ ...feedback, [s.id]: e.target.value })} className="mt-2 p-1 rounded bg-slate-800 border border-slate-700 text-sm w-full" />
            )}
            {s.feedback && <p className="text-sm mt-1 text-slate-400">Feedback: {s.feedback}</p>}
          </div>
        ))}
        {!hit.submissions?.length && <p className="text-slate-500 text-sm">No submissions yet.</p>}
      </div>

      {consensus && (
        <div className="mt-6">
          <h2 className="font-semibold">Consensus</h2>
          <p className="text-sm text-slate-400">{consensus.agreeing_items}/{consensus.total_items} items fully agree</p>
          <div className="mt-2 grid gap-1">
            {Object.entries(consensus.items || {}).map(([itemId, d]) => (
              <div key={itemId} className="text-sm flex gap-3">
                <span className="text-slate-400">item {itemId}:</span>
                <span className={d.agreement ? "text-emerald-400" : "text-yellow-400"}>
                  {d.agreement ? "agree" : "split"} ({d.choices.join(", ")})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

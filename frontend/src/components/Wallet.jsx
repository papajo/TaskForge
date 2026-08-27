import React, { useEffect, useState } from "react";
import { api, getUser } from "../api.js";

export default function Wallet() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const user = getUser();

  useEffect(() => {
    api.wallet().then(setData).catch((e) => setError(e.message));
  }, []);

  if (!data) return <div className="p-4 text-slate-400">{error || "Loading..."}</div>;
  const stats = data.stats;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Wallet</h1>
      <div className="flex gap-6 mb-4">
        <div className="bg-slate-900 border border-slate-800 rounded p-4">
          <p className="text-sm text-slate-400">Balance</p>
          <p className="text-2xl font-bold text-emerald-400">{data.balance_cents} credits</p>
        </div>
        {user?.role === "worker" && stats && (
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <p className="text-sm text-slate-400">Approval rate</p>
            <p className="text-2xl font-bold">{stats.score == null ? "—" : `${stats.score}%`}</p>
            <p className="text-xs text-slate-500">{stats.approved} approved / {stats.rejected} rejected</p>
          </div>
        )}
      </div>
      <h2 className="font-semibold mb-2">Ledger</h2>
      <div className="grid gap-1">
        {data.entries.map((e) => (
          <div key={e.id} className="text-sm bg-slate-900 border border-slate-800 rounded p-2 flex gap-3">
            <span className={e.amount_cents > 0 ? "text-emerald-400" : "text-red-400"}>{e.kind}: {e.amount_cents}¢</span>
            {e.assignment_id && <span className="text-slate-500">assignment #{e.assignment_id}</span>}
          </div>
        ))}
        {!data.entries.length && <p className="text-slate-500 text-sm">No earnings yet.</p>}
      </div>
    </div>
  );
}

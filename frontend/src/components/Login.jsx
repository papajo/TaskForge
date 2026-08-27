import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, saveSession } from "../api.js";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("worker");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function doSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = isRegister ? await api.register(username, password, role) : await api.login(username, password);
      saveSession(res.token, res.user);
      nav(res.user.role === "requester" ? "/dashboard" : "/marketplace");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-slate-900 border border-slate-800 rounded">
      <h1 className="text-xl font-bold mb-1">TaskForge</h1>
      <p className="text-sm text-slate-400 mb-4">Crowdsourced microtasks for ML workflows and business processes.</p>
      <form onSubmit={doSubmit} className="flex flex-col gap-3">
        <input className="p-2 rounded bg-slate-800 border border-slate-700" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="p-2 rounded bg-slate-800 border border-slate-700" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {isRegister && (
          <div className="flex gap-3 text-sm">
            <label><input type="radio" checked={role === "worker"} onChange={() => setRole("worker")} /> Worker</label>
            <label><input type="radio" checked={role === "requester"} onChange={() => setRole("requester")} /> Requester</label>
          </div>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="bg-emerald-600 hover:bg-emerald-500 p-2 rounded font-medium">{isRegister ? "Register" : "Login"}</button>
      </form>
      <button className="mt-4 text-sm text-emerald-400" onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? "Have an account? Login" : "New here? Register"}
      </button>
      <p className="mt-3 text-xs text-slate-500">Demo: alice/alice123 (requester), bob/bob123, carol/carol123 (workers)</p>
    </div>
  );
}

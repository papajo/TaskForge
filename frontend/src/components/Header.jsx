import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearSession, getUser } from "../api.js";

export default function Header() {
  const user = getUser();
  const nav = useNavigate();
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto flex items-center gap-4 p-3">
        <Link to="/" className="font-bold text-emerald-400">TaskForge</Link>
        {user && (
          <nav className="flex gap-3 text-sm">
            {user.role === "requester" ? (
              <>
                <Link to="/dashboard" className="hover:text-emerald-300">Dashboard</Link>
                <Link to="/create" className="hover:text-emerald-300">Create HIT</Link>
                <Link to="/import" className="hover:text-emerald-300">Import Predictions</Link>
              </>
            ) : (
              <>
                <Link to="/marketplace" className="hover:text-emerald-300">Marketplace</Link>
                <Link to="/mywork" className="hover:text-emerald-300">My Work</Link>
              </>
            )}
            <Link to="/wallet" className="hover:text-emerald-300">Wallet</Link>
          </nav>
        )}
        <div className="ml-auto text-sm">
          {user ? (
            <button
              onClick={() => { clearSession(); nav("/login"); }}
              className="bg-slate-800 px-3 py-1 rounded hover:bg-slate-700"
            >
              {user.username} · {user.role} · logout
            </button>
          ) : (
            <Link to="/login" className="bg-emerald-600 px-3 py-1 rounded hover:bg-emerald-500">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}

import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Header from "./components/Header.jsx";
import Login from "./components/Login.jsx";
import RequesterDashboard from "./components/RequesterDashboard.jsx";
import CreateHIT from "./components/CreateHIT.jsx";
import HITDetail from "./components/HITDetail.jsx";
import Marketplace from "./components/Marketplace.jsx";
import TaskWorkspace from "./components/TaskWorkspace.jsx";
import MyWork from "./components/MyWork.jsx";
import Wallet from "./components/Wallet.jsx";
import ImportPredictions from "./components/ImportPredictions.jsx";
import { getUser } from "./api.js";

function Gate({ role, children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === "requester" ? "/dashboard" : "/marketplace"} replace />;
  return children;
}

function Home() {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "requester" ? "/dashboard" : "/marketplace"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Header />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Gate role="requester"><RequesterDashboard /></Gate>} />
          <Route path="/create" element={<Gate role="requester"><CreateHIT /></Gate>} />
          <Route path="/hits/:id" element={<Gate role="requester"><HITDetail /></Gate>} />
          <Route path="/import" element={<Gate role="requester"><ImportPredictions /></Gate>} />
          <Route path="/marketplace" element={<Gate role="worker"><Marketplace /></Gate>} />
          <Route path="/work/:hitId/:assignmentId" element={<Gate role="worker"><TaskWorkspace /></Gate>} />
          <Route path="/mywork" element={<Gate role="worker"><MyWork /></Gate>} />
          <Route path="/wallet" element={<Gate role={null}><Wallet /></Gate>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

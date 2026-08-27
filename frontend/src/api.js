const API_BASE = "/api";

export async function downloadExport(hitId, format) {
  const res = await fetch(`${API_BASE}/export/${hitId}?format=${format}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error((data && data.detail) || res.statusText);
  }
  const text = format === "json" ? JSON.stringify(await res.json(), null, 2) : await res.text();
  const type = format === "json" ? "application/json" : "text/csv";
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `hit-${hitId}-export.${format}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function getToken() {
  return localStorage.getItem("tf_token");
}

export function getUser() {
  const raw = localStorage.getItem("tf_user");
  return raw ? JSON.parse(raw) : null;
}

export function saveSession(token, user) {
  localStorage.setItem("tf_token", token);
  localStorage.setItem("tf_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("tf_token");
  localStorage.removeItem("tf_user");
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
      if (Array.isArray(detail)) detail = detail.map((d) => d.msg).join("; ");
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  register: (username, password, role) => request("/auth/register", { method: "POST", body: { username, password, role } }),
  login: (username, password) => request("/auth/login", { method: "POST", body: { username, password } }),
  available: () => request("/hits/available"),
  mineHits: () => request("/hits/mine"),
  hit: (id) => request(`/hits/${id}`),
  createHit: (body) => request("/hits", { method: "POST", body }),
  closeHit: (id) => request(`/hits/${id}/close`, { method: "POST" }),
  accept: (hitId) => request(`/assignments/${hitId}/accept`, { method: "POST", body: {} }),
  submit: (assignmentId, answers) => request(`/assignments/${assignmentId}/submit`, { method: "POST", body: { answers } }),
  myAssignments: () => request("/assignments/mine"),
  review: (assignmentId, decision, feedback) => request(`/assignments/${assignmentId}/${decision}`, { method: "POST", body: { feedback } }),
  wallet: () => request("/wallet"),
  export: (id, format) => request(`/export/${id}?format=${format}`),
  import: (body) => request("/import/predictions", { method: "POST", body }),
  consensus: (id) => request(`/hits/${id}/consensus`),
  listQuizzes: () => request("/quizzes"),
  createQuiz: (title, questions, pass_score_pct) => request("/quizzes", { method: "POST", body: { title, questions, pass_score_pct } }),
  takeQuiz: (id) => request(`/quizzes/${id}/take`),
  submitQuiz: (id, answers) => request(`/quizzes/${id}/submit`, { method: "POST", body: { answers } }),
};

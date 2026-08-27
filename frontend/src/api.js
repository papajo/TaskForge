const API_BASE = "/api";

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
};

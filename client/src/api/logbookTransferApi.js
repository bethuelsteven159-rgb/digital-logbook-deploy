const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

function getAuthToken() {
  return localStorage.getItem("authToken");
}

async function request(path, options = {}) {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication required. Please sign in again.");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const body = response.headers.get("content-type")?.includes("application/json")
    ? await response.json()
    : null;
  if (!response.ok) throw new Error(body?.message || `Request failed with status ${response.status}`);
  return body?.data ?? body;
}

export function exportLogbook() {
  return request("/api/logbook/export");
}

export function importLogbook(payload) {
  return request("/api/logbook/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

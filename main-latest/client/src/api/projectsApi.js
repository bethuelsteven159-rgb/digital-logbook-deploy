const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

function getAuthToken() {
  return localStorage.getItem("authToken");
}

async function request(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    const error = new Error(
      "Authentication required. Please sign in again.",
    );
    error.status = 401;
    throw error;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  const contentType = response.headers.get("content-type");
  const body = contentType?.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const error = new Error(
      body?.message ||
        body?.error?.message ||
        body?.error ||
        `Request failed with status ${response.status}`,
    );

    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body?.data ?? body;
}

export function fetchProjects(status = "active") {
  return request(
    `/api/projects?status=${encodeURIComponent(status)}`,
  );
}

export function createProject(payload) {
  return request("/api/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProject(projectId, payload) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return request(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function setProjectArchived(projectId, archived = true) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return request(`/api/projects/${projectId}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ archived }),
  });
}

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

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type");

  let body = null;

  if (contentType?.includes("application/json")) {
    body = await response.json();
  }

  if (!response.ok) {
    const message =
      body?.error?.message ||
      body?.message ||
      `Request failed with status ${response.status}`;

    const error = new Error(message);

    error.status = response.status;
    error.body = body;

    throw error;
  }

  if (!body) {
    return null;
  }

  return body.data ?? body;
}

export async function fetchProjectDetails(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return request(`/api/projects/${projectId}`);
}

export async function createProjectEntry(
  projectId,
  payload,
) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return request(`/api/projects/${projectId}/entries`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function fetchSavedFilters(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return request(`/api/projects/${projectId}/filters`);
}

export async function createSavedFilter(projectId, payload) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return request(`/api/projects/${projectId}/filters`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function applySavedFilter(projectId, filterId) {
  if (!projectId || !filterId) {
    throw new Error("Project ID and filter ID are required.");
  }

  return request(
    `/api/projects/${projectId}/filters/${filterId}/apply`,
  );
}

export async function deleteSavedFilter(filterId) {
  if (!filterId) {
    throw new Error("Filter ID is required.");
  }

  return request(`/api/projects/filters/${filterId}`, {
    method: "DELETE",
  });
}

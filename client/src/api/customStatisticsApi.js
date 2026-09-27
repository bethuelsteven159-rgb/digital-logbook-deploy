const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
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

  let body = null;

  if (contentType?.includes("application/json")) {
    body = await response.json();
  }

  if (!response.ok) {
    const message =
      body?.error?.message ||
      body?.error ||
      body?.message ||
      `Request failed with status ${response.status}`;

    const error = new Error(message);

    error.status = response.status;
    error.body = body;

    throw error;
  }

  return body;
}

export async function fetchCustomStatistics(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return request(
    `/api/stats/projects/${projectId}/custom`,
  );
}

export async function createCustomStatistic(
  projectId,
  payload,
) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return request(
    `/api/stats/projects/${projectId}/custom`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateCustomStatistic(
  projectId,
  statId,
  payload,
) {
  if (!projectId || !statId) {
    throw new Error(
      "Project ID and statistic ID are required.",
    );
  }

  return request(
    `/api/stats/projects/${projectId}/custom/${statId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteCustomStatistic(
  projectId,
  statId,
) {
  if (!projectId || !statId) {
    throw new Error(
      "Project ID and statistic ID are required.",
    );
  }

  return request(
    `/api/stats/projects/${projectId}/custom/${statId}`,
    {
      method: "DELETE",
    },
  );
}

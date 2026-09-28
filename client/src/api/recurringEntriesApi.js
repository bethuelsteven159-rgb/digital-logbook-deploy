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

export async function fetchRecurringEntries(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return request(
    `/api/projects/${projectId}/recurring-entries`,
  );
}

export async function createRecurringEntry(
  projectId,
  payload,
) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return request(
    `/api/projects/${projectId}/recurring-entries`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateRecurringEntry(
  definitionId,
  payload,
) {
  if (!definitionId) {
    throw new Error("Recurring entry ID is required.");
  }

  return request(
    `/api/projects/recurring-entries/${definitionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteRecurringEntry(
  definitionId,
) {
  if (!definitionId) {
    throw new Error("Recurring entry ID is required.");
  }

  return request(
    `/api/projects/recurring-entries/${definitionId}`,
    {
      method: "DELETE",
    },
  );
}

export async function generateDueRecurringEntries(
  projectId,
) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return request(
    `/api/projects/${projectId}/recurring-entries/generate-due`,
    {
      method: "POST",
    },
  );
}

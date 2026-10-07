const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

function getAuthToken() {
  return localStorage.getItem("authToken");
}

function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
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
    cache: "no-store",
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

/**
 * Load statistics for one project field.
 *
 * GET /api/stats/projects/:projectId?operation=...&fieldId=...
 */
export async function fetchStatistics(params) {
  const { projectId, ...queryParams } = params;

  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  const query = new URLSearchParams(queryParams).toString();

  return request(
    `/api/stats/projects/${encodeURIComponent(projectId)}?${query}`,
  );
}

/**
 * Load the daily / weekday / per-project activity breakdown that powers
 * the Stats page charts.
 *
 * GET /api/stats/activity?days=30&timezone=Europe/London
 */
export async function fetchActivityStats({ days = 30, timezone } = {}) {
  const query = new URLSearchParams({
    days: String(days),
    timezone: timezone || getTimezone(),
  }).toString();

  return request(`/api/stats/activity?${query}`);
}

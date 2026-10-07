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
 * Get the current user's notification feed.
 *
 * GET /api/notifications
 */
export async function fetchNotifications() {
  return request(
    `/api/notifications?timezone=${encodeURIComponent(getTimezone())}`,
  );
}

/**
 * Mark a single notification as read.
 *
 * POST /api/notifications/:key/read
 */
export async function markNotificationRead(key) {
  if (!key) {
    throw new Error("Notification key is required.");
  }

  return request(`/api/notifications/${encodeURIComponent(key)}/read`, {
    method: "POST",
  });
}

/**
 * Mark every notification currently in the feed as read.
 *
 * POST /api/notifications/read-all
 */
export async function markAllNotificationsRead() {
  return request(
    `/api/notifications/read-all?timezone=${encodeURIComponent(getTimezone())}`,
    { method: "POST" },
  );
}

/**
 * Dismiss a single notification so it stops appearing.
 *
 * POST /api/notifications/:key/dismiss
 */
export async function dismissNotification(key) {
  if (!key) {
    throw new Error("Notification key is required.");
  }

  return request(`/api/notifications/${encodeURIComponent(key)}/dismiss`, {
    method: "POST",
  });
}

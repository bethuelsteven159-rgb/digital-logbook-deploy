const AUTH_API_URL = (
  import.meta.env.VITE_AUTH_API_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/$/, "");

function getAuthToken() {
  return localStorage.getItem("authToken");
}

async function request(
  baseUrl,
  endpoint,
  options = {},
) {
  const token = getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${baseUrl}${endpoint}`,
    {
      ...options,
      headers,
    },
  );

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const error = new Error(
      body?.error?.message ||
        body?.message ||
        `Request failed with status ${response.status}`,
    );

    error.status = response.status;
    error.body = body;

    throw error;
  }

  return body;
}

function extractData(response) {
  if (!response) {
    return null;
  }

  return (
    response.data ??
    response.user ??
    response.profile ??
    response
  );
}

/**
 * Get the user represented by the
 * authentication backend's session JWT.
 *
 * Auth backend:
 * GET /api/auth/me
 */
export async function getCurrentUser() {
  const response = await request(
    AUTH_API_URL,
    "/api/auth/me",
  );

  return extractData(response);
}

/**
 * Get the current user's Digital Logbook profile.
 *
 * Main server:
 * GET /api/users/me/profile
 */
export async function getUserProfile() {
  const response = await request(
    API_URL,
    "/api/users/me/profile",
  );

  return extractData(response);
}

/**
 * Update the current user's Digital Logbook profile.
 *
 * Main server:
 * PATCH /api/users/me/profile
 */
export async function updateUserProfile(profile) {
  const response = await request(
    API_URL,
    "/api/users/me/profile",
    {
      method: "PATCH",
      body: JSON.stringify(profile),
    },
  );

  return extractData(response);
}
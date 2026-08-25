const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

export async function fetchDashboard() {
  const token = localStorage.getItem("authToken");

  if (!token) {
    throw new Error(
      "You are not signed in.",
    );
  }

  const response = await fetch(
    `${API_URL}/api/dashboard`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const contentType =
    response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    throw new Error(
      "Dashboard API returned a non-JSON response.",
    );
  }

  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      body.message ||
        "Failed to load dashboard.",
    );
  }

  return body.data;
}

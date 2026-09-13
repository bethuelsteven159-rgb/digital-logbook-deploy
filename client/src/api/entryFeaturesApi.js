const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/$/, "");

function getAuthToken() {
  return localStorage.getItem(
    "authToken",
  );
}

async function request(
  path,
  options = {},
) {
  const token =
    getAuthToken();

  if (!token) {
    throw new Error(
      "Authentication required. Please sign in again.",
    );
  }

  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type":
          "application/json",
        Authorization:
          `Bearer ${token}`,
        ...options.headers,
      },
    },
  );

  const body =
    response.headers
      .get("content-type")
      ?.includes("application/json")
      ? await response.json()
      : null;

  if (!response.ok) {
    throw new Error(
      body?.message ||
        `Request failed with status ${response.status}`,
    );
  }

  return body?.data ?? body;
}

export async function updateChecklistItem(
  projectId,
  entryId,
  itemId,
  changes,
) {
  const body =
    typeof changes === "boolean"
      ? { completed: changes }
      : changes;

  return request(
    `/api/projects/${projectId}/entries/${entryId}/checklist/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function deleteChecklistItem(
  projectId,
  entryId,
  itemId,
) {
  return request(
    `/api/projects/${projectId}/entries/${entryId}/checklist/${itemId}`,
    {
      method: "DELETE",
    },
  );
}

export async function updateProjectReferences(
  projectId,
  projectIds,
) {
  return request(
    `/api/projects/${projectId}/references`,
    {
      method: "PATCH",
      body: JSON.stringify({
        projectIds,
      }),
    },
  );
}

export async function updateEntryProjectReferences(
  projectId,
  entryId,
  projectIds,
) {
  return request(
    `/api/projects/${projectId}/entries/${entryId}/project-references`,
    {
      method: "PATCH",
      body: JSON.stringify({ projectIds }),
    },
  );
}

export async function updateEntryReferences(
  projectId,
  entryId,
  entryIds,
) {
  return request(
    `/api/projects/${projectId}/entries/${entryId}/references`,
    {
      method: "PATCH",
      body: JSON.stringify({
        entryIds,
      }),
    },
  );
}
export async function updateEntry(
  projectId,
  entryId,
  payload,
) {
  return request(
    `/api/projects/${projectId}/entries/${entryId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

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
    const error = new Error(
      "Authentication required. Please sign in again.",
    );

    error.status = 401;

    throw error;
  }

  const headers = {
    "Content-Type":
      "application/json",

    ...options.headers,

    Authorization:
      `Bearer ${token}`,
  };

  const response =
    await fetch(
      `${API_URL}${path}`,
      {
        ...options,
        headers,
      },
    );

  const contentType =
    response.headers.get(
      "content-type",
    );

  let body = null;

  if (
    contentType?.includes(
      "application/json",
    )
  ) {
    body =
      await response.json();
  }

  if (!response.ok) {
    const message =
      body?.error?.message ||
      body?.message ||
      `Request failed with status ${response.status}`;

    const error =
      new Error(message);

    error.status =
      response.status;

    error.body = body;

    throw error;
  }

  if (!body) {
    return null;
  }

  return body.data ?? body;
}

export async function fetchProjectDetails(
  projectId,
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required.",
    );
  }

  return request(
    `/api/projects/${projectId}`,
  );
}

export async function fetchAiProjectProgress(
  projectId,
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required.",
    );
  }

  return request(
    `/api/projects/${projectId}/ai-progress`,
    {
      method: "POST",
    },
  );
}
export async function fetchLearningVideos(
  projectId,
  query = "",
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required.",
    );
  }

  const term = String(query ?? "").trim();

  const params = term
    ? `?q=${encodeURIComponent(term)}`
    : "";

  return request(
    `/api/projects/${projectId}/learning-videos${params}`,
  );
}
export async function fetchAiProjectSpeech(
  projectId,
  insight,
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required.",
    );
  }

  if (!insight) {
    throw new Error(
      "AI insight is required.",
    );
  }

  return request(
    `/api/projects/${projectId}/ai-progress/speech`,
    {
      method: "POST",

      body:
        JSON.stringify({
          insight,
        }),
    },
  );
}

export async function searchProjectEntries(
  projectId,
  filters = {},
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required.",
    );
  }

  const params =
    new URLSearchParams();

  if (filters.query?.trim()) {
    params.set(
      "q",
      filters.query.trim(),
    );
  }

  if (filters.fromDate) {
    params.set(
      "fromDate",
      filters.fromDate,
    );
  }

  if (filters.toDate) {
    params.set(
      "toDate",
      filters.toDate,
    );
  }

  if (
    filters.minDuration !==
      undefined &&
    filters.minDuration !==
      null &&
    filters.minDuration !== ""
  ) {
    params.set(
      "minDuration",
      filters.minDuration,
    );
  }

  if (
    filters.maxDuration !==
      undefined &&
    filters.maxDuration !==
      null &&
    filters.maxDuration !== ""
  ) {
    params.set(
      "maxDuration",
      filters.maxDuration,
    );
  }

  if (
    typeof filters.completed ===
    "boolean"
  ) {
    params.set(
      "completed",
      String(
        filters.completed,
      ),
    );
  }

  if (filters.sort) {
    params.set(
      "sort",
      filters.sort,
    );
  }

  const customFields =
    Array.isArray(
      filters.customFields,
    )
      ? filters.customFields.filter(
          (filter) =>
            filter?.fieldId &&
            String(
              filter.value ??
                "",
            ).trim(),
        )
      : [];

  if (customFields.length) {
    params.set(
      "customFields",
      JSON.stringify(
        customFields,
      ),
    );
  }

  const query =
    params.toString();

  return request(
    `/api/projects/${projectId}/entries/search${
      query
        ? `?${query}`
        : ""
    }`,
  );
}

export async function searchOwnedEntries(filters = {}) {
  const params = new URLSearchParams();
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.query?.trim()) params.set("q", filters.query.trim());
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  if (filters.minDuration !== undefined && filters.minDuration !== null && filters.minDuration !== "") params.set("minDuration", filters.minDuration);
  if (filters.maxDuration !== undefined && filters.maxDuration !== null && filters.maxDuration !== "") params.set("maxDuration", filters.maxDuration);
  if (typeof filters.completed === "boolean") params.set("completed", String(filters.completed));
  if (filters.sort) params.set("sort", filters.sort);

  const customFields = Array.isArray(filters.customFields)
    ? filters.customFields.filter((filter) => filter?.fieldId && String(filter.value ?? "").trim())
    : [];
  if (customFields.length) params.set("customFields", JSON.stringify(customFields));

  const query = params.toString();
  return request(`/api/projects/entries/search${query ? `?${query}` : ""}`);
}

export async function createProjectEntry(
  projectId,
  payload,
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required.",
    );
  }

  return request(
    `/api/projects/${projectId}/entries`,
    {
      method: "POST",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}

export async function completeProjectEntry(
  projectId,
  entryId,
) {
  if (
    !projectId ||
    !entryId
  ) {
    throw new Error(
      "Project ID and entry ID are required.",
    );
  }

  return request(
    `/api/projects/${projectId}/entries/${entryId}/complete`,
    {
      method: "POST",
    },
  );
}

export async function fetchSavedFilters(
  projectId,
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required.",
    );
  }

  return request(
    `/api/projects/${projectId}/filters`,
  );
}

export async function createSavedFilter(
  projectId,
  payload,
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required.",
    );
  }

  return request(
    `/api/projects/${projectId}/filters`,
    {
      method: "POST",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}

export async function applySavedFilter(
  projectId,
  filterId,
) {
  if (
    !projectId ||
    !filterId
  ) {
    throw new Error(
      "Project ID and filter ID are required.",
    );
  }

  return request(
    `/api/projects/${projectId}/filters/${filterId}/apply`,
  );
}

export async function deleteSavedFilter(
  filterId,
) {
  if (!filterId) {
    throw new Error(
      "Filter ID is required.",
    );
  }

  return request(
    `/api/projects/filters/${filterId}`,
    {
      method: "DELETE",
    },
  );
}

export async function markEntryComplete(
  projectId,
  entryId,
) {
  if (
    !projectId ||
    !entryId
  ) {
    throw new Error(
      "Project ID and entry ID are required.",
    );
  }

  return request(
    `/api/projects/${projectId}/entries/${entryId}/complete`,
    {
      method: "PATCH",
    },
  );
}

export async function fetchOutstandingEntries(
  projectId,
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required.",
    );
  }

  return request(
    `/api/projects/${projectId}/entries/outstanding`,
  );
}

export async function fetchIncompleteEntries(
  projectId,
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required.",
    );
  }

  return request(
    `/api/projects/${projectId}/entries/incomplete`,
  );
}

export async function updateSavedFilter(
  filterId,
  payload,
) {
  if (!filterId) {
    throw new Error(
      "Filter ID is required.",
    );
  }

  return request(
    `/api/projects/filters/${filterId}`,
    {
      method: "PATCH",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}

export async function fetchAutomationRules(
  projectId,
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required.",
    );
  }

  return request(
    `/api/projects/${projectId}/automation-rules`,
  );
}

export async function createAutomationRule(
  projectId,
  payload,
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required.",
    );
  }

  return request(
    `/api/projects/${projectId}/automation-rules`,
    {
      method: "POST",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}

export async function updateAutomationRule(
  ruleId,
  payload,
) {
  if (!ruleId) {
    throw new Error(
      "Rule ID is required.",
    );
  }

  return request(
    `/api/projects/automation-rules/${ruleId}`,
    {
      method: "PATCH",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}

export async function deleteAutomationRule(
  ruleId,
) {
  if (!ruleId) {
    throw new Error(
      "Rule ID is required.",
    );
  }

  return request(
    `/api/projects/automation-rules/${ruleId}`,
    {
      method: "DELETE",
    },
  );
}

export async function deleteProjectEntry(
  projectId,
  entryId,
) {
  if (
    !projectId ||
    !entryId
  ) {
    throw new Error(
      "Project ID and entry ID are required.",
    );
  }

  return request(
    `/api/projects/${projectId}/entries/${entryId}`,
    {
      method: "DELETE",
    },
  );
}

// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fetchLearningVideos } from "./projectDetailsApi";

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    headers: {
      get: vi.fn(() => "application/json"),
    },
    json: vi.fn().mockResolvedValue(body),
  };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("authToken", "test-token");
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

test("fetchLearningVideos GETs the learning-videos route with auth", async () => {
  const data = { videos: [{ videoId: "abc" }] };

  fetch.mockResolvedValueOnce(jsonResponse({ success: true, data }));

  await expect(fetchLearningVideos("project-1")).resolves.toEqual(data);

  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe(
    "http://localhost:5000/api/projects/project-1/learning-videos",
  );
  expect(options.method).toBeUndefined();
  expect(options.headers.Authorization).toBe("Bearer test-token");
});

test("fetchLearningVideos encodes the search term", async () => {
  fetch.mockResolvedValueOnce(jsonResponse({ success: true, data: {} }));

  await fetchLearningVideos("project-1", "  c++ & arrays ");

  expect(fetch.mock.calls[0][0]).toBe(
    "http://localhost:5000/api/projects/project-1/learning-videos?q=c%2B%2B%20%26%20arrays",
  );
});

test("fetchLearningVideos requires a project id", async () => {
  await expect(fetchLearningVideos("")).rejects.toThrow(
    "Project ID is required.",
  );
  expect(fetch).not.toHaveBeenCalled();
});

test("fetchLearningVideos surfaces the server error message", async () => {
  fetch.mockResolvedValueOnce(
    jsonResponse(
      { error: { message: "YouTube search is not configured." } },
      { ok: false, status: 503 },
    ),
  );

  await expect(fetchLearningVideos("project-1")).rejects.toMatchObject({
    message: "YouTube search is not configured.",
    status: 503,
  });
});

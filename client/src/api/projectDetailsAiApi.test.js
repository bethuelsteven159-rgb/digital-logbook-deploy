// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  fetchAiProjectProgress,
  fetchAiProjectSpeech,
} from "./projectDetailsApi";

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

test("fetchAiProjectProgress posts to the project AI route with auth", async () => {
  const data = {
    insight: { headline: "Progress" },
    evidence: { totalEntries: 4 },
  };

  fetch.mockResolvedValueOnce(
    jsonResponse({ success: true, data }),
  );

  await expect(
    fetchAiProjectProgress("project-1"),
  ).resolves.toEqual(data);

  expect(fetch).toHaveBeenCalledWith(
    "http://localhost:5000/api/projects/project-1/ai-progress",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
    },
  );
});

test("fetchAiProjectSpeech posts the generated insight to the speech route", async () => {
  const insight = {
    headline: "Progress",
    summary: "Summary",
  };

  const speech = {
    audio: "ZmFrZQ==",
    mimeType: "audio/wav",
  };

  fetch.mockResolvedValueOnce(
    jsonResponse({ success: true, data: speech }),
  );

  await expect(
    fetchAiProjectSpeech("project-1", insight),
  ).resolves.toEqual(speech);

  expect(fetch).toHaveBeenCalledWith(
    "http://localhost:5000/api/projects/project-1/ai-progress/speech",
    {
      method: "POST",
      body: JSON.stringify({ insight }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
    },
  );
});

test("AI API helpers require an authenticated token", async () => {
  localStorage.removeItem("authToken");

  await expect(
    fetchAiProjectProgress("project-1"),
  ).rejects.toThrow("Authentication required");

  expect(fetch).not.toHaveBeenCalled();
});

test("AI API helpers surface backend failure messages", async () => {
  fetch.mockResolvedValueOnce(
    jsonResponse(
      {
        success: false,
        message: "AI progress analysis is temporarily unavailable.",
      },
      { ok: false, status: 502 },
    ),
  );

  await expect(
    fetchAiProjectProgress("project-1"),
  ).rejects.toThrow("AI progress analysis is temporarily unavailable.");
});

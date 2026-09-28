// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fetchDashboard, saveDashboardLayout } from "./dashboardApi";

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

test("fetchDashboard sends the auth token and returns dashboard data", async () => {
  const data = { stats: { totalEntries: 3 }, layout: [] };
  fetch.mockResolvedValueOnce(jsonResponse({ success: true, data }));

  await expect(fetchDashboard()).resolves.toEqual(data);
  expect(fetch).toHaveBeenCalledWith(
    "http://localhost:5000/api/dashboard",
    { headers: { Authorization: "Bearer test-token" } },
  );
});

test("fetchDashboard rejects when no auth token exists", async () => {
  localStorage.removeItem("authToken");
  await expect(fetchDashboard()).rejects.toThrow("You are not signed in.");
  expect(fetch).not.toHaveBeenCalled();
});

test("fetchDashboard surfaces an API error message", async () => {
  fetch.mockResolvedValueOnce(jsonResponse(
    { success: false, message: "Dashboard unavailable" },
    { ok: false, status: 500 },
  ));
  await expect(fetchDashboard()).rejects.toThrow("Dashboard unavailable");
});

test("fetchDashboard rejects non-JSON responses", async () => {
  fetch.mockResolvedValueOnce({
    ok: false,
    headers: { get: vi.fn(() => "text/html") },
  });
  await expect(fetchDashboard()).rejects.toThrow("Dashboard API returned a non-JSON response.");
});

test("saveDashboardLayout sends a PUT request with the layout and returns the saved layout", async () => {
  const layout = [{ id: "one", statisticId: "loggedMinutes" }];
  fetch.mockResolvedValueOnce(jsonResponse({ success: true, data: { layout } }));

  await expect(saveDashboardLayout(layout)).resolves.toEqual(layout);
  expect(fetch).toHaveBeenCalledWith(
    "http://localhost:5000/api/dashboard",
    {
      method: "PUT",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ layout }),
    },
  );
});

test("saveDashboardLayout rejects when no auth token exists", async () => {
  localStorage.removeItem("authToken");
  await expect(saveDashboardLayout([])).rejects.toThrow("You are not signed in.");
  expect(fetch).not.toHaveBeenCalled();
});

test("saveDashboardLayout surfaces validation errors from the API", async () => {
  fetch.mockResolvedValueOnce(jsonResponse(
    { success: false, message: "Dashboard widget ids must be unique" },
    { ok: false, status: 400 },
  ));
  await expect(saveDashboardLayout([])).rejects.toThrow("Dashboard widget ids must be unique");
});

// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { StrictMode } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { fetchDashboard, fetchQuote } from "./api/dashboardApi";

vi.mock("./api/dashboardApi", () => ({
  fetchDashboard: vi.fn(),
  fetchQuote: vi.fn(),
}));
vi.mock("./context/UserContext.jsx", () => ({ UserProvider: ({ children }) => children }));
vi.mock("./components/Sidebar", () => ({ default: () => null }));
vi.mock("./pages/LogIn/Login.jsx", () => ({ default: () => null }));
vi.mock("./pages/Projects/Projects", () => ({ default: () => <div>Projects page</div> }));
vi.mock("./pages/Projects/ProjectDetails", () => ({ default: () => null }));
vi.mock("./pages/Profile/Profile", () => ({ default: () => null }));
vi.mock("./pages/Stats/Stats", () => ({ default: () => null }));
vi.mock("./pages/Settings/Settings", () => ({ default: () => null }));

const completionKey = "digitalLogbookOnboardingComplete";
const eventName = "digitalLogbookOpenOnboarding";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(completionKey, "true");
  window.history.replaceState(null, "", "/dashboard");
  fetchDashboard.mockResolvedValue({});
  fetchQuote.mockResolvedValue(null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

function requestOnboarding() {
  act(() => window.dispatchEvent(new CustomEvent(eventName)));
}

async function expectFirstStep() {
  expect(await screen.findByRole("dialog", { name: "Create a project" })).toBeInTheDocument();
  await waitFor(() => expect(window.history.state?.usr?.openOnboarding).toBeUndefined());
}

test("help event on Dashboard reopens completed onboarding without adding history", async () => {
  window.history.replaceState({ usr: { preserved: "value" } }, "", "/dashboard");
  render(<App />);
  const historyLength = window.history.length;
  requestOnboarding();
  await expectFirstStep();
  expect(window.history.length).toBe(historyLength);
  expect(window.history.state.usr).toEqual({ preserved: "value" });
  expect(localStorage.getItem(completionKey)).toBe("true");
});

test("the real Help Assistant action navigates from another page and opens onboarding", async () => {
  window.history.replaceState(null, "", "/projects");
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Open help assistant" }));
  await user.click(screen.getByRole("button", { name: "How do I get started?" }));
  await expectFirstStep();
  expect(window.location.pathname).toBe("/dashboard");
  expect(screen.queryByRole("dialog", { name: "Digital Logbook Help" })).not.toBeInTheDocument();
});

test("repeated requests reset the step and reopen after dismissal", async () => {
  const user = userEvent.setup();
  render(<App />);
  requestOnboarding();
  await expectFirstStep();
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("dialog", { name: "Open your project" })).toBeInTheDocument();
  requestOnboarding();
  await expectFirstStep();
  await user.click(screen.getByRole("button", { name: "Skip guide" }));
  requestOnboarding();
  await expectFirstStep();
});

test("StrictMode keeps one event listener and removes it on unmount", async () => {
  const add = vi.spyOn(window, "addEventListener");
  const remove = vi.spyOn(window, "removeEventListener");
  const { unmount } = render(<StrictMode><App /></StrictMode>);
  function activeListeners() {
    const removed = new Set(remove.mock.calls.filter(([name]) => name === eventName).map(([, fn]) => fn));
    return add.mock.calls.filter(([name, fn]) => name === eventName && !removed.has(fn));
  }
  expect(activeListeners()).toHaveLength(1);
  requestOnboarding();
  await expectFirstStep();
  expect(activeListeners()).toHaveLength(1);
  unmount();
  expect(activeListeners()).toHaveLength(0);
  const historyState = window.history.state;
  requestOnboarding();
  expect(window.history.state).toEqual(historyState);
});

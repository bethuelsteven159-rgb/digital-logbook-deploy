// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import { fetchDashboard, saveDashboardLayout } from "../../api/dashboardApi";

vi.mock("../../api/dashboardApi", () => ({
  fetchDashboard: vi.fn(),
  saveDashboardLayout: vi.fn(),
}));
vi.mock("../../components/Sidebar", () => ({ default: () => null }));

const completionKey = "digitalLogbookOnboardingComplete";

const dashboardData = {
  stats: {
    loggedMinutes: 180,
    activeProjects: 2,
    totalEntries: 7,
    thisWeekMinutes: 90,
  },
  overview: {
    projectsCreated: 4,
    projectsArchived: 2,
    entriesLogged: 7,
    averageSessionMinutes: 26,
  },
  recentActivity: [],
  layout: [
    { id: "hours", statisticId: "loggedMinutes" },
    { id: "projects", statisticId: "activeProjects" },
  ],
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(completionKey, "true");
  fetchDashboard.mockReset();
  saveDashboardLayout.mockReset();
  fetchDashboard.mockResolvedValue(dashboardData);
  saveDashboardLayout.mockImplementation(async (layout) => layout);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="location">{JSON.stringify(location)}</output>
      <button onClick={() => navigate("/other")}>Leave dashboard</button>
      <button onClick={() => navigate(-1)}>Return back</button>
    </>
  );
}

function mount(entry = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <NavigationProbe />
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/other" element={<div>Other page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function openCustomizer() {
  const user = userEvent.setup();
  mount();
  await waitFor(() => {
    expect(statCardLabels()).toContain("Hours Logged");
  });
  await user.click(screen.getByRole("button", { name: "Customize dashboard widgets" }));
  return user;
}

function statCardLabels() {
  return Array.from(document.querySelectorAll(".stat-grid .stat-card-label")).map(
    (element) => element.textContent,
  );
}

test("first-time onboarding retains all steps and completion persistence", async () => {
  localStorage.removeItem(completionKey);
  const user = userEvent.setup();
  mount();
  expect(await screen.findByRole("dialog", { name: "Create a project" })).toBeInTheDocument();
  expect(localStorage.getItem(completionKey)).toBeNull();
  for (const title of ["Open your project", "Create your first entry", "Track and review your work"]) {
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("dialog", { name: title })).toBeInTheDocument();
  }
  await user.click(screen.getByRole("button", { name: "Get Started", exact: true }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(localStorage.getItem(completionKey)).toBe("true");
});

test("completed onboarding stays closed and the existing restart button still works", async () => {
  const user = userEvent.setup();
  mount();
  const restart = await screen.findByRole("button", { name: "Show Getting Started Guide" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(restart);
  expect(screen.getByRole("dialog", { name: "Create a project" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Skip guide" }));
  expect(localStorage.getItem(completionKey)).toBe("true");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("consumes only the request flag and does not reopen on back navigation or remount", async () => {
  const user = userEvent.setup();
  const view = mount({ pathname: "/dashboard", search: "?keep=1", hash: "#keep", state: { openOnboarding: true, preserved: 42 } });
  expect(await screen.findByRole("dialog", { name: "Create a project" })).toBeInTheDocument();
  await waitFor(() => {
    expect(JSON.parse(screen.getByTestId("location").textContent).state).toEqual({ preserved: 42 });
  });
  const consumedLocation = JSON.parse(screen.getByTestId("location").textContent);
  expect(consumedLocation.search).toBe("?keep=1");
  expect(consumedLocation.hash).toBe("#keep");
  await user.click(screen.getByRole("button", { name: "Skip guide" }));
  await user.click(screen.getByRole("button", { name: "Leave dashboard" }));
  await user.click(screen.getByRole("button", { name: "Return back" }));
  await screen.findByRole("button", { name: "Show Getting Started Guide" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  view.unmount();
  mount(consumedLocation);
  await screen.findByRole("button", { name: "Show Getting Started Guide" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("loads and displays the saved dashboard widget layout", async () => {
  mount();
  await waitFor(() => {
    expect(statCardLabels()).toEqual(["Hours Logged", "Active Projects"]);
  });
  expect(fetchDashboard).toHaveBeenCalledTimes(1);
});

test("keeps Recent Activity, Overview, and Get Started outside customization", async () => {
  const user = await openCustomizer();
  expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  expect(screen.getByText("Overview")).toBeInTheDocument();
  expect(screen.getByText("Get Started")).toBeInTheDocument();
  await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);
  expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  expect(screen.getByText("Overview")).toBeInTheDocument();
  expect(screen.getByText("Get Started")).toBeInTheDocument();
});

test("adds a widget using the selected statistic", async () => {
  const user = await openCustomizer();
  await user.selectOptions(screen.getByLabelText("Statistic to add"), "totalEntries");
  await user.click(screen.getByRole("button", { name: "Add Widget" }));
  expect(statCardLabels()).toContain("Total Entries");
  expect(screen.getAllByLabelText("Widget statistic")).toHaveLength(3);
});

test("changes, removes, and reorders widgets while customizing", async () => {
  const user = await openCustomizer();
  const selectors = screen.getAllByLabelText("Widget statistic");
  await user.selectOptions(selectors[0], "projectsCreated");
  expect(statCardLabels()).toEqual(["Projects Created", "Active Projects"]);

  await user.click(screen.getAllByRole("button", { name: "Move widget right" })[0]);
  expect(statCardLabels()).toEqual(["Active Projects", "Projects Created"]);

  await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);
  expect(screen.getAllByLabelText("Widget statistic")).toHaveLength(1);
});

test("cancelling customization discards unsaved layout changes", async () => {
  const user = await openCustomizer();
  await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);
  expect(statCardLabels()).not.toContain("Hours Logged");
  await user.click(screen.getByRole("button", { name: "Cancel customization" }));
  expect(statCardLabels()).toEqual(["Hours Logged", "Active Projects"]);
  expect(saveDashboardLayout).not.toHaveBeenCalled();
});

test("saves the customized layout and exits customization mode", async () => {
  const user = await openCustomizer();
  await user.selectOptions(screen.getByLabelText("Statistic to add"), "projectsArchived");
  await user.click(screen.getByRole("button", { name: "Add Widget" }));
  await user.click(screen.getByRole("button", { name: "Save Layout" }));

  await waitFor(() => expect(saveDashboardLayout).toHaveBeenCalledTimes(1));
  const savedLayout = saveDashboardLayout.mock.calls[0][0];
  expect(savedLayout.map((widget) => widget.statisticId)).toEqual([
    "loggedMinutes",
    "activeProjects",
    "projectsArchived",
  ]);
  expect(await screen.findByRole("button", { name: "Customize dashboard widgets" })).toBeInTheDocument();
  expect(screen.getByText("Projects Archived")).toBeInTheDocument();
});

test("shows a save error and stays in customization mode when persistence fails", async () => {
  saveDashboardLayout.mockRejectedValueOnce(new Error("Could not save layout"));
  const user = await openCustomizer();
  await user.click(screen.getByRole("button", { name: "Save Layout" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not save layout");
  expect(screen.getByRole("button", { name: "Cancel customization" })).toBeInTheDocument();
});

test("supports an empty saved dashboard and adding the first widget", async () => {
  fetchDashboard.mockResolvedValueOnce({ ...dashboardData, layout: [] });
  const user = userEvent.setup();
  mount();
  expect(await screen.findByText("Your dashboard is empty.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Add a Widget" }));
  await user.click(screen.getByRole("button", { name: "Add Widget" }));
  expect(statCardLabels()).toEqual(["Hours Logged"]);
});

test("renders an unavailable saved statistic safely", async () => {
  fetchDashboard.mockResolvedValueOnce({
    ...dashboardData,
    layout: [{ id: "legacy", statisticId: "removedStatistic" }],
  });
  mount();
  expect(await screen.findByText("Unavailable statistic")).toBeInTheDocument();
  expect(screen.getByText("This statistic is no longer available.")).toBeInTheDocument();
});

test("enforces the 12-widget client limit", async () => {
  fetchDashboard.mockResolvedValueOnce({
    ...dashboardData,
    layout: Array.from({ length: 12 }, (_, index) => ({
      id: `widget-${index}`,
      statisticId: "loggedMinutes",
    })),
  });
  const user = await openCustomizer();
  await user.click(screen.getByRole("button", { name: "Add Widget" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("You can add up to 12 dashboard widgets.");
  expect(screen.getAllByLabelText("Widget statistic")).toHaveLength(12);
});

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import { fetchDashboard } from "../../api/dashboardApi";

vi.mock("../../api/dashboardApi", () => ({ fetchDashboard: vi.fn() }));
vi.mock("../../components/Sidebar", () => ({ default: () => null }));
const completionKey = "digitalLogbookOnboardingComplete";

beforeEach(() => {
  localStorage.clear();
  fetchDashboard.mockResolvedValue({});
});
afterEach(() => { cleanup(); localStorage.clear(); });

function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <>
    <output data-testid="location">{JSON.stringify(location)}</output>
    <button onClick={() => navigate("/other")}>Leave dashboard</button>
    <button onClick={() => navigate(-1)}>Return back</button>
  </>;
}
function mount(entry = "/dashboard") {
  return render(<MemoryRouter initialEntries={[entry]}>
    <NavigationProbe />
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/other" element={<div>Other page</div>} />
    </Routes>
  </MemoryRouter>);
}

test("first-time onboarding retains all steps and completion persistence", async () => {
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
  localStorage.setItem(completionKey, "true");
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
  localStorage.setItem(completionKey, "true");
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

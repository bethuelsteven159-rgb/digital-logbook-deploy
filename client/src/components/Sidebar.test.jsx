// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const userMocks = vi.hoisted(() => ({
  logout: vi.fn(),
}));

const userState = vi.hoisted(() => ({
  user: { id: "user-1", name: "Olive Owner", avatarUrl: null },
}));

vi.mock("../context/UserContext.jsx", () => ({
  useUser: () => ({
    user: userState.user,
    logout: userMocks.logout,
  }),
}));

vi.mock("../hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    counts: { overdue: 0, dueToday: 0, dueTomorrow: 0 },
    loading: false,
    error: "",
    refresh: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

import Sidebar from "./Sidebar";

function renderSidebar({ collapsed = false } = {}) {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route
          path="/dashboard"
          element={<Sidebar collapsed={collapsed} onToggle={() => {}} />}
        />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/profile" element={<div>Profile page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  userState.user = { id: "user-1", name: "Olive Owner", avatarUrl: null };
});

describe("Sidebar sign out", () => {
  test("renders the signed-in user next to the profile shortcut", async () => {
    renderSidebar();

    expect(screen.getByText("Olive Owner")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Go to profile" }),
    ).toBeInTheDocument();
  });

  test("signs out and returns to the login page", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(userMocks.logout).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  test("keeps sign out reachable while the sidebar is collapsed", () => {
    renderSidebar({ collapsed: true });

    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });
});

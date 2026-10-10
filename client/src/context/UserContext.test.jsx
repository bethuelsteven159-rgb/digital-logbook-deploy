// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("../api/userApi.js", () => ({
  getCurrentUser: apiMocks.getCurrentUser,
}));

const storeMocks = vi.hoisted(() => ({
  resetNotificationsStore: vi.fn(),
}));

vi.mock("../hooks/useNotifications.js", () => ({
  resetNotificationsStore: storeMocks.resetNotificationsStore,
}));

import { UserProvider, useUser } from "./UserContext.jsx";

function UserProbe() {
  const { user, logout } = useUser();

  return (
    <div>
      <span data-testid="user-name">{user ? user.name : "signed-out"}</span>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <UserProvider>
      <UserProbe />
    </UserProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem("authToken", "test-token");
});

describe("UserContext", () => {
  test("loads the current user when a session token exists", async () => {
    apiMocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      name: "Olive Owner",
    });

    renderProvider();

    expect(await screen.findByText("Olive Owner")).toBeInTheDocument();
    expect(apiMocks.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  test("logout clears the token, the cached notification feed and the user", async () => {
    const user = userEvent.setup();
    apiMocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      name: "Olive Owner",
    });

    renderProvider();

    await screen.findByText("Olive Owner");
    await user.click(screen.getByRole("button", { name: "Logout" }));

    expect(localStorage.getItem("authToken")).toBeNull();
    expect(storeMocks.resetNotificationsStore).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("user-name")).toHaveTextContent("signed-out");
  });

  test("missing sessions surface as a signed-out state", async () => {
    const unauthorized = new Error("Not authenticated");
    unauthorized.status = 401;
    apiMocks.getCurrentUser.mockRejectedValue(unauthorized);

    renderProvider();

    expect(await screen.findByText("signed-out")).toBeInTheDocument();
  });
});

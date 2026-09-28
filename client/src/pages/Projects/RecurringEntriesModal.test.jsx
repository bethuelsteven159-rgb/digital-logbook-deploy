import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecurringEntriesModal from "./RecurringEntriesModal";

const apiMocks = vi.hoisted(() => ({
  fetchRecurringEntries: vi.fn(),
  createRecurringEntry: vi.fn(),
  updateRecurringEntry: vi.fn(),
  deleteRecurringEntry: vi.fn(),
}));

vi.mock("../../api/recurringEntriesApi", () => ({
  fetchRecurringEntries: apiMocks.fetchRecurringEntries,
  createRecurringEntry: apiMocks.createRecurringEntry,
  updateRecurringEntry: apiMocks.updateRecurringEntry,
  deleteRecurringEntry: apiMocks.deleteRecurringEntry,
}));

const activeDefinition = {
  id: "def-1",
  projectId: "project-1",
  name: "Daily stand-up notes",
  durationMinutes: 15,
  tags: ["standup"],
  checklist: [{ text: "Add blockers" }],
  frequency: "daily",
  intervalCount: 1,
  startsOn: "2026-09-01",
  endsOn: null,
  enabled: true,
  lastGeneratedOn: "2026-09-27",
};

const pausedDefinition = {
  id: "def-2",
  projectId: "project-1",
  name: "Revision session",
  durationMinutes: 60,
  tags: [],
  checklist: [],
  frequency: "weekly",
  intervalCount: 2,
  startsOn: "2026-09-01",
  endsOn: "2026-12-31",
  enabled: false,
  lastGeneratedOn: null,
};

function renderModal(props = {}) {
  const onClose = vi.fn();
  const onChanged = vi.fn();

  render(
    <RecurringEntriesModal
      projectId="project-1"
      onClose={onClose}
      onChanged={onChanged}
      {...props}
    />,
  );

  return { onClose, onChanged };
}

describe("RecurringEntriesModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiMocks.fetchRecurringEntries.mockResolvedValue([
      activeDefinition,
    ]);
    apiMocks.createRecurringEntry.mockResolvedValue({
      id: "def-3",
    });
    apiMocks.updateRecurringEntry.mockResolvedValue({
      id: "def-1",
    });
    apiMocks.deleteRecurringEntry.mockResolvedValue({
      id: "def-1",
    });
  });

  test("lists existing definitions with their schedule and status", async () => {
    renderModal();

    expect(
      await screen.findByText("Daily stand-up notes"),
    ).toBeInTheDocument();

    expect(apiMocks.fetchRecurringEntries).toHaveBeenCalledWith(
      "project-1",
    );
    expect(
      screen.getByText(/Every day · 15 min/),
    ).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  test("formats interval and end date for paused definitions", async () => {
    apiMocks.fetchRecurringEntries.mockResolvedValue([
      pausedDefinition,
    ]);

    renderModal();

    expect(
      await screen.findByText("Revision session"),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Every 2 weeks until 2026-12-31/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  test("shows a load error when definitions cannot be fetched", async () => {
    apiMocks.fetchRecurringEntries.mockRejectedValue(
      new Error("Could not load recurring entries."),
    );

    renderModal();

    expect(
      await screen.findByText(
        "Could not load recurring entries.",
      ),
    ).toBeInTheDocument();
  });

  test("creates a recurring entry from the form and notifies the page", async () => {
    const user = userEvent.setup();
    const { onChanged } = renderModal();

    await screen.findByText("Daily stand-up notes");

    await user.type(
      screen.getByLabelText(/Entry name/i),
      "Weekly review",
    );
    await user.selectOptions(
      screen.getByLabelText("Repeats"),
      "weekly",
    );
    await user.clear(screen.getByLabelText("Every"));
    await user.type(screen.getByLabelText("Every"), "2");
    await user.type(
      screen.getByLabelText(/Time spent per occurrence/i),
      "45",
    );
    await user.type(
      screen.getByLabelText("Tags"),
      "review{Enter}",
    );
    await user.type(
      screen.getByLabelText("Checklist"),
      "Summarise progress{Enter}",
    );

    await user.click(
      screen.getByRole("button", {
        name: "Create recurring entry",
      }),
    );

    await waitFor(() =>
      expect(
        apiMocks.createRecurringEntry,
      ).toHaveBeenCalledTimes(1),
    );

    const [projectId, payload] =
      apiMocks.createRecurringEntry.mock.calls[0];

    expect(projectId).toBe("project-1");
    expect(payload).toMatchObject({
      name: "Weekly review",
      durationMinutes: 45,
      frequency: "weekly",
      intervalCount: 2,
      endsOn: null,
      tags: ["review"],
      checklist: [{ text: "Summarise progress" }],
    });
    expect(payload.startsOn).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );

    expect(
      apiMocks.fetchRecurringEntries,
    ).toHaveBeenCalledTimes(2);
    expect(onChanged).toHaveBeenCalled();
  });

  test("edits an existing definition", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("Daily stand-up notes");

    await user.click(
      screen.getByRole("button", { name: "Edit" }),
    );

    const nameInput = screen.getByLabelText(/Entry name/i);

    expect(nameInput).toHaveValue(
      "Daily stand-up notes",
    );
    expect(
      screen.getByText("Edit recurring entry"),
    ).toBeInTheDocument();

    await user.clear(nameInput);
    await user.type(nameInput, "Morning journal");

    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );

    await waitFor(() =>
      expect(
        apiMocks.updateRecurringEntry,
      ).toHaveBeenCalledTimes(1),
    );

    const [definitionId, payload] =
      apiMocks.updateRecurringEntry.mock.calls[0];

    expect(definitionId).toBe("def-1");
    expect(payload).toMatchObject({
      name: "Morning journal",
      frequency: "daily",
      intervalCount: 1,
      startsOn: "2026-09-01",
      endsOn: null,
    });
  });

  test("pauses an active definition", async () => {
    const user = userEvent.setup();
    const { onChanged } = renderModal();

    await screen.findByText("Daily stand-up notes");

    await user.click(
      screen.getByRole("button", { name: "Pause" }),
    );

    await waitFor(() =>
      expect(
        apiMocks.updateRecurringEntry,
      ).toHaveBeenCalledWith("def-1", {
        enabled: false,
      }),
    );

    expect(onChanged).toHaveBeenCalled();
  });

  test("deletes a definition after confirmation", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(true);

    renderModal();

    await screen.findByText("Daily stand-up notes");

    await user.click(
      screen.getByRole("button", { name: "Delete" }),
    );

    await waitFor(() =>
      expect(
        apiMocks.deleteRecurringEntry,
      ).toHaveBeenCalledWith("def-1"),
    );

    confirmSpy.mockRestore();
  });

  test("keeps the definition when deletion is not confirmed", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(false);

    renderModal();

    await screen.findByText("Daily stand-up notes");

    await user.click(
      screen.getByRole("button", { name: "Delete" }),
    );

    expect(
      apiMocks.deleteRecurringEntry,
    ).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  test("rejects an end date earlier than the start date", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("Daily stand-up notes");

    await user.type(
      screen.getByLabelText(/Entry name/i),
      "Bad range",
    );

    fireEvent.change(
      screen.getByLabelText(/Starts on/i),
      { target: { value: "2026-10-10" } },
    );
    fireEvent.change(
      screen.getByLabelText(/Ends on/i),
      { target: { value: "2026-10-01" } },
    );

    await user.click(
      screen.getByRole("button", {
        name: "Create recurring entry",
      }),
    );

    expect(
      await screen.findByText(
        /End date cannot be earlier/i,
      ),
    ).toBeInTheDocument();
    expect(
      apiMocks.createRecurringEntry,
    ).not.toHaveBeenCalled();
  });

  test("requires a name before saving", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("Daily stand-up notes");

    await user.click(
      screen.getByRole("button", {
        name: "Create recurring entry",
      }),
    );

    expect(
      await screen.findByText(
        "Recurring entry name is required.",
      ),
    ).toBeInTheDocument();
    expect(
      apiMocks.createRecurringEntry,
    ).not.toHaveBeenCalled();
  });
});

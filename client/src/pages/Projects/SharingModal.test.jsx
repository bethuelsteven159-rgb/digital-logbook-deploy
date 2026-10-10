import { describe, test, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SharingModal from "./SharingModal";

const apiMocks = vi.hoisted(() => ({
  fetchCollaborators: vi.fn(),
  inviteCollaborator: vi.fn(),
  revokeInvitation: vi.fn(),
  removeCollaborator: vi.fn(),
}));

vi.mock("../../api/projectSharingApi", () => ({
  fetchCollaborators: apiMocks.fetchCollaborators,
  inviteCollaborator: apiMocks.inviteCollaborator,
  revokeInvitation: apiMocks.revokeInvitation,
  removeCollaborator: apiMocks.removeCollaborator,
}));

const userState = vi.hoisted(() => ({ id: "owner-1" }));

vi.mock("../../context/UserContext", () => ({
  useUser: () => ({ user: userState, loading: false, error: null }),
}));

const owner = { id: "owner-1", name: "Olive Owner", email: "olive@example.com" };
const collaborator = {
  id: "user-2",
  name: "Carl Collaborator",
  email: "carl@example.com",
};
const invitation = {
  id: "invitation-1",
  inviteeEmail: "new@example.com",
  inviterName: "Olive Owner",
};

const sharingData = {
  project: { id: "project-1", ownerId: "owner-1" },
  owner,
  collaborators: [collaborator],
  invitations: [invitation],
};

function renderModal(props = {}) {
  const onClose = vi.fn();
  const onSharedChange = vi.fn();

  const view = render(
    <SharingModal
      projectId="project-1"
      onClose={onClose}
      onSharedChange={onSharedChange}
      {...props}
    />,
  );

  return { onClose, onSharedChange, container: view.container };
}

beforeEach(() => {
  vi.clearAllMocks();
  userState.id = "owner-1";
});

describe("SharingModal", () => {
  test("shows a loading state before the sharing details arrive", async () => {
    let resolveLoad;
    apiMocks.fetchCollaborators.mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );
    renderModal();

    expect(
      screen.getByText("Loading sharing details..."),
    ).toBeInTheDocument();

    resolveLoad(sharingData);

    expect(await screen.findByText("olive@example.com")).toBeInTheDocument();
    expect(
      screen.queryByText("Loading sharing details..."),
    ).not.toBeInTheDocument();
  });

  test("renders the owner, collaborators and pending invitations", async () => {
    apiMocks.fetchCollaborators.mockResolvedValue(sharingData);
    renderModal();

    expect(
      await screen.findByRole("heading", { name: "Share Project" }),
    ).toBeInTheDocument();
    expect(screen.getByText("olive@example.com")).toBeInTheDocument();
    expect(screen.getByText("Carl Collaborator")).toBeInTheDocument();
    expect(screen.getByText("new@example.com")).toBeInTheDocument();
    expect(screen.getByText("Invited by Olive Owner")).toBeInTheDocument();
    expect(apiMocks.fetchCollaborators).toHaveBeenCalledWith("project-1");
  });

  test("renders empty placeholders when nothing is shared yet", async () => {
    apiMocks.fetchCollaborators.mockResolvedValue({
      ...sharingData,
      collaborators: [],
      invitations: [],
    });
    renderModal();

    expect(
      await screen.findByText(
        "No collaborators yet. Invite someone to start sharing this project.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("No pending invitations.")).toBeInTheDocument();
  });

  test("tolerates an empty payload without crashing", async () => {
    apiMocks.fetchCollaborators.mockResolvedValue(null);
    renderModal();

    expect(
      await screen.findByText(
        "No collaborators yet. Invite someone to start sharing this project.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
  });

  test("shows the owner a Remove button for every collaborator", async () => {
    apiMocks.fetchCollaborators.mockResolvedValue(sharingData);
    renderModal();

    expect(
      await screen.findByRole("button", { name: "Remove" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Leave" }),
    ).not.toBeInTheDocument();
  });

  test("shows a collaborator Leave for themselves and no controls elsewhere", async () => {
    userState.id = "user-2";
    apiMocks.fetchCollaborators.mockResolvedValue({
      ...sharingData,
      collaborators: [
        collaborator,
        { id: "user-3", name: "Other Person", email: "other@example.com" },
      ],
    });
    renderModal();

    expect(
      await screen.findByRole("button", { name: "Leave" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove" }),
    ).not.toBeInTheDocument();
  });

  test("keeps the invite button disabled until an email is typed", async () => {
    apiMocks.fetchCollaborators.mockResolvedValue(sharingData);
    renderModal();

    expect(
      await screen.findByRole("button", { name: "Invite" }),
    ).toBeDisabled();
  });

  test("asks for an email when the form is submitted empty", async () => {
    apiMocks.fetchCollaborators.mockResolvedValue(sharingData);
    renderModal();

    const emailInput = await screen.findByLabelText("Invitee email");
    fireEvent.submit(emailInput.closest("form"));

    expect(
      await screen.findByText("Enter the email of the person to invite."),
    ).toBeInTheDocument();
    expect(apiMocks.inviteCollaborator).not.toHaveBeenCalled();
  });

  test("sends an invitation, clears the input and refreshes the list", async () => {
    const user = userEvent.setup();
    apiMocks.fetchCollaborators.mockResolvedValue(sharingData);
    apiMocks.inviteCollaborator.mockResolvedValue({ id: "invitation-2" });
    const { onSharedChange } = renderModal();

    await user.type(
      await screen.findByLabelText("Invitee email"),
      "friend@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Invite" }));

    await waitFor(() =>
      expect(apiMocks.inviteCollaborator).toHaveBeenCalledWith(
        "project-1",
        "friend@example.com",
      ),
    );
    expect(
      await screen.findByText("Invitation sent to friend@example.com."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Invitee email")).toHaveValue("");
    await waitFor(() =>
      expect(apiMocks.fetchCollaborators).toHaveBeenCalledTimes(2),
    );
    expect(onSharedChange).toHaveBeenCalledTimes(1);
  });

  test("shows an error and stays open when inviting fails", async () => {
    const user = userEvent.setup();
    apiMocks.fetchCollaborators.mockResolvedValue(sharingData);
    apiMocks.inviteCollaborator.mockRejectedValue(
      new Error("A pending invitation already exists for this email"),
    );
    const { onClose } = renderModal();

    await user.type(
      await screen.findByLabelText("Invitee email"),
      "friend@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Invite" }));

    expect(
      await screen.findByText(
        "A pending invitation already exists for this email",
      ),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  test("revokes a pending invitation", async () => {
    const user = userEvent.setup();
    apiMocks.fetchCollaborators.mockResolvedValue(sharingData);
    apiMocks.revokeInvitation.mockResolvedValue({ id: "invitation-1" });
    renderModal();

    await user.click(await screen.findByRole("button", { name: "Revoke" }));

    await waitFor(() =>
      expect(apiMocks.revokeInvitation).toHaveBeenCalledWith(
        "project-1",
        "invitation-1",
      ),
    );
    expect(await screen.findByText("Invitation revoked.")).toBeInTheDocument();
  });

  test("removes a collaborator as the owner", async () => {
    const user = userEvent.setup();
    apiMocks.fetchCollaborators.mockResolvedValue(sharingData);
    apiMocks.removeCollaborator.mockResolvedValue({ id: "user-2" });
    renderModal();

    await user.click(await screen.findByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(apiMocks.removeCollaborator).toHaveBeenCalledWith(
        "project-1",
        "user-2",
      ),
    );
    expect(
      await screen.findByText("Collaborator removed."),
    ).toBeInTheDocument();
  });

  test("lets a collaborator leave the project", async () => {
    const user = userEvent.setup();
    userState.id = "user-2";
    apiMocks.fetchCollaborators.mockResolvedValue(sharingData);
    apiMocks.removeCollaborator.mockResolvedValue({ id: "user-2" });
    renderModal();

    await user.click(await screen.findByRole("button", { name: "Leave" }));

    await waitFor(() =>
      expect(apiMocks.removeCollaborator).toHaveBeenCalledWith(
        "project-1",
        "user-2",
      ),
    );
    expect(
      await screen.findByText("You have left the project."),
    ).toBeInTheDocument();
  });

  test("shows the load error message when loading fails", async () => {
    apiMocks.fetchCollaborators.mockRejectedValue(
      new Error("Could not load sharing details"),
    );
    renderModal();

    expect(
      await screen.findByText("Could not load sharing details"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Loading sharing details..."),
    ).not.toBeInTheDocument();
  });

  test("closes when the close button is clicked", async () => {
    const user = userEvent.setup();
    apiMocks.fetchCollaborators.mockResolvedValue(sharingData);
    const { onClose } = renderModal();

    await user.click(await screen.findByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("closes on an overlay click but not on clicks inside the modal", async () => {
    apiMocks.fetchCollaborators.mockResolvedValue(sharingData);
    const { onClose, container } = renderModal();

    await screen.findByText("olive@example.com");

    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

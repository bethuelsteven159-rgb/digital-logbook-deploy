import {
  acceptInvitation,
  declineInvitation,
  fetchCollaborators,
  fetchMyInvitations,
  inviteCollaborator,
  removeCollaborator,
  revokeInvitation,
} from "./projectSharingApi";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestAt(fetchMock, index = 0) {
  const [url, options] = fetchMock.mock.calls[index];
  return { url, options };
}

describe("projectSharingApi", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("authToken", "test-token");
    vi.restoreAllMocks();
  });

  it("lists collaborators and unwraps the data envelope", async () => {
    const data = {
      project: { id: "project-1", ownerId: "owner-1" },
      owner: { id: "owner-1", name: "Olive Owner" },
      collaborators: [{ id: "user-2", email: "carl@example.com" }],
      invitations: [],
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ success: true, data }));

    const result = await fetchCollaborators("project-1");
    const { url, options } = requestAt(fetchMock);

    expect(url).toMatch(/\/api\/projects\/project-1\/collaborators$/);
    expect(options.headers.Authorization).toBe("Bearer test-token");
    expect(result).toEqual(data);
  });

  it("invites a collaborator by email", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse({ success: true, data: { id: "invitation-1" } }, 201),
      );

    const result = await inviteCollaborator("project-1", "friend@example.com");
    const { url, options } = requestAt(fetchMock);

    expect(url).toMatch(
      /\/api\/projects\/project-1\/collaborators\/invitations$/,
    );
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ email: "friend@example.com" });
    expect(result).toEqual({ id: "invitation-1" });
  });

  it("revokes a pending invitation", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse({ success: true, data: { id: "invitation-1" } }),
      );

    await revokeInvitation("project-1", "invitation-1");
    const { url, options } = requestAt(fetchMock);

    expect(url).toMatch(
      /\/api\/projects\/project-1\/collaborators\/invitations\/invitation-1$/,
    );
    expect(options.method).toBe("DELETE");
  });

  it("removes a collaborator", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse({ success: true, data: { removed: true } }),
      );

    const result = await removeCollaborator("project-1", "user-2");
    const { url, options } = requestAt(fetchMock);

    expect(url).toMatch(/\/api\/projects\/project-1\/collaborators\/user-2$/);
    expect(options.method).toBe("DELETE");
    expect(result).toEqual({ removed: true });
  });

  it("lists the caller's pending invitations", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse({ success: true, data: [{ id: "invitation-1" }] }),
      );

    const result = await fetchMyInvitations();
    const { url } = requestAt(fetchMock);

    expect(url).toMatch(/\/api\/invitations$/);
    expect(result).toEqual([{ id: "invitation-1" }]);
  });

  it("accepts an invitation", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse({ success: true, data: { status: "accepted" } }),
      );

    const result = await acceptInvitation("invitation-1");
    const { url, options } = requestAt(fetchMock);

    expect(url).toMatch(/\/api\/invitations\/invitation-1\/accept$/);
    expect(options.method).toBe("POST");
    expect(result).toEqual({ status: "accepted" });
  });

  it("declines an invitation", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse({ success: true, data: { status: "declined" } }),
      );

    const result = await declineInvitation("invitation-1");
    const { url, options } = requestAt(fetchMock);

    expect(url).toMatch(/\/api\/invitations\/invitation-1\/decline$/);
    expect(options.method).toBe("POST");
    expect(result).toEqual({ status: "declined" });
  });

  it("throws a 401-shaped error when there is no token", async () => {
    localStorage.removeItem("authToken");
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(fetchCollaborators("project-1")).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the server error message on failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        { message: "A pending invitation already exists for this email" },
        409,
      ),
    );

    await expect(
      inviteCollaborator("project-1", "friend@example.com"),
    ).rejects.toThrow("A pending invitation already exists for this email");
  });

  it("rejects calls that are missing required ids", () => {
    expect(() => fetchCollaborators()).toThrow("Project ID is required.");
    expect(() => inviteCollaborator()).toThrow("Project ID is required.");
    expect(() => revokeInvitation("project-1")).toThrow(
      "Project ID and invitation ID are required.",
    );
    expect(() => removeCollaborator("project-1")).toThrow(
      "Project ID and user ID are required.",
    );
    expect(() => acceptInvitation()).toThrow("Invitation ID is required.");
    expect(() => declineInvitation()).toThrow("Invitation ID is required.");
  });
});

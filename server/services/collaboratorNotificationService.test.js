import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const db = require("../db");
const emailService = require("./emailService");
const {
  ACTION_DESCRIPTIONS,
  notifyProjectChange,
  resetNotificationThrottle,
} = require("./collaboratorNotificationService");

const PROJECT_ID = "project-1";
const OWNER = { id: "owner-1", name: "Olivia Owner", email: "olivia@example.com" };
const COLLAB_A = { id: "collab-a", name: "Ana", email: "ana@example.com" };
const COLLAB_B = { id: "collab-b", name: "Ben", email: "ben@example.com" };

function membersQuery(members, projectName = "Lab Notebook") {
  return vi.fn().mockResolvedValue({
    rows: members.map((member) => ({ project_name: projectName, ...member })),
  });
}

function baseOptions(overrides = {}) {
  return {
    enabled: true,
    query: membersQuery([OWNER, COLLAB_A, COLLAB_B]),
    sendEmail: vi.fn().mockResolvedValue({ messageId: "m" }),
    now: () => 1_000_000,
    throttleMs: 10 * 60 * 1000,
    ...overrides,
  };
}

const originalFrontendUrl = process.env.FRONTEND_URL;

beforeEach(() => {
  resetNotificationThrottle();
  process.env.FRONTEND_URL = "https://notebook.example.com/";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = originalFrontendUrl;
});

describe("notifyProjectChange", () => {
  test("emails every other project member but not the person who made the change", async () => {
    const options = baseOptions();

    const result = await notifyProjectChange(
      { projectId: PROJECT_ID, actorId: COLLAB_A.id, action: "entry_updated", entryName: "Week 3" },
      options,
    );

    expect(result).toEqual({ sent: 2 });
    expect(options.query).toHaveBeenCalledWith(expect.any(String), [PROJECT_ID]);

    const recipients = options.sendEmail.mock.calls.map(([message]) => message.to.email);
    expect(recipients.sort()).toEqual([OWNER.email, COLLAB_B.email].sort());

    const [message] = options.sendEmail.mock.calls[0];
    expect(message.subject).toBe('Ana edited the entry "Week 3" in "Lab Notebook"');
    expect(message.text).toContain('Ana edited the entry "Week 3" in the shared project "Lab Notebook".');
    expect(message.text).toContain("https://notebook.example.com/projects/project-1");
    expect(message.html).toContain('href="https://notebook.example.com/projects/project-1"');
  });

  test("notifies collaborators when the owner makes a change", async () => {
    const options = baseOptions();

    await notifyProjectChange(
      { projectId: PROJECT_ID, actorId: OWNER.id, action: "project_updated" },
      options,
    );

    const recipients = options.sendEmail.mock.calls.map(([message]) => message.to.email);
    expect(recipients.sort()).toEqual([COLLAB_A.email, COLLAB_B.email].sort());
    expect(options.sendEmail.mock.calls[0][0].subject).toBe(
      'Olivia Owner updated the project details in "Lab Notebook"',
    );
  });

  test("sends nothing for a project that is not shared", async () => {
    const options = baseOptions({ query: membersQuery([OWNER]) });

    const result = await notifyProjectChange(
      { projectId: PROJECT_ID, actorId: OWNER.id, action: "entry_created", entryName: "Solo" },
      options,
    );

    expect(result).toEqual({ sent: 0 });
    expect(options.sendEmail).not.toHaveBeenCalled();
  });

  test("sends nothing when the actor is not a member of the project", async () => {
    const options = baseOptions();

    await notifyProjectChange(
      { projectId: PROJECT_ID, actorId: "stranger", action: "entry_created", entryName: "X" },
      options,
    );

    expect(options.sendEmail).not.toHaveBeenCalled();
  });

  test("throttles repeat emails to the same recipient for the same project", async () => {
    let currentTime = 1_000_000;
    const options = baseOptions({ now: () => currentTime });
    const change = { projectId: PROJECT_ID, actorId: COLLAB_A.id, action: "entry_updated", entryName: "E" };

    await notifyProjectChange(change, options);
    expect(options.sendEmail).toHaveBeenCalledTimes(2);

    currentTime += 5 * 60 * 1000;
    const throttled = await notifyProjectChange(change, options);
    expect(throttled).toEqual({ sent: 0 });
    expect(options.sendEmail).toHaveBeenCalledTimes(2);

    currentTime += 6 * 60 * 1000;
    await notifyProjectChange(change, options);
    expect(options.sendEmail).toHaveBeenCalledTimes(4);
  });

  test("throttling is per recipient, so a new actor still notifies the first actor", async () => {
    const options = baseOptions();

    await notifyProjectChange(
      { projectId: PROJECT_ID, actorId: COLLAB_A.id, action: "entry_updated", entryName: "E" },
      options,
    );
    options.sendEmail.mockClear();

    await notifyProjectChange(
      { projectId: PROJECT_ID, actorId: COLLAB_B.id, action: "entry_updated", entryName: "E" },
      options,
    );

    const recipients = options.sendEmail.mock.calls.map(([message]) => message.to.email);
    expect(recipients).toEqual([COLLAB_A.email]);
  });

  test("a failed send is logged, does not throw, and does not consume the throttle window", async () => {
    const sendEmail = vi
      .fn()
      .mockRejectedValueOnce(new Error("provider down"))
      .mockResolvedValue({ messageId: "m" });
    const options = baseOptions({ query: membersQuery([OWNER, COLLAB_A]), sendEmail });
    const change = { projectId: PROJECT_ID, actorId: COLLAB_A.id, action: "entry_deleted", entryName: "Old" };

    const first = await notifyProjectChange(change, options);
    expect(first).toEqual({ sent: 0 });
    expect(console.error).toHaveBeenCalled();

    const retry = await notifyProjectChange(change, options);
    expect(retry).toEqual({ sent: 1 });
  });

  test("never throws when loading project members fails", async () => {
    const options = baseOptions({ query: vi.fn().mockRejectedValue(new Error("db down")) });

    await expect(
      notifyProjectChange(
        { projectId: PROJECT_ID, actorId: COLLAB_A.id, action: "entry_created", entryName: "E" },
        options,
      ),
    ).resolves.toEqual({ sent: 0 });
    expect(options.sendEmail).not.toHaveBeenCalled();
  });

  test("escapes user-provided names in the html body", async () => {
    const options = baseOptions({
      query: membersQuery([OWNER, { ...COLLAB_A, name: "<b>Ana</b>" }], "R&D <Lab>"),
    });

    await notifyProjectChange(
      { projectId: PROJECT_ID, actorId: COLLAB_A.id, action: "entry_created", entryName: '<script>alert("x")</script>' },
      options,
    );

    const { html } = options.sendEmail.mock.calls[0][0];
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>Ana</b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("R&amp;D &lt;Lab&gt;");
  });

  test("falls back to a generic entry label when the entry name is unknown", async () => {
    const options = baseOptions();

    await notifyProjectChange(
      { projectId: PROJECT_ID, actorId: COLLAB_A.id, action: "entry_deleted" },
      options,
    );

    expect(options.sendEmail.mock.calls[0][0].subject).toBe(
      'Ana deleted the entry "an entry" in "Lab Notebook"',
    );
  });

  test("ignores unknown actions", async () => {
    const options = baseOptions();

    await notifyProjectChange(
      { projectId: PROJECT_ID, actorId: COLLAB_A.id, action: "checklist_toggled" },
      options,
    );

    expect(options.query).not.toHaveBeenCalled();
    expect(options.sendEmail).not.toHaveBeenCalled();
  });

  test("is disabled during test runs and touches neither the database nor the provider", async () => {
    const querySpy = vi.spyOn(db, "query");
    const sendSpy = vi.spyOn(emailService, "sendEmail");

    const result = await notifyProjectChange({
      projectId: PROJECT_ID,
      actorId: COLLAB_A.id,
      action: "entry_created",
      entryName: "E",
    });

    expect(result).toEqual({ sent: 0 });
    expect(querySpy).not.toHaveBeenCalled();
    expect(sendSpy).not.toHaveBeenCalled();
  });

  test("describes every supported action", () => {
    for (const describeAction of Object.values(ACTION_DESCRIPTIONS)) {
      expect(describeAction("Entry")).toEqual(expect.any(String));
    }
  });
});

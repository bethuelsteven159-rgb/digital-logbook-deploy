const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildDemoPlan,
  seedDemoData,
  main,
  describeDatabaseTarget,
  occurredIso,
  addDaysIso,
  DEMO_PROJECT_NAMES,
  RESERVED_LIVE_DEMO_ENTRY,
} = require("../scripts/seedDemoData");

const NOW = new Date("2026-09-28T00:00:00Z");
const TODAY_ISO = "2026-09-28";

const USER = {
  id: "user-1",
  name: "Demo User",
  email: "demo@example.com",
};

const OTHER_USER = {
  id: "user-2",
  name: "Other User",
  email: "other@example.com",
};

// ---------------------------------------------------------------------------
// In-memory fake gateways — the same seam the orchestrator uses against
// the real services, so these tests never touch a database.
// ---------------------------------------------------------------------------

function createFakeGateways(users) {
  const state = {
    projects: new Map(),
    fields: new Map(),
    entries: new Map(),
    entryRows: new Map(),
    rules: new Map(),
    recurring: new Map(),
    counters: { project: 0, field: 0, entry: 0 },
    calls: {
      findUserById: [],
      findUserByEmail: [],
      createProject: [],
      findProjectByName: [],
      createField: [],
      findEntryByName: [],
      createEntry: [],
      backdateEntry: [],
      completeChecklistItem: [],
      createRule: [],
      createRecurring: [],
    },
  };

  const key = (projectId, name) =>
    `${projectId}||${name.trim().toLowerCase()}`;

  const gateways = {
    async findUserById(userId) {
      state.calls.findUserById.push(userId);
      return (
        users.find((row) => row.id === userId) ||
        null
      );
    },

    async findUserByEmail(email) {
      state.calls.findUserByEmail.push(email);
      return (
        users.find(
          (row) =>
            row.email.toLowerCase() ===
            email.toLowerCase(),
        ) || null
      );
    },

    async createProject(ownerId, data) {
      const project = {
        id: `project-${(state.counters.project += 1)}`,
        owner_id: ownerId,
        name: data.name,
      };

      state.calls.createProject.push({
        ownerId,
        data,
        returnedId: project.id,
      });

      state.projects.set(
        key(project.id, data.name),
        project,
      );

      return project;
    },

    async findProjectByName(ownerId, name) {
      state.calls.findProjectByName.push({
        ownerId,
        name,
      });

      for (const project of state.projects.values()) {
        if (
          project.owner_id === ownerId &&
          project.name === name
        ) {
          return project;
        }
      }

      return null;
    },

    async listFields(projectId) {
      return [...state.fields.values()].filter(
        (field) =>
          field.projectId === projectId &&
          !field.archivedAt,
      );
    },

    async createField(data) {
      const field = {
        id: `field-${(state.counters.field += 1)}`,
        projectId: data.projectId,
        name: data.name,
        fieldType: data.fieldType,
        formula: data.formula ?? null,
        position: data.position,
        archivedAt: null,
      };

      state.calls.createField.push({
        ...data,
        returnedId: field.id,
      });

      state.fields.set(
        key(data.projectId, data.name),
        field,
      );

      return field;
    },

    async findEntryByName(projectId, name) {
      state.calls.findEntryByName.push({
        projectId,
        name,
      });

      const row = state.entries.get(
        key(projectId, name),
      );

      return row || null;
    },

    async createEntry({ projectId, userId, data }) {
      const id = `entry-${(state.counters.entry += 1)}`;

      state.calls.createEntry.push({
        projectId,
        userId,
        data,
        returnedId: id,
      });

      state.entries.set(key(projectId, data.name), {
        id,
        project_id: projectId,
        name: data.name,
      });

      state.entryRows.set(id, {
        id,
        projectId,
        createdById: userId,
        name: data.name,
        data,
      });

      return { id };
    },

    async backdateEntry({
      entryId,
      userId,
      occurredAt,
      completedAt,
    }) {
      state.calls.backdateEntry.push({
        entryId,
        userId,
        occurredAt,
        completedAt,
      });

      const row = state.entryRows.get(entryId);

      if (!row || row.createdById !== userId) {
        return false;
      }

      row.occurredAt = occurredAt;
      row.completedAt = completedAt;
      return true;
    },

    async completeChecklistItem({ entryId, text }) {
      state.calls.completeChecklistItem.push({
        entryId,
        text,
      });

      return state.entryRows.has(entryId);
    },

    async listRules({ projectId }) {
      return [...state.rules.values()].filter(
        (rule) => rule.projectId === projectId,
      );
    },

    async createRule({ ownerId, projectId, data }) {
      state.calls.createRule.push({
        ownerId,
        projectId,
        data,
      });

      state.rules.set(
        `${projectId}||${data.name.trim().toLowerCase()}`,
        { projectId, ...data },
      );

      return { id: `rule-${state.rules.size}` };
    },

    async listRecurring({ projectId }) {
      return [...state.recurring.values()].filter(
        (def) => def.projectId === projectId,
      );
    },

    async createRecurring({ projectId, userId, data }) {
      state.calls.createRecurring.push({
        projectId,
        userId,
        data,
      });

      state.recurring.set(
        `${projectId}||${data.name.trim().toLowerCase()}`,
        { projectId, ...data },
      );

      return { id: `recurring-${state.recurring.size}` };
    },

    async close() {},
  };

  return { state, gateways };
}

function planEntries(plan) {
  return plan.projects.flatMap((project) =>
    project.entries.map((entry) => ({
      project: project.name,
      ...entry,
    })),
  );
}

// ---------------------------------------------------------------------------
// Guards (STEP 19: refuses without DEMO_SEED, without identifier,
// and rejects unknown users — all before touching the database)
// ---------------------------------------------------------------------------

test("main refuses to run without DEMO_SEED=true", async () => {
  const { state, gateways } = createFakeGateways([
    USER,
  ]);

  const result = await main({
    env: {},
    gateways,
    log: () => {},
    now: NOW,
  });

  assert.deepEqual(result, {
    ok: false,
    reason: "missing-demo-seed-flag",
  });
  assert.equal(state.calls.findUserById.length, 0);
  assert.equal(
    state.calls.findUserByEmail.length,
    0,
  );
});

test("main refuses to run without a user identifier", async () => {
  const { state, gateways } = createFakeGateways([
    USER,
  ]);

  const result = await main({
    env: { DEMO_SEED: "true" },
    gateways,
    log: () => {},
    now: NOW,
  });

  assert.deepEqual(result, {
    ok: false,
    reason: "missing-user-identifier",
  });
  assert.equal(state.calls.findUserById.length, 0);
  assert.equal(
    state.calls.findUserByEmail.length,
    0,
  );
});

test("main rejects an unknown DEMO_USER_ID", async () => {
  const { gateways } = createFakeGateways([USER]);

  const result = await main({
    env: {
      DEMO_SEED: "true",
      DEMO_USER_ID: "no-such-user",
    },
    gateways,
    log: () => {},
    now: NOW,
  });

  assert.deepEqual(result, {
    ok: false,
    reason: "unknown-user",
  });
});

test("main rejects an unknown DEMO_USER_EMAIL", async () => {
  const { gateways } = createFakeGateways([USER]);

  const result = await main({
    env: {
      DEMO_SEED: "true",
      DEMO_USER_EMAIL: "ghost@example.com",
    },
    gateways,
    log: () => {},
    now: NOW,
  });

  assert.deepEqual(result, {
    ok: false,
    reason: "unknown-user",
  });
});

test("describeDatabaseTarget never exposes credentials", () => {
  const described = describeDatabaseTarget(
    "postgres://user:secret-password@db.example.com:5432/logbook_prod",
  );

  assert.equal(
    described,
    "db.example.com:5432/logbook_prod",
  );
  assert.ok(!described.includes("secret"));
  assert.ok(!described.includes("user:"));
});

// ---------------------------------------------------------------------------
// Plan shape (STEP 5-8, 15: projects, counts, statuses, durations,
// date spread, distinct project flavours, reserved live entry)
// ---------------------------------------------------------------------------

test("demo plan contains exactly the four required projects", () => {
  const plan = buildDemoPlan({ todayIso: TODAY_ISO });

  assert.deepEqual(
    plan.projects.map((project) => project.name),
    DEMO_PROJECT_NAMES,
  );
});

test("demo plan entry totals sit inside the 45-60 range", () => {
  const plan = buildDemoPlan({ todayIso: TODAY_ISO });
  const entries = planEntries(plan);

  assert.equal(entries.length, 49);

  const perProject = Object.fromEntries(
    plan.projects.map((project) => [
      project.name,
      project.entries.length,
    ]),
  );

  assert.deepEqual(perProject, {
    "Machine Learning Project": 14,
    "Software Design Project": 13,
    "Research Project": 11,
    "Personal Study Log": 11,
  });
});

test("statuses are varied and unequally common", () => {
  const plan = buildDemoPlan({ todayIso: TODAY_ISO });
  const entries = planEntries(plan);

  const counts = { Completed: 0, "In Progress": 0, "To Do": 0, Blocked: 0 };

  for (const entry of entries) {
    const status = entry.values?.Status;

    if (status) {
      counts[status] += 1;
    }
  }

  assert.deepEqual(counts, {
    Completed: 11,
    "In Progress": 7,
    "To Do": 7,
    Blocked: 2,
  });

  assert.notEqual(
    counts.Completed,
    counts["In Progress"],
  );
});

test("durations use only the approved values", () => {
  const plan = buildDemoPlan({ todayIso: TODAY_ISO });
  const allowed = new Set([
    15, 30, 45, 60, 75, 90, 120, 150, 180,
  ]);

  for (const entry of planEntries(plan)) {
    assert.ok(
      allowed.has(entry.durationMinutes),
      `unexpected duration ${entry.durationMinutes}`,
    );
  }
});

test("entries spread across recent weeks with same-day clusters", () => {
  const plan = buildDemoPlan({ todayIso: TODAY_ISO });
  const entries = planEntries(plan);

  const daysAgo = entries.map((entry) => entry.daysAgo);

  assert.equal(Math.min(...daysAgo), 1);
  assert.equal(Math.max(...daysAgo), 28);

  const byDay = new Map();

  for (const entry of entries) {
    byDay.set(
      entry.daysAgo,
      (byDay.get(entry.daysAgo) || 0) + 1,
    );
  }

  const clusters = [...byDay.values()].filter(
    (count) => count > 1,
  );

  assert.ok(clusters.length >= 4);
});

test("projects do not share entry distributions", () => {
  const plan = buildDemoPlan({ todayIso: TODAY_ISO });

  const signatures = plan.projects.map((project) => {
    const durations = project.entries
      .map((entry) => entry.durationMinutes)
      .sort()
      .join(",");

    const tagCount = project.entries.reduce(
      (total, entry) =>
        total + (entry.tags?.length || 0),
      0,
    );

    return `${project.entries.length}|${durations}|${tagCount}`;
  });

  assert.equal(
    new Set(signatures).size,
    signatures.length,
  );
});

test("reserved live-demo entry is never part of the plan", () => {
  const plan = buildDemoPlan({ todayIso: TODAY_ISO });
  const names = planEntries(plan).map(
    (entry) => entry.name,
  );

  assert.ok(
    !names.includes(RESERVED_LIVE_DEMO_ENTRY),
  );
});

test("plan values only reference defined fields (no invented columns)", () => {
  const plan = buildDemoPlan({ todayIso: TODAY_ISO });

  for (const project of plan.projects) {
    const fieldNames = new Set(
      project.fields.map((field) => field.name),
    );

    for (const entry of project.entries) {
      for (const fieldName of Object.keys(
        entry.values || {},
      )) {
        assert.ok(
          fieldNames.has(fieldName),
          `${project.name} / ${entry.name} uses ` +
            `undeclared field "${fieldName}"`,
        );
      }
    }
  }
});

test("ML plan includes the five named tasks with exact values", () => {
  const plan = buildDemoPlan({ todayIso: TODAY_ISO });
  const ml = plan.projects.find(
    (project) =>
      project.name === "Machine Learning Project",
  );

  const byName = new Map(
    ml.entries.map((entry) => [entry.name, entry]),
  );

  const expected = {
    "Clean dataset": {
      Status: "Completed",
      Hours: 3,
      Difficulty: "Medium",
      Progress: 100,
    },
    "Train baseline model": {
      Status: "Completed",
      Hours: 4,
      Difficulty: "High",
      Progress: 100,
    },
    "Tune hyperparameters": {
      Status: "In Progress",
      Hours: 2,
      Difficulty: "High",
      Progress: 60,
    },
    "Evaluate model": {
      Status: "To Do",
      Hours: 0,
      Difficulty: "Medium",
      Progress: 0,
    },
    "Prepare final report": {
      Status: "To Do",
      Hours: 1,
      Difficulty: "Medium",
      Progress: 20,
    },
  };

  for (const [name, values] of Object.entries(
    expected,
  )) {
    assert.deepEqual(
      byName.get(name)?.values,
      { Task: byName.get(name)?.values.Task, ...values },
    );
  }
});

test("ML computed field is declared with a real formula", () => {
  const plan = buildDemoPlan({ todayIso: TODAY_ISO });
  const ml = plan.projects.find(
    (project) =>
      project.name === "Machine Learning Project",
  );

  const computed = ml.fields.find(
    (field) => field.type === "computed",
  );

  assert.equal(computed.name, "Weighted progress");
  assert.equal(computed.formula, "Hours * Progress / 100");
});

// ---------------------------------------------------------------------------
// Seeding behaviour (STEP 17, 19: correct preparation, single-user
// scoping, repeat-run idempotency, rule/recurring exactly once)
// ---------------------------------------------------------------------------

async function runSeed(users = [USER, OTHER_USER]) {
  const { state, gateways } = createFakeGateways(users);

  const summary = await seedDemoData({
    user: users[0],
    now: NOW,
    gateways,
  });

  return { state, gateways, summary };
}

test("first seed creates four projects and 49 entries for the selected user only", async () => {
  const { state, summary } = await runSeed();

  assert.equal(summary.projectsCreated, 4);
  assert.equal(summary.projectsReused, 0);
  assert.equal(summary.entriesCreated, 49);
  assert.equal(summary.entriesSkipped, 0);

  for (const call of state.calls.createProject) {
    assert.equal(call.ownerId, USER.id);
  }

  for (const call of state.calls.createEntry) {
    assert.equal(call.userId, USER.id);
  }

  for (const call of state.calls.backdateEntry) {
    assert.equal(call.userId, USER.id);
  }
});

test("entries stay scoped to the selected user when another user shares the database", async () => {
  const { state, gateways } = (() => {
    const fake = createFakeGateways([
      USER,
      OTHER_USER,
    ]);

    fake.state.projects.set("p1||pre-existing", {
      id: "p1",
      owner_id: OTHER_USER.id,
      name: "Pre-existing",
    });

    fake.state.entries.set("p1||old entry", {
      id: "e-old",
      project_id: "p1",
      name: "old entry",
    });

    return fake;
  })();

  await seedDemoData({
    user: USER,
    now: NOW,
    gateways,
  });

  const otherUserTouched = state.calls.createEntry.some(
    (call) => call.userId === OTHER_USER.id,
  );

  assert.equal(otherUserTouched, false);
  assert.deepEqual(
    state.entries.get("p1||old entry"),
    {
      id: "e-old",
      project_id: "p1",
      name: "old entry",
    },
  );
});

test("repeated seeding creates no duplicates and backdates nothing", async () => {
  const { state, gateways, summary } = await runSeed();

  assert.equal(summary.rulesCreated, 1);
  assert.equal(summary.recurringCreated, 2);

  const second = await seedDemoData({
    user: USER,
    now: NOW,
    gateways,
  });

  assert.equal(second.projectsCreated, 0);
  assert.equal(second.projectsReused, 4);
  assert.equal(second.entriesCreated, 0);
  assert.equal(second.entriesSkipped, 49);
  assert.equal(second.rulesCreated, 0);
  assert.equal(second.rulesSkipped, 1);
  assert.equal(second.recurringCreated, 0);
  assert.equal(second.recurringSkipped, 2);

  const backdatesAfterFirstRun =
    state.calls.backdateEntry.length;

  await seedDemoData({
    user: USER,
    now: NOW,
    gateways,
  });

  assert.equal(
    state.calls.backdateEntry.length,
    backdatesAfterFirstRun,
  );
});

test("automation rule is created exactly once with the real payload", async () => {
  const { state } = await runSeed();

  assert.equal(state.calls.createRule.length, 1);

  const [ruleCall] = state.calls.createRule;

  assert.equal(ruleCall.ownerId, USER.id);
  assert.equal(ruleCall.data.name, "Tag completed work");
  assert.equal(ruleCall.data.conditionOperator, "equals");
  assert.equal(ruleCall.data.conditionValue, "Completed");
  assert.equal(ruleCall.data.actionType, "add_tag");
  assert.equal(ruleCall.data.actionValue, "completed");
  assert.equal(ruleCall.data.enabled, true);

  const sdProject = state.calls.createProject.find(
    (call) =>
      call.data.name === "Software Design Project",
  );

  const statusField = state.calls.createField.find(
    (call) =>
      call.projectId === sdProject.returnedId &&
      call.name === "Status",
  );

  assert.equal(
    ruleCall.data.conditionFieldId,
    statusField.returnedId,
  );
});

test("recurring definitions are created exactly once with safe start dates", async () => {
  const { state } = await runSeed();

  assert.equal(state.calls.createRecurring.length, 2);

  const byName = new Map(
    state.calls.createRecurring.map((call) => [
      call.data.name,
      call,
    ]),
  );

  const weekly = byName.get("Weekly project review");
  assert.equal(weekly.userId, USER.id);
  assert.equal(weekly.data.frequency, "weekly");
  assert.equal(weekly.data.intervalCount, 1);
  assert.equal(weekly.data.durationMinutes, 30);
  assert.deepEqual(weekly.data.tags, ["review"]);
  assert.equal(weekly.data.startsOn, "2026-09-22");
  assert.equal(weekly.data.endsOn, null);
  assert.equal(weekly.data.enabled, true);
  assert.deepEqual(weekly.data.checklist, [
    { text: "Review completed work" },
    { text: "Check outstanding tasks" },
    { text: "Update progress" },
  ]);

  const daily = byName.get("Daily progress log");
  assert.equal(daily.data.frequency, "daily");
  assert.equal(daily.data.intervalCount, 1);
  assert.equal(daily.data.durationMinutes, 15);
  assert.deepEqual(daily.data.tags, ["daily-log"]);
  assert.equal(daily.data.startsOn, "2026-09-27");
});

test("seeded entries land on historical dates with completion times", async () => {
  const { state } = await runSeed();

  const occurredDays = state.calls.backdateEntry.map(
    (call) => call.occurredAt.slice(0, 10),
  );

  assert.equal(
    occurredDays.every((day) =>
      day >= "2026-08-31" && day <= "2026-09-27",
    ),
    true,
  );

  const cleanDataset = state.calls.createEntry.find(
    (call) => call.data.name === "Clean dataset",
  );
  const cleanBackdate = state.calls.backdateEntry.find(
    (call) => call.entryId === cleanDataset.returnedId,
  );

  assert.equal(
    cleanBackdate.occurredAt,
    "2026-09-02T08:37:00Z",
  );
  assert.equal(
    cleanBackdate.completedAt,
    "2026-09-02T10:07:00.000Z",
  );

  const evaluateModel = state.calls.createEntry.find(
    (call) => call.data.name === "Evaluate model",
  );
  const evaluateBackdate = state.calls.backdateEntry.find(
    (call) => call.entryId === evaluateModel.returnedId,
  );

  assert.equal(evaluateBackdate.completedAt, null);
});

test("references and links resolve to records created earlier in the same run", async () => {
  const { state } = await runSeed();

  const draft = state.calls.createEntry.find(
    (call) =>
      call.data.name === "Draft related-work section",
  );

  const survey = state.calls.createEntry.find(
    (call) =>
      call.data.name === "Summarise transformer survey",
  );

  const compare = state.calls.createEntry.find(
    (call) =>
      call.data.name === "Compare survey methodologies",
  );

  const mlProject = state.calls.createProject.find(
    (call) =>
      call.data.name === "Machine Learning Project",
  );

  assert.deepEqual(draft.data.referenceEntryIds, [
    survey.returnedId,
  ]);
  assert.deepEqual(draft.data.referenceProjectIds, [
    mlProject.returnedId,
  ]);
  assert.deepEqual(draft.data.linkedEntryIds, [
    compare.returnedId,
  ]);
});

test("checklist completion is only requested for the pre-completed demo item", async () => {
  const { state } = await runSeed();

  assert.equal(
    state.calls.completeChecklistItem.length,
    1,
  );

  const weeklyReflection = state.calls.createEntry.find(
    (call) => call.data.name === "Weekly reflection",
  );

  assert.deepEqual(state.calls.completeChecklistItem, [
    {
      entryId: weeklyReflection.returnedId,
      text: "Review observer pattern",
    },
  ]);
});

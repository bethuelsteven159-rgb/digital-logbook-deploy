/*
 * Demo data seed for the Sprint 3 demonstration.
 *
 * Manually invoked ONLY — this file is never required by server.js,
 * so it can never run on normal app startup. It also refuses to
 * execute unless the environment explicitly opts in:
 *
 *   DEMO_SEED=true DEMO_USER_ID=<users.id UUID> node scripts/seedDemoData.js
 *   DEMO_SEED=true DEMO_USER_EMAIL=<email>       node scripts/seedDemoData.js
 *
 * Safety properties:
 *   - refuses to run unless DEMO_SEED === "true" exactly
 *   - refuses unknown user identifiers
 *   - creates demo data for the selected user ONLY
 *   - idempotent: re-running skips already-seeded entities by name
 *   - never deletes or updates pre-existing user data
 *   - never inserts aggregate/statistic rows — the app computes
 *     its own statistics at read time (routes/stats.js)
 *
 * Raw SQL is used in exactly three places, each justified:
 *   1. project INSERT — the app has no project creation service
 *      (the route holds the INSERT inline), so a script that seeds
 *      projects must do the same.
 *   2. occurred_at / completed_at backdating — neither the API nor
 *      any service accepts historical timestamps (createEntry always
 *      stamps occurred_at = NOW()), so a raw UPDATE is the only way
 *      to spread demo entries across past weeks. The UPDATE is
 *      ownership-guarded (WHERE created_by_id = the seed user).
 *   3. checklist item completion — the service always creates
 *      items unchecked, so marking one demo item complete requires
 *      a targeted UPDATE limited to entry IDs the seed just created.
 */

const DEMO_PROJECT_NAMES = [
  "Machine Learning Project",
  "Software Design Project",
  "Research Project",
  "Personal Study Log",
];

const RESERVED_LIVE_DEMO_ENTRY = "Verify recurring-entry API";

// ---------------------------------------------------------------------------
// Pure date helpers (deterministic; all relative to an injected "today")
// ---------------------------------------------------------------------------

function toDateIso(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateIso(isoDate) {
  const [year, month, day] = isoDate
    .split("-")
    .map((part) => Number(part));

  return { year, month, day };
}

function addDaysIso(todayIso, deltaDays) {
  const { year, month, day } = parseDateIso(todayIso);
  const date = new Date(
    Date.UTC(year, month - 1, day + deltaDays),
  );

  return toDateIso(date);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

/*
 * Deterministic occurrence time for a seeded entry: 08:00 UTC on the
 * target day plus a per-entry offset of (index * 37) % 240 minutes, so
 * multi-entry days get natural-looking spread without any randomness.
 */
function occurredIso(todayIso, daysAgo, index) {
  const dateIso = addDaysIso(todayIso, -daysAgo);
  const totalMinutes =
    8 * 60 + ((index * 37) % 240);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${dateIso}T${pad2(hours)}:${pad2(minutes)}:00Z`;
}

function plusMinutesIso(isoTimestamp, minutes) {
  return new Date(
    new Date(isoTimestamp).getTime() +
      minutes * 60000,
  ).toISOString();
}

function dueIso(todayIso, dueInDays) {
  return `${addDaysIso(todayIso, dueInDays)}T16:00:00Z`;
}

// ---------------------------------------------------------------------------
// buildDemoPlan — the complete demo dataset, pure and deterministic.
//
// Every entry is authored in creation order; entryRefs / links targets
// always appear before the entries that reference them.
// Values are keyed by FIELD NAME and resolved to field IDs by the
// orchestrator after fields exist.
// ---------------------------------------------------------------------------

function buildDemoPlan({ todayIso }) {
  return {
    todayIso,
    projects: [
      // ------------------------------------------------------------- ML
      {
        name: "Machine Learning Project",
        description:
          "Supervised learning coursework: dataset preparation, " +
          "model training and evaluation.",
        fields: [
          { name: "Task", type: "short_text" },
          { name: "Status", type: "short_text" },
          { name: "Hours", type: "number" },
          { name: "Difficulty", type: "short_text" },
          {
            name: "Progress",
            type: "number",
          },
          {
            name: "Weighted progress",
            type: "computed",
            formula: "Hours * Progress / 100",
          },
        ],
        entries: [
          {
            name: "Collect dataset sources",
            daysAgo: 28,
            index: 0,
            durationMinutes: 60,
            values: {
              Task: "Data collection",
              Status: "Completed",
              Hours: 2,
              Difficulty: "Low",
              Progress: 100,
            },
          },
          {
            name: "Clean dataset",
            daysAgo: 26,
            index: 1,
            durationMinutes: 90,
            values: {
              Task: "Data cleaning",
              Status: "Completed",
              Hours: 3,
              Difficulty: "Medium",
              Progress: 100,
            },
          },
          {
            name: "Label training samples",
            daysAgo: 24,
            index: 2,
            durationMinutes: 120,
            values: {
              Task: "Data labelling",
              Status: "Completed",
              Hours: 5,
              Difficulty: "Medium",
              Progress: 100,
            },
          },
          {
            name: "Split train and test sets",
            daysAgo: 23,
            index: 3,
            durationMinutes: 30,
            values: {
              Task: "Data preparation",
              Status: "Completed",
              Hours: 1,
              Difficulty: "Low",
              Progress: 100,
            },
          },
          {
            name: "Train baseline model",
            daysAgo: 20,
            index: 4,
            durationMinutes: 120,
            values: {
              Task: "Model training",
              Status: "Completed",
              Hours: 4,
              Difficulty: "High",
              Progress: 100,
            },
          },
          {
            name: "Implement data pipeline",
            daysAgo: 18,
            index: 5,
            durationMinutes: 75,
            values: {
              Task: "Engineering",
              Status: "Completed",
              Hours: 2,
              Difficulty: "Medium",
              Progress: 100,
            },
          },
          {
            name: "Tune hyperparameters",
            daysAgo: 12,
            index: 6,
            durationMinutes: 90,
            values: {
              Task: "Model tuning",
              Status: "In Progress",
              Hours: 2,
              Difficulty: "High",
              Progress: 60,
            },
          },
          {
            name: "Debug validation loss spike",
            daysAgo: 9,
            index: 7,
            durationMinutes: 90,
            values: {
              Task: "Debugging",
              Status: "In Progress",
              Hours: 3,
              Difficulty: "High",
              Progress: 40,
            },
          },
          {
            name: "Train augmented model",
            daysAgo: 9,
            index: 8,
            durationMinutes: 150,
            values: {
              Task: "Model training",
              Status: "In Progress",
              Hours: 4,
              Difficulty: "High",
              Progress: 55,
            },
          },
          {
            name: "Write experiment notes",
            daysAgo: 4,
            index: 9,
            durationMinutes: 45,
            values: {
              Task: "Documentation",
              Status: "Completed",
              Hours: 1,
              Difficulty: "Low",
              Progress: 100,
            },
          },
          {
            name: "Compare model metrics",
            daysAgo: 5,
            index: 10,
            durationMinutes: 60,
            values: {
              Task: "Evaluation",
              Status: "To Do",
              Hours: 2,
              Difficulty: "Medium",
              Progress: 0,
            },
          },
          {
            name: "Evaluate model",
            daysAgo: 3,
            index: 11,
            durationMinutes: 45,
            values: {
              Task: "Evaluation",
              Status: "To Do",
              Hours: 0,
              Difficulty: "Medium",
              Progress: 0,
            },
          },
          {
            name: "Prepare final report",
            daysAgo: 2,
            index: 12,
            durationMinutes: 60,
            values: {
              Task: "Reporting",
              Status: "To Do",
              Hours: 1,
              Difficulty: "Medium",
              Progress: 20,
            },
          },
          {
            name: "Review ethics checklist",
            daysAgo: 1,
            index: 13,
            durationMinutes: 30,
            values: {
              Task: "Compliance",
              Status: "Blocked",
              Hours: 1,
              Difficulty: "Low",
              Progress: 10,
            },
          },
        ],
      },

      // ------------------------------------------------- Software Design
      {
        name: "Software Design Project",
        description:
          "Full-stack build of the Digital Logbook features: " +
          "authentication, entries API, dashboard and automation.",
        fields: [
          { name: "Status", type: "short_text" },
        ],
        rule: {
          name: "Tag completed work",
          conditionField: "Status",
          conditionOperator: "equals",
          conditionValue: "Completed",
          actionType: "add_tag",
          actionValue: "completed",
        },
        recurring: {
          name: "Weekly project review",
          frequency: "weekly",
          intervalCount: 1,
          durationMinutes: 30,
          tags: ["review"],
          startsOn: addDaysIso(todayIso, -6),
          checklist: [
            { text: "Review completed work" },
            { text: "Check outstanding tasks" },
            { text: "Update progress" },
          ],
        },
        entries: [
          {
            name: "Design database schema",
            daysAgo: 25,
            index: 0,
            durationMinutes: 90,
            tags: ["database", "backend"],
            values: { Status: "Completed" },
          },
          {
            name: "Set up CI pipeline",
            daysAgo: 22,
            index: 1,
            durationMinutes: 60,
            tags: ["testing", "backend"],
            values: { Status: "Completed" },
          },
          {
            name: "Build entries API endpoints",
            daysAgo: 19,
            index: 2,
            durationMinutes: 120,
            tags: ["api", "backend"],
            values: { Status: "Completed" },
          },
          {
            name: "Test project creation API",
            daysAgo: 17,
            index: 3,
            durationMinutes: 60,
            tags: ["testing", "api"],
            values: { Status: "Completed" },
          },
          {
            name: "Run performance tests",
            daysAgo: 14,
            index: 4,
            durationMinutes: 75,
            tags: ["performance"],
            values: { Status: "To Do" },
          },
          {
            name: "Implement login validation",
            daysAgo: 12,
            index: 5,
            durationMinutes: 120,
            tags: ["backend", "authentication"],
            values: { Status: "In Progress" },
          },
          {
            name: "Refactor authentication module",
            daysAgo: 11,
            index: 6,
            durationMinutes: 90,
            tags: ["authentication", "backend"],
            values: { Status: "In Progress" },
          },
          {
            name: "Improve dashboard layout",
            daysAgo: 10,
            index: 7,
            durationMinutes: 90,
            tags: ["frontend"],
            values: { Status: "In Progress" },
          },
          {
            name: "Fix tag filtering bug",
            daysAgo: 8,
            index: 8,
            durationMinutes: 45,
            tags: ["frontend", "testing"],
            values: { Status: "Blocked" },
          },
          {
            name: "Document automation API",
            daysAgo: 5,
            index: 9,
            durationMinutes: 45,
            tags: ["documentation"],
            values: { Status: "To Do" },
          },
          {
            name: "Write API integration guide",
            daysAgo: 6,
            index: 10,
            durationMinutes: 60,
            tags: ["documentation", "api"],
            values: { Status: "To Do" },
          },
          {
            name: "Optimise dashboard queries",
            daysAgo: 4,
            index: 11,
            durationMinutes: 75,
            tags: ["performance", "database"],
            values: { Status: "In Progress" },
          },
          {
            name: "Review pull request checklist",
            daysAgo: 4,
            index: 12,
            durationMinutes: 30,
            tags: ["testing"],
            values: { Status: "To Do" },
          },
        ],
      },

      // -------------------------------------------------------- Research
      {
        name: "Research Project",
        description:
          "Literature review and analysis for the dissertation, " +
          "with linked sources and cross-project references.",
        fields: [
          { name: "Theme", type: "short_text" },
        ],
        entries: [
          {
            name: "Survey machine learning literature",
            daysAgo: 27,
            index: 0,
            durationMinutes: 90,
            tags: ["deep-learning"],
            values: { Theme: "deep learning" },
          },
          {
            name: "Summarise transformer survey",
            daysAgo: 21,
            index: 1,
            durationMinutes: 75,
            tags: ["nlp"],
            values: { Theme: "nlp" },
          },
          {
            name: "Compare survey methodologies",
            daysAgo: 16,
            index: 2,
            durationMinutes: 60,
            tags: ["methodology"],
            values: { Theme: "methodology" },
          },
          {
            name: "Collect benchmark datasets",
            daysAgo: 14,
            index: 3,
            durationMinutes: 60,
            tags: ["datasets"],
            values: { Theme: "datasets" },
          },
          {
            name: "Draft related-work section",
            daysAgo: 10,
            index: 4,
            durationMinutes: 90,
            tags: ["writing"],
            values: { Theme: "writing" },
            entryRefs: ["Summarise transformer survey"],
            projectRefs: ["Machine Learning Project"],
            links: ["Compare survey methodologies"],
          },
          {
            name: "Analyse experiment results",
            daysAgo: 8,
            index: 5,
            durationMinutes: 75,
            tags: ["analysis"],
            values: { Theme: "analysis" },
            entryRefs: ["Collect benchmark datasets"],
          },
          {
            name: "Note reproducibility gaps",
            daysAgo: 8,
            index: 6,
            durationMinutes: 45,
            tags: ["reproducibility"],
            values: { Theme: "reproducibility" },
          },
          {
            name: "Interview prep notes",
            daysAgo: 5,
            index: 7,
            durationMinutes: 30,
            tags: ["qualitative"],
            values: { Theme: "qualitative" },
          },
          {
            name: "Outline discussion chapter",
            daysAgo: 3,
            index: 8,
            durationMinutes: 60,
            tags: ["writing"],
            values: { Theme: "writing" },
            dueInDays: 4,
          },
          {
            name: "Update bibliography",
            daysAgo: 2,
            index: 9,
            durationMinutes: 30,
            tags: ["references"],
            values: { Theme: "references" },
            dueInDays: 1,
          },
          {
            name: "Final proofread plan",
            daysAgo: 1,
            index: 10,
            durationMinutes: 15,
            tags: ["writing"],
            values: { Theme: "writing" },
            dueInDays: 6,
          },
        ],
      },

      // ------------------------------------------------- Personal Study
      {
        name: "Personal Study Log",
        description:
          "Revision tracker for OS, ML, Graphics and Software " +
          "Design modules, with due dates and checklists.",
        fields: [
          { name: "Module", type: "short_text" },
        ],
        recurring: {
          name: "Daily progress log",
          frequency: "daily",
          intervalCount: 1,
          durationMinutes: 15,
          tags: ["daily-log"],
          startsOn: addDaysIso(todayIso, -1),
          checklist: [],
        },
        entries: [
          {
            name: "Revise OS scheduling",
            daysAgo: 26,
            index: 0,
            durationMinutes: 60,
            tags: ["os"],
            values: { Module: "os" },
          },
          {
            name: "OS deadlock worksheet",
            daysAgo: 20,
            index: 1,
            durationMinutes: 45,
            tags: ["os"],
            values: { Module: "os" },
          },
          {
            name: "Revise ML regression notes",
            daysAgo: 15,
            index: 2,
            durationMinutes: 75,
            tags: ["ml"],
            values: { Module: "ml" },
          },
          {
            name: "Graphics transformation drills",
            daysAgo: 13,
            index: 3,
            durationMinutes: 45,
            tags: ["graphics"],
            values: { Module: "graphics" },
          },
          {
            name: "ML practice problems",
            daysAgo: 9,
            index: 4,
            durationMinutes: 60,
            tags: ["ml"],
            values: { Module: "ml" },
            dueInDays: -2,
          },
          {
            name: "Software design patterns revision",
            daysAgo: 7,
            index: 5,
            durationMinutes: 90,
            tags: ["software-design"],
            values: { Module: "software-design" },
            dueInDays: 2,
          },
          {
            name: "Distributed systems reading",
            daysAgo: 6,
            index: 6,
            durationMinutes: 30,
            tags: ["os", "reading"],
            values: { Module: "os" },
          },
          {
            name: "Revise calculus for ML",
            daysAgo: 7,
            index: 7,
            durationMinutes: 45,
            tags: ["ml", "maths"],
            values: { Module: "ml" },
          },
          {
            name: "Graphics pipeline notes",
            daysAgo: 3,
            index: 8,
            durationMinutes: 60,
            tags: ["graphics"],
            values: { Module: "graphics" },
            dueInDays: 4,
            checklist: [
              { text: "Summarise rasterisation" },
              { text: "Complete shading exercise" },
            ],
          },
          {
            name: "Exam prep planner",
            daysAgo: 2,
            index: 9,
            durationMinutes: 30,
            tags: ["planning"],
            values: { Module: "general" },
            dueInDays: 3,
          },
          {
            name: "Weekly reflection",
            daysAgo: 1,
            index: 10,
            durationMinutes: 15,
            tags: ["reflection"],
            values: { Module: "general" },
            checklist: [
              { text: "Review singleton pattern" },
              {
                text: "Review observer pattern",
                complete: true,
              },
              { text: "Sketch class diagram" },
            ],
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Real gateways — wrap the app's real services/repositories plus the
// justified raw SQL documented in the header. Everything is lazy-required
// so merely importing this module never opens a database pool.
// ---------------------------------------------------------------------------

function createRealGateways() {
  const db = require("../db");
  const projectDetailsRepository = require("../repositories/postgresProjectDetailsRepository");
  const { createEntryService } = require("../services/projectDetailsService");
  const {
    createAutomationRuleService,
    listAutomationRulesService,
  } = require("../services/automationRuleService");
  const {
    createRecurringEntryService,
    listRecurringEntriesService,
  } = require("../services/recurringEntryService");
  const {
    bindFormulaToFields,
  } = require("../services/computedFieldService");

  return {
    async findUserById(userId) {
      const result = await db.query(
        `SELECT id, name, email
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [userId],
      );

      return result.rows[0] || null;
    },

    async findUserByEmail(email) {
      const result = await db.query(
        `SELECT id, name, email
         FROM users
         WHERE lower(email) = lower($1)
         LIMIT 1`,
        [email],
      );

      return result.rows[0] || null;
    },

    /*
     * Raw INSERT justified: the app has no project service — the
     * route handler holds the project INSERT inline, so a seeding
     * script must do the same.
     */
    async createProject(ownerId, { name, description }) {
      const result = await db.query(
        `INSERT INTO projects (owner_id, name, description)
         VALUES ($1, $2, $3)
         RETURNING id, owner_id, name, description`,
        [ownerId, name, description],
      );

      return result.rows[0];
    },

    async findProjectByName(ownerId, name) {
      const result = await db.query(
        `SELECT id, owner_id, name
         FROM projects
         WHERE owner_id = $1
           AND name = $2
         ORDER BY created_at ASC
         LIMIT 1`,
        [ownerId, name],
      );

      return result.rows[0] || null;
    },

    async listFields(projectId) {
      const fields =
        await projectDetailsRepository.getProjectFields(
          projectId,
        );

      return fields.filter(
        (field) => !field.archivedAt,
      );
    },

    async createField({
      projectId,
      name,
      fieldType,
      formula,
      position,
    }) {
      /*
       * Bind computed formulas exactly like the app's real field
       * pipeline does (name symbols -> stable field symbols).
       */
      let boundFormula = formula ?? null;

      if (fieldType === "computed" && formula) {
        const siblings =
          await projectDetailsRepository.getProjectFields(
            projectId,
          );

        boundFormula = bindFormulaToFields(
          formula,
          siblings.filter((f) => !f.archivedAt),
        );
      }

      return projectDetailsRepository.createProjectField({
        projectId,
        name,
        fieldType,
        formula: boundFormula,
        position,
        required: false,
      });
    },

    async findEntryByName(projectId, name) {
      const result = await db.query(
        `SELECT id, project_id, name
         FROM entries
         WHERE project_id = $1
           AND name = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [projectId, name],
      );

      return result.rows[0] || null;
    },

    createEntry({ projectId, userId, data }) {
      // Real creation path — fires automation rules for real.
      return createEntryService({ projectId, userId, data });
    },

    /*
     * Raw UPDATE justified: no API or service accepts historical
     * timestamps (createEntry always stamps occurred_at = NOW()),
     * so spreading demo entries across past weeks requires this.
     * Ownership-guarded so it can only touch the seed user's rows.
     */
    async backdateEntry({
      entryId,
      userId,
      occurredAt,
      completedAt,
    }) {
      const result = await db.query(
        `UPDATE entries
         SET occurred_at = $1,
             created_at = $1,
             completed_at = $2
         WHERE id = $3
           AND created_by_id = $4`,
        [occurredAt, completedAt, entryId, userId],
      );

      return result.rowCount === 1;
    },

    /*
     * Raw UPDATE justified: the entry service always creates
     * checklist items unchecked. Scoped to an entry the seed
     * itself just created.
     */
    async completeChecklistItem({ entryId, text }) {
      const result = await db.query(
        `UPDATE entry_checklist_items
         SET completed = true
         WHERE entry_id = $1
           AND text = $2`,
        [entryId, text],
      );

      return result.rowCount >= 1;
    },

    async listRules({ ownerId, projectId }) {
      return listAutomationRulesService({
        ownerId,
        projectId,
      });
    },

    createRule({ ownerId, projectId, data }) {
      return createAutomationRuleService({
        ownerId,
        projectId,
        data,
      });
    },

    async listRecurring({ projectId, userId }) {
      return listRecurringEntriesService({
        projectId,
        userId,
      });
    },

    createRecurring({ projectId, userId, data }) {
      return createRecurringEntryService({
        projectId,
        userId,
        data,
      });
    },

    async close() {
      await db.end();
    },
  };
}

// ---------------------------------------------------------------------------
// Orchestrator — idempotent seeding against an injectable gateway seam,
// so tests can run it against in-memory fakes without any database.
// ---------------------------------------------------------------------------

function normalizeName(name) {
  return name.trim().toLowerCase();
}

async function seedDemoData({
  user,
  now,
  gateways,
  log = () => {},
}) {
  const todayIso = toDateIso(now);
  const plan = buildDemoPlan({ todayIso });

  const summary = {
    userId: user.id,
    projectsCreated: 0,
    projectsReused: 0,
    fieldsCreated: 0,
    fieldsReused: 0,
    entriesCreated: 0,
    entriesSkipped: 0,
    rulesCreated: 0,
    rulesSkipped: 0,
    recurringCreated: 0,
    recurringSkipped: 0,
  };

  // name -> projectId, for cross-project references.
  const projectIds = new Map();

  for (const plannedProject of plan.projects) {
    let project = await gateways.findProjectByName(
      user.id,
      plannedProject.name,
    );

    if (project) {
      summary.projectsReused += 1;
      log(`Reusing project: ${plannedProject.name}`);
    } else {
      project = await gateways.createProject(user.id, {
        name: plannedProject.name,
        description: plannedProject.description,
      });
      summary.projectsCreated += 1;
      log(`Created project: ${plannedProject.name}`);
    }

    projectIds.set(plannedProject.name, project.id);

    // ---- fields (match by name; never archive existing fields) ----
    const existingFields = await gateways.listFields(
      project.id,
    );
    const fieldIds = new Map();

    for (const field of existingFields) {
      fieldIds.set(normalizeName(field.name), field.id);
    }

    for (const plannedField of plannedProject.fields) {
      const key = normalizeName(plannedField.name);

      if (fieldIds.has(key)) {
        summary.fieldsReused += 1;
        continue;
      }

      const created = await gateways.createField({
        projectId: project.id,
        name: plannedField.name,
        fieldType: plannedField.type,
        formula: plannedField.formula,
        position: existingFields.length + 1,
      });

      fieldIds.set(key, created.id);
      existingFields.push(created);
      summary.fieldsCreated += 1;
      log(`Created field: ${plannedProject.name} / ${plannedField.name}`);
    }

    // ---- entries (match by name; skip + never backdate on reuse) ----
    const entryIds = new Map();

    for (const plannedEntry of plannedProject.entries) {
      const existing = await gateways.findEntryByName(
        project.id,
        plannedEntry.name,
      );

      if (existing) {
        entryIds.set(plannedEntry.name, existing.id);
        summary.entriesSkipped += 1;
        continue;
      }

      const values = [];

      for (const [fieldName, value] of Object.entries(
        plannedEntry.values || {},
      )) {
        const fieldId = fieldIds.get(
          normalizeName(fieldName),
        );

        if (!fieldId) {
          throw new Error(
            `Demo plan references unknown field "${fieldName}" ` +
              `in project "${plannedProject.name}"`,
          );
        }

        values.push({ fieldId, value });
      }

      const created = await gateways.createEntry({
        projectId: project.id,
        userId: user.id,
        data: {
          name: plannedEntry.name,
          durationMinutes:
            plannedEntry.durationMinutes,
          tags: plannedEntry.tags || [],
          dueAt: plannedEntry.dueInDays
            ? dueIso(todayIso, plannedEntry.dueInDays)
            : null,
          values,
          newFields: [],
          checklist:
            plannedEntry.checklist?.map(
              (item) => ({ text: item.text }),
            ) || [],
          referenceProjectIds:
            plannedEntry.projectRefs?.map(
              (name) => projectIds.get(name),
            ) || [],
          referenceEntryIds:
            plannedEntry.entryRefs?.map(
              (name) => entryIds.get(name),
            ) || [],
          linkedEntryIds:
            plannedEntry.links?.map(
              (name) => entryIds.get(name),
            ) || [],
        },
      });

      entryIds.set(plannedEntry.name, created.id);

      const occurredAt = occurredIso(
        todayIso,
        plannedEntry.daysAgo,
        plannedEntry.index,
      );

      const isCompleted =
        plannedEntry.values?.Status === "Completed";

      await gateways.backdateEntry({
        entryId: created.id,
        userId: user.id,
        occurredAt,
        completedAt: isCompleted
          ? plusMinutesIso(
              occurredAt,
              plannedEntry.durationMinutes,
            )
          : null,
      });

      for (const item of plannedEntry.checklist ||
        []) {
        if (item.complete) {
          await gateways.completeChecklistItem({
            entryId: created.id,
            text: item.text,
          });
        }
      }

      summary.entriesCreated += 1;
    }

    // ---- automation rule (exactly one, by real service) ----
    if (plannedProject.rule) {
      const existingRules = await gateways.listRules({
        ownerId: user.id,
        projectId: project.id,
      });

      const ruleName = plannedProject.rule.name;
      const alreadyExists = existingRules.some(
        (rule) => rule.name === ruleName,
      );

      if (alreadyExists) {
        summary.rulesSkipped += 1;
      } else {
        await gateways.createRule({
          ownerId: user.id,
          projectId: project.id,
          data: {
            name: ruleName,
            conditionFieldId: fieldIds.get(
              normalizeName(
                plannedProject.rule.conditionField,
              ),
            ),
            conditionOperator:
              plannedProject.rule.conditionOperator,
            conditionValue:
              plannedProject.rule.conditionValue,
            actionType:
              plannedProject.rule.actionType,
            actionValue:
              plannedProject.rule.actionValue,
            enabled: true,
          },
        });
        summary.rulesCreated += 1;
        log(`Created automation rule: ${ruleName}`);
      }
    }

    // ---- recurring definitions (by real service, no occurrences) ----
    if (plannedProject.recurring) {
      const existingDefs =
        await gateways.listRecurring({
          projectId: project.id,
          userId: user.id,
        });

      const recurringName =
        plannedProject.recurring.name;
      const alreadyExists = existingDefs.some(
        (def) => def.name === recurringName,
      );

      if (alreadyExists) {
        summary.recurringSkipped += 1;
      } else {
        await gateways.createRecurring({
          projectId: project.id,
          userId: user.id,
          data: {
            name: recurringName,
            durationMinutes:
              plannedProject.recurring
                .durationMinutes,
            tags: plannedProject.recurring.tags,
            checklist:
              plannedProject.recurring.checklist,
            frequency:
              plannedProject.recurring.frequency,
            intervalCount:
              plannedProject.recurring
                .intervalCount,
            startsOn:
              plannedProject.recurring.startsOn,
            endsOn: null,
            enabled: true,
          },
        });
        summary.recurringCreated += 1;
        log(
          `Created recurring definition: ${recurringName}`,
        );
      }
    }
  }

  return summary;
}

// ---------------------------------------------------------------------------
// CLI entry — guards run BEFORE any database object is created.
// ---------------------------------------------------------------------------

function describeDatabaseTarget(databaseUrl) {
  if (!databaseUrl) {
    return "(DATABASE_URL is not set)";
  }

  try {
    const url = new URL(databaseUrl);

    const host = url.hostname;
    const port = url.port || "5432";
    const database = url.pathname.replace(/^\//, "");

    return `${host}:${port}/${database}`;
  } catch {
    return "(DATABASE_URL could not be parsed)";
  }
}

async function main({
  env,
  gateways,
  log = console.log,
  now = new Date(),
}) {
  if (env.DEMO_SEED !== "true") {
    log(
      "Refusing to seed: set DEMO_SEED=true to opt in. " +
        "No database connection was opened.",
    );
    return { ok: false, reason: "missing-demo-seed-flag" };
  }

  const userId = env.DEMO_USER_ID;
  const userEmail = env.DEMO_USER_EMAIL;

  if (!userId && !userEmail) {
    log(
      "Refusing to seed: provide DEMO_USER_ID (users.id UUID) " +
        "or DEMO_USER_EMAIL. No database connection was opened.",
    );
    return {
      ok: false,
      reason: "missing-user-identifier",
    };
  }

  log("Demo seed target database:");
  log(`  ${describeDatabaseTarget(env.DATABASE_URL)}`);
  log("");

  let user;

  if (userId) {
    user = await gateways.findUserById(userId);
  } else {
    user = await gateways.findUserByEmail(userEmail);
  }

  if (!user) {
    log(
      "Refusing to seed: no user matches the supplied " +
        "DEMO_USER_ID / DEMO_USER_EMAIL.",
    );
    return { ok: false, reason: "unknown-user" };
  }

  log(`Seeding demo data for: ${user.name} <${user.email}>`);
  log("");

  const summary = await seedDemoData({
    user,
    now,
    gateways,
    log,
  });

  log("");
  log("Seed summary:");
  log(
    `  projects: ${summary.projectsCreated} created, ` +
      `${summary.projectsReused} reused`,
  );
  log(
    `  fields:   ${summary.fieldsCreated} created, ` +
      `${summary.fieldsReused} reused`,
  );
  log(
    `  entries:  ${summary.entriesCreated} created, ` +
      `${summary.entriesSkipped} already present`,
  );
  log(
    `  automation rules: ${summary.rulesCreated} created, ` +
      `${summary.rulesSkipped} already present`,
  );
  log(
    `  recurring definitions: ${summary.recurringCreated} created, ` +
      `${summary.recurringSkipped} already present`,
  );

  return { ok: true, summary };
}

async function runCli() {
  /*
   * Guards run before createRealGateways() so a refused run never
   * even creates a database pool, let alone a connection.
   */
  if (process.env.DEMO_SEED !== "true") {
    console.log(
      "Refusing to seed: set DEMO_SEED=true to opt in. " +
        "No database connection was opened.",
    );
    process.exitCode = 1;
    return;
  }

  if (
    !process.env.DEMO_USER_ID &&
    !process.env.DEMO_USER_EMAIL
  ) {
    console.log(
      "Refusing to seed: provide DEMO_USER_ID (users.id UUID) " +
        "or DEMO_USER_EMAIL. No database connection was opened.",
    );
    process.exitCode = 1;
    return;
  }

  let gateways;

  try {
    gateways = createRealGateways();

    const result = await main({
      env: process.env,
      gateways,
      now: new Date(),
    });

    if (!result.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Demo seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (gateways) {
      await gateways.close();
    }
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  buildDemoPlan,
  createRealGateways,
  describeDatabaseTarget,
  seedDemoData,
  main,
  DEMO_PROJECT_NAMES,
  RESERVED_LIVE_DEMO_ENTRY,
  occurredIso,
  addDaysIso,
};

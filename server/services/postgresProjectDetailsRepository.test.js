import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";

const db = require("../db");
const repository = require("../repositories/postgresProjectDetailsRepository");

function makeSearchRow(overrides = {}) {
  return {
    entry_id: "11111111-1111-1111-1111-111111111111",
    project_id: "project-1",
    created_by_id: "user-1",
    entry_name: "Research Session",
    duration_minutes: 60,
    occurred_at: new Date("2026-09-20T10:00:00.000Z"),
    tags: ["research", "university"],
    due_at: null,
    completed_at: null,
    entry_created_at: new Date("2026-09-20T10:00:00.000Z"),
    entry_updated_at: new Date("2026-09-20T10:00:00.000Z"),

    value_id: null,
    field_id: null,
    value_text: null,
    value_number: null,
    value_date: null,
    value_created_at: null,
    field_name: null,
    field_archived_at: null,
    field_type: null,

    ...overrides,
  };
}

function mockDatabase({
  searchRows = [],
  checklistRows = [],
  projectReferenceRows = [],
  entryReferenceRows = [],
} = {}) {
  const calls = [];

  vi.spyOn(db, "query").mockImplementation(
    async (sql, params = []) => {
      calls.push({
        sql,
        params,
      });

      if (
        sql.includes("FROM entries e") &&
        sql.includes("LEFT JOIN entry_field_values v") &&
        sql.includes("WHERE")
      ) {
        return {
          rows: searchRows,
        };
      }

      if (sql.includes("FROM entry_checklist_items")) {
        return {
          rows: checklistRows,
        };
      }

      if (sql.includes("FROM entry_project_references r")) {
        return {
          rows: projectReferenceRows,
        };
      }

      if (sql.includes("FROM entry_entry_references r")) {
        return {
          rows: entryReferenceRows,
        };
      }

      throw new Error(
        `Unexpected database query:\n${sql}`,
      );
    },
  );

  return calls;
}

function firstQuery(calls) {
  expect(calls.length).toBeGreaterThan(0);
  return calls[0];
}

describe(
  "postgresProjectDetailsRepository.searchProjectEntries - US-A04",
  () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    test(
      "searches entry names, tags and arbitrary custom-field values",
      async () => {
        const calls = mockDatabase({
          searchRows: [],
        });

        const result = await repository.searchProjectEntries(
          "project-1",
          {
            query: "research",
          },
        );

        expect(result).toEqual([]);

        const { sql, params } = firstQuery(calls);

        expect(sql).toContain("e.project_id = $1");

        expect(sql).toContain(
          "e.name ILIKE $2",
        );

        expect(sql).toContain(
          "array_to_string(e.tags, ' ')",
        );

        expect(sql).toContain(
          "FROM entry_field_values sv",
        );

        expect(sql).toContain(
          "COALESCE(sv.value_text, '') ILIKE $2",
        );

        expect(sql).toContain(
          "COALESCE(sv.value_number::text, '') ILIKE $2",
        );

        expect(sql).toContain(
          "COALESCE(sv.value_date::text, '') ILIKE $2",
        );

        expect(params).toEqual([
          "project-1",
          "%research%",
        ]);
      },
    );

    test(
      "combines project, date, duration and incomplete-status filters",
      async () => {
        const calls = mockDatabase({
          searchRows: [],
        });

        await repository.searchProjectEntries(
          "project-1",
          {
            fromDate: "2026-09-01",
            toDate: "2026-09-30",
            minDuration: 30,
            maxDuration: 120,
            completed: false,
          },
        );

        const { sql, params } = firstQuery(calls);

        expect(sql).toContain(
          "e.project_id = $1",
        );

        expect(sql).toContain(
          "e.occurred_at >= $2::date",
        );

        expect(sql).toContain(
          "e.occurred_at < ($3::date + INTERVAL '1 day')",
        );

        expect(sql).toContain(
          "e.duration_minutes >= $4",
        );

        expect(sql).toContain(
          "e.duration_minutes <= $5",
        );

        expect(sql).toContain(
          "e.completed_at IS NULL",
        );

        expect(params).toEqual([
          "project-1",
          "2026-09-01",
          "2026-09-30",
          30,
          120,
        ]);
      },
    );

    test(
      "filters completed entries when completed is true",
      async () => {
        const calls = mockDatabase({
          searchRows: [],
        });

        await repository.searchProjectEntries(
          "project-1",
          {
            completed: true,
          },
        );

        const { sql, params } = firstQuery(calls);

        expect(sql).toContain(
          "e.completed_at IS NOT NULL",
        );

        expect(sql).not.toContain(
          "e.completed_at IS NULL",
        );

        expect(params).toEqual([
          "project-1",
        ]);
      },
    );

    test(
      "filters by a specific custom field and its value",
      async () => {
        const calls = mockDatabase({
          searchRows: [],
        });

        await repository.searchProjectEntries(
          "project-1",
          {
            customFields: [
              {
                fieldId:
                  "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                value: "Library",
              },
            ],
          },
        );

        const { sql, params } = firstQuery(calls);

        expect(sql).toContain(
          "FROM entry_field_values fv",
        );

        expect(sql).toContain(
          "fv.entry_id = e.id",
        );

        expect(sql).toContain(
          "fv.field_id = $2::uuid",
        );

        expect(sql).toContain(
          "COALESCE(fv.value_text, '') ILIKE $3",
        );

        expect(sql).toContain(
          "COALESCE(fv.value_number::text, '') ILIKE $3",
        );

        expect(sql).toContain(
          "COALESCE(fv.value_date::text, '') ILIKE $3",
        );

        expect(params).toEqual([
          "project-1",
          "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          "%Library%",
        ]);
      },
    );

    test(
      "supports multiple custom-field filters at the same time",
      async () => {
        const calls = mockDatabase({
          searchRows: [],
        });

        await repository.searchProjectEntries(
          "project-1",
          {
            customFields: [
              {
                fieldId:
                  "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                value: "Library",
              },
              {
                fieldId:
                  "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                value: "Complete",
              },
            ],
          },
        );

        const { sql, params } = firstQuery(calls);

        expect(sql).toContain(
          "fv.field_id = $2::uuid",
        );

        expect(sql).toContain(
          "COALESCE(fv.value_text, '') ILIKE $3",
        );

        expect(sql).toContain(
          "fv.field_id = $4::uuid",
        );

        expect(sql).toContain(
          "COALESCE(fv.value_text, '') ILIKE $5",
        );

        expect(params).toEqual([
          "project-1",
          "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          "%Library%",
          "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          "%Complete%",
        ]);
      },
    );

    test(
      "combines keyword search with structured and custom-field filters",
      async () => {
        const calls = mockDatabase({
          searchRows: [],
        });

        await repository.searchProjectEntries(
          "project-1",
          {
            query: "network",
            fromDate: "2026-09-01",
            minDuration: 20,
            completed: false,
            customFields: [
              {
                fieldId:
                  "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                value: "Campus",
              },
            ],
          },
        );

        const { sql, params } = firstQuery(calls);

        expect(sql).toContain(
          "e.name ILIKE $2",
        );

        expect(sql).toContain(
          "e.occurred_at >= $3::date",
        );

        expect(sql).toContain(
          "e.duration_minutes >= $4",
        );

        expect(sql).toContain(
          "e.completed_at IS NULL",
        );

        expect(sql).toContain(
          "fv.field_id = $5::uuid",
        );

        expect(sql).toContain(
          "COALESCE(fv.value_text, '') ILIKE $6",
        );

        expect(params).toEqual([
          "project-1",
          "%network%",
          "2026-09-01",
          20,
          "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          "%Campus%",
        ]);
      },
    );

    test.each([
      [
        "newest",
        "e.occurred_at DESC, e.created_at DESC",
      ],
      [
        "oldest",
        "e.occurred_at ASC, e.created_at ASC",
      ],
      [
        "name",
        "e.name ASC, e.occurred_at DESC",
      ],
      [
        "duration",
        "e.duration_minutes DESC, e.occurred_at DESC",
      ],
    ])(
      "uses the %s ordering",
      async (sort, expectedOrder) => {
        const calls = mockDatabase({
          searchRows: [],
        });

        await repository.searchProjectEntries(
          "project-1",
          {
            sort,
          },
        );

        const { sql } = firstQuery(calls);

        expect(sql).toContain(
          `ORDER BY ${expectedOrder}, v.created_at ASC`,
        );
      },
    );

    test(
      "falls back to newest ordering for an unknown sort value",
      async () => {
        const calls = mockDatabase({
          searchRows: [],
        });

        await repository.searchProjectEntries(
          "project-1",
          {
            sort: "something-unsupported",
          },
        );

        const { sql } = firstQuery(calls);

        expect(sql).toContain(
          "ORDER BY e.occurred_at DESC, e.created_at DESC, v.created_at ASC",
        );
      },
    );

    test(
      "returns an empty array and skips feature queries when nothing matches",
      async () => {
        const calls = mockDatabase({
          searchRows: [],
        });

        const result =
          await repository.searchProjectEntries(
            "project-1",
            {
              query: "does-not-exist",
            },
          );

        expect(result).toEqual([]);

        // Only the main search query should run because
        // attachEntryFeatures immediately returns for [].
        expect(calls).toHaveLength(1);
      },
    );

    test(
      "maps matching rows and attaches entry features",
      async () => {
        const entryId =
          "11111111-1111-1111-1111-111111111111";

        const calls = mockDatabase({
          searchRows: [
            makeSearchRow({
              entry_id: entryId,
              value_id:
                "22222222-2222-2222-2222-222222222222",
              field_id:
                "33333333-3333-3333-3333-333333333333",
              value_text: "Library",
              value_created_at: new Date(
                "2026-09-20T10:00:00.000Z",
              ),
              field_name: "Location",
              field_type: "short_text",
            }),
          ],

          checklistRows: [
            {
              id: "check-1",
              entry_id: entryId,
              text: "Submit notes",
              completed: false,
              position: 0,
              created_at: new Date(
                "2026-09-20T10:00:00.000Z",
              ),
              updated_at: new Date(
                "2026-09-20T10:00:00.000Z",
              ),
            },
          ],

          projectReferenceRows: [],
          entryReferenceRows: [],
        });

        const result =
          await repository.searchProjectEntries(
            "project-1",
            {
              query: "research",
            },
          );

        expect(result).toHaveLength(1);

        expect(result[0]).toMatchObject({
          id: entryId,
          projectId: "project-1",
          name: "Research Session",
          durationMinutes: 60,
          tags: ["research", "university"],
        });

        expect(result[0].values).toHaveLength(1);
        expect(result[0].checklist).toHaveLength(1);
        expect(result[0].references).toEqual([]);
        expect(result[0].entryReferences).toEqual([]);

        // Main search + checklist + project refs + entry refs.
        expect(calls).toHaveLength(4);

        const featureCalls = calls.slice(1);

        for (const call of featureCalls) {
          expect(call.params).toEqual([
            [entryId],
          ]);
        }
      },
    );

    test(
      "uses only the project filter when no optional filters are supplied",
      async () => {
        const calls = mockDatabase({
          searchRows: [],
        });

        await repository.searchProjectEntries(
          "project-1",
        );

        const { sql, params } = firstQuery(calls);

        expect(params).toEqual([
          "project-1",
        ]);

        expect(sql).toContain(
          "WHERE e.project_id = $1",
        );

        expect(sql).not.toContain(
          "e.completed_at IS NULL",
        );

        expect(sql).not.toContain(
          "e.completed_at IS NOT NULL",
        );

        expect(sql).toContain(
          "ORDER BY e.occurred_at DESC, e.created_at DESC, v.created_at ASC",
        );
      },
    );
  },
);

/**
 * Benchmark: entry revision-history retrieval at scale.
 *
 * Creates a throwaway user/project/entry, bulk-seeds revisions directly via
 * SQL (generate_series, not a JS loop of individual inserts, since that
 * would itself dominate the timing), benchmarks getEntryRevisionsService /
 * getEntryRevisionService at increasing revision counts, checks whether the
 * idx_entry_revisions_entry index is actually used, then deletes everything
 * it created.
 *
 * Run from the project root:
 *   node server/scripts/benchmarkRevisionHistory.js
 *
 * Adjust REVISION_COUNTS below to match whatever scale your team's shared
 * benchmark dataset uses (Sprint 3 doc suggests ~10,000 entries; this script
 * targets revisions-per-entry, which is a different axis but the same idea).
 */

const db = require("../db");
const {
  getEntryRevisionsService,
  getEntryRevisionService,
} = require("../services/projectDetailsService");

const REVISION_COUNTS = [100, 1000, 10000];

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

async function setup() {
  const suffix = randomSuffix();

  const userResult = await db.query(
    `INSERT INTO users (google_id, name, email)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [`bench-${suffix}`, "Benchmark User", `bench-${suffix}@example.test`],
  );
  const userId = userResult.rows[0].id;

  const projectResult = await db.query(
    `INSERT INTO projects (owner_id, name)
     VALUES ($1, $2)
     RETURNING id`,
    [userId, "Benchmark Project"],
  );
  const projectId = projectResult.rows[0].id;

  const entryResult = await db.query(
    `INSERT INTO entries (project_id, created_by_id, name, duration_minutes)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [projectId, userId, "Benchmark Entry", 30],
  );
  const entryId = entryResult.rows[0].id;

  return { userId, projectId, entryId };
}

async function seedRevisions(entryId, projectId, userId, count) {
  const snapshot = JSON.stringify({
    name: "Benchmark Entry",
    durationMinutes: 30,
    values: [],
  });

  // Bulk insert via generate_series: one round trip regardless of count,
  // with created_at spread out so ORDER BY created_at DESC has real work
  // to do rather than ties.
  await db.query(
    `INSERT INTO entry_revisions (entry_id, project_id, changed_by_id, snapshot, created_at)
     SELECT $1, $2, $3, $4::jsonb, NOW() - (n || ' seconds')::interval
     FROM generate_series(1, $5) AS n`,
    [entryId, projectId, userId, snapshot, count],
  );
}

async function clearRevisions(entryId) {
  await db.query(`DELETE FROM entry_revisions WHERE entry_id = $1`, [
    entryId,
  ]);
}

async function timeIt(label, fn) {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const ms = Number(end - start) / 1e6;
  console.log(`  ${label}: ${ms.toFixed(2)}ms`);
  return result;
}

async function explainListQuery(entryId) {
  const result = await db.query(
    `EXPLAIN ANALYZE
     SELECT id, entry_id, project_id, changed_by_id, snapshot, created_at
     FROM entry_revisions
     WHERE entry_id = $1
     ORDER BY created_at DESC`,
    [entryId],
  );

  const plan = result.rows.map((row) => row["QUERY PLAN"]).join("\n");
  const usesIndex = plan.includes("idx_entry_revisions_entry");

  console.log(plan);
  console.log(
    usesIndex
      ? "  -> Uses idx_entry_revisions_entry (good)"
      : "  -> WARNING: does not appear to use idx_entry_revisions_entry — check the plan above",
  );
}

async function cleanup({ projectId, userId }) {
  // projects -> entries -> entry_revisions all cascade on delete per schema.sql
  await db.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
  await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
}

async function main() {
  console.log("Setting up throwaway user/project/entry...");
  const { userId, projectId, entryId } = await setup();

  try {
    for (const count of REVISION_COUNTS) {
      console.log(`\n=== ${count} revisions ===`);

      await clearRevisions(entryId);
      console.log(`Seeding ${count} revisions...`);
      await timeIt("  (seed time, not part of the result)", () =>
        seedRevisions(entryId, projectId, userId, count),
      );

      await timeIt("getEntryRevisionsService (list)", () =>
        getEntryRevisionsService({ projectId, entryId, userId }),
      );

      const revisions = await getEntryRevisionsService({
        projectId,
        entryId,
        userId,
      });
      const midRevisionId = revisions[Math.floor(revisions.length / 2)].id;

      await timeIt("getEntryRevisionService (single lookup)", () =>
        getEntryRevisionService({
          projectId,
          entryId,
          revisionId: midRevisionId,
          userId,
        }),
      );

      console.log("Query plan for the list query:");
      await explainListQuery(entryId);
    }
  } finally {
    console.log("\nCleaning up...");
    await cleanup({ projectId, userId });
    await db.end?.();
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error("Benchmark failed:", error);
  process.exit(1);
});

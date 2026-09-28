const path = require("path");
const { Pool } = require("pg");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL was not found in server/.env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS entry_revisions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          changed_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          snapshot JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entry_revisions_entry
          ON entry_revisions(entry_id, created_at DESC);
    `);

    await client.query("COMMIT");

    console.log("Entry revisions migration completed successfully.");
    console.log("Added/confirmed: entry_revisions table");
    console.log("Added/confirmed: idx_entry_revisions_entry");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

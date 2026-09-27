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
      CREATE TABLE IF NOT EXISTS custom_statistics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        expression TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_custom_statistics_owner
        ON custom_statistics (owner_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_custom_statistics_project
        ON custom_statistics (project_id);
    `);

    await client.query("COMMIT");

    console.log("Custom statistics migration completed successfully.");
    console.log("Added/confirmed: custom_statistics table");
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

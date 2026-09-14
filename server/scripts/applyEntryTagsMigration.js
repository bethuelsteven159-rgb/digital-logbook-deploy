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
      ALTER TABLE entries
        ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_tags
        ON entries USING GIN (tags);
    `);

    await client.query("COMMIT");

    console.log("Entry tags migration completed successfully.");
    console.log("Added/confirmed: entries.tags");
    console.log("Added/confirmed: idx_entries_tags");
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

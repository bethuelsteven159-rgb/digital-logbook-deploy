const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL was not found in server/.env");
  process.exit(1);
}

const migrationFile = path.resolve(
  __dirname,
  "../sql/20260928_recurring_entries.sql",
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  const sql = fs.readFileSync(migrationFile, "utf8");

  if (!sql.trim()) {
    throw new Error(
      `Migration file is empty: ${migrationFile}`,
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(sql);

    await client.query("COMMIT");

    console.log(
      "Recurring entries migration completed successfully.",
    );
    console.log(
      "Created/confirmed: recurring_entry_definitions",
    );
    console.log(
      "Added/confirmed: entries.recurring_definition_id",
    );
    console.log(
      "Added/confirmed: entries.recurrence_date",
    );
    console.log(
      "Created/confirmed: uq_entries_recurring_occurrence",
    );
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

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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  const sql = fs.readFileSync(
    path.resolve(__dirname, "../sql/20260927_automation_rules.sql"),
    "utf8",
  );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(sql);

    await client.query("COMMIT");

    console.log("Automation rules migration completed successfully.");
    console.log("Added/confirmed: automation_rules table");
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

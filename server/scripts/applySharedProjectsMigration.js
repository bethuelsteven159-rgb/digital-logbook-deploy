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
  const sqlPath = path.resolve(
    __dirname,
    "../sql/20261009_shared_projects.sql",
  );

  const sql = fs.readFileSync(sqlPath, "utf8");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(sql);

    await client.query("COMMIT");

    console.log("Shared projects migration completed successfully.");
    console.log("Added/confirmed: project_collaborators, project_invitations tables");
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

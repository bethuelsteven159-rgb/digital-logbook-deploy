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
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    const migrationPath = path.join(
      __dirname,
      "../sql/20260911_person4_features.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf8").replace(/^\uFEFF/, "");
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("Person 4 database migration completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Person 4 migration failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

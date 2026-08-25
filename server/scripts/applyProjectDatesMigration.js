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
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS start_date DATE,
        ADD COLUMN IF NOT EXISTS end_date DATE;
    `);

    const existingConstraint = await client.query(`
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'projects_date_range_check'
        AND conrelid = 'projects'::regclass
      LIMIT 1;
    `);

    if (existingConstraint.rowCount === 0) {
      await client.query(`
        ALTER TABLE projects
          ADD CONSTRAINT projects_date_range_check
          CHECK (
            start_date IS NULL
            OR end_date IS NULL
            OR end_date >= start_date
          );
      `);
    }

    await client.query("COMMIT");

    console.log("Project date migration completed successfully.");
    console.log("Added/confirmed: projects.start_date");
    console.log("Added/confirmed: projects.end_date");
    console.log("Added/confirmed: projects_date_range_check");
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

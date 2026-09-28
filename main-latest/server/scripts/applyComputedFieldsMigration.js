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
      ALTER TABLE project_fields
        ADD COLUMN IF NOT EXISTS formula TEXT;
    `);

    await client.query(`
      ALTER TABLE project_fields
        DROP CONSTRAINT IF EXISTS project_fields_field_type_check;
    `);

    await client.query(`
      ALTER TABLE project_fields
        ADD CONSTRAINT project_fields_field_type_check
        CHECK (field_type IN ('short_text', 'long_text', 'number', 'date', 'computed'));
    `);

    await client.query("COMMIT");

    console.log("Computed fields migration completed successfully.");
    console.log("Added/confirmed: project_fields.formula");
    console.log("Updated: project_fields_field_type_check to allow 'computed'");
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

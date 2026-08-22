const fs = require("fs");
const path = require("path");

const db = require("../db");

async function applyProfileMigration() {
  try {
    const migrationPath = path.join(
      __dirname,
      "..",
      "sql",
      "profileMigration.sql",
    );

    const sql = fs.readFileSync(
      migrationPath,
      "utf8",
    );

    console.log("Applying profile migration...");

    await db.query(sql);

    console.log(
      "Profile migration applied successfully.",
    );

    const result = await db.query(`
      SELECT
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.table(result.rows);
  } catch (error) {
    console.error(
      "Profile migration failed:",
    );
    console.error(error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

applyProfileMigration();
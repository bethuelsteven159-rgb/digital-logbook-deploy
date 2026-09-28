const db = require("../db");

async function checkDatabase() {
  try {
    console.log("Connecting to PostgreSQL...");

    const connectionResult = await db.query(`
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        NOW() AS connected_at
    `);

    console.log("Database connection successful.");
    console.table(connectionResult.rows);

    const tablesResult = await db.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    if (tablesResult.rows.length === 0) {
      console.log("No tables currently exist in the public schema.");
    } else {
      console.log("Existing tables:");

      console.table(tablesResult.rows);
    }
  } catch (error) {
    console.error("Database connection failed:");
    console.error(error.message);

    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

checkDatabase();
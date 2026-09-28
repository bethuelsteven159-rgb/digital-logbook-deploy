const db = require("../db");

async function showFieldConstraint() {
  try {
    const result = await db.query(
      `
        SELECT
          pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conname = $1
      `,
      ["project_fields_field_type_check"],
    );

    console.table(result.rows);
  } catch (error) {
    console.error("Could not inspect constraint:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

showFieldConstraint();
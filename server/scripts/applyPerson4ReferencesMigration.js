const fs = require("fs");
const path = require("path");
const db = require("../db");

async function main() {
  const migrationPath = path.join(
    __dirname,
    "../sql/20260911_person4_references.sql",
  );

  const migration = fs.readFileSync(
    migrationPath,
    "utf8",
  );

  try {
    await db.query(migration);

    console.log(
      "Person 4 references migration completed successfully.",
    );
  } catch (error) {
    console.error(
      "Person 4 references migration failed:",
      error,
    );
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main();
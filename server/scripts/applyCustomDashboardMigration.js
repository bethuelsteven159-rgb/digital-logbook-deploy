const fs = require("fs");
const path = require("path");
const db = require("../db");

async function main() {
  const sqlPath = path.join(
    __dirname,
    "../sql/20260928_custom_dashboard.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");

  await db.query(sql);
  console.log("Custom dashboard migration applied successfully.");
  await db.end();
}

main().catch(async (error) => {
  console.error("Failed to apply custom dashboard migration:", error);
  try {
    await db.end();
  } catch {
    // Ignore shutdown failures after a migration error.
  }
  process.exit(1);
});

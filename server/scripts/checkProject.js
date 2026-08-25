const db = require("../db");

const projectId = process.argv[2];

async function checkProject() {
  try {
    if (!projectId) {
      console.log("\n❌ Please provide a project ID.");
      console.log("\nExample:");
      console.log(
        "node scripts/checkProject.js 67e2cf4b-e3f8-45d7-a39a-696534296cd2"
      );
      return;
    }

    console.log("\n🔍 Checking project:");
    console.log(projectId);

    const result = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.owner_id,
          p.created_at,
          p.archived_at,
          u.email AS owner_email
        FROM projects p
        LEFT JOIN users u
          ON u.id = p.owner_id
        WHERE p.id = $1
      `,
      [projectId]
    );

    if (result.rows.length === 0) {
      console.log("\n❌ PROJECT DOES NOT EXIST");

      console.log("\n📦 Projects currently in database:");

      const projects = await db.query(
        `
          SELECT
            p.id,
            p.name,
            p.owner_id,
            u.email AS owner_email
          FROM projects p
          LEFT JOIN users u
            ON u.id = p.owner_id
          ORDER BY p.created_at DESC
        `
      );

      if (projects.rows.length === 0) {
        console.log("There are NO projects in the database.");
      } else {
        console.table(projects.rows);
      }

      return;
    }

    console.log("\n✅ PROJECT FOUND\n");

    console.table(result.rows);

    const project = result.rows[0];

    console.log("\nProject ID:");
    console.log(project.id);

    console.log("\nOwner ID:");
    console.log(project.owner_id);

    console.log("\nOwner email:");
    console.log(project.owner_email || "No matching user found");
  } catch (error) {
    console.error("\n💥 Database error:");
    console.error(error);
  } finally {
    await db.end();
  }
}

checkProject();
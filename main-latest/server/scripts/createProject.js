const db = require("../db");

const email = process.argv[2];
const projectName =
  process.argv.slice(3).join(" ") ||
  "Project Details Test";

async function createProject() {
  const client = await db.connect();

  try {
    if (!email) {
      console.log("\n❌ Please provide the owner's email.\n");

      console.log("Users currently in the database:");

      const users = await db.query(`
        SELECT id, name, email
        FROM users
        ORDER BY created_at DESC
      `);

      console.table(users.rows);

      console.log("\nExample:");
      console.log(
        'node scripts/createProject.js student@wits.ac.za "My Test Project"'
      );

      return;
    }

    await client.query("BEGIN");

    // Find the user who should own the project
    const userResult = await client.query(
      `
        SELECT id, name, email
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log(`\n❌ No user found with email: ${email}`);

      const users = await client.query(`
        SELECT id, name, email
        FROM users
        ORDER BY created_at DESC
      `);

      console.log("\nAvailable users:");
      console.table(users.rows);

      await client.query("ROLLBACK");
      return;
    }

    const user = userResult.rows[0];

    console.log("\n👤 Creating project for:");
    console.table([user]);

    // Create project
    const projectResult = await client.query(
      `
        INSERT INTO projects (
          owner_id,
          name,
          description
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          owner_id,
          name,
          description,
          created_at
      `,
      [
        user.id,
        projectName,
        "Test project for Project Details and logbook entries.",
      ]
    );

    const project = projectResult.rows[0];

    // Add some useful test fields
    const fields = [
      ["Summary", "short_text", 0, true],
      ["Notes", "long_text", 1, false],
      ["Progress", "number", 2, false],
      ["Work Date", "date", 3, false],
    ];

    for (const [name, type, position, required] of fields) {
      await client.query(
        `
          INSERT INTO project_fields (
            project_id,
            name,
            field_type,
            position,
            required
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          project.id,
          name,
          type,
          position,
          required,
        ]
      );
    }

    await client.query("COMMIT");

    console.log("\n✅ PROJECT CREATED SUCCESSFULLY\n");

    console.table([project]);

    console.log("\n📋 Custom fields:");
    console.table(
      fields.map(([name, type, position, required]) => ({
        name,
        type,
        position,
        required,
      }))
    );

    console.log("\n🌐 Open this URL:\n");

    console.log(
      `http://localhost:8443/digital_logbook/projects/${project.id}`
    );

    console.log("\nProject ID:");
    console.log(project.id);
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("\n💥 Failed to create project:");
    console.error(error);
  } finally {
    client.release();
    await db.end();
  }
}

createProject();
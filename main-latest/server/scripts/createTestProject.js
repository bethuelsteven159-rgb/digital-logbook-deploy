const db = require("../db");

async function createTestProject() {
  const userId = process.argv[2];

  if (!userId) {
    console.error(
      "Usage: node scripts/createTestProject.js <user-uuid>",
    );

    process.exitCode = 1;
    return;
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    /*
     * Make sure the supplied UUID really belongs
     * to a user in the shared Render database.
     */
    const userResult = await client.query(
      `
        SELECT id, name, email
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId],
    );

    if (userResult.rows.length === 0) {
      throw new Error(
        "No Render user exists with that UUID.",
      );
    }

    const user = userResult.rows[0];

    /*
     * Create one project purely for testing
     * Project Details / Entries integration.
     */
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
        userId,
        "Project Details Integration Test",
        "Temporary project for testing Project Details and Entries.",
      ],
    );

    const project = projectResult.rows[0];

    /*
     * Give the project some configured fields so
     * we can test values for EXISTING fields as well.
     */
    await client.query(
      `
        INSERT INTO project_fields (
          project_id,
          name,
          field_type,
          position,
          required
        )
        VALUES
         ($1, 'Work completed', 'text', 1, false),
($1, 'Difficulty', 'number', 2, false),
($1, 'Work date', 'date', 3, false),
($1, 'Completed', 'boolean', 4, false),
($1, 'Category', 'tag', 5, false)
      `,
      [project.id],
    );

    await client.query("COMMIT");

    console.log("");
    console.log("Test project created successfully.");
    console.log("");
    console.log("User:");
    console.log(`${user.name} <${user.email}>`);

    console.log("");
    console.log("Project ID:");
    console.log(project.id);

    console.log("");
    console.log("Open:");
    console.log(
      `http://localhost:8443/digital_logbook/projects/${project.id}`,
    );
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Could not create test project:",
    );

    console.error(error.message);

    process.exitCode = 1;
  } finally {
    client.release();
    await db.end();
  }
}

createTestProject();
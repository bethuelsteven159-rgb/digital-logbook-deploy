const path = require("path");
const { Pool } = require("pg");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const projectId = process.argv[2] || null;

if (!process.env.DATABASE_URL) {
  console.error("\nERROR: DATABASE_URL was not found.");
  console.error("Expected it in: server/.env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

function heading(title) {
  console.log("\n");
  console.log("=".repeat(90));
  console.log(title);
  console.log("=".repeat(90));
}

function subheading(title) {
  console.log("\n" + "-".repeat(90));
  console.log(title);
  console.log("-".repeat(90));
}

function printRows(rows) {
  if (!rows || rows.length === 0) {
    console.log("(no rows)");
    return;
  }

  console.table(rows);
}

async function query(client, text, params = []) {
  return client.query(text, params);
}

async function getPublicTables(client) {
  const result = await query(
    client,
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  );

  return result.rows.map((row) => row.table_name);
}

async function getColumns(client) {
  return (
    await query(
      client,
      `
        SELECT
          table_name,
          ordinal_position,
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `
    )
  ).rows;
}

async function tableHasColumn(client, tableName, columnName) {
  const result = await query(
    client,
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1;
    `,
    [tableName, columnName]
  );

  return result.rowCount > 0;
}

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function inspectProjectData(client, tables, projectIdValue) {
  heading(`PROJECT-SPECIFIC DATA: ${projectIdValue}`);

  if (tables.includes("projects")) {
    subheading("projects row");

    const result = await query(
      client,
      `SELECT * FROM public.projects WHERE id::text = $1;`,
      [projectIdValue]
    );

    printRows(result.rows);
  } else {
    console.log("No public.projects table exists.");
  }

  const tablesWithProjectId = [];

  for (const table of tables) {
    if (await tableHasColumn(client, table, "project_id")) {
      tablesWithProjectId.push(table);
    }
  }

  subheading("Tables containing project_id");
  console.log(
    tablesWithProjectId.length
      ? tablesWithProjectId.join(", ")
      : "(none)"
  );

  for (const table of tablesWithProjectId) {
    subheading(`${table} rows for this project`);

    const result = await query(
      client,
      `
        SELECT *
        FROM public.${quoteIdent(table)}
        WHERE project_id::text = $1
        ORDER BY 1;
      `,
      [projectIdValue]
    );

    printRows(result.rows);
  }

  let entryIds = [];

  if (
    tables.includes("entries") &&
    (await tableHasColumn(client, "entries", "project_id"))
  ) {
    const result = await query(
      client,
      `
        SELECT id::text AS id
        FROM public.entries
        WHERE project_id::text = $1;
      `,
      [projectIdValue]
    );

    entryIds = result.rows.map((row) => row.id);
  }

  if (entryIds.length === 0) {
    subheading("Entry-linked tables");
    console.log("(No entry IDs found for this project.)");
    return;
  }

  const tablesWithEntryId = [];

  for (const table of tables) {
    if (await tableHasColumn(client, table, "entry_id")) {
      tablesWithEntryId.push(table);
    }
  }

  subheading("Tables containing entry_id");
  console.log(
    tablesWithEntryId.length
      ? tablesWithEntryId.join(", ")
      : "(none)"
  );

  for (const table of tablesWithEntryId) {
    subheading(`${table} rows linked to this project's entries`);

    const result = await query(
      client,
      `
        SELECT *
        FROM public.${quoteIdent(table)}
        WHERE entry_id::text = ANY($1::text[])
        ORDER BY 1;
      `,
      [entryIds]
    );

    printRows(result.rows);
  }
}

async function main() {
  const client = await pool.connect();

  try {
    await query(client, "BEGIN READ ONLY;");

    heading("DIGITAL LOGBOOK DATABASE INSPECTION");
    console.log("Mode: READ ONLY");
    console.log(
      projectId
        ? `Project filter: ${projectId}`
        : "Project filter: none (schema inspection only)"
    );

    const tables = await getPublicTables(client);

    heading("1. PUBLIC TABLES");
    printRows(tables.map((table_name) => ({ table_name })));

    heading("2. ALL PUBLIC TABLE COLUMNS");
    printRows(await getColumns(client));

    heading("3. CONSTRAINTS");
    const constraints = await query(
      client,
      `
        SELECT
          conrelid::regclass::text AS table_name,
          conname AS constraint_name,
          CASE contype
            WHEN 'p' THEN 'PRIMARY KEY'
            WHEN 'f' THEN 'FOREIGN KEY'
            WHEN 'u' THEN 'UNIQUE'
            WHEN 'c' THEN 'CHECK'
            WHEN 'x' THEN 'EXCLUSION'
            ELSE contype::text
          END AS constraint_type,
          pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE connamespace = 'public'::regnamespace
        ORDER BY table_name, constraint_type, constraint_name;
      `
    );

    printRows(constraints.rows);

    heading("4. ENUM TYPES AND ALLOWED VALUES");
    const enums = await query(
      client,
      `
        SELECT
          n.nspname AS schema_name,
          t.typname AS enum_name,
          e.enumsortorder,
          e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        ORDER BY enum_name, e.enumsortorder;
      `
    );

    printRows(enums.rows);

    heading("5. INDEXES");
    const indexes = await query(
      client,
      `
        SELECT
          tablename AS table_name,
          indexname AS index_name,
          indexdef AS definition
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
      `
    );

    printRows(indexes.rows);

    heading("6. FOREIGN-KEY RELATIONSHIPS");
    const foreignKeys = await query(
      client,
      `
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS referenced_table,
          ccu.column_name AS referenced_column,
          tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name;
      `
    );

    printRows(foreignKeys.rows);

    heading("7. ROW COUNTS");
    const counts = [];

    for (const table of tables) {
      const result = await query(
        client,
        `SELECT COUNT(*)::int AS count FROM public.${quoteIdent(table)};`
      );

      counts.push({
        table_name: table,
        row_count: result.rows[0].count,
      });
    }

    printRows(counts);

    heading("8. PROJECT / ENTRY RELATED TABLES");

    const relatedPattern = /(project|entry|field|value|user)/i;

    const relatedTables = tables.filter((table) =>
      relatedPattern.test(table)
    );

    printRows(
      relatedTables.map((table_name) => ({
        table_name,
      }))
    );

    if (projectId) {
      await inspectProjectData(client, tables, projectId);
    } else {
      heading("9. PROJECT DATA WAS NOT DUMPED");
      console.log(
        "Run this script again with a project UUID:"
      );
      console.log(
        "node scripts/inspectDatabase.js <PROJECT_UUID>"
      );
    }

    await query(client, "ROLLBACK;");

    heading("DONE");
    console.log(
      "Inspection completed. No database changes were made."
    );
  } catch (error) {
    try {
      await query(client, "ROLLBACK;");
    } catch (_) {}

    console.error("\nDATABASE INSPECTION FAILED:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

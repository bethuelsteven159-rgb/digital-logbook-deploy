const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

function getDatabaseTarget() {
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    throw new Error('DATABASE_URL is missing from server/.env');
  }

  if (raw.includes('...')) {
    throw new Error(
      'DATABASE_URL contains "...". Copy the full connection string from Neon before inspecting the database.'
    );
  }

  const url = new URL(raw);

  return {
    connectionString: raw,
    host: url.hostname,
    database: url.pathname.replace(/^\//, ''),
    user: decodeURIComponent(url.username),
  };
}

async function inspectDatabase() {
  const target = getDatabaseTarget();
  const pool = new Pool({ connectionString: target.connectionString });

  try {
    const [tables, columns, constraints, indexes] = await Promise.all([
      pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `),
      pool.query(`
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
      `),
      pool.query(`
        SELECT
          cls.relname AS table_name,
          con.conname AS constraint_name,
          con.contype AS constraint_type,
          pg_get_constraintdef(con.oid, true) AS definition
        FROM pg_constraint con
        JOIN pg_class cls ON cls.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = cls.relnamespace
        WHERE ns.nspname = 'public'
        ORDER BY cls.relname, con.conname;
      `),
      pool.query(`
        SELECT
          tablename AS table_name,
          indexname AS index_name,
          indexdef AS definition
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
      `),
    ]);

    const snapshot = {
      generatedAt: new Date().toISOString(),
      target: {
        host: target.host,
        database: target.database,
        user: target.user,
      },
      tables: tables.rows,
      columns: columns.rows,
      constraints: constraints.rows,
      indexes: indexes.rows,
    };

    const outputPath = path.join(__dirname, 'schema-snapshot.json');
    fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2) + '\n');

    console.log(`✅ Schema snapshot written to ${outputPath}`);
    console.log(`Tables found: ${tables.rowCount}`);
    console.log('No rows or secret values were exported.');
  } finally {
    await pool.end();
  }
}

inspectDatabase().catch((error) => {
  console.error('❌ Inspection failed:', error.message);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const LOCK_ID = 30110001;

function getDatabaseTarget() {
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    throw new Error('DATABASE_URL is missing from server/.env');
  }

  if (raw.includes('...')) {
    throw new Error(
      'DATABASE_URL contains "...". Copy the full connection string from Neon; do not use a shortened hostname.'
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

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ');
}

function assertNonDestructive(sql, filename) {
  const cleaned = stripSqlComments(sql);

  const forbidden = [
    { pattern: /\bDROP\s+SCHEMA\b/i, label: 'DROP SCHEMA' },
    { pattern: /\bDROP\s+TABLE\b/i, label: 'DROP TABLE' },
    { pattern: /\bTRUNCATE\b/i, label: 'TRUNCATE' },
    { pattern: /\bALTER\s+TABLE\b[\s\S]*?\bDROP\s+COLUMN\b/i, label: 'ALTER TABLE ... DROP COLUMN' },
  ];

  for (const rule of forbidden) {
    if (rule.pattern.test(cleaned)) {
      throw new Error(
        `Migration ${filename} contains forbidden destructive SQL: ${rule.label}. ` +
        'This runner is intentionally non-destructive.'
      );
    }
  }
}

function checksum(sql) {
  return crypto.createHash('sha256').update(sql, 'utf8').digest('hex');
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function runMigrations() {
  const target = getDatabaseTarget();

  console.log('Safe database migration');
  console.log(`  host:     ${target.host}`);
  console.log(`  database: ${target.database}`);
  console.log(`  user:     ${target.user}`);

  const pool = new Pool({
    connectionString: target.connectionString,
  });

  const client = await pool.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);

    await ensureMigrationTable(client);

    if (!fs.existsSync(MIGRATIONS_DIR)) {
      fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    }

    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((name) => /^\d+_.+\.sql$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const appliedResult = await client.query(
      'SELECT filename, checksum, applied_at FROM schema_migrations ORDER BY filename'
    );

    const applied = new Map(
      appliedResult.rows.map((row) => [row.filename, row])
    );

    let appliedCount = 0;

    for (const filename of migrationFiles) {
      const fullPath = path.join(MIGRATIONS_DIR, filename);
      const sql = fs.readFileSync(fullPath, 'utf8').replace(/^\uFEFF/, '');
      const fileChecksum = checksum(sql);

      if (applied.has(filename)) {
        const previous = applied.get(filename);

        if (previous.checksum !== fileChecksum) {
          throw new Error(
            `Applied migration ${filename} has been edited after it ran. ` +
            'Create a new migration instead of modifying an applied migration.'
          );
        }

        console.log(`✓ ${filename} already applied`);
        continue;
      }

      assertNonDestructive(sql, filename);

      console.log(`→ Applying ${filename}`);

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
          [filename, fileChecksum]
        );
        await client.query('COMMIT');

        console.log(`✓ Applied ${filename}`);
        appliedCount += 1;
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${filename} failed and was rolled back: ${error.message}`);
      }
    }

    if (migrationFiles.length === 0) {
      console.log('No migration files found. Nothing was changed.');
    } else if (appliedCount === 0) {
      console.log('Database is already up to date.');
    } else {
      console.log(`Done. Applied ${appliedCount} migration(s).`);
    }
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
    } catch (_) {
      // Ignore unlock errors while shutting down.
    }
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations().catch((error) => {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runMigrations };

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Render SSL
});

// Strips a leading UTF-8 BOM if present, so files saved by editors/tools
// that default to "UTF-8 with BOM" don't break Postgres with
// "syntax error at or near CREATE" on the first statement.
function readSql(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

async function runSetup() {
  try {
    console.log('Resetting schema...');
    // Drops all tables/constraints/indexes in one shot so schema.sql's
    // CREATE TABLE IF NOT EXISTS clauses always create fresh, current
    // tables instead of silently no-op'ing against stale ones.
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('✅ Schema reset');

    console.log('Running schema.sql...');
    const schemaSql = readSql(path.join(__dirname, 'schema.sql'));
    await pool.query(schemaSql);
    console.log('✅ Schema tables created successfully!');

    console.log('Running seed.sql...');
    const seedSql = readSql(path.join(__dirname, 'seed.sql'));
    await pool.query(seedSql);
    console.log('✅ Seed data inserted successfully!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error setting up database:', err);
    process.exit(1);
  }
}

runSetup();


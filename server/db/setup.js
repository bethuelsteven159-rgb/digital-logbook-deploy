const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Render SSL
});

async function runSetup() {
  try {
    console.log('Running schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schemaSql);
    console.log('✅ Schema tables created successfully!');

    console.log('Running seed.sql...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await pool.query(seedSql);
    console.log('✅ Seed data inserted successfully!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error setting up database:', err);
    process.exit(1);
  }
}

runSetup();

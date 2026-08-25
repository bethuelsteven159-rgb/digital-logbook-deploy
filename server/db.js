const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Export the Pool itself.
// A pg Pool supports BOTH:
//   db.query(...)   -> used by normal routes
//   db.connect()    -> required by transaction-based repositories
module.exports = pool;

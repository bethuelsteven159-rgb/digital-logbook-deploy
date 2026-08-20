const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/dashboard - Summary stats for dashboard[cite: 2]
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user?.id;
    // Calculate total hours, active project count, total entries[cite: 1, 2]
    const statsQuery = await db.query(
      `SELECT
         COALESCE(SUM(duration_minutes) / 60.0, 0) AS total_hours,
         COUNT(DISTINCT project_id) AS active_projects,
         COUNT(id) AS total_entries
       FROM entries
       WHERE created_by_id = $1`,
      [userId]
    );
    res.json(statsQuery.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

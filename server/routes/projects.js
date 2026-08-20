const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/projects - Get all projects for user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;

    // If auth middleware is active, filter by user; otherwise return all projects
    const query = userId
      ? 'SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM projects ORDER BY created_at DESC';

    const params = userId ? [userId] : [];

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects - Create a new project
router.post('/', async (req, res) => {
  try {
    // Fallback ID for testing before Auth middleware is added
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
    const { name, description } = req.body;

    const result = await db.query(
      'INSERT INTO projects (owner_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [userId, name, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

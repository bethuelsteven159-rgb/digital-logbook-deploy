const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/projects - Get projects for logged-in user or all projects if unauthenticated[cite: 2]
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
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

// POST /api/projects - Create a new project[cite: 2]
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

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

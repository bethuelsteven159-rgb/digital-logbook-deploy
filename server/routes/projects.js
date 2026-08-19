const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /projects - Get all projects for user[cite: 2]
router.get('/', async (req, res) => {
  try {
    // req.user.id will be passed by your teammate's auth middleware
    const userId = req.user?.id;
    const result = await db.query(
      'SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /projects - Create a new project[cite: 2]
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
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

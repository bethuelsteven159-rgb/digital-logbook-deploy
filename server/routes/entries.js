const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/projects/:projectId/entries - Get all entries for a project
router.get('/projects/:projectId/entries', async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await db.query(
      `SELECT e.*,
              json_agg(json_build_object('field_id', efv.field_id, 'val_text', efv.value_text, 'val_num', efv.value_number, 'val_date', efv.value_date)) AS custom_values
       FROM entries e
       LEFT JOIN entry_field_values efv ON e.id = efv.entry_id
       WHERE e.project_id = $1
       GROUP BY e.id
       ORDER BY e.occurred_at DESC`,
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:projectId/entries - Create entry with dynamic values[cite: 2]
router.post('/projects/:projectId/entries', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN'); // Start transaction for atomic insertion
    const { projectId } = req.params;
    const userId = req.user?.id;
    const { name, duration_minutes, occurred_at, custom_fields } = req.body;

    // 1. Insert base entry[cite: 2]
    const entryRes = await client.query(
      `INSERT INTO entries (project_id, created_by_id, name, duration_minutes, occurred_at)
       VALUES ($1, $2, $3, $4, COALESCE($5, NOW())) RETURNING *`,
      [projectId, userId, name, duration_minutes || 0, occurred_at]
    );
    const newEntry = entryRes.rows[0];

    // 2. Insert custom dynamic field values if provided[cite: 2]
    if (custom_fields && Array.isArray(custom_fields)) {
      for (const field of custom_fields) {
        await client.query(
          `INSERT INTO entry_field_values (entry_id, field_id, value_text, value_number, value_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [newEntry.id, field.field_id, field.value_text, field.value_number, field.value_date]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(newEntry);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/entries/:id - Delete entry[cite: 2]
router.delete('/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM entries WHERE id = $1', [id]);
    res.json({ message: 'Entry deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

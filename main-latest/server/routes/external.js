const express = require('express');
const router = express.Router();

// Express mounts this file at '/api/external'
// Writing '/quote' here makes the full URL: GET /api/external/quote
router.get('/quote', async (req, res) => {
  try {
    const response = await fetch('https://dummyjson.com/quotes/random');
    if (!response.ok) {
      throw new Error(`External API responded with status ${response.status}`);
    }

    const data = await response.json();
    res.json({
      quote: data.quote,
      author: data.author
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch external quote', details: err.message });
  }
});

module.exports = router;

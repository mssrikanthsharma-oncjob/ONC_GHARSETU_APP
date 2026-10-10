const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/settings — return all settings as { key: value } map
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings — upsert each key-value pair
router.put('/', (req, res) => {
  const data = req.body;

  if (typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ error: 'Body must be a key-value object' });
  }

  const upsert = db.prepare('INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)');

  const upsertMany = db.transaction((entries) => {
    for (const [key, value] of entries) {
      upsert.run(key, String(value));
    }
  });

  try {
    upsertMany(Object.entries(data));
    // Return updated settings
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

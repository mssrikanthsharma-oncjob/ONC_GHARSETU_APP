const express = require('express');
const router = express.Router();
const db = require('../database');

// Parse JSON array fields from a raw customer row
function parseCustomer(row) {
  if (!row) return null;
  return {
    ...row,
    preferred_locations: safeParseArray(row.preferred_locations),
    preferred_bhk: safeParseArray(row.preferred_bhk),
    amenities_wishlist: safeParseArray(row.amenities_wishlist),
  };
}

function safeParseArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// GET /api/customers — list with optional filters
router.get('/', (req, res) => {
  const { search, type, status } = req.query;

  let query = 'SELECT * FROM customers WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  try {
    const rows = db.prepare(query).all(...params);
    res.json(rows.map(parseCustomer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id — single customer
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Customer not found' });
    res.json(parseCustomer(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers — create
router.post('/', (req, res) => {
  const {
    name, phone, email, type = 'buyer', status = 'active',
    budget_min, budget_max,
    preferred_locations = [], preferred_bhk = [], amenities_wishlist = [],
    notes, follow_up_date,
  } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const now = new Date().toISOString();
  try {
    const result = db.prepare(`
      INSERT INTO customers
        (name, phone, email, type, status, budget_min, budget_max,
         preferred_locations, preferred_bhk, amenities_wishlist, notes, follow_up_date, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, phone || null, email || null, type, status,
      budget_min ?? null, budget_max ?? null,
      JSON.stringify(preferred_locations),
      JSON.stringify(preferred_bhk),
      JSON.stringify(amenities_wishlist),
      notes || null, follow_up_date || null,
      now, now,
    );

    const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(parseCustomer(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id — update
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  const {
    name, phone, email, type, status,
    budget_min, budget_max,
    preferred_locations, preferred_bhk, amenities_wishlist,
    notes, follow_up_date,
  } = req.body;

  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE customers SET
        name = ?, phone = ?, email = ?, type = ?, status = ?,
        budget_min = ?, budget_max = ?,
        preferred_locations = ?, preferred_bhk = ?, amenities_wishlist = ?,
        notes = ?, follow_up_date = ?, updated_at = ?
      WHERE id = ?
    `).run(
      name ?? existing.name,
      phone !== undefined ? phone : existing.phone,
      email !== undefined ? email : existing.email,
      type ?? existing.type,
      status ?? existing.status,
      budget_min !== undefined ? budget_min : existing.budget_min,
      budget_max !== undefined ? budget_max : existing.budget_max,
      preferred_locations !== undefined ? JSON.stringify(preferred_locations) : existing.preferred_locations,
      preferred_bhk !== undefined ? JSON.stringify(preferred_bhk) : existing.preferred_bhk,
      amenities_wishlist !== undefined ? JSON.stringify(amenities_wishlist) : existing.amenities_wishlist,
      notes !== undefined ? notes : existing.notes,
      follow_up_date !== undefined ? follow_up_date : existing.follow_up_date,
      now,
      req.params.id,
    );

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    res.json(parseCustomer(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

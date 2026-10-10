const express = require('express');
const router = express.Router();
const db = require('../database');

function parseProperty(row) {
  if (!row) return null;
  return {
    ...row,
    amenities: safeParseArray(row.amenities),
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

// Compute avg price per sqft for a locality + type combination
function getAvgPriceSqft(locality, type) {
  if (!locality || !type) return null;
  const row = db.prepare(`
    SELECT AVG(price / area_sqft) as avg_price_sqft
    FROM properties
    WHERE locality = ? AND type = ? AND area_sqft > 0
  `).get(locality, type);
  return row && row.avg_price_sqft ? Math.round(row.avg_price_sqft) : null;
}

// GET /api/properties — list with optional filters
router.get('/', (req, res) => {
  const { locality, type, status, min_price, max_price } = req.query;

  let query = 'SELECT * FROM properties WHERE 1=1';
  const params = [];

  if (locality) {
    query += ' AND locality LIKE ?';
    params.push(`%${locality}%`);
  }
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (min_price) {
    query += ' AND price >= ?';
    params.push(Number(min_price));
  }
  if (max_price) {
    query += ' AND price <= ?';
    params.push(Number(max_price));
  }

  query += ' ORDER BY created_at DESC';

  try {
    const rows = db.prepare(query).all(...params);
    const result = rows.map(row => {
      const parsed = parseProperty(row);
      parsed.avg_price_sqft = getAvgPriceSqft(row.locality, row.type);
      return parsed;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/properties/:id — single property
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Property not found' });
    const parsed = parseProperty(row);
    parsed.avg_price_sqft = getAvgPriceSqft(row.locality, row.type);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/properties — create
router.post('/', (req, res) => {
  const {
    title, type = 'apartment', status = 'available',
    locality, city, price, area_sqft, bhk,
    floor, total_floors, parking = 0,
    amenities = [], description, seller_id,
  } = req.body;

  if (!title) return res.status(400).json({ error: 'title is required' });
  if (!locality) return res.status(400).json({ error: 'locality is required' });
  if (price === undefined || price === null) return res.status(400).json({ error: 'price is required' });

  const now = new Date().toISOString();
  try {
    const result = db.prepare(`
      INSERT INTO properties
        (title, type, status, locality, city, price, area_sqft, bhk,
         floor, total_floors, parking, amenities, description, seller_id, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, type, status, locality, city || null,
      Number(price), area_sqft ? Number(area_sqft) : null,
      bhk ? Number(bhk) : null,
      floor ? Number(floor) : null,
      total_floors ? Number(total_floors) : null,
      Number(parking),
      JSON.stringify(amenities),
      description || null, seller_id || null,
      now, now,
    );

    const created = db.prepare('SELECT * FROM properties WHERE id = ?').get(result.lastInsertRowid);
    const parsed = parseProperty(created);
    parsed.avg_price_sqft = getAvgPriceSqft(created.locality, created.type);
    res.status(201).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/properties/:id — update
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Property not found' });

  const {
    title, type, status, locality, city, price, area_sqft, bhk,
    floor, total_floors, parking, amenities, description, seller_id,
  } = req.body;

  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE properties SET
        title = ?, type = ?, status = ?, locality = ?, city = ?,
        price = ?, area_sqft = ?, bhk = ?, floor = ?, total_floors = ?,
        parking = ?, amenities = ?, description = ?, seller_id = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title ?? existing.title,
      type ?? existing.type,
      status ?? existing.status,
      locality ?? existing.locality,
      city !== undefined ? city : existing.city,
      price !== undefined ? Number(price) : existing.price,
      area_sqft !== undefined ? Number(area_sqft) : existing.area_sqft,
      bhk !== undefined ? Number(bhk) : existing.bhk,
      floor !== undefined ? Number(floor) : existing.floor,
      total_floors !== undefined ? Number(total_floors) : existing.total_floors,
      parking !== undefined ? Number(parking) : existing.parking,
      amenities !== undefined ? JSON.stringify(amenities) : existing.amenities,
      description !== undefined ? description : existing.description,
      seller_id !== undefined ? seller_id : existing.seller_id,
      now,
      req.params.id,
    );

    const updated = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
    const parsed = parseProperty(updated);
    parsed.avg_price_sqft = getAvgPriceSqft(updated.locality, updated.type);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/properties/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM properties WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Property not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

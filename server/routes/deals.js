const express = require('express');
const router = express.Router();
const db = require('../database');

function parseDeal(row) {
  if (!row) return null;
  return {
    ...row,
    brokers: safeParseArray(row.brokers),
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

function calcAmounts(dealAmount, buyerPct, sellerPct) {
  const amount = Number(dealAmount) || 0;
  const bPct = Number(buyerPct) || 0;
  const sPct = Number(sellerPct) || 0;
  const buyer_brokerage_amount = parseFloat((amount * bPct / 100).toFixed(2));
  const seller_brokerage_amount = parseFloat((amount * sPct / 100).toFixed(2));
  const total_brokerage_amount = parseFloat((buyer_brokerage_amount + seller_brokerage_amount).toFixed(2));
  return { buyer_brokerage_amount, seller_brokerage_amount, total_brokerage_amount };
}

// GET /api/deals/stats — must be before /:id
router.get('/stats', (req, res) => {
  try {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const monthBrokerage = db.prepare(`
      SELECT SUM(total_brokerage_amount) as total
      FROM deals
      WHERE status = 'completed' AND strftime('%Y-%m', deal_date) = ?
    `).get(monthStr);

    const allTimeBrokerage = db.prepare(`
      SELECT SUM(total_brokerage_amount) as total FROM deals WHERE status = 'completed'
    `).get();

    const dealCount = db.prepare(`SELECT COUNT(*) as count FROM deals`).get();

    const topLocalities = db.prepare(`
      SELECT p.locality, COUNT(*) as count
      FROM deals d
      JOIN properties p ON d.property_id = p.id
      GROUP BY p.locality
      ORDER BY count DESC
      LIMIT 5
    `).all();

    res.json({
      total_brokerage_month: monthBrokerage.total || 0,
      total_brokerage_alltime: allTimeBrokerage.total || 0,
      deal_count: dealCount.count || 0,
      top_localities: topLocalities,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deals — list with optional filters
router.get('/', (req, res) => {
  const { status, month } = req.query;

  let query = 'SELECT * FROM deals WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (month) {
    query += ` AND strftime('%Y-%m', deal_date) = ?`;
    params.push(month);
  }

  query += ' ORDER BY deal_date DESC';

  try {
    const rows = db.prepare(query).all(...params);

    // Recalculate amounts on read for consistency
    const result = rows.map(row => {
      const deal = parseDeal(row);
      const amounts = calcAmounts(deal.deal_amount, deal.buyer_brokerage_pct, deal.seller_brokerage_pct);
      return { ...deal, ...amounts };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deals/dashboard-stats
router.get('/dashboard-stats', (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // --- KPIs ---
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    const dealsThisMonthRow = db.prepare(
      `SELECT COUNT(*) as cnt FROM deals WHERE strftime('%Y-%m', deal_date) = ?`
    ).get(monthStr);

    const brokerageThisMonthRow = db.prepare(
      `SELECT IFNULL(SUM(CAST(total_brokerage_amount AS REAL)), 0) as total FROM deals WHERE strftime('%Y-%m', deal_date) = ?`
    ).get(monthStr);

    const brokerageAllTimeRow = db.prepare(
      `SELECT IFNULL(SUM(CAST(total_brokerage_amount AS REAL)), 0) as total FROM deals`
    ).get();

    const totalDealsRow = db.prepare(`SELECT COUNT(*) as cnt FROM deals`).get();

    const dealsClosedRow = db.prepare(
      `SELECT COUNT(*) as cnt FROM deals WHERE status = 'completed'`
    ).get();

    const dealsNegotiationRow = db.prepare(
      `SELECT COUNT(*) as cnt FROM deals WHERE status = 'in_progress'`
    ).get();

    // --- Monthly brokerage for last 6 months ---
    const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthly_brokerage = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth();
      const key = `${yr}-${String(mo + 1).padStart(2, '0')}`;
      const shortYear = String(yr).slice(-2);
      const label = `${monthLabels[mo]} '${shortYear}`;
      const row = db.prepare(
        `SELECT IFNULL(SUM(CAST(total_brokerage_amount AS REAL)), 0) as total FROM deals WHERE strftime('%Y-%m', deal_date) = ?`
      ).get(key);
      monthly_brokerage.push({ month: key, label, total: row.total || 0 });
    }

    // --- Recent deals (last 5) ---
    const recent_deals = db.prepare(`
      SELECT d.id, d.deal_date, d.deal_amount, d.total_brokerage_amount, d.status, d.brokerage_type,
             p.title as property_title, p.locality as property_locality,
             buyers.name as buyer_name, sellers.name as seller_name
      FROM deals d
      LEFT JOIN properties p ON d.property_id = p.id
      LEFT JOIN customers AS buyers ON d.buyer_id = buyers.id
      LEFT JOIN customers AS sellers ON d.seller_id = sellers.id
      ORDER BY d.deal_date DESC
      LIMIT 5
    `).all();

    // --- Top localities ---
    const top_localities = db.prepare(`
      SELECT p.locality as locality, COUNT(*) as deal_count,
             IFNULL(SUM(CAST(d.total_brokerage_amount AS REAL)), 0) as total_brokerage
      FROM deals d
      JOIN properties p ON d.property_id = p.id
      WHERE p.locality IS NOT NULL AND p.locality != ''
      GROUP BY p.locality
      ORDER BY deal_count DESC
      LIMIT 5
    `).all();

    // --- Property status breakdown ---
    const propAvailRow = db.prepare(`SELECT COUNT(*) as cnt FROM properties WHERE status = 'available'`).get();
    const propPendingRow = db.prepare(`SELECT COUNT(*) as cnt FROM properties WHERE status = 'pending'`).get();
    const propSoldRow = db.prepare(`SELECT COUNT(*) as cnt FROM properties WHERE status = 'sold'`).get();

    // --- Customer type breakdown ---
    const custBuyerRow = db.prepare(`SELECT COUNT(*) as cnt FROM customers WHERE type = 'buyer'`).get();
    const custSellerRow = db.prepare(`SELECT COUNT(*) as cnt FROM customers WHERE type = 'seller'`).get();
    const custBothRow = db.prepare(`SELECT COUNT(*) as cnt FROM customers WHERE type = 'both'`).get();

    // --- Follow-up needed (not updated in 30 days) ---
    const followup_needed = db.prepare(`
      SELECT id, name, phone, type, updated_at
      FROM customers
      WHERE updated_at < datetime('now', '-30 days')
      ORDER BY updated_at ASC
      LIMIT 5
    `).all();

    res.json({
      kpis: {
        deals_this_month: dealsThisMonthRow.cnt || 0,
        brokerage_this_month: brokerageThisMonthRow.total || 0,
        brokerage_all_time: brokerageAllTimeRow.total || 0,
        total_deals: totalDealsRow.cnt || 0,
        deals_closed: dealsClosedRow.cnt || 0,
        deals_in_negotiation: dealsNegotiationRow.cnt || 0
      },
      monthly_brokerage,
      recent_deals,
      top_localities,
      property_status_breakdown: {
        available: propAvailRow.cnt || 0,
        pending: propPendingRow.cnt || 0,
        sold: propSoldRow.cnt || 0
      },
      customer_type_breakdown: {
        buyer: custBuyerRow.cnt || 0,
        seller: custSellerRow.cnt || 0,
        both: custBothRow.cnt || 0
      },
      followup_needed
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deals/:id
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Deal not found' });
    const deal = parseDeal(row);
    const amounts = calcAmounts(deal.deal_amount, deal.buyer_brokerage_pct, deal.seller_brokerage_pct);
    res.json({ ...deal, ...amounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/deals — create
router.post('/', (req, res) => {
  const {
    property_id, buyer_id, seller_id,
    deal_amount, deal_date, status = 'in_progress',
    brokerage_type = 'both',
    buyer_brokerage_pct = 0, seller_brokerage_pct = 0,
    brokers = [], notes,
  } = req.body;

  if (!deal_amount) return res.status(400).json({ error: 'deal_amount is required' });
  if (!deal_date) return res.status(400).json({ error: 'deal_date is required' });

  const { buyer_brokerage_amount, seller_brokerage_amount, total_brokerage_amount } =
    calcAmounts(deal_amount, buyer_brokerage_pct, seller_brokerage_pct);

  const now = new Date().toISOString();

  try {
    const result = db.prepare(`
      INSERT INTO deals
        (property_id, buyer_id, seller_id, deal_amount, deal_date, status, brokerage_type,
         buyer_brokerage_pct, seller_brokerage_pct, buyer_brokerage_amount,
         seller_brokerage_amount, total_brokerage_amount, brokers, notes, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      property_id || null, buyer_id || null, seller_id || null,
      Number(deal_amount), deal_date, status, brokerage_type,
      Number(buyer_brokerage_pct), Number(seller_brokerage_pct),
      buyer_brokerage_amount, seller_brokerage_amount, total_brokerage_amount,
      JSON.stringify(brokers), notes || null,
      now, now,
    );

    const created = db.prepare('SELECT * FROM deals WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(parseDeal(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/deals/:id — update
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Deal not found' });

  const {
    property_id, buyer_id, seller_id,
    deal_amount, deal_date, status, brokerage_type,
    buyer_brokerage_pct, seller_brokerage_pct,
    brokers, notes,
  } = req.body;

  const newAmount = deal_amount !== undefined ? Number(deal_amount) : existing.deal_amount;
  const newBuyerPct = buyer_brokerage_pct !== undefined ? Number(buyer_brokerage_pct) : existing.buyer_brokerage_pct;
  const newSellerPct = seller_brokerage_pct !== undefined ? Number(seller_brokerage_pct) : existing.seller_brokerage_pct;

  const { buyer_brokerage_amount, seller_brokerage_amount, total_brokerage_amount } =
    calcAmounts(newAmount, newBuyerPct, newSellerPct);

  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE deals SET
        property_id = ?, buyer_id = ?, seller_id = ?,
        deal_amount = ?, deal_date = ?, status = ?, brokerage_type = ?,
        buyer_brokerage_pct = ?, seller_brokerage_pct = ?,
        buyer_brokerage_amount = ?, seller_brokerage_amount = ?, total_brokerage_amount = ?,
        brokers = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      property_id !== undefined ? property_id : existing.property_id,
      buyer_id !== undefined ? buyer_id : existing.buyer_id,
      seller_id !== undefined ? seller_id : existing.seller_id,
      newAmount,
      deal_date !== undefined ? deal_date : existing.deal_date,
      status !== undefined ? status : existing.status,
      brokerage_type !== undefined ? brokerage_type : existing.brokerage_type,
      newBuyerPct,
      newSellerPct,
      buyer_brokerage_amount,
      seller_brokerage_amount,
      total_brokerage_amount,
      brokers !== undefined ? JSON.stringify(brokers) : existing.brokers,
      notes !== undefined ? notes : existing.notes,
      now,
      req.params.id,
    );

    const updated = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
    res.json(parseDeal(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/deals/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM deals WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Deal not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../database');

function safeParseArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Scoring algorithm — 100 pts total
 *   Budget       30 pts
 *   Location     25 pts
 *   Property type 20 pts
 *   BHK          15 pts
 *   Amenities    10 pts
 */
function scoreProperty(buyer, property) {
  const breakdown = {
    budget: 0,
    location: 0,
    property_type: 0,
    bhk: 0,
    amenities: 0,
  };

  // Budget (30 pts)
  if (buyer.budget_max && buyer.budget_min !== null) {
    if (property.price >= buyer.budget_min && property.price <= buyer.budget_max) {
      breakdown.budget = 30;
    } else if (property.price > buyer.budget_max && property.price <= buyer.budget_max * 1.2) {
      breakdown.budget = 15; // within 20% above max
    }
  } else if (buyer.budget_max && property.price <= buyer.budget_max) {
    breakdown.budget = 30;
  }

  // Location (25 pts)
  const preferredLocations = buyer.preferred_locations || [];
  if (preferredLocations.length > 0) {
    const matched = preferredLocations.some(
      loc => property.locality && property.locality.toLowerCase().includes(loc.toLowerCase()),
    );
    if (matched) breakdown.location = 25;
  }

  // Property type (20 pts)
  if (buyer.preferred_property_type && buyer.preferred_property_type === property.type) {
    breakdown.property_type = 20;
  } else if (!buyer.preferred_property_type) {
    // No preference set — give partial credit
    breakdown.property_type = 10;
  }

  // BHK (15 pts)
  const preferredBhk = buyer.preferred_bhk || [];
  if (preferredBhk.length > 0 && property.bhk) {
    const bhkNums = preferredBhk.map(b => Number(b));
    if (bhkNums.includes(Number(property.bhk))) {
      breakdown.bhk = 15;
    }
  } else if (preferredBhk.length === 0) {
    breakdown.bhk = 8; // No preference — partial
  }

  // Amenities (10 pts)
  const wishlist = buyer.amenities_wishlist || [];
  const propAmenities = safeParseArray(typeof property.amenities === 'string' ? property.amenities : JSON.stringify(property.amenities));
  if (wishlist.length > 0 && propAmenities.length > 0) {
    const matched = wishlist.filter(a =>
      propAmenities.some(pa => pa.toLowerCase() === a.toLowerCase()),
    );
    breakdown.amenities = Math.round((matched.length / wishlist.length) * 10);
  } else if (wishlist.length === 0) {
    breakdown.amenities = 5; // No preference
  }

  const score = Object.values(breakdown).reduce((s, v) => s + v, 0);
  const percentage = score / 100;

  return { score, percentage, breakdown };
}

function generateInsight(buyer, property, percentage, breakdown) {
  const pct = Math.round(percentage * 100);
  const parts = [];

  // Budget insight
  if (breakdown.budget === 30) {
    parts.push('fits your budget perfectly');
  } else if (breakdown.budget === 15) {
    parts.push('is slightly above your budget but within reach');
  } else if (breakdown.budget === 0 && buyer.budget_max) {
    parts.push('exceeds your budget range');
  }

  // Location insight
  if (breakdown.location === 25) {
    parts.push(`is in your preferred area (${property.locality})`);
  }

  // Type insight
  if (breakdown.property_type === 20) {
    parts.push('matches your preferred property type');
  }

  // BHK insight
  if (breakdown.bhk === 15) {
    parts.push(`has the ${property.bhk}BHK configuration you want`);
  }

  let summary = '';
  if (parts.length > 0) {
    summary = ` It ${parts.join(', ')}.`;
  }

  const matchLevel = pct >= 80 ? 'excellent' : pct >= 50 ? 'good' : 'partial';

  return `This ${property.bhk ? property.bhk + 'BHK ' : ''}${property.type} in ${property.locality} is a ${matchLevel} match at ${pct}% compatibility.${summary}`;
}

// POST /api/matchmaking/find
router.post('/find', (req, res) => {
  const { buyer_id } = req.body;

  if (!buyer_id) return res.status(400).json({ error: 'buyer_id is required' });

  try {
    const buyerRow = db.prepare('SELECT * FROM customers WHERE id = ?').get(buyer_id);
    if (!buyerRow) return res.status(404).json({ error: 'Buyer not found' });

    // Ensure buyer has buyer or both type
    if (buyerRow.type === 'seller') {
      return res.status(400).json({ error: 'Customer is not a buyer' });
    }

    const buyer = {
      ...buyerRow,
      preferred_locations: safeParseArray(buyerRow.preferred_locations),
      preferred_bhk: safeParseArray(buyerRow.preferred_bhk),
      amenities_wishlist: safeParseArray(buyerRow.amenities_wishlist),
    };

    const properties = db.prepare(`SELECT * FROM properties WHERE status = 'available'`).all();

    const results = [];
    for (const prop of properties) {
      const property = {
        ...prop,
        amenities: safeParseArray(prop.amenities),
      };

      const { score, percentage, breakdown } = scoreProperty(buyer, property);

      // Filter below 20% threshold
      if (percentage < 0.20) continue;

      const insight = generateInsight(buyer, property, percentage, breakdown);

      results.push({
        property,
        score,
        percentage: Math.round(percentage * 100),
        breakdown,
        insight,
      });
    }

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

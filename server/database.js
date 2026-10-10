const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'gharsetu.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// ─── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL,
    phone               TEXT,
    email               TEXT,
    type                TEXT NOT NULL DEFAULT 'buyer',  -- buyer | seller | both
    status              TEXT NOT NULL DEFAULT 'active', -- active | inactive | closed
    budget_min          REAL,
    budget_max          REAL,
    preferred_locations TEXT,   -- JSON array of strings
    preferred_bhk       TEXT,   -- JSON array of numbers
    amenities_wishlist  TEXT,   -- JSON array of strings
    notes               TEXT,
    follow_up_date      TEXT,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS properties (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    type          TEXT NOT NULL DEFAULT 'apartment', -- apartment | villa | plot | commercial | independent_house
    status        TEXT NOT NULL DEFAULT 'available', -- available | pending | sold
    locality      TEXT NOT NULL,
    city          TEXT,
    price         REAL NOT NULL,
    area_sqft     REAL,
    bhk           INTEGER,
    floor         INTEGER,
    total_floors  INTEGER,
    parking       INTEGER DEFAULT 0,
    amenities     TEXT,   -- JSON array of strings
    description   TEXT,
    seller_id     INTEGER REFERENCES customers(id),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS deals (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id               INTEGER REFERENCES properties(id),
    buyer_id                  INTEGER REFERENCES customers(id),
    seller_id                 INTEGER REFERENCES customers(id),
    deal_amount               REAL NOT NULL,
    deal_date                 TEXT NOT NULL,
    status                    TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | completed | cancelled
    brokerage_type            TEXT NOT NULL DEFAULT 'both',        -- buyer_only | seller_only | both | split
    buyer_brokerage_pct       REAL DEFAULT 0,
    seller_brokerage_pct      REAL DEFAULT 0,
    buyer_brokerage_amount    REAL DEFAULT 0,
    seller_brokerage_amount   REAL DEFAULT 0,
    total_brokerage_amount    REAL DEFAULT 0,
    brokers                   TEXT,   -- JSON array: [{name, share_pct, amount}]
    notes                     TEXT,
    created_at                TEXT NOT NULL,
    updated_at                TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

// ─── Seeds ───────────────────────────────────────────────────────────────────

const now = new Date().toISOString();

// Settings defaults
const defaultSettings = [
  ['company_name',                'ONC GHARSETU Realty'],
  ['company_address',             '12, Business Park, Sector 15, Navi Mumbai - 400703'],
  ['company_phone',               '+91 98765 43210'],
  ['default_buyer_brokerage_pct', '2'],
  ['default_seller_brokerage_pct','2'],
  ['currency_symbol',             '₹'],
];

const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings(key, value) VALUES(?, ?)`);
for (const [key, value] of defaultSettings) {
  insertSetting.run(key, value);
}

// Customers seed
const customerCount = db.prepare('SELECT COUNT(*) as cnt FROM customers').get();
if (customerCount.cnt === 0) {
  const insertCustomer = db.prepare(`
    INSERT INTO customers
      (name, phone, email, type, status, budget_min, budget_max,
       preferred_locations, preferred_bhk, amenities_wishlist, notes, created_at, updated_at)
    VALUES
      (@name, @phone, @email, @type, @status, @budget_min, @budget_max,
       @preferred_locations, @preferred_bhk, @amenities_wishlist, @notes, @created_at, @updated_at)
  `);

  const customers = [
    {
      name: 'Ramesh Sharma',
      phone: '9876543210',
      email: 'ramesh.sharma@email.com',
      type: 'buyer',
      status: 'active',
      budget_min: 5000000,
      budget_max: 8000000,
      preferred_locations: JSON.stringify(['Andheri', 'Borivali', 'Kandivali']),
      preferred_bhk: JSON.stringify([2, 3]),
      amenities_wishlist: JSON.stringify(['parking', 'gym', 'security']),
      notes: 'Looking for a 2-3 BHK in western suburbs',
      created_at: now,
      updated_at: now,
    },
    {
      name: 'Priya Mehta',
      phone: '9876543211',
      email: 'priya.mehta@email.com',
      type: 'seller',
      status: 'active',
      budget_min: null,
      budget_max: null,
      preferred_locations: JSON.stringify([]),
      preferred_bhk: JSON.stringify([]),
      amenities_wishlist: JSON.stringify([]),
      notes: 'Has 2BHK in Andheri ready to sell',
      created_at: now,
      updated_at: now,
    },
    {
      name: 'Suresh Patel',
      phone: '9876543212',
      email: 'suresh.patel@email.com',
      type: 'both',
      status: 'active',
      budget_min: 3000000,
      budget_max: 6000000,
      preferred_locations: JSON.stringify(['Thane', 'Mulund', 'Bhandup']),
      preferred_bhk: JSON.stringify([2]),
      amenities_wishlist: JSON.stringify(['parking', 'clubhouse']),
      notes: 'Wants to upgrade; will sell current 1BHK',
      created_at: now,
      updated_at: now,
    },
    {
      name: 'Anjali Singh',
      phone: '9876543213',
      email: 'anjali.singh@email.com',
      type: 'buyer',
      status: 'active',
      budget_min: 10000000,
      budget_max: 15000000,
      preferred_locations: JSON.stringify(['Bandra', 'Juhu', 'Versova']),
      preferred_bhk: JSON.stringify([3, 4]),
      amenities_wishlist: JSON.stringify(['swimming_pool', 'gym', 'parking', 'security', 'garden']),
      notes: 'High-end buyer, sea view preferred',
      created_at: now,
      updated_at: now,
    },
    {
      name: 'Vijay Kumar',
      phone: '9876543214',
      email: 'vijay.kumar@email.com',
      type: 'both',
      status: 'active',
      budget_min: 7000000,
      budget_max: 12000000,
      preferred_locations: JSON.stringify(['Powai', 'Vikhroli', 'Kanjurmarg']),
      preferred_bhk: JSON.stringify([3]),
      amenities_wishlist: JSON.stringify(['parking', 'gym', 'security', 'clubhouse']),
      notes: 'IT professional, prefers Powai/Hiranandani area',
      created_at: now,
      updated_at: now,
    },
  ];

  for (const c of customers) {
    insertCustomer.run(c);
  }

  // Properties seed
  const insertProperty = db.prepare(`
    INSERT INTO properties
      (title, type, status, locality, city, price, area_sqft, bhk, floor,
       total_floors, parking, amenities, description, seller_id, created_at, updated_at)
    VALUES
      (@title, @type, @status, @locality, @city, @price, @area_sqft, @bhk, @floor,
       @total_floors, @parking, @amenities, @description, @seller_id, @created_at, @updated_at)
  `);

  const properties = [
    {
      title: 'Spacious 2BHK in Andheri West',
      type: 'apartment',
      status: 'available',
      locality: 'Andheri',
      city: 'Mumbai',
      price: 7500000,
      area_sqft: 950,
      bhk: 2,
      floor: 4,
      total_floors: 10,
      parking: 1,
      amenities: JSON.stringify(['parking', 'security', 'gym']),
      description: 'Well-maintained 2BHK in prime Andheri West location. Near metro station.',
      seller_id: 2,
      created_at: now,
      updated_at: now,
    },
    {
      title: 'Modern 3BHK Villa in Borivali',
      type: 'villa',
      status: 'available',
      locality: 'Borivali',
      city: 'Mumbai',
      price: 9500000,
      area_sqft: 1400,
      bhk: 3,
      floor: 1,
      total_floors: 2,
      parking: 2,
      amenities: JSON.stringify(['parking', 'garden', 'security']),
      description: 'Beautiful independent villa with private garden in Borivali East.',
      seller_id: null,
      created_at: now,
      updated_at: now,
    },
    {
      title: 'Affordable 2BHK in Thane West',
      type: 'apartment',
      status: 'available',
      locality: 'Thane',
      city: 'Thane',
      price: 5500000,
      area_sqft: 850,
      bhk: 2,
      floor: 7,
      total_floors: 14,
      parking: 1,
      amenities: JSON.stringify(['parking', 'clubhouse', 'security']),
      description: 'Affordable 2BHK in a well-managed society in Thane West.',
      seller_id: null,
      created_at: now,
      updated_at: now,
    },
    {
      title: 'Luxury 3BHK Sea View in Bandra',
      type: 'apartment',
      status: 'available',
      locality: 'Bandra',
      city: 'Mumbai',
      price: 28000000,
      area_sqft: 1800,
      bhk: 3,
      floor: 12,
      total_floors: 20,
      parking: 2,
      amenities: JSON.stringify(['swimming_pool', 'gym', 'parking', 'security', 'clubhouse']),
      description: 'Luxury apartment with stunning sea view in Bandra West. Premium amenities.',
      seller_id: null,
      created_at: now,
      updated_at: now,
    },
    {
      title: 'IT Hub 3BHK in Powai',
      type: 'apartment',
      status: 'available',
      locality: 'Powai',
      city: 'Mumbai',
      price: 11000000,
      area_sqft: 1200,
      bhk: 3,
      floor: 9,
      total_floors: 18,
      parking: 1,
      amenities: JSON.stringify(['parking', 'gym', 'security', 'clubhouse', 'children_play_area']),
      description: 'Premium 3BHK in Hiranandani Powai. Walking distance from IT parks.',
      seller_id: null,
      created_at: now,
      updated_at: now,
    },
  ];

  for (const p of properties) {
    insertProperty.run(p);
  }

  // Deals seed
  const insertDeal = db.prepare(`
    INSERT INTO deals
      (property_id, buyer_id, seller_id, deal_amount, deal_date, status, brokerage_type,
       buyer_brokerage_pct, seller_brokerage_pct, buyer_brokerage_amount,
       seller_brokerage_amount, total_brokerage_amount, brokers, notes, created_at, updated_at)
    VALUES
      (@property_id, @buyer_id, @seller_id, @deal_amount, @deal_date, @status, @brokerage_type,
       @buyer_brokerage_pct, @seller_brokerage_pct, @buyer_brokerage_amount,
       @seller_brokerage_amount, @total_brokerage_amount, @brokers, @notes, @created_at, @updated_at)
  `);

  const deals = [
    {
      property_id: 3,
      buyer_id: 3,
      seller_id: null,
      deal_amount: 5400000,
      deal_date: '2024-11-15',
      status: 'completed',
      brokerage_type: 'both',
      buyer_brokerage_pct: 2,
      seller_brokerage_pct: 2,
      buyer_brokerage_amount: 108000,
      seller_brokerage_amount: 108000,
      total_brokerage_amount: 216000,
      brokers: JSON.stringify([]),
      notes: 'Smooth deal. Handover on 20 Nov.',
      created_at: now,
      updated_at: now,
    },
    {
      property_id: 1,
      buyer_id: 1,
      seller_id: 2,
      deal_amount: 7400000,
      deal_date: '2024-12-05',
      status: 'in_progress',
      brokerage_type: 'split',
      buyer_brokerage_pct: 2,
      seller_brokerage_pct: 1.5,
      buyer_brokerage_amount: 148000,
      seller_brokerage_amount: 111000,
      total_brokerage_amount: 259000,
      brokers: JSON.stringify([
        { name: 'Rajesh Broker', share_pct: 50, amount: 129500 },
        { name: 'Sunil Agency', share_pct: 50, amount: 129500 },
      ]),
      notes: 'Co-broker deal. Documents under review.',
      created_at: now,
      updated_at: now,
    },
  ];

  for (const d of deals) {
    insertDeal.run(d);
  }
}

module.exports = db;

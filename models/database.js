const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'flashsuite.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Links Table
  db.run(`CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_url TEXT NOT NULL,
    short_code TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Analytics Table
  db.run(`CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    FOREIGN KEY(link_id) REFERENCES links(id) ON DELETE CASCADE
  )`);

  // Admin / User Table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'user',
    stripe_customer_id TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Blogs Table
  db.run(`CREATE TABLE IF NOT EXISTS blogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    status TEXT DEFAULT 'published',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Programmatic Pages Table for pSEO
  db.run(`CREATE TABLE IF NOT EXISTS programmatic_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    keyword TEXT NOT NULL,
    target_tool TEXT NOT NULL,
    h1_title TEXT NOT NULL,
    intro_p TEXT NOT NULL,
    step_1 TEXT NOT NULL,
    step_2 TEXT NOT NULL,
    step_3 TEXT NOT NULL,
    faq_1_q TEXT,
    faq_1_a TEXT,
    faq_2_q TEXT,
    faq_2_a TEXT,
    faq_3_q TEXT,
    faq_3_a TEXT,
    status TEXT DEFAULT 'active',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // --- SaaS Subscription Architecture ---

  // Plans Table
  db.run(`CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    monthly_price INTEGER DEFAULT 0,
    yearly_price INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    badge_label TEXT,
    is_popular BOOLEAN DEFAULT 0,
    status TEXT DEFAULT 'active',
    sort_order INTEGER DEFAULT 0,
    stripe_product_id TEXT,
    stripe_price_id TEXT
  )`);

  // Features Table
  db.run(`CREATE TABLE IF NOT EXISTS features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT
  )`);

  // PlanFeatures mapping
  db.run(`CREATE TABLE IF NOT EXISTS plan_features (
    plan_id INTEGER,
    feature_id INTEGER,
    FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    FOREIGN KEY(feature_id) REFERENCES features(id) ON DELETE CASCADE,
    PRIMARY KEY (plan_id, feature_id)
  )`);

  // Tools Table
  db.run(`CREATE TABLE IF NOT EXISTS tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    status TEXT DEFAULT 'published'
  )`);

  // PlanTools mapping
  db.run(`CREATE TABLE IF NOT EXISTS plan_tools (
    plan_id INTEGER,
    tool_id INTEGER,
    FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    FOREIGN KEY(tool_id) REFERENCES tools(id) ON DELETE CASCADE,
    PRIMARY KEY (plan_id, tool_id)
  )`);

  // UserSubscriptions
  db.run(`CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    plan_id INTEGER,
    stripe_subscription_id TEXT,
    status TEXT DEFAULT 'active',
    current_period_end DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE SET NULL
  )`);

  // Password Resets
  db.run(`CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    expires_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
});

module.exports = db;
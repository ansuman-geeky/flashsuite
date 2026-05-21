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

  // Admin Table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
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
});

module.exports = db;
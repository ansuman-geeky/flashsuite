const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'flashsuite.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Add google_id column to users
    db.run("ALTER TABLE users ADD COLUMN google_id TEXT", (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error("Error adding google_id:", err);
        } else {
            console.log("google_id column ensured in users table.");
        }
    });
});

db.close();

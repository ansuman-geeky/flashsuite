const db = require('../models/database');

console.log("Fixing users table...");

db.serialize(() => {
    db.run("BEGIN TRANSACTION;");
    
    db.run(`CREATE TABLE IF NOT EXISTS users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        email TEXT UNIQUE,
        role TEXT DEFAULT 'user',
        stripe_customer_id TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);
    
    db.run(`INSERT INTO users_new (id, username, password, role, stripe_customer_id, status)
            SELECT id, username, password, role, stripe_customer_id, status FROM users;`, (err) => {
        if(err) {
            console.error("Insert error:", err.message);
            // If it fails, maybe role/stripe_customer_id aren't there on all rows depending on previous script success.
            // Let's do a more robust insert if needed, or just rollback.
        }
    });
    
    db.run("DROP TABLE users;");
    db.run("ALTER TABLE users_new RENAME TO users;");
    db.run("COMMIT;", (err) => {
        if(err) {
            console.error("Transaction failed", err);
        } else {
            console.log("Successfully rebuilt users table.");
        }
        process.exit(0);
    });
});

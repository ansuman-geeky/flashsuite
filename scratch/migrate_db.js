const db = require('../models/database');

console.log("Running migrations...");

const alterQueries = [
    "ALTER TABLE users ADD COLUMN email TEXT UNIQUE;",
    "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';",
    "ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;",
    "ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';",
    "ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;"
];

db.serialize(() => {
    let completed = 0;
    
    alterQueries.forEach(query => {
        db.run(query, (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log("Column already exists, skipping...");
                } else {
                    console.error("Migration error on query:", query, err.message);
                }
            } else {
                console.log("Successfully ran:", query);
            }
            
            completed++;
            if (completed === alterQueries.length) {
                console.log("Migration script finished successfully.");
                process.exit(0);
            }
        });
    });
});

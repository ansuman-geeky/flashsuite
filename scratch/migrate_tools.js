const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'flashsuite.db');

const db = new sqlite3.Database(dbPath);

console.log("Starting DB Migration...");

db.serialize(() => {
    // We add the columns one by one and catch errors in case they already exist
    const columns = [
        "ALTER TABLE tools ADD COLUMN is_premium BOOLEAN DEFAULT 0",
        "ALTER TABLE tools ADD COLUMN visibility TEXT DEFAULT 'public'",
        "ALTER TABLE tools ADD COLUMN sort_order INTEGER DEFAULT 0",
        "ALTER TABLE tools ADD COLUMN is_featured BOOLEAN DEFAULT 0"
    ];

    let count = 0;
    
    columns.forEach(query => {
        db.run(query, (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log(`Column already exists, skipping: ${query}`);
                } else {
                    console.error("Error running query:", err.message);
                }
            } else {
                console.log(`Successfully executed: ${query}`);
            }
            count++;
            
            if (count === columns.length) {
                console.log("Migration finished.");
                db.close();
            }
        });
    });
});

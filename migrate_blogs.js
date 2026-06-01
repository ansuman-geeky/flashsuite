const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'flashsuite.db');
const db = new sqlite3.Database(dbPath);

const slugify = (text) => text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text

db.serialize(() => {
    // 1. Add the slug column (ignore error if it already exists)
    db.run("ALTER TABLE blogs ADD COLUMN slug TEXT", (err) => {
        if (err && !err.message.includes("duplicate column name")) {
            console.error("Error adding column:", err.message);
        } else {
            console.log("Column 'slug' added or already exists.");
        }
        
        // 2. Backfill existing blogs
        db.all("SELECT id, title FROM blogs WHERE slug IS NULL OR slug = ''", (err, rows) => {
            if (err) {
                console.error("Error fetching blogs:", err.message);
                return;
            }
            if (!rows || rows.length === 0) {
                console.log("No blogs to backfill.");
                return;
            }
            
            const stmt = db.prepare("UPDATE blogs SET slug = ? WHERE id = ?");
            rows.forEach(row => {
                let slug = slugify(row.title);
                if (!slug) slug = 'blog-post-' + row.id;
                stmt.run([slug, row.id], (err) => {
                    if (err) {
                        console.error(`Error updating blog ${row.id}:`, err.message);
                        // If it's a duplicate slug error, append the ID to make it unique
                        if (err.message.includes('UNIQUE constraint failed')) {
                            stmt.run([slug + '-' + row.id, row.id]);
                        }
                    } else {
                        console.log(`Updated blog ${row.id} with slug: ${slug}`);
                    }
                });
            });
            stmt.finalize();
        });
    });
});

const db = require('./models/database');
const bcrypt = require('bcryptjs');

async function seed() {
    const hashedPass = await bcrypt.hash('admin123', 10);

    db.serialize(() => {
        // Create Admin User
        db.run("INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, 'admin')", ['admin', hashedPass]);
        db.run("UPDATE users SET role = 'admin' WHERE username = 'admin'");

        // Create Dummy Links
        const stmt = db.prepare("INSERT OR IGNORE INTO links (original_url, short_code) VALUES (?, ?)");
        stmt.run("https://google.com", "goog12");
        stmt.run("https://github.com/microsoft", "git456");
        stmt.run("https://news.ycombinator.com", "hacknews");
        stmt.run("https://example.com/very/long/path/to/some/page", "exmpl1");
        stmt.finalize();

        // Create Dummy Analytics (Last 7 days, various referrers)
        const referrers = ['Google', 'Twitter', 'LinkedIn', 'Direct', 'Facebook', 'GitHub'];
        
        for (let i = 0; i < 150; i++) {
            // Random date within last 7 days
            const daysAgo = Math.floor(Math.random() * 7);
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            const timestamp = date.toISOString().replace('T', ' ').substring(0, 19);
            
            const linkId = Math.floor(Math.random() * 4) + 1;
            const referrer = referrers[Math.floor(Math.random() * referrers.length)];
            
            db.run("INSERT INTO analytics (link_id, timestamp, referrer) VALUES (?, ?, ?)",
                [linkId, timestamp, referrer]);
        }
    });
    console.log("Seeding complete. Beautiful dummy data generated!");
    console.log("Admin login: admin / Pass: admin123");
}

seed();
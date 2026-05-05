const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { nanoid } = require('nanoid');
const bcrypt = require('bcryptjs');

// Middleware to protect admin routes
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
}

// Public: Shorten URL
router.post('/shorten', (req, res) => {
    const { url } = req.body;
    const shortCode = nanoid(6); // Unique 6-char slug

    db.run("INSERT INTO links (original_url, short_code) VALUES (?, ?)",
        [url, shortCode],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ short_code: shortCode });
        }
    );
});

// Admin: Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
        
        const valid = await bcrypt.compare(password, user.password);
        if (valid) {
            req.session.userId = user.id;
            res.json({ success: true });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// Admin: Get Analytics & Links
router.get('/admin/stats', isAuthenticated, (req, res) => {
    const stats = { totalClicks: 0, links: [], chartData: { labels: [], values: [] }, referrerData: { labels: [], values: [] } };

    db.all("SELECT * FROM links ORDER BY created_at DESC", [], (err, links) => {
        stats.links = links;
        db.get("SELECT COUNT(*) as count FROM analytics", [], (err, row) => {
            stats.totalClicks = row.count;

            db.all("SELECT date(timestamp) as date, COUNT(*) as count FROM analytics GROUP BY date ORDER BY date ASC LIMIT 7", [], (err, rows) => {
                stats.chartData.labels = rows.map(r => r.date);
                stats.chartData.values = rows.map(r => r.count);
                
                db.all("SELECT referrer, COUNT(*) as count FROM analytics GROUP BY referrer ORDER BY count DESC LIMIT 5", [], (err, refRows) => {
                    stats.referrerData.labels = refRows.map(r => r.referrer || 'Direct');
                    stats.referrerData.values = refRows.map(r => r.count);
                    res.json(stats);
                });
            });
        });
    });
});

// Admin: Delete Link
router.delete('/links/:id', isAuthenticated, (req, res) => {
    db.run("DELETE FROM links WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).send();
        res.status(204).send();
    });
});

// Admin: Edit Link
router.put('/links/:id', isAuthenticated, (req, res) => {
    db.run("UPDATE links SET original_url = ? WHERE id = ?", [req.body.url, req.params.id], (err) => {
        if (err) return res.status(500).send();
        res.status(200).send();
    });
});

// Auth: Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.status(200).send();
});

// Admin: Create Blog
router.post('/admin/blogs', isAuthenticated, (req, res) => {
    const { title, content, status } = req.body;
    db.run("INSERT INTO blogs (title, content, status) VALUES (?, ?, ?)",
        [title, content, status || 'published'],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Admin: Update Blog
router.put('/admin/blogs/:id', isAuthenticated, (req, res) => {
    const { title, content, status } = req.body;
    db.run("UPDATE blogs SET title = ?, content = ?, status = ? WHERE id = ?",
        [title, content, status, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(200).send();
        }
    );
});

// Admin: Get all Blogs
router.get('/admin/blogs', isAuthenticated, (req, res) => {
    db.all("SELECT * FROM blogs ORDER BY created_at DESC", [], (err, blogs) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(blogs);
    });
});

// Admin: Delete Blog
router.delete('/admin/blogs/:id', isAuthenticated, (req, res) => {
    db.run("DELETE FROM blogs WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).send();
        res.status(204).send();
    });
});

// Public: Get published blogs
router.get('/blogs', (req, res) => {
    db.all("SELECT * FROM blogs WHERE status = 'published' ORDER BY created_at DESC", [], (err, blogs) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(blogs);
    });
});

// Public: Get single published blog
router.get('/blogs/:id', (req, res) => {
    db.get("SELECT * FROM blogs WHERE id = ? AND status = 'published'", [req.params.id], (err, blog) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!blog) return res.status(404).json({ error: 'Blog not found' });
        res.json(blog);
// Admin: Update Credentials
router.put('/admin/credentials', isAuthenticated, async (req, res) => {
    const { username, password } = req.body;
    try {
        let updates = [];
        let params = [];
        if (username) {
            updates.push("username = ?");
            params.push(username);
        }
        if (password) {
            const hash = await bcrypt.hash(password, 10);
            updates.push("password = ?");
            params.push(hash);
        }
        
        if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
        
        params.push(req.session.userId);
        
        db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: "Username already exists" });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Clear Analytics
router.delete('/admin/analytics', isAuthenticated, (req, res) => {
    db.run("DELETE FROM analytics", [], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

module.exports = router;
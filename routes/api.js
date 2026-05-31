const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { nanoid } = require('nanoid');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
    message: { error: 'Too many authentication attempts from this IP, please try again after 15 minutes' }
});

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
    const shortCode = nanoid(6);

    db.run("INSERT INTO links (original_url, short_code) VALUES (?, ?)",
        [url, shortCode],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ short_code: shortCode });
        }
    );
});

// Admin: Login (DEDICATED)
router.post('/admin/login', authLimiter, (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND role = 'admin'", [username], async (err, user) => {
        if (err || !user || !user.password) return res.status(401).json({ error: 'Invalid admin credentials' });

        try {
            const valid = await bcrypt.compare(password, user.password);
            if (valid) {
                req.session.userId = user.id;
                req.session.role = user.role;
                res.json({ success: true, role: user.role });
            } else {
                res.status(401).json({ error: 'Invalid admin credentials' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});

// User: Login
router.post('/login', authLimiter, (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err || !user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });

        // Reject admins trying to login via the user portal
        if (user.role === 'admin') {
            return res.status(403).json({ error: 'Admin access restricted. Please use the admin login portal.' });
        }

        try {
            const valid = await bcrypt.compare(password, user.password);
            if (valid) {
                req.session.userId = user.id;
                req.session.role = user.role;
                res.json({ success: true, role: user.role });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Public: Sign Up
router.post('/signup', authLimiter, async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
        return res.status(400).json({ error: 'Username, password, and email are required' });
    }
    
    try {
        const hash = await bcrypt.hash(password, 10);
        db.run("INSERT INTO users (username, password, email) VALUES (?, ?, ?)", [username, hash, email], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username or email already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            const newUserId = this.lastID;
            
            // Assign default Free Plan (assuming plan_id = 1 is Free Tier)
            db.run("INSERT INTO user_subscriptions (user_id, plan_id, status) VALUES (?, 1, 'active')", [newUserId], (subErr) => {
                if (subErr) console.error("Failed to assign free plan:", subErr);
                
                // Automatically log them in
                req.session.userId = newUserId;
                req.session.role = 'user'; // Ensure role is in session
                
                res.json({ success: true, role: 'user' });
            });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mock: Forgot Password
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    db.get("SELECT id FROM users WHERE email = ?", [email], (err, user) => {
        if (!err && user) {
            const mockToken = require('crypto').randomBytes(20).toString('hex');
            db.run("INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+1 hour'))", [mockToken, user.id]);
            console.log(`[MOCK EMAIL] Password reset requested for ${email}. Link: http://localhost:3000/reset-password?token=${mockToken}`);
        }
        // Always return success to prevent email enumeration
        res.json({ success: true });
    });
});

// --- USER DASHBOARD APIS ---

router.get('/user/profile', isAuthenticated, (req, res) => {
    db.get("SELECT id, username, email, role, status FROM users WHERE id = ?", [req.session.userId], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    });
});

router.get('/user/subscriptions', isAuthenticated, (req, res) => {
    const query = `
        SELECT us.*, p.name as plan_name, p.badge_label 
        FROM user_subscriptions us 
        JOIN plans p ON us.plan_id = p.id 
        WHERE us.user_id = ? AND us.status = 'active'
    `;
    db.all(query, [req.session.userId], (err, subs) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(subs || []);
    });
});

// Admin: Get Analytics & Links
router.get('/admin/stats', isAuthenticated, (req, res) => {
    const stats = { totalClicks: 0, links: [], chartData: { labels: [], values: [] }, referrerData: { labels: [], values: [] } };

    db.all("SELECT * FROM links ORDER BY created_at DESC", [], (err, links) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.links = links;

        db.get("SELECT COUNT(*) as count FROM analytics", [], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.totalClicks = row ? row.count : 0;

            db.all("SELECT date(timestamp) as date, COUNT(*) as count FROM analytics GROUP BY date ORDER BY date ASC LIMIT 7", [], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.chartData.labels = rows.map(r => r.date);
                stats.chartData.values = rows.map(r => r.count);

                db.all("SELECT referrer, COUNT(*) as count FROM analytics GROUP BY referrer ORDER BY count DESC LIMIT 5", [], (err, refRows) => {
                    if (err) return res.status(500).json({ error: err.message });
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
    if (req.session) {
        req.session.destroy();
    }
    res.status(200).send();
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Only image files are allowed!"));
    }
});

// Admin: Upload Image
router.post('/admin/upload-image', isAuthenticated, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl: imageUrl });
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
    }); // This closing brace/parenthesis pair was the primary culprit
});

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

        db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params, function (err) {
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
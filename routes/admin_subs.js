const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Middleware to protect admin routes
function isAdmin(req, res, next) {
    if (req.session && req.session.userId) {
        db.get("SELECT role FROM users WHERE id = ?", [req.session.userId], (err, row) => {
            if (row && row.role === 'admin') {
                return next();
            } else if (row && row.role === 'user') {
                // For development/testing, if they are the ONLY user, maybe make them admin? 
                // We'll strict check here. We can manually promote a user in the DB.
                return res.status(403).json({ error: 'Forbidden: Admins only' });
            } else {
                return res.status(401).json({ error: 'Unauthorized' });
            }
        });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

// --- PLANS MANAGEMENT ---

router.get('/plans', isAdmin, (req, res) => {
    db.all("SELECT * FROM plans ORDER BY sort_order ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/plans', isAdmin, (req, res) => {
    const { name, slug, description, monthly_price, yearly_price, badge_label, is_popular, status, sort_order } = req.body;
    db.run(`INSERT INTO plans (name, slug, description, monthly_price, yearly_price, badge_label, is_popular, status, sort_order) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, slug, description, monthly_price, yearly_price, badge_label, is_popular ? 1 : 0, status, sort_order],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, success: true });
        }
    );
});

router.put('/plans/:id', isAdmin, (req, res) => {
    const { name, slug, description, monthly_price, yearly_price, badge_label, is_popular, status, sort_order } = req.body;
    db.run(`UPDATE plans SET name=?, slug=?, description=?, monthly_price=?, yearly_price=?, badge_label=?, is_popular=?, status=?, sort_order=? WHERE id=?`,
        [name, slug, description, monthly_price, yearly_price, badge_label, is_popular ? 1 : 0, status, sort_order, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

router.delete('/plans/:id', isAdmin, (req, res) => {
    db.run("DELETE FROM plans WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- TOOLS MANAGEMENT ---

router.get('/tools', isAdmin, (req, res) => {
    db.all("SELECT * FROM tools ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/tools', isAdmin, (req, res) => {
    const { name, slug, is_active, is_premium, visibility, sort_order, is_featured } = req.body;
    db.run(`INSERT INTO tools (name, slug, is_active, is_premium, visibility, sort_order, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, slug, is_active ? 1 : 0, is_premium ? 1 : 0, visibility || 'public', sort_order || 0, is_featured ? 1 : 0],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, success: true });
        }
    );
});

router.put('/tools/:id', isAdmin, (req, res) => {
    const { name, slug, is_active, is_premium, visibility, sort_order, is_featured } = req.body;
    db.run(`UPDATE tools SET name=?, slug=?, is_active=?, is_premium=?, visibility=?, sort_order=?, is_featured=? WHERE id=?`,
        [name, slug, is_active ? 1 : 0, is_premium ? 1 : 0, visibility || 'public', sort_order || 0, is_featured ? 1 : 0, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

router.delete('/tools/:id', isAdmin, (req, res) => {
    db.run("DELETE FROM tools WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- PLAN-TOOL MAPPINGS ---

router.get('/plan-tools', isAdmin, (req, res) => {
    db.all("SELECT * FROM plan_tools", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/plan-tools', isAdmin, (req, res) => {
    const { plan_id, tool_id } = req.body;
    db.run(`INSERT INTO plan_tools (plan_id, tool_id) VALUES (?, ?)`,
        [plan_id, tool_id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

router.delete('/plan-tools/:plan_id/:tool_id', isAdmin, (req, res) => {
    db.run("DELETE FROM plan_tools WHERE plan_id = ? AND tool_id = ?", [req.params.plan_id, req.params.tool_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- FEATURES MANAGEMENT ---

router.get('/features', isAdmin, (req, res) => {
    db.all("SELECT * FROM features ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/features', isAdmin, (req, res) => {
    const { name, slug, description } = req.body;
    db.run(`INSERT INTO features (name, slug, description) VALUES (?, ?, ?)`,
        [name, slug, description],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, success: true });
        }
    );
});

router.put('/features/:id', isAdmin, (req, res) => {
    const { name, slug, description } = req.body;
    db.run(`UPDATE features SET name=?, slug=?, description=? WHERE id=?`,
        [name, slug, description, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

router.delete('/features/:id', isAdmin, (req, res) => {
    db.run("DELETE FROM features WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- PLAN-FEATURES MAPPINGS ---

router.get('/plan-features', isAdmin, (req, res) => {
    db.all("SELECT * FROM plan_features", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/plan-features', isAdmin, (req, res) => {
    const { plan_id, feature_id } = req.body;
    db.run(`INSERT INTO plan_features (plan_id, feature_id) VALUES (?, ?)`,
        [plan_id, feature_id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

router.delete('/plan-features/:plan_id/:feature_id', isAdmin, (req, res) => {
    db.run("DELETE FROM plan_features WHERE plan_id = ? AND feature_id = ?", [req.params.plan_id, req.params.feature_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- ANALYTICS ---
router.get('/analytics', isAdmin, (req, res) => {
    // We need: Total Subscribers, Active Subscribers, Revenue (approximate from plans if stripe webhooks aren't fully saving revenue), etc.
    const queries = {
        totalUsers: "SELECT COUNT(*) as count FROM users WHERE role = 'user'",
        activeSubscriptions: "SELECT COUNT(*) as count FROM user_subscriptions WHERE status = 'active'",
        revenue: `SELECT SUM(p.monthly_price) as mrr 
                  FROM user_subscriptions us 
                  JOIN plans p ON us.plan_id = p.id 
                  WHERE us.status = 'active'`,
        popularPlan: `SELECT p.name, COUNT(us.id) as count 
                      FROM user_subscriptions us 
                      JOIN plans p ON us.plan_id = p.id 
                      WHERE us.status = 'active'
                      GROUP BY p.id 
                      ORDER BY count DESC LIMIT 1`
    };

    let results = {};
    let completed = 0;
    const queryKeys = Object.keys(queries);

    queryKeys.forEach(key => {
        db.get(queries[key], [], (err, row) => {
            if (err) {
                console.error(err);
                results[key] = null;
            } else {
                results[key] = row;
            }
            completed++;
            if (completed === queryKeys.length) {
                res.json(results);
            }
        });
    });
});

module.exports = router;

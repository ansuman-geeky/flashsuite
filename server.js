const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./models/database');
const apiRoutes = require('./routes/api');

const app = express();
app.use(express.json());
app.use(session({
    secret: 'flashsuite-secure-key',
    resave: false,
    saveUninitialized: false
}));

// Auth Middleware
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login.html');
}

// Protect static admin files
app.get('/admin.html', isAuthenticated, (req, res, next) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static('public'));

// API Routes
app.use('/api', apiRoutes);

// Redirection Logic
app.get('/:code', (req, res) => {
    const code = req.params.code;
    db.get("SELECT * FROM links WHERE short_code = ?", [code], (err, link) => {
        if (link) {
            const ip = req.ip;
            const ua = req.headers['user-agent'];
            const ref = req.headers['referer'] || 'Direct';

            db.run("INSERT INTO analytics (link_id, ip_address, user_agent, referrer) VALUES (?, ?, ?, ?)",
                [link.id, ip, ua, ref]);

            return res.redirect(link.original_url);
        }
        res.status(404).send("Link not found");
    });
});

app.listen(3000, () => console.log('FlashSuite running at http://localhost:3000'));
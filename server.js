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

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

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

            const socialMediaDomains = ['youtube.com', 'youtu.be', 'instagram.com', 'facebook.com', 'fb.watch', 'twitter.com', 'x.com', 'tiktok.com'];
            const isSocialMedia = socialMediaDomains.some(domain => link.original_url.toLowerCase().includes(domain));
            const isMobile = /mobile|android|iphone|ipad/i.test(ua);

            if (isSocialMedia && isMobile) {
                // Serve a deep-link bridge page
                return res.send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Opening Link... | FlashSuite</title>
                        <style>
                            body { font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #F8F9FA; color: #1A2B3C; text-align: center; }
                            .card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.05); max-width: 320px; width: 90%; }
                            .logo { height: 40px; margin-bottom: 30px; }
                            h2 { margin-bottom: 10px; font-size: 1.5rem; }
                            p { color: #666; margin-bottom: 30px; line-height: 1.5; }
                            .btn { display: block; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-bottom: 15px; transition: 0.3s; }
                            .btn-primary { background: #9D1C44; color: white; }
                            .btn-outline { border: 2px solid #9D1C44; color: #9D1C44; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <img src="/flashsuite_logo.png" alt="FlashSuite" class="logo">
                            <h2>Open in App?</h2>
                            <p>For the best experience, open this link in its respective application.</p>
                            <a href="${link.original_url}" class="btn btn-primary" id="openApp">Open in App</a>
                            <a href="${link.original_url}" class="btn btn-outline" id="openBrowser">Continue in Browser</a>
                        </div>
                        <script>
                            // Attempt to trigger deep link automatically
                            window.onload = function() {
                                setTimeout(() => {
                                    window.location.href = "${link.original_url}";
                                }, 500);
                            };
                        </script>
                    </body>
                    </html>
                `);
            }

            return res.redirect(link.original_url);
        }
        res.status(404).send("Link not found");
    });
});

app.listen(3000, () => console.log('FlashSuite running at http://localhost:3000'));
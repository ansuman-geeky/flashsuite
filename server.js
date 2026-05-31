require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./models/database');
const apiRoutes = require('./routes/api');
const humanizeRoutes = require('./routes/humanize');
const adminSubsRoutes = require('./routes/admin_subs');
const stripeRoutes = require('./routes/stripe');
const compression = require('compression');

// SEO Programmatic Middlewares & Routers
const seoPrerender = require('./middleware/seo');
const seoRouter = require('./routes/seo');
const pseoRouter = require('./routes/pseo');

const app = express();
app.set('trust proxy', 1); // Essential for rate limiting behind Hostinger/Cloudflare proxies
app.use(compression());

// Apply global SEO Prerender Hook
app.use(seoPrerender);

// Apply Sitemap, Robots, and Programmatic use-case routers before wildcards
app.use(seoRouter);
app.use(pseoRouter);

// Stripe Webhook MUST be mounted before express.json to preserve raw body
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeRoutes);

app.use(express.json());
app.use(session({
    secret: 'flashsuite-secure-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours session lifetime
    }
}));

// Auth Middleware (For Users)
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login.html');
}

// Admin Authentication Middleware
function isAdminAuthenticated(req, res, next) {
    if (req.session && req.session.userId && req.session.role === 'admin') {
        return next();
    }
    res.redirect('/admin-login.html');
}

// Clean URLs Middleware: Redirect .html requests to clean URLs (keeping admin.html and admin-login.html authentication flow)
app.use((req, res, next) => {
    if (req.path === '/admin') {
        return res.redirect('/admin.html');
    }
    if (req.path.endsWith('.html') && req.path !== '/admin.html' && req.path !== '/admin-login.html') {
        const cleanPath = req.path === '/index.html' ? '/' : req.path.slice(0, -5);
        const queryIndex = req.url.indexOf('?');
        const queryString = queryIndex !== -1 ? req.url.slice(queryIndex) : '';
        return res.redirect(301, cleanPath + queryString);
    }
    next();
});

// Logging Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Explicit Root Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Protect static admin files
app.get('/admin.html', isAdminAuthenticated, (req, res, next) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve admin login file
app.get('/admin-login.html', (req, res, next) => {
    if (req.session && req.session.userId && req.session.role === 'admin') {
        return res.redirect('/admin.html');
    }
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// Redirect authenticated users away from the login page
app.get('/login', (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard.html');
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '1d' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '1d' }));

// Tool Gatekeeper Middleware
// Intercepts requests to check if they are mapped to a tool that requires a premium plan
app.use(async (req, res, next) => {
    // We only care about GET requests to potential tools (e.g. /humanize)
    if (req.method !== 'GET') return next();
    
    // Extract slug (e.g. from '/humanize' or '/humanize?q=1')
    const slug = req.path.split('/')[1];
    if (!slug) return next();

    // Check if slug is a tool
    db.get("SELECT * FROM tools WHERE slug = ? AND is_active = 1", [slug], (err, tool) => {
        if (err || !tool) return next(); // Not a tool, or not active, continue normally

        // Check which plans give access to this tool
        db.all("SELECT plan_id FROM plan_tools WHERE tool_id = ?", [tool.id], (err, mappings) => {
            if (err || !mappings || mappings.length === 0) {
                // If it's not mapped to any plan, assume it's free/public.
                return next();
            }

            // It requires a specific plan. Does the user have it?
            if (!req.session || !req.session.userId) {
                return res.redirect('/login.html'); // Not logged in
            }

            const requiredPlanIds = mappings.map(m => m.plan_id);

            db.get(`
                SELECT * FROM user_subscriptions 
                WHERE user_id = ? AND status = 'active'
                ORDER BY id DESC LIMIT 1
            `, [req.session.userId], (err, sub) => {
                if (err) return res.redirect('/pricing.html');

                if (sub && requiredPlanIds.includes(sub.plan_id)) {
                    // Access granted
                    return next();
                } else {
                    // Access denied, redirect to upgrade
                    return res.redirect('/pricing.html');
                }
            });
        });
    });
});

// Health Check
app.get('/health', (req, res) => res.status(200).send('OK'));

// API Routes
app.use('/api', apiRoutes);
app.use('/api/auth', require('./routes/auth_google'));
app.use('/api', humanizeRoutes);
app.use('/api/admin/subs', adminSubsRoutes);
app.use('/api/stripe', stripeRoutes);

// Redirection Logic
app.get('/:code', (req, res) => {
    const code = req.params.code;
    db.get("SELECT * FROM links WHERE short_code = ?", [code], (err, link) => {
        if (link) {
            const ip = req.ip || '0.0.0.0';
            const ua = req.headers['user-agent'] || '';
            const ref = req.headers['referer'] || 'Direct';
            const originalUrl = link.original_url || '';

            db.run("INSERT INTO analytics (link_id, ip_address, user_agent, referrer) VALUES (?, ?, ?, ?)",
                [link.id, ip, ua, ref]);

            const socialMediaDomains = ['youtube.com', 'youtu.be', 'instagram.com', 'facebook.com', 'fb.watch', 'twitter.com', 'x.com', 'tiktok.com'];
            const isSocialMedia = socialMediaDomains.some(domain => originalUrl.toLowerCase().includes(domain));
            const isMobile = /mobile|android|iphone|ipad/i.test(ua);

            if (isSocialMedia && isMobile && originalUrl) {
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
                                // Trigger deep link
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`FlashSuite running at http://localhost:${PORT}`);
});
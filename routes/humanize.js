const express = require('express');
const router = express.Router();
const humanizeController = require('../controllers/humanize');

// In-memory rate limiting map
const rateLimitMap = new Map();

/**
 * Simple client-side IP-based rate limiting middleware
 */
function rateLimiter(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 10; // max 10 requests per minute

    const clientData = rateLimitMap.get(ip) || { requests: [], blockedUntil: 0 };

    // Check if blocked
    if (clientData.blockedUntil > now) {
        const remainingTime = Math.ceil((clientData.blockedUntil - now) / 1000);
        return res.status(429).json({ error: `Too many requests. Please try again in ${remainingTime} seconds.` });
    }

    // Filter request timestamps older than 1 minute
    clientData.requests = clientData.requests.filter(timestamp => (now - timestamp) < windowMs);

    if (clientData.requests.length >= maxRequests) {
        clientData.blockedUntil = now + (30 * 1000); // block for 30 seconds
        rateLimitMap.set(ip, clientData);
        return res.status(429).json({ error: 'Too many requests. Rate limit exceeded. Try again in 30 seconds.' });
    }

    clientData.requests.push(now);
    rateLimitMap.set(ip, clientData);
    next();
}

/**
 * Input Sanitation Middleware
 */
function sanitizeInput(req, res, next) {
    if (req.body && typeof req.body.text === 'string') {
        // Sanitize string to prevent basic script injections
        req.body.text = req.body.text
            .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '') // strip scripts
            .replace(/<\/?[^>]+(>|$)/g, ""); // strip HTML tags
    }
    next();
}

// POST /api/humanize
router.post('/humanize', rateLimiter, sanitizeInput, humanizeController.humanize);

// POST /api/detect - LLM-powered AI text detection
router.post('/detect', rateLimiter, sanitizeInput, humanizeController.detect);

module.exports = router;

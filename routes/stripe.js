const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../models/database');

// Middleware to parse raw body for Stripe webhooks
// (Needs to be mounted in server.js before body-parser/express.json)

// 1. Create Checkout Session
router.post('/checkout', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Please log in to subscribe' });
    }

    const { plan_id, is_yearly } = req.body;

    db.get("SELECT * FROM plans WHERE id = ?", [plan_id], async (err, plan) => {
        if (err || !plan) return res.status(404).json({ error: 'Plan not found' });

        try {
            const priceCents = is_yearly ? plan.yearly_price : plan.monthly_price;
            
            // In a real app, we would look up or create the stripe_price_id
            // Here, for dynamic plans, we can use ad-hoc inline price data if we haven't synced them to Stripe,
            // or we use the pre-synced stripe_price_id from the DB.
            // Assuming dynamic inline prices for seamless testing:
            
            const sessionData = {
                payment_method_types: ['card'],
                mode: 'subscription',
                line_items: [{
                    price_data: {
                        currency: plan.currency.toLowerCase(),
                        product_data: {
                            name: plan.name,
                            description: plan.description || 'FlashSuite Subscription'
                        },
                        unit_amount: priceCents,
                        recurring: {
                            interval: is_yearly ? 'year' : 'month',
                        },
                    },
                    quantity: 1,
                }],
                metadata: {
                    user_id: req.session.userId.toString(),
                    plan_id: plan.id.toString()
                },
                success_url: `${req.headers.origin}/dashboard.html?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${req.headers.origin}/pricing.html`,
            };

            // Check if user already has a stripe_customer_id
            const user = await new Promise((resolve, reject) => {
                db.get("SELECT * FROM users WHERE id = ?", [req.session.userId], (err, row) => {
                    if (err) reject(err); else resolve(row);
                });
            });

            if (user && user.stripe_customer_id) {
                sessionData.customer = user.stripe_customer_id;
            } else if (user && user.email) {
                sessionData.customer_email = user.email;
            }

            const checkoutSession = await stripe.checkout.sessions.create(sessionData);
            res.json({ url: checkoutSession.url });

        } catch (error) {
            console.error('Stripe Error:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

// 2. Customer Portal
router.post('/portal', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.get("SELECT stripe_customer_id FROM users WHERE id = ?", [req.session.userId], async (err, user) => {
        if (err || !user || !user.stripe_customer_id) {
            return res.status(400).json({ error: 'No active subscription found.' });
        }

        try {
            const portalSession = await stripe.billingPortal.sessions.create({
                customer: user.stripe_customer_id,
                return_url: `${req.headers.origin}/dashboard.html`,
            });
            res.json({ url: portalSession.url });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

// 3. Webhook Handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        if (process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_WEBHOOK_SECRET !== 'mocked_for_now') {
            event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        } else {
            // Bypass signature check for local mocking
            event = JSON.parse(req.body.toString());
        }
    } catch (err) {
        console.error('Webhook Error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.metadata.user_id;
                const planId = session.metadata.plan_id;
                const customerId = session.customer;
                const subscriptionId = session.subscription;

                // Update user with customer ID
                db.run("UPDATE users SET stripe_customer_id = ? WHERE id = ?", [customerId, userId]);

                // Record subscription
                db.run(`INSERT INTO user_subscriptions (user_id, plan_id, stripe_subscription_id, status) 
                        VALUES (?, ?, ?, 'active')`, [userId, planId, subscriptionId]);
                break;
            }
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const subId = subscription.id;
                const status = subscription.status;
                const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

                db.run("UPDATE user_subscriptions SET status = ?, current_period_end = ? WHERE stripe_subscription_id = ?", 
                    [status, periodEnd, subId]);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                db.run("UPDATE user_subscriptions SET status = 'canceled' WHERE stripe_subscription_id = ?", [subscription.id]);
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (err) {
        console.error("Database Error handling webhook:", err);
    }

    res.json({ received: true });
});

module.exports = router;

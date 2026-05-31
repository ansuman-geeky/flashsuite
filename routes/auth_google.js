const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../models/database');
const router = express.Router();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_client_id_please_configure_in_env',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    proxy: true
  },
  function(accessToken, refreshToken, profile, cb) {
      const googleId = profile.id;
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      // create a unique username just in case
      const username = profile.displayName ? profile.displayName.replace(/\s+/g, '') + Math.floor(Math.random() * 1000) : `user_${googleId}`;

      if (!email) {
          return cb(new Error("Google account has no email attached"));
      }

      db.get("SELECT * FROM users WHERE google_id = ? OR email = ?", [googleId, email], (err, user) => {
          if (err) return cb(err);
          if (user) {
              if (!user.google_id) {
                  // Link google account to existing email
                  db.run("UPDATE users SET google_id = ? WHERE id = ?", [googleId, user.id], (updateErr) => {
                      if (updateErr) return cb(updateErr);
                      user.google_id = googleId;
                      return cb(null, user);
                  });
              } else {
                  return cb(null, user);
              }
          } else {
              // Create new user
              db.run("INSERT INTO users (username, email, google_id) VALUES (?, ?, ?)", [username, email, googleId], function(insertErr) {
                  if (insertErr) return cb(insertErr);
                  const newUserId = this.lastID;
                  
                  // Assign Free Plan
                  db.run("INSERT INTO user_subscriptions (user_id, plan_id, status) VALUES (?, 1, 'active')", [newUserId], (subErr) => {
                      if (subErr) console.error("Failed to assign free plan to google user:", subErr);
                      
                      db.get("SELECT * FROM users WHERE id = ?", [newUserId], (err2, newUser) => {
                          if (err2) return cb(err2);
                          return cb(null, newUser);
                      });
                  });
              });
          }
      });
  }
));

// Initialize passport but don't use passport.session() to keep it aligned with our manual express-session
router.use(passport.initialize());

// Route to trigger Google Auth
router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
}));

// Google Auth Callback
router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login.html?error=google_failed', session: false }),
    (req, res) => {
        // Successful authentication
        // We set the session manually to match the rest of the app's architecture
        if (req.user) {
            req.session.userId = req.user.id;
            req.session.role = req.user.role;
            
            // Save the session explicitly before redirecting
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.redirect('/login.html?error=session_failed');
                }
                // Redirect based on role
                if (req.user.role === 'admin') {
                    res.redirect('/admin.html');
                } else {
                    res.redirect('/dashboard.html');
                }
            });
        } else {
            res.redirect('/login.html?error=google_failed');
        }
    }
);

module.exports = router;

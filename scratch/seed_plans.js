const db = require('../models/database');

console.log("Seeding subscription plans and tools...");

db.serialize(() => {
    // 1. Insert Plans
    const freePlan = [
        "Free Tier", "free", "Basic access to essential tools", 0, 0, null, 0, "active", 1
    ];
    
    const proPlan = [
        "Premium Pro", "premium-pro", "Advanced features and AI integration", 900, 9000, "Most Popular", 1, "active", 2
    ];

    db.run(`INSERT INTO plans (name, slug, description, monthly_price, yearly_price, badge_label, is_popular, status, sort_order) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, freePlan);
    
    db.run(`INSERT INTO plans (name, slug, description, monthly_price, yearly_price, badge_label, is_popular, status, sort_order) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, proPlan);

    // 2. Insert Tools
    const tools = [
        ["Humanize AI", "humanize", 1],
        ["Merge PDF", "mergepdf", 1],
        ["Split PDF", "splitpdf", 1],
        ["Edit PDF", "editpdf", 1],
        ["Protect PDF", "protectpdf", 1],
        ["Unlock PDF", "unlockpdf", 1],
        ["Compress PDF", "compresspdf", 1],
        ["PDF to Image", "pdftoimage", 1],
        ["Image to PDF", "imagetopdf", 1],
        ["PDF to Word", "pdftodoc", 1],
        ["Excel to PDF", "exceltopdf", 1],
        ["Sign PDF", "signpdf", 1],
        ["Crop PDF", "croppdf", 1],
        ["URL Shortener", "urlshortener", 1],
        ["QR Generator", "qrcode", 1]
    ];

    tools.forEach(tool => {
        db.run(`INSERT INTO tools (name, slug, is_active) VALUES (?, ?, ?)`, tool);
    });

    // 3. Map Humanize AI to Premium Pro only
    // Wait until tables are populated to get IDs.
    // For simplicity, assume IDs based on insertion order:
    // plans: 1 = Free, 2 = Premium Pro
    // tools: 1 = Humanize AI
    db.run(`INSERT INTO plan_tools (plan_id, tool_id) VALUES (2, 1)`, (err) => {
        if(err) {
            console.error("Mapping error:", err.message);
        } else {
            console.log("Seeding complete.");
        }
    });
});

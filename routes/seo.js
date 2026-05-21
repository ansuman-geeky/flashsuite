const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const db = require('../models/database');

const STATIC_PAGES = [
    '',
    'pdftools',
    'mergepdf',
    'splitpdf',
    'compresspdf',
    'protectpdf',
    'unlockpdf',
    'pdftoimage',
    'imagetopdf',
    'pdftodoc',
    'croppdf',
    'editpdf',
    'about',
    'privacy',
    'terms',
    'blog'
];

// robots.txt route
router.get('/robots.txt', (req, res) => {
    res.header('Content-Type', 'text/plain');
    res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: https://flashsuite.com/sitemap.xml
`);
});

// dynamic sitemap.xml route
router.get('/sitemap.xml', (req, res) => {
    res.header('Content-Type', 'application/xml');
    res.header('Content-Encoding', 'gzip');

    db.all("SELECT category, slug, updated_at FROM programmatic_pages WHERE status = 'active'", [], (err, programmaticRows) => {
        if (err) {
            console.error("Error fetching programmatic pages for sitemap:", err);
            programmaticRows = [];
        }

        db.all("SELECT id, created_at FROM blogs WHERE status = 'published'", [], (err, blogRows) => {
            if (err) {
                console.error("Error fetching blogs for sitemap:", err);
                blogRows = [];
            }

            let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
            xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

            const domain = 'https://flashsuite.com';
            const currentDate = new Date().toISOString().split('T')[0];

            // 1. Append core static utility tool interfaces
            STATIC_PAGES.forEach(page => {
                const cleanUrl = page === '' ? '' : `/${page}`;
                xml += `  <url>\n`;
                xml += `    <loc>${domain}${cleanUrl}</loc>\n`;
                xml += `    <lastmod>${currentDate}</lastmod>\n`;
                xml += `    <changefreq>daily</changefreq>\n`;
                xml += `    <priority>${page === '' ? '1.0' : '0.8'}</priority>\n`;
                xml += `  </url>\n`;
            });

            // 2. Append dynamically registered programmatic use-case routes
            programmaticRows.forEach(row => {
                const lastMod = row.updated_at ? row.updated_at.split(' ')[0] : currentDate;
                xml += `  <url>\n`;
                xml += `    <loc>${domain}/use-cases/${row.category}/${row.slug}</loc>\n`;
                xml += `    <lastmod>${lastMod}</lastmod>\n`;
                xml += `    <changefreq>weekly</changefreq>\n`;
                xml += `    <priority>0.6</priority>\n`;
                xml += `  </url>\n`;
            });

            // 3. Append dynamic blog posts
            blogRows.forEach(row => {
                const lastMod = row.created_at ? row.created_at.split(' ')[0] : currentDate;
                xml += `  <url>\n`;
                xml += `    <loc>${domain}/post?id=${row.id}</loc>\n`;
                xml += `    <lastmod>${lastMod}</lastmod>\n`;
                xml += `    <changefreq>weekly</changefreq>\n`;
                xml += `    <priority>0.6</priority>\n`;
                xml += `  </url>\n`;
            });

            xml += `</urlset>`;

            // Compress XML with Gzip dynamically
            zlib.gzip(xml, (err, compressed) => {
                if (err) {
                    res.header('Content-Encoding', '');
                    return res.send(xml);
                }
                res.send(compressed);
            });
        });
    });
});

module.exports = router;

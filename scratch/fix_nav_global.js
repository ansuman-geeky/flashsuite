const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const publicDir = path.join(__dirname, '../public');

// Read index.html to get the exact Nav bar
const indexHtmlPath = path.join(publicDir, 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
const $index = cheerio.load(indexHtml, { recognizeSelfClosing: true });
const mainNavHtml = $index('nav').first().prop('outerHTML');

const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(publicDir, file);
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html, { recognizeSelfClosing: true });

    // Remove all existing navs and mobile headers
    $('nav').remove();
    $('header').remove(); // This handles <header class="mobile-header">
    $('.mobile-header').remove();
    $('#mobileMenuOverlay').remove();
    $('#mobileMenu').remove();
    
    // In admin.html, remove the sidebar wrapper if it's there
    if (file === 'admin.html') {
        $('aside.sidebar').remove();
        $('.sidebar-overlay').remove();
    }

    // Prepend the exact index nav to body
    $('body').prepend(mainNavHtml);

    // Make sure main has pt-20 to avoid overlap
    const main = $('main').first();
    if (main.length > 0) {
        if (!main.hasClass('pt-20')) {
            main.addClass('pt-20');
        }
    }

    fs.writeFileSync(filePath, $.html());
    console.log(`Updated nav for ${file}`);
});
console.log('Done fixing global nav bars.');

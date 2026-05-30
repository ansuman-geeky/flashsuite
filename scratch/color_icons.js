const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const filePath = path.join(__dirname, '../public/pdftools.html');
const html = fs.readFileSync(filePath, 'utf8');
const $ = cheerio.load(html, { recognizeSelfClosing: true });

const colors = [
    'bg-primary-container text-on-primary-container', // Merge
    'bg-tertiary-container text-on-tertiary-container', // Split
    'bg-error-container text-on-error-container', // Compress
    'bg-primary/20 text-primary', // Crop
    'bg-vibrant-fuchsia/20 text-vibrant-fuchsia', // Edit
    'bg-secondary-container text-on-secondary-container', // Sign
    'bg-tertiary-container text-on-tertiary-container', // Excel
    'bg-error-container text-on-error-container', // Protect
    'bg-primary/20 text-primary', // PDF to Image
    'bg-vibrant-fuchsia/20 text-vibrant-fuchsia', // Unlock
    'bg-primary-container text-on-primary-container', // Image to PDF
    'bg-tertiary-container text-on-tertiary-container' // PDF to Doc
];

$('.bento-grid a').each((i, el) => {
    const $iconDiv = $(el).find('div').first();
    // Sometimes it's inside another div (like in bento-large)
    let target = $iconDiv;
    if ($iconDiv.hasClass('relative') || $iconDiv.hasClass('z-10')) {
        target = $iconDiv.find('div').first();
    }
    
    // Remove existing bg/text classes
    const classes = target.attr('class') || '';
    const newClasses = classes.split(' ').filter(c => 
        !c.startsWith('bg-') && !c.startsWith('text-')
    ).join(' ');
    
    // Ensure w-12 h-12 rounded-xl flex items-center justify-center (or w-16 h-16)
    // we just append the colors
    const colorClass = colors[i % colors.length];
    target.attr('class', `${newClasses} ${colorClass}`.trim());
    
});

fs.writeFileSync(filePath, $.html());
console.log('pdftools.html icons colored!');

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const demoPath = path.join(__dirname, '../pdftools_demo.html');
const targetPath = path.join(__dirname, '../public/pdftools.html');

const demoHtml = fs.readFileSync(demoPath, 'utf8');
const targetHtml = fs.readFileSync(targetPath, 'utf8');

const $demo = cheerio.load(demoHtml, { recognizeSelfClosing: true });
const $target = cheerio.load(targetHtml, { recognizeSelfClosing: true });

// Extract main from demo
const newMain = $demo('main').prop('outerHTML');
$target('main').replaceWith(newMain);

// Extract styles from demo and append to target's head if not already there
const demoStyles = $demo('style').text();
$target('head').append(`<style>${demoStyles}</style>`);

// Also grab the scripts from demo (like the intersection observer) and place at bottom
const demoScripts = $demo('body > script').prop('outerHTML');
$target('body').append(demoScripts);

// Update Links in Bento Grid
$target('.bento-grid a').each((i, el) => {
    const title = $target(el).find('h3').text().toLowerCase();
    if (title.includes('merge')) $target(el).attr('href', '/mergepdf');
    else if (title.includes('split')) $target(el).attr('href', '/splitpdf');
    else if (title.includes('compress')) $target(el).attr('href', '/compresspdf');
    else if (title.includes('crop')) $target(el).attr('href', '/croppdf');
    else if (title.includes('edit')) $target(el).attr('href', '/editpdf');
    else if (title.includes('sign')) $target(el).attr('href', '/signpdf');
    else if (title.includes('excel')) $target(el).attr('href', '/exceltopdf');
    else if (title.includes('protect')) $target(el).attr('href', '/protectpdf');
    else if (title.includes('image')) $target(el).attr('href', '/pdftoimage');
});

fs.writeFileSync(targetPath, $target.html());
console.log('pdftools.html redesigned successfully with proper links!');

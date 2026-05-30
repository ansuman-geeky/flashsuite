const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const filePath = path.join(__dirname, '../public/pdftools.html');
const html = fs.readFileSync(filePath, 'utf8');
const $ = cheerio.load(html, { recognizeSelfClosing: true });

// Move PDF to Doc right after PDF Cropper
const pdfToDoc = $('a[href="/pdftodoc"]');
const cropPdf = $('a[href="/croppdf"]');

if (pdfToDoc.length && cropPdf.length) {
    cropPdf.after(pdfToDoc);
}

// Move Unlock PDF right after Protect PDF
const unlockPdf = $('a[href="/unlockpdf"]');
const protectPdf = $('a[href="/protectpdf"]');

if (unlockPdf.length && protectPdf.length) {
    protectPdf.after(unlockPdf);
}

fs.writeFileSync(filePath, $.html());
console.log('Reordered grid items successfully!');

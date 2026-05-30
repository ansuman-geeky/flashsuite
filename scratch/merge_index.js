const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const indexHtmlPath = path.join(__dirname, '../public/index.html');
const codeHtmlPath = path.join(__dirname, '../code.html');

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
const codeHtml = fs.readFileSync(codeHtmlPath, 'utf8');

const $index = cheerio.load(indexHtml);
const $code = cheerio.load(codeHtml);

// 1. We want to use $code as the base.
// 2. We need to add necessary scripts to $code's head.
const scriptsToMove = [
    'https://www.googletagmanager.com/gtag/js?id=G-3B61CKGJL7',
    'https://unpkg.com/lucide@latest',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];
$index('head script').each((i, el) => {
    if ($index(el).attr('src') && scriptsToMove.includes($index(el).attr('src'))) {
        $code('head').append($index(el).prop('outerHTML'));
    } else if ($index(el).html() && $index(el).html().includes('dataLayer')) {
        $code('head').prepend($index(el).prop('outerHTML'));
    }
});
$code('head').append('<link rel="stylesheet" href="styles.css">');

// 3. We need to preserve the result card from $index and put it into $code
// In $code, we have a hardcoded result section:
/*
<div class="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30">
<div class="flex justify-between items-center mb-4">
<span class="font-label-md text-on-surface-variant uppercase tracking-wider">Your Short Link</span>
<span class="text-vibrant-fuchsia font-label-md font-bold">New</span>
</div>
<div class="flex items-center justify-between gap-4 p-4 rounded-xl bg-white border border-outline-variant/50">
<span class="text-body-md font-medium text-deep-navy">flash.suite/vibrant-link</span>
...
*/

// Let's replace that hardcoded result box with a dynamic one matching the new design.
const dynamicResultHTML = `
<div id="resultCard" class="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30 hidden mt-6 transition-all">
    <div class="flex justify-between items-center mb-4">
        <span class="font-label-md text-on-surface-variant uppercase tracking-wider">Your Shortened Link</span>
        <span class="text-vibrant-fuchsia font-label-md font-bold">Success</span>
    </div>
    <div class="flex items-center justify-between gap-4 p-4 rounded-xl bg-white border border-outline-variant/50 flex-wrap">
        <span id="shortenedLink" class="text-body-md font-medium text-deep-navy break-all"></span>
        <div class="flex gap-2">
            <button id="copyBtn" onclick="copyLink()" class="flex items-center gap-2 px-4 py-2 hover:bg-surface-container-high rounded-lg transition-colors font-label-md"><span class="material-symbols-outlined text-[20px] text-on-surface-variant">content_copy</span> Copy</button>
            <button id="qrBtn" onclick="openQrModal(document.getElementById('shortenedLink').innerText)" class="flex items-center gap-2 px-4 py-2 bg-deep-navy text-white hover:bg-deep-navy/90 rounded-lg transition-colors font-label-md"><span class="material-symbols-outlined text-[20px]">qr_code_2</span> QR</button>
        </div>
    </div>
</div>
`;

// Find the existing result card in code.html and replace it
$code('.p-6.rounded-2xl.bg-surface-container-low').replaceWith(dynamicResultHTML);

// 4. Update the input field in code.html to have id="longUrl"
const $input = $code('input[type="text"]');
$input.attr('id', 'longUrl');
// Update the shorten button
const $button = $input.next('button');
$button.attr('id', 'actionBtn');
$button.attr('onclick', 'performAction()');
// The button has a micro-interaction in script at the bottom of code.html, we'll keep it or adapt it.

// Add the tabs into the glass card
const tabsHTML = `
<div class="flex justify-center mb-6 gap-2 bg-white/50 p-1.5 rounded-xl border border-outline-variant/20 inline-flex w-full">
    <button id="tabShorten" class="flex-1 py-2 px-4 rounded-lg font-label-md text-secondary transition-all" style="background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);" onclick="switchActionTab('shorten')">Shorten Link</button>
    <button id="tabQR" class="flex-1 py-2 px-4 rounded-lg font-label-md text-on-surface-variant hover:text-secondary transition-all" onclick="switchActionTab('qr')">Create QR Code</button>
</div>
`;
$code('.glass-card .space-y-6').before(tabsHTML);

// 5. Add the QR Modal
const qrModal = $index('#qrModal').prop('outerHTML');
$code('body').append(qrModal);

// 6. Copy over all the scripts from the end of index.html
const indexScripts = [];
$index('body > script').each((i, el) => {
    indexScripts.push($index(el).prop('outerHTML'));
});
// Remove code.html's inline script about shorten button since it conflicts with performAction()
$code('body > script').remove(); 
indexScripts.forEach(script => $code('body').append(script));

// Add the missing CSS class "hidden" to Tailwind if not present, but it's a default class so we are good.
// In the CSS of styles.css, resultCard uses .show, but we can change our JS or CSS.
// Our new dynamicResultHTML has "hidden" and we can toggle it in JS. Let's fix JS in the file.
const scriptTag = $code('script').last();
let jsCode = scriptTag.html();

// Update switchActionTab logic to handle new styles
jsCode = jsCode.replace(`tabShorten.classList.add('active');`, `
    tabShorten.style.background = 'white';
    tabShorten.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
    tabShorten.classList.replace('text-on-surface-variant', 'text-secondary');
    
    tabQR.style.background = 'transparent';
    tabQR.style.boxShadow = 'none';
    tabQR.classList.replace('text-secondary', 'text-on-surface-variant');
`);
jsCode = jsCode.replace(`tabQR.classList.add('active');`, `
    tabQR.style.background = 'white';
    tabQR.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
    tabQR.classList.replace('text-on-surface-variant', 'text-secondary');
    
    tabShorten.style.background = 'transparent';
    tabShorten.style.boxShadow = 'none';
    tabShorten.classList.replace('text-secondary', 'text-on-surface-variant');
`);
// Remove PDF tab logic since it's gone
jsCode = jsCode.replace(/tabPDF\.classList\.remove\('active'\);/g, '');
jsCode = jsCode.replace(/else if \(action === 'pdf'\) \{[\s\S]*?\}/g, '');
jsCode = jsCode.replace(/const tabPDF = document\.getElementById\('tabPDF'\);/g, '');
jsCode = jsCode.replace(/pdfQuickActions\.style\.display = 'none';/g, '');
jsCode = jsCode.replace(/const pdfQuickActions = document\.getElementById\('pdfQuickActions'\);/g, '');
// Note inputGroupContainer logic
jsCode = jsCode.replace(/inputGroupContainer\.style\.display = 'flex';/g, '');
jsCode = jsCode.replace(/inputGroupContainer\.style\.display = 'none';/g, '');
jsCode = jsCode.replace(/const inputGroupContainer = document\.getElementById\('inputGroupContainer'\);/g, '');

// Update show result card logic
jsCode = jsCode.replace(`resultCard.classList.add('show');`, `
                resultCard.classList.remove('hidden');
`);

scriptTag.html(jsCode);

fs.writeFileSync(indexHtmlPath, $code.html());
console.log('Merged index.html');

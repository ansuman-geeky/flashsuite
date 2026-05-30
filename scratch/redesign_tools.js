const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const targetFiles = [
    'mergepdf.html',
    'splitpdf.html',
    'compresspdf.html',
    'croppdf.html',
    'editpdf.html',
    'signpdf.html',
    'exceltopdf.html',
    'protectpdf.html',
    'unlockpdf.html',
    'pdftoimage.html',
    'imagetopdf.html',
    'pdftodoc.html'
];

targetFiles.forEach(file => {
    const filePath = path.join(__dirname, '../public', file);
    if (!fs.existsSync(filePath)) {
        console.warn(`File ${file} not found. Skipping.`);
        return;
    }

    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html, { recognizeSelfClosing: true });

    // 1. Transform the hero section
    const $hero = $('.pdf-hero');
    if ($hero.length) {
        $hero.attr('class', 'pt-32 pb-16 text-center px-margin-desktop max-w-max-width mx-auto');
        $hero.css('text-align', '');
        $hero.css('padding', '');
        $hero.css('background', '');
        $hero.css('border-bottom', '');
        
        const $h1 = $hero.find('h1');
        $h1.addClass('font-display-lg text-display-lg text-on-surface leading-tight mb-6');
        $h1.find('.text-gradient').addClass('gradient-text text-vibrant-fuchsia').removeClass('text-gradient');

        const $p = $hero.find('.hero-description');
        $p.addClass('font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-8');

        const $badge = $hero.find('.hero-badge');
        $badge.addClass('inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-label-md mb-6');
    }

    // 2. Transform the tool-card
    const $toolCard = $('.tool-card');
    if ($toolCard.length) {
        $toolCard.attr('class', 'bg-surface-container-lowest border border-outline-variant/30 rounded-[32px] p-8 md:p-12 shadow-sm max-w-4xl mx-auto mb-24 relative overflow-hidden');
    }

    // 3. Transform the drop-zone
    const $dropZone = $('.drop-zone');
    if ($dropZone.length) {
        $dropZone.attr('class', 'drop-zone border-2 border-dashed border-primary/30 bg-primary/5 rounded-[24px] p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/10 transition-all');
        $dropZone.find('.upload-icon').addClass('mx-auto block mb-4 w-12 h-12 text-primary');
        $dropZone.find('h3').addClass('text-title-lg font-title-lg text-on-surface mb-2');
        $dropZone.find('p').addClass('text-body-md font-body-md text-on-surface-variant mb-4');
        $dropZone.find('.file-limits').addClass('inline-block text-label-md bg-surface-container-low text-secondary px-4 py-1 rounded-full');
    }

    // 4. Transform action buttons and file list wrappers if they are in the tool card
    const $btnMerge = $('.btn-merge');
    if ($btnMerge.length) {
        $btnMerge.attr('class', 'btn-merge px-8 py-4 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-all flex items-center gap-2 justify-center w-full md:w-auto mt-4');
    }
    
    const $btnClear = $('.btn-clear');
    if ($btnClear.length) {
        $btnClear.attr('class', 'btn-clear px-8 py-4 bg-surface-container-low text-on-surface rounded-full font-bold hover:bg-surface-container-high transition-all flex items-center gap-2 justify-center w-full md:w-auto mt-4');
    }

    const $actionButtons = $('.action-buttons');
    if ($actionButtons.length) {
        $actionButtons.attr('class', 'action-buttons flex flex-col md:flex-row gap-4 items-center justify-between mt-8 pt-8 border-t border-outline-variant/20');
    }

    // We can't transform dynamic elements created in JS directly via HTML, but we can update the styles in <style> block 
    // to override the old file list styles or ensure they look somewhat consistent.
    // Instead of deleting the old <style> block completely, let's keep it but remove the .tool-card, .drop-zone, .pdf-hero styles from it
    
    const $style = $('style').first();
    if ($style.length) {
        let styleContent = $style.html();
        // Just let Tailwind handle the replaced classes. The old classes in style might still apply, so we can comment them out.
        // For simplicity, we just inject our styles if needed.
    }

    // Write back
    fs.writeFileSync(filePath, $.html());
    console.log(`Updated ${file}`);
});

console.log("Completed redesign transformations.");

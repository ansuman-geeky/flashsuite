const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const publicDir = path.join(__dirname, '../public');
const codeHtmlPath = path.join(__dirname, '../code.html');

// Read code.html
const codeHtml = fs.readFileSync(codeHtmlPath, 'utf8');
const $code = cheerio.load(codeHtml);

const newNav = $code('nav').parent().html() ? $code('nav').parent().html().match(/<nav[\s\S]*?<\/nav>/)[0] : $code('nav').prop('outerHTML');
const newFooter = $code('footer').parent().html() ? $code('footer').parent().html().match(/<footer[\s\S]*?<\/footer>/)[0] : $code('footer').prop('outerHTML');
const newBodyClasses = $code('body').attr('class');

// Extract Tailwind script and config, and custom style block
const tailwindScripts = [];
$code('head script').each((i, el) => {
    if ($code(el).attr('src') && $code(el).attr('src').includes('tailwindcss')) {
        tailwindScripts.push($code(el).parent().html().match(/<script[\s\S]*?tailwindcss[\s\S]*?<\/script>/)[0] || $code(el).prop('outerHTML'));
    } else if ($code(el).attr('id') === 'tailwind-config') {
        tailwindScripts.push($code(el).prop('outerHTML'));
    }
});
const fonts = [];
$code('head link').each((i, el) => {
    if ($code(el).attr('href') && $code(el).attr('href').includes('fonts.')) {
        fonts.push($code(el).prop('outerHTML'));
    }
});
const customStyles = $code('head style').prop('outerHTML');

const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    if (file === 'index.html') return; // We'll handle index manually because of complex logic

    const filePath = path.join(publicDir, file);
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html, { recognizeSelfClosing: true });

    // Replace Nav
    $('nav').replaceWith(newNav);

    // Replace Footer
    $('footer').replaceWith(newFooter);

    // Update body classes
    $('body').attr('class', newBodyClasses);

    // Add Tailwind + Fonts to head if not present
    const headHtml = $('head').html();
    if (!headHtml.includes('tailwindcss.com')) {
        $('head').append('\n    <!-- New Design System -->\n');
        tailwindScripts.forEach(script => $('head').append('    ' + script + '\n'));
        fonts.forEach(font => $('head').append('    ' + font + '\n'));
        if (customStyles) $('head').append('    ' + customStyles + '\n');
    }

    // Wrap main content in <main class="pt-20"> if not already wrapped
    // We want to wrap everything between nav and footer/scripts
    if ($('main.pt-20').length === 0) {
        // Collect elements to wrap
        const toWrap = [];
        $('body').children().each((i, el) => {
            const tag = el.tagName.toLowerCase();
            if (tag !== 'nav' && tag !== 'footer' && tag !== 'script' && !$(el).hasClass('mobile-menu-overlay') && !$(el).hasClass('mobile-menu')) {
                toWrap.push(el);
            }
        });
        
        if (toWrap.length > 0) {
            const wrapper = $('<main class="pt-20 pb-16 min-h-screen"></main>');
            $(toWrap[0]).before(wrapper);
            toWrap.forEach(el => {
                wrapper.append(el);
            });
        }
    }
    
    // Also remove the old mobile menu elements as the new nav doesn't use them (or handles differently)
    $('.mobile-menu-overlay').remove();
    $('.mobile-menu').remove();

    fs.writeFileSync(filePath, $.html());
    console.log(`Migrated ${file}`);
});
console.log('Done migrating other pages.');

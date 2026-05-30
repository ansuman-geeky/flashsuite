const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const publicDir = path.join(__dirname, '../public');

// Links update map for Navbar
const navLinks = [
    { text: "URL Shortener", href: "/" },
    { text: "QR Codes", href: "/" },
    { text: "PDF Tools", href: "/pdftools" },
    { text: "Humanize AI Texts", href: "/humanize" } // Replacing Pricing
];

// PDF Tools to inject into index.html
const allPdfTools = [
    { icon: 'call_merge', name: 'Merge PDF', url: '/mergepdf' },
    { icon: 'content_cut', name: 'Split PDF', url: '/splitpdf' },
    { icon: 'compress', name: 'Compress', url: '/compresspdf' },
    { icon: 'draw', name: 'Sign PDF', url: '/signpdf' },
    { icon: 'edit', name: 'Edit PDF', url: '/editpdf' },
    { icon: 'lock', name: 'Protect PDF', url: '/protectpdf' },
    { icon: 'lock_open', name: 'Unlock PDF', url: '/unlockpdf' },
    { icon: 'crop', name: 'Crop PDF', url: '/croppdf' },
    { icon: 'table_view', name: 'Excel to PDF', url: '/exceltopdf' },
    { icon: 'image', name: 'Image to PDF', url: '/imagetopdf' },
    { icon: 'photo_library', name: 'PDF to Image', url: '/pdftoimage' },
    { icon: 'description', name: 'PDF to Doc', url: '/pdftodoc' }
];

const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(publicDir, file);
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html, { recognizeSelfClosing: true });

    // Update Desktop Nav
    const navAnchors = $('nav .hidden.md\\:flex a');
    if (navAnchors.length > 0) {
        $(navAnchors[0]).attr('href', navLinks[0].href).text(navLinks[0].text);
        $(navAnchors[1]).attr('href', navLinks[1].href).text(navLinks[1].text);
        $(navAnchors[2]).attr('href', navLinks[2].href).text(navLinks[2].text);
        
        if (navAnchors.length > 3) {
            $(navAnchors[3]).attr('href', navLinks[3].href).text(navLinks[3].text);
        } else {
            $('nav .hidden.md\\:flex').append(`<a class="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="${navLinks[3].href}">${navLinks[3].text}</a>`);
        }
    }
    
    // Update Footer Links
    $('footer a').each((i, el) => {
        const text = $(el).text().trim();
        if (text === 'URL Shortener') $(el).attr('href', '/');
        if (text === 'QR Generator') $(el).attr('href', '/');
        if (text === 'PDF Tools') $(el).attr('href', '/pdftools');
        if (text === 'API Docs') $(el).attr('href', '/api');
        if (text === 'About Us') $(el).attr('href', '/about');
        if (text === 'Help Center') $(el).attr('href', '/about'); // No explicit help page
        if (text === 'Security') $(el).attr('href', '/privacy');
        if (text === 'Privacy Policy') $(el).attr('href', '/privacy');
        if (text === 'Terms of Service') $(el).attr('href', '/terms');
        // Add humanize AI text to footer Platform list if we want, or leave as is
    });

    if (file === 'index.html') {
        // Expand the Bento Grid for PDF Tools
        const gridContainer = $('.md\\:col-span-3 .flex-grow.grid');
        gridContainer.removeClass('md:grid-cols-4').addClass('md:grid-cols-4 sm:grid-cols-3'); // adjust columns if needed, but 4 is fine for 12 items (3 rows)
        
        gridContainer.empty(); // clear existing 4
        allPdfTools.forEach(tool => {
            gridContainer.append(`
<div class="aspect-square rounded-2xl bg-surface-container-low flex flex-col items-center justify-center gap-3 border border-outline-variant/20 hover:border-vibrant-fuchsia/50 hover:bg-white transition-all cursor-pointer" onclick="window.location.href='${tool.url}'">
<span class="material-symbols-outlined text-vibrant-fuchsia">${tool.icon}</span>
<span class="font-label-md text-on-surface-variant text-center">${tool.name}</span>
</div>
            `);
        });

        // Add Humanize AI to Bento grid as well? The user asked for "Other pages".
        // Let's add a "Humanize AI Texts" card in the Actionable Analytics or somewhere.
        // Or we can add it to the Hero Section buttons.
        const heroButtons = $('.hero-section .flex-wrap, section.relative.overflow-hidden .flex-wrap');
        // Let's append to the first button group
        if (heroButtons.length > 0) {
            // Already has "Shorten Link" and "PDF Tools"
            // Let's just make sure "PDF Tools" links to /pdftools and "Shorten Link" links to #
            heroButtons.find('button').each((i, el) => {
                const text = $(el).text();
                if (text.includes('PDF Tools')) {
                    $(el).attr('onclick', "window.location.href='/pdftools'");
                }
            });
            // We can add a Humanize AI button
            if (heroButtons.text().indexOf('Humanize') === -1) {
                heroButtons.append(`
<button class="flex items-center gap-2 px-8 py-4 rounded-xl bg-white border border-outline-variant text-on-surface font-title-lg hover:bg-surface-container-low transition-colors" onclick="window.location.href='/humanize'">
    Humanize AI
</button>
                `);
            }
        }
        
        // Add the floating glass card animation script back
        const animationScript = `
        <script id="floating-card-script">
        // Floating effect for the glass card
        document.addEventListener('mousemove', (e) => {
            const card = document.querySelector('.glass-card');
            if(card) {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                if (x > 0 && x < rect.width && y > 0 && y < rect.height) {
                    const rotateX = (y - rect.height/2) / 20;
                    const rotateY = (rect.width/2 - x) / 20;
                    card.style.transform = \`perspective(1000px) rotateX(\${rotateX}deg) rotateY(\${rotateY}deg)\`;
                } else {
                    card.style.transform = \`perspective(1000px) rotateX(0deg) rotateY(0deg)\`;
                }
            }
        });
        </script>
        `;
        
        if ($('#floating-card-script').length === 0) {
            $('body').append(animationScript);
        }
    }

    fs.writeFileSync(filePath, $.html());
    console.log(`Updated links in ${file}`);
});
console.log('Done fixing links and UI.');

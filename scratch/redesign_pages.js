const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const pagesDir = path.join(__dirname, '../public');

// --- ABOUT.HTML REDESIGN ---
const aboutPath = path.join(pagesDir, 'about.html');
if (fs.existsSync(aboutPath)) {
    let html = fs.readFileSync(aboutPath, 'utf8');
    const $ = cheerio.load(html);
    
    const newMain = `
<main class="pt-24 pb-32">
    <!-- Hero Section -->
    <section class="relative pt-20 pb-16 px-margin-desktop overflow-hidden">
        <div class="absolute inset-0 bg-primary/5 pointer-events-none"></div>
        <div class="absolute -top-24 -right-24 w-96 h-96 bg-vibrant-fuchsia/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="max-w-3xl mx-auto text-center relative z-10">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-label-md mb-6">
                <span class="material-symbols-outlined text-[18px]">info</span>
                About FlashSuite
            </div>
            <h1 class="font-display-lg text-display-lg text-on-surface mb-6">Welcome to FlashSuite</h1>
            <p class="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                In a digital world where every second counts, every character matters, and document security is critical, FlashSuite is built to bridge the gap between complexity and clarity. We are a comprehensive suite featuring a custom URL shortener, dynamic QR code generator, and a secure client-side PDF toolkit designed for creators, developers, and enterprises who value speed, confidentiality, and data-driven insights.
            </p>
        </div>
    </section>

    <!-- Mission & Story -->
    <section class="py-16 px-margin-desktop bg-surface">
        <div class="max-w-3xl mx-auto space-y-12">
            
            <div class="glass-card p-8 rounded-2xl border-l-4 border-l-primary bg-white/50 flex flex-col sm:flex-row gap-6 items-start shadow-sm">
                <span class="material-symbols-outlined text-primary text-[40px] shrink-0">verified_user</span>
                <div>
                    <h4 class="font-title-lg text-on-surface mb-3">Reviewed by FlashSuite Lead Digital Strategist</h4>
                    <p class="text-on-surface-variant font-body-lg italic leading-relaxed">With over a decade of experience optimizing enterprise marketing campaigns, our team specializes in custom link management infrastructure, data privacy, and conversion rate optimization through branded links and QR technology.</p>
                </div>
            </div>

            <div>
                <h2 class="font-headline-lg text-headline-lg text-primary mb-6 flex items-center gap-3"><span class="material-symbols-outlined text-[32px]">public</span> Our Mission</h2>
                <p class="text-body-lg text-on-surface-variant leading-relaxed">
                    Our mission is simple: To make the web more accessible, one link at a time. We believe that a link is more than just a destination—it’s a touchpoint. Whether you are generating QR codes for print media or creating branded short links for a viral video, FlashSuite ensures your first impression is professional, trackable, and lightning-fast.
                </p>
            </div>

            <div>
                <h2 class="font-headline-lg text-headline-lg text-primary mb-6 flex items-center gap-3"><span class="material-symbols-outlined text-[32px]">history_edu</span> The FlashSuite Story</h2>
                <div class="space-y-6 text-body-lg text-on-surface-variant leading-relaxed">
                    <p>FlashSuite started as a vision to create a "no-nonsense" utility for the modern web. We noticed that most tools were either too bloated with unnecessary features or too fragile for professional use. We decided to build the middle ground: a robust, full-stack solution that is as powerful as it is elegant.</p>
                    <p>As we grew, we expanded our offerings to include high-performance, client-side PDF tools. Understanding that users are hesitant to upload private documents like financial statements or agreements to remote clouds, we implemented serverless document rendering using WebAssembly and PDF-Lib, enabling users to edit, compress, and sign files 100% offline.</p>
                    <p>Today, we empower users to transform long, messy URLs into sleek, manageable "FlashSuites" and process documents with ultimate security, easy tracking, and maximum optimization.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Why Choose FlashSuite -->
    <section class="py-24 px-margin-desktop bg-surface-light">
        <div class="max-w-max-width mx-auto">
            <div class="text-center mb-16">
                <h2 class="font-headline-lg text-headline-lg text-on-surface mb-4">Why Choose FlashSuite?</h2>
                <p class="text-body-lg text-on-surface-variant max-w-2xl mx-auto">We’ve stripped away the clutter of bloated enterprise software to provide a multi-tool digital suite that focuses on speed, privacy, and ease of use.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <!-- Feature 1 -->
                <div class="glass-card p-8 rounded-3xl hover:border-vibrant-fuchsia/50 transition-colors group">
                    <div class="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined text-[28px]">bolt</span>
                    </div>
                    <h3 class="font-title-lg text-title-lg text-on-surface mb-3">Blazing Performance</h3>
                    <p class="text-on-surface-variant">Built on a high-performance Node.js architecture, our redirects happen in milliseconds, ensuring your audience never hits a loading screen.</p>
                </div>
                <!-- Feature 2 -->
                <div class="glass-card p-8 rounded-3xl hover:border-vibrant-fuchsia/50 transition-colors group">
                    <div class="w-14 h-14 rounded-2xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined text-[28px]">monitoring</span>
                    </div>
                    <h3 class="font-title-lg text-title-lg text-on-surface mb-3">Precision Analytics</h3>
                    <p class="text-on-surface-variant">Knowledge is power. Our integrated dashboard provides real-time data on clicks, referring platforms, and geographic trends to optimize your strategy.</p>
                </div>
                <!-- Feature 3 -->
                <div class="glass-card p-8 rounded-3xl hover:border-vibrant-fuchsia/50 transition-colors group">
                    <div class="w-14 h-14 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined text-[28px]">lock</span>
                    </div>
                    <h3 class="font-title-lg text-title-lg text-on-surface mb-3">Security First</h3>
                    <p class="text-on-surface-variant">With encrypted admin access and secure SQLite data handling, your links and data remain yours. We prioritize privacy in every line of code.</p>
                </div>
                <!-- Feature 4 -->
                <div class="lg:col-span-2 glass-card p-8 rounded-3xl hover:border-vibrant-fuchsia/50 transition-colors group flex flex-col md:flex-row gap-8 items-center">
                    <div class="w-16 h-16 rounded-2xl bg-vibrant-fuchsia/20 text-vibrant-fuchsia flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[32px]">folder_off</span>
                    </div>
                    <div>
                        <h3 class="font-title-lg text-title-lg text-on-surface mb-3">Serverless PDF Privacy</h3>
                        <p class="text-on-surface-variant">Our document utilities run 100% locally inside your web browser. No files are ever uploaded or saved on our servers, ensuring your sensitive bank statements or contracts remain completely confidential.</p>
                    </div>
                </div>
                <!-- Feature 5 -->
                <div class="glass-card p-8 rounded-3xl hover:border-vibrant-fuchsia/50 transition-colors group">
                    <div class="w-14 h-14 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined text-[28px]">design_services</span>
                    </div>
                    <h3 class="font-title-lg text-title-lg text-on-surface mb-3">Minimalist Design</h3>
                    <p class="text-on-surface-variant">We value the "Modern Minimalist" aesthetic. Our interface is clean, spacious, and intuitive, so you can spend less time figuring out the tool.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA -->
    <section class="py-16 px-margin-desktop text-center">
        <h2 class="font-headline-lg text-headline-lg text-on-surface mb-6">Get In Touch</h2>
        <p class="text-body-lg text-on-surface-variant max-w-xl mx-auto mb-8">We are constantly evolving and love hearing from our community of creators. Whether you have a feature suggestion or just want to say hello, we’re here to help you navigate your digital journey.</p>
        <button class="px-8 py-4 bg-vibrant-fuchsia text-white rounded-full font-title-lg hover:scale-105 transition-transform shadow-lg shadow-vibrant-fuchsia/20" onclick="window.location.href='/urlshortener'">
            Ready to shorten your path?
        </button>
    </section>
</main>
    `;
    
    // Replace existing main tag
    $('main').replaceWith(newMain);
    
    // Clean up old custom styles in head if any
    $('style').each((i, el) => {
        const text = $(el).html();
        if(text.includes('.page-content')) {
            // Keep the standard styles, remove page-content ones by just rewriting the standard ones
            $(el).html(`
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .bg-mesh {
            background-color: #f8f9fa;
            background-image: 
                radial-gradient(at 0% 0%, rgba(192, 38, 211, 0.05) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(158, 0, 177, 0.05) 0px, transparent 50%);
        }
        .nav-pill-active {
            position: relative;
        }
        .nav-pill-active::after {
            content: '';
            position: absolute;
            bottom: -4px;
            left: 0;
            width: 100%;
            height: 2px;
            background-color: #9e00b1;
        }
            `);
        }
    });

    fs.writeFileSync(aboutPath, $.html());
    console.log('Updated about.html');
}

// --- LEGAL PAGES REDESIGN (privacy, terms) ---
const legalPages = [
    { file: 'privacy.html', title: 'Privacy Policy', icon: 'shield_lock' },
    { file: 'terms.html', title: 'Terms of Service', icon: 'gavel' }
];

legalPages.forEach(page => {
    const filePath = path.join(pagesDir, page.file);
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        const $ = cheerio.load(html);
        
        // Extract raw content from old <main> or .page-content
        let contentHtml = '';
        const oldMain = $('main.page-content, main');
        
        // Remove h1 as we will add a custom header
        oldMain.find('h1').remove();
        
        // Convert old semantic tags to tailwind classes
        oldMain.find('h2').addClass('font-headline-lg text-primary mt-12 mb-6 border-b border-outline-variant/30 pb-2');
        oldMain.find('h3').addClass('font-title-lg text-on-surface mt-8 mb-4');
        oldMain.find('p').addClass('text-body-lg text-on-surface-variant leading-relaxed mb-6');
        oldMain.find('ul').addClass('list-disc list-inside text-body-lg text-on-surface-variant mb-6 space-y-3 pl-4');
        oldMain.find('li').addClass('leading-relaxed');
        oldMain.find('a').addClass('text-vibrant-fuchsia hover:underline transition-all');
        oldMain.find('strong, b').addClass('font-bold text-on-surface');

        contentHtml = oldMain.html();
        
        const newMain = `
<main class="pt-32 pb-24 px-margin-desktop bg-surface-light min-h-screen">
    <div class="max-w-3xl mx-auto glass-card p-8 md:p-16 rounded-[40px] shadow-sm border border-outline-variant/20">
        <div class="mb-12 text-center">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-label-md mb-6">
                <span class="material-symbols-outlined text-[18px]">${page.icon}</span>
                Legal Document
            </div>
            <h1 class="font-display-lg text-display-lg text-on-surface mb-4">${page.title}</h1>
            <p class="text-on-surface-variant font-label-lg">Last updated: May 30, 2026</p>
        </div>

        <div class="legal-content">
            ${contentHtml}
        </div>
    </div>
</main>
        `;
        
        $('main').replaceWith(newMain);
        
        // Clean up old custom styles in head if any
        $('style').each((i, el) => {
            const text = $(el).html();
            if(text.includes('.page-content')) {
                $(el).html(`
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .bg-mesh {
            background-color: #f8f9fa;
            background-image: 
                radial-gradient(at 0% 0%, rgba(192, 38, 211, 0.05) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(158, 0, 177, 0.05) 0px, transparent 50%);
        }
                `);
            }
        });

        fs.writeFileSync(filePath, $.html());
        console.log("Updated " + page.file);
    }
});

const db = require('./models/database');

const samplePages = [
    {
        category: 'url',
        slug: 'shorten-whatsapp-link',
        keyword: 'shorten whatsapp link',
        target_tool: 'url-shortener',
        h1_title: 'Shorten WhatsApp Link Online',
        intro_p: 'Create a short, clean, and professional link for your WhatsApp chat in seconds. Share your WhatsApp link easily on Instagram, TikTok, Facebook, and SMS with zero friction.',
        step_1: 'Paste your full WhatsApp chat link (e.g., https://wa.me/1234567890) into the input box above.',
        step_2: 'Click the shorten button to generate your customized short link instantly.',
        step_3: 'Copy your short link and share it anywhere. Track anonymous redirect counts instantly.',
        faq_1_q: 'Is it free to shorten WhatsApp chat links?',
        faq_1_a: 'Yes, shortening links on FlashSuite is 100% free with unlimited redirects and no expiration.',
        faq_2_q: 'Do you track personal information during redirects?',
        faq_2_a: 'No. FlashSuite only tracks basic, anonymous geographic and referrer counts to show you click analytics, ensuring total privacy.'
    },
    {
        category: 'qr',
        slug: 'qr-code-for-wifi-password',
        keyword: 'qr code for wifi password',
        target_tool: 'qr-wifi',
        h1_title: 'Generate WiFi Password QR Code Free',
        intro_p: 'Connect your guests to your home or office WiFi instantly. Generate a secure WiFi network QR code so your visitors can scan and join without typing complex passwords.',
        step_1: 'Select the WiFi tab and type in your network name (SSID) and security type.',
        step_2: 'Input your wireless network password into the password field securely.',
        step_3: 'Click generate to render your WiFi QR code. Print it or download it as a high-quality PNG.',
        faq_1_q: 'Is my WiFi password sent to your servers?',
        faq_1_a: 'Absolutely not. All QR code generation is performed locally inside your web browser. Your wireless password never leaves your device.',
        faq_2_q: 'Which devices can scan the WiFi QR code?',
        faq_2_a: 'All modern iOS (Apple) and Android mobile devices support scanning WiFi QR codes directly through their native camera applications.'
    },
    {
        category: 'pdf',
        slug: 'how-to-merge-invoice-pdfs',
        keyword: 'how to merge invoice pdfs',
        target_tool: 'pdf-merge',
        h1_title: 'Merge Invoice PDFs Locally & Securely',
        intro_p: 'Combine multiple business invoices, receipts, and billing statements into a single, cohesive PDF document in a split second. Keep your financial files safe.',
        step_1: 'Click the upload box to select multiple invoice PDF files from your device.',
        step_2: 'Arrange the sequence order of your uploaded invoices in the interactive queue.',
        step_3: 'Click merge to compile the final document locally in your browser memory and download it instantly.',
        faq_1_q: 'Are my financial invoice documents uploaded to remote servers?',
        faq_1_a: 'No! FlashSuite is built to be 100% client-side. The file merging process takes place entirely inside your local browser memory, guaranteeing absolute financial data confidentiality.',
        faq_2_q: 'Is there a limit to how many invoices I can combine?',
        faq_2_a: 'No. FlashSuite has zero limits on page count, file volume, or conversion numbers.'
    }
];

db.serialize(() => {
    console.log("Seeding programmatic SEO pages...");

    const stmt = db.prepare(`INSERT OR REPLACE INTO programmatic_pages (
        category, slug, keyword, target_tool, h1_title, intro_p, 
        step_1, step_2, step_3, faq_1_q, faq_1_a, faq_2_q, faq_2_a
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    samplePages.forEach(page => {
        stmt.run([
            page.category,
            page.slug,
            page.keyword,
            page.target_tool,
            page.h1_title,
            page.intro_p,
            page.step_1,
            page.step_2,
            page.step_3,
            page.faq_1_q,
            page.faq_1_a,
            page.faq_2_q,
            page.faq_2_a
        ], (err) => {
            if (err) {
                console.error(`Failed to seed ${page.slug}:`, err);
            } else {
                console.log(`Successfully seeded programmatic page: /use-cases/${page.category}/${page.slug}`);
            }
        });
    });

    stmt.finalize(() => {
        console.log("Seeding completed successfully.");
    });
});

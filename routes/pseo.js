const express = require('express');
const router = express.Router();
const db = require('../models/database');

router.get('/use-cases/:category/:slug', (req, res) => {
    const { category, slug } = req.params;

    db.get("SELECT * FROM programmatic_pages WHERE category = ? AND slug = ? AND status = 'active'", [category, slug], (err, page) => {
        if (err || !page) {
            // Fallback gracefully to core tools landing if dynamic slug is missing or inactive
            return res.redirect('/pdftools');
        }

        // Build premium client-side JSON-LD Graph for dynamic search crawlers
        const schema = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "SoftwareApplication",
                    "@id": `https://flashsuite.com/use-cases/${category}/${slug}#software`,
                    "name": `FlashSuite ${page.h1_title}`,
                    "operatingSystem": "All",
                    "applicationCategory": "BusinessApplication",
                    "offers": {
                        "@type": "Offer",
                        "price": "0.00",
                        "priceCurrency": "USD"
                    },
                    "description": page.intro_p
                }
            ]
        };

        // Add FAQ Graph dynamically if QA variables are registered in SQLite
        if (page.faq_1_q && page.faq_1_a) {
            const faqList = [
                {
                    "@type": "Question",
                    "name": page.faq_1_q,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": page.faq_1_a
                    }
                }
            ];

            if (page.faq_2_q && page.faq_2_a) {
                faqList.push({
                    "@type": "Question",
                    "name": page.faq_2_q,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": page.faq_2_a
                    }
                });
            }

            if (page.faq_3_q && page.faq_3_a) {
                faqList.push({
                    "@type": "Question",
                    "name": page.faq_3_q,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": page.faq_3_a
                    }
                });
            }

            schema["@graph"].push({
                "@type": "FAQPage",
                "@id": `https://flashsuite.com/use-cases/${category}/${slug}#faq`,
                "mainEntity": faqList
            });
        }

        // Resolve structural parent application to serve based on the programmatic record targets
        let parentLayoutFile = 'index.html'; // Default to landing shortener / QR code
        
        switch (page.target_tool) {
            case 'pdf-merge':
                parentLayoutFile = 'mergepdf.html';
                break;
            case 'pdf-split':
                parentLayoutFile = 'splitpdf.html';
                break;
            case 'pdf-compress':
                parentLayoutFile = 'compresspdf.html';
                break;
            case 'pdf-protect':
                parentLayoutFile = 'protectpdf.html';
                break;
            case 'pdf-unlock':
                parentLayoutFile = 'unlockpdf.html';
                break;
            case 'pdf-to-img':
                parentLayoutFile = 'pdftoimage.html';
                break;
            case 'img-to-pdf':
                parentLayoutFile = 'imagetopdf.html';
                break;
            case 'pdf-to-doc':
                parentLayoutFile = 'pdftodoc.html';
                break;
            case 'pdf-crop':
                parentLayoutFile = 'croppdf.html';
                break;
            case 'pdf-edit':
                parentLayoutFile = 'editpdf.html';
                break;
            default:
                parentLayoutFile = 'index.html';
        }

        // Inject headers and serve dynamic render
        res.renderSEOPage(parentLayoutFile, {
            title: `${page.h1_title} - 100% Free & Secure`,
            description: page.intro_p,
            schema: schema
        });
    });
});

module.exports = router;

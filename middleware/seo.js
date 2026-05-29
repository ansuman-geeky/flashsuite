const path = require('path');
const fs = require('fs');

module.exports = function seoPrerender(req, res, next) {
    res.renderSEOPage = function(fileName, seoData) {
        const filePath = path.join(__dirname, '../public', fileName);
        
        fs.readFile(filePath, 'utf8', (err, html) => {
            if (err) {
                console.error("Error reading base layout:", err);
                return res.sendFile(filePath);
            }

            const canonicalUrl = `https://flashsuite.pro${req.path}`;
            
            // Build Dynamic Schema Block
            const schemaScript = seoData.schema ? `
    <script type="application/ld+json">
    ${JSON.stringify(seoData.schema, null, 2)}
    </script>` : '';

            // Clean existing title tags and meta descriptions in head, then inject new SEO headers
            let modifiedHtml = html
                .replace(/<title>.*?<\/title>/, `<title>${seoData.title} | FlashSuite</title>`)
                .replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${seoData.description}">`);

            // Dynamically convert relative resource paths to root-relative for nested subdirectories (preventing 404s)
            modifiedHtml = modifiedHtml
                .replace(/href="styles\.css"/g, 'href="/styles.css"')
                .replace(/src="flashsuite_logo\.png"/g, 'src="/flashsuite_logo.png"')
                .replace(/href="pdftools(\.html)?"/g, 'href="/pdftools"')
                .replace(/href="imagetopdf(\.html)?"/g, 'href="/imagetopdf"')
                .replace(/href="pdftoimage(\.html)?"/g, 'href="/pdftoimage"')
                .replace(/href="pdftodoc(\.html)?"/g, 'href="/pdftodoc"')
                .replace(/href="croppdf(\.html)?"/g, 'href="/croppdf"')
                .replace(/href="editpdf(\.html)?"/g, 'href="/editpdf"');

            // Inject Canonicals, OG, Twitter Metas and JSON-LD directly before </head>
            modifiedHtml = modifiedHtml.replace('</head>', `
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="${seoData.title} | FlashSuite" />
    <meta property="og:description" content="${seoData.description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="https://flashsuite.pro/og_banner.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${seoData.title} | FlashSuite" />
    <meta name="twitter:description" content="${seoData.description}" />
    ${schemaScript}
    </head>`);

            res.header('Content-Type', 'text/html');
            res.send(modifiedHtml);
        });
    };

    next();
};

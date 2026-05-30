const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

const faviconLink = '\n    <link rel="icon" type="image/png" href="/favicon.png">\n';

for (const file of files) {
    const filePath = path.join(publicDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('rel="icon"')) {
        content = content.replace('</head>', faviconLink + '</head>');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Added favicon to', file);
    }
}

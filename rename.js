const fs = require('fs');
const path = require('path');

const filesToProcess = [
    'package.json',
    'server.js',
    'models/database.js',
    'public/index.html',
    'public/about.html',
    'public/privacy.html',
    'public/terms.html',
    'public/blog.html',
    'public/post.html',
    'public/admin.html',
    'public/login.html',
    'public/qr-generator.js',
    'public/main.js',
    'seo_strategy_report.md'
];

// Rename files
try {
    if (fs.existsSync('public/flashpath_logo.png')) {
        fs.renameSync('public/flashpath_logo.png', 'public/flashsuite_logo.png');
        console.log('Renamed logo.');
    }
} catch (e) { console.error(e); }

try {
    if (fs.existsSync('flashpath.db')) {
        fs.renameSync('flashpath.db', 'flashsuite.db');
        console.log('Renamed database.');
    }
} catch (e) { console.error(e); }

// Process files
filesToProcess.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');
        let newContent = content
            .replace(/FlashPath/g, 'FlashSuite')
            .replace(/flashpath/g, 'flashsuite');
        
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf-8');
            console.log(`Updated ${file}`);
        }
    }
});

console.log('Rebranding script completed.');

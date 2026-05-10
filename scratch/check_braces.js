const fs = require('fs');

function checkBraces(filepath) {
    if (!fs.existsSync(filepath)) {
        console.log(`File ${filepath} not found`);
        return;
    }
    
    const content = fs.readFileSync(filepath, 'utf8');
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    
    console.log(`File: ${filepath}`);
    console.log(`Open: ${openBraces}`);
    console.log(`Close: ${closeBraces}`);
    if (openBraces !== closeBraces) {
        console.log("!!! UNBALANCED BRACES !!!");
    }
}

checkBraces('public/styles.css');
checkBraces('public/index.html');
checkBraces('public/admin.html');

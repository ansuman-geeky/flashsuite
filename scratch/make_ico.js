const fs = require('fs');
const pngToIco = require('png-to-ico');

console.log(typeof pngToIco);

(async () => {
    try {
        const buf = await (typeof pngToIco === 'function' ? pngToIco : pngToIco.default)('../public/favicon.png');
        fs.writeFileSync('../public/favicon.ico', buf);
        console.log('Successfully created favicon.ico');
    } catch (e) {
        console.error(e);
    }
})();

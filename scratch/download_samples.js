const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const file1 = path.join(dir, 'sample1.pdf');
const file2 = path.join(dir, 'sample2.pdf');

function download(url, dest, cb) {
    const file = fs.createWriteStream(dest);
    https.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(cb);
        });
    }).on('error', function(err) {
        fs.unlink(dest, () => {});
        if (cb) cb(err.message);
    });
}

const pdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

console.log('Downloading sample PDF 1...');
download(pdfUrl, file1, (err) => {
    if (err) {
        console.error('Error downloading sample 1:', err);
    } else {
        console.log('Downloaded sample 1 successfully.');
        console.log('Downloading sample PDF 2...');
        download(pdfUrl, file2, (err2) => {
            if (err2) {
                console.error('Error downloading sample 2:', err2);
            } else {
                console.log('Downloaded sample 2 successfully.');
            }
        });
    }
});

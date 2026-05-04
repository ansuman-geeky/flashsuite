let qrCodeInstance = null;
let currentQrUrl = '';

function openQrModal(url) {
    currentQrUrl = url;
    document.getElementById('qrModal').classList.add('show');
    generateQRCode();
}

function closeQrModal() {
    document.getElementById('qrModal').classList.remove('show');
}

function generateQRCode() {
    const container = document.getElementById('qrCodeContainer');
    container.innerHTML = ''; // Clear previous

    const fgColor = document.getElementById('qrFgColor').value;
    const bgColor = document.getElementById('qrBgColor').value;
    const errorCorrection = document.getElementById('qrErrorCorrection').value;

    qrCodeInstance = new QRCode(container, {
        text: currentQrUrl,
        width: 256,
        height: 256,
        colorDark : fgColor,
        colorLight : bgColor,
        correctLevel : QRCode.CorrectLevel[errorCorrection]
    });
}

function downloadQRCode() {
    const canvas = document.querySelector('#qrCodeContainer canvas');
    if (!canvas) return alert('Please generate a QR code first.');

    // Extract shortcode from url for filename
    let filename = 'flashsuite-qr.png';
    try {
        const urlObj = new URL(currentQrUrl);
        const pathParts = urlObj.pathname.split('/');
        const code = pathParts[pathParts.length - 1];
        if (code) filename = `${code}.png`;
    } catch (e) {
        // Fallback to default
    }

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

async function copyQRCode() {
    const canvas = document.querySelector('#qrCodeContainer canvas');
    if (!canvas) return alert('Please generate a QR code first.');

    try {
        canvas.toBlob(async (blob) => {
            const item = new ClipboardItem({ "image/png": blob });
            await navigator.clipboard.write([item]);
            alert("QR Code copied to clipboard!");
        });
    } catch (err) {
        console.error('Failed to copy: ', err);
        alert("Failed to copy image. Your browser might not support this feature.");
    }
}

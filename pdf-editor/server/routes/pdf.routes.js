const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { PDFDocument, StandardFonts, rgb, degrees } = require('pdf-lib');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set up Multer for PDF uploads (max 50MB)
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadsDir); },
    filename: function (req, file, cb) { cb(null, uuidv4() + '.pdf'); }
});
const upload = multer({
    storage: storage, limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed!'), false);
    }
});

// Auto-cleanup cron job
setInterval(() => {
    fs.readdir(uploadsDir, (err, files) => {
        if (err) return;
        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                if (now - stats.mtimeMs > 30 * 60 * 1000) {
                    fs.unlink(filePath, e => { if (!e) console.log(`Auto-cleaned temp file: ${file}`); });
                }
            });
        });
    });
}, 5 * 60 * 1000);

// POST /api/pdf/upload
router.post('/upload', upload.single('pdf'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });
    res.json({
        fileId: path.parse(req.file.filename).name,
        filename: req.file.originalname,
        fileSizeKB: Math.round(req.file.size / 1024),
        tempPath: `/uploads/${req.file.filename}`
    });
});

// Helper: hex to rgb
function hexToRgb(hex) {
    if (!hex) return undefined;
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    return rgb(
        parseInt(hex.substring(0, 2), 16) / 255,
        parseInt(hex.substring(2, 4), 16) / 255,
        parseInt(hex.substring(4, 6), 16) / 255
    );
}

// POST /api/pdf/:id/export
router.post('/:id/export', express.json({ limit: '50mb' }), async (req, res) => {
    try {
        const fileId = req.params.id;
        const filePath = path.join(uploadsDir, `${fileId}.pdf`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found or expired. Please upload again.' });
        }

        const annotations = req.body.annotations || [];
        const replacements = req.body.replacements || [];
        
        const pdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        const embeddedFonts = {};
        for (const fontName of Object.values(StandardFonts)) {
            embeddedFonts[fontName] = await pdfDoc.embedFont(fontName);
        }
        const defaultFont = embeddedFonts[StandardFonts.Helvetica];

        // Process replacements first (white-out + redraw)
        for (const r of replacements) {
            if (r.pageIndex < 0 || r.pageIndex >= pages.length) continue;
            
            const page = pages[r.pageIndex];
            const { height } = page.getSize();
            
            // White-out original text
            // Note: r.y in replacements is the screen Y. We need to convert it to PDF Y.
            // Actually, r.y is screenY from frontend, which is viewport.height - pdfY - fontSize.
            // But wait, the frontend sends r.y as item.y (screen space).
            // To be precise, let's use r.y just like el.y for text
            page.drawRectangle({
                x: r.x,
                y: height - r.y - r.height, // anchor is bottom-left
                width: r.width,
                height: r.height,
                color: hexToRgb(r.bgColor || '#ffffff'),
                opacity: 1
            });

            // Draw new text
            let font = defaultFont;
            if (r.fontName) {
                const baseFont = r.fontName.split(',')[0].replace(/['"]/g, '').trim().toLowerCase().replace(/\s+/g, '');
                const standardKey = Object.keys(StandardFonts).find(k => 
                    StandardFonts[k].toLowerCase().replace(/-/g, '').includes(baseFont) || 
                    baseFont.includes(StandardFonts[k].toLowerCase().replace(/-/g, ''))
                );
                if (standardKey && embeddedFonts[StandardFonts[standardKey]]) {
                    font = embeddedFonts[StandardFonts[standardKey]];
                }
            }
            
            page.drawText(r.newText, {
                x: r.x, 
                y: height - r.y - r.fontSize, 
                size: r.fontSize, 
                font: font,
                color: hexToRgb(r.color || '#000000'), 
                opacity: 1.0
            });
        }

        // Process new annotations
        for (const el of annotations) {
            if (el.pageIndex < 0 || el.pageIndex >= pages.length) continue;
            
            const page = pages[el.pageIndex];
            const { height } = page.getSize();
            const opacity = el.opacity !== undefined ? el.opacity : 1.0;

            if (el.type === 'text') {
                let font = defaultFont;
                if (el.fontFamily) {
                    const baseFont = el.fontFamily.split(',')[0].replace(/['"]/g, '').trim().toLowerCase().replace(/\s+/g, '');
                    const standardKey = Object.keys(StandardFonts).find(k => 
                        StandardFonts[k].toLowerCase().replace(/-/g, '').includes(baseFont) ||
                        baseFont.includes(StandardFonts[k].toLowerCase().replace(/-/g, ''))
                    );
                    if (standardKey && embeddedFonts[StandardFonts[standardKey]]) {
                        font = embeddedFonts[StandardFonts[standardKey]];
                    }
                }
                const lines = el.text.split('\n');
                const lineHeight = el.fontSize * (el.lineHeight || 1.2);
                let currentY = height - el.y - el.fontSize;
                
                for (const line of lines) {
                    page.drawText(line, {
                        x: el.x, y: currentY, size: el.fontSize, font: font,
                        color: hexToRgb(el.color || '#000000'), opacity: opacity
                    });
                    currentY -= lineHeight;
                }
            } 
            else if (el.type === 'rect') {
                page.drawRectangle({
                    x: el.x,
                    y: height - el.y - el.height, // anchor is bottom-left
                    width: el.width,
                    height: el.height,
                    color: el.fillColor ? hexToRgb(el.fillColor) : undefined,
                    borderColor: el.strokeColor ? hexToRgb(el.strokeColor) : undefined,
                    borderWidth: el.strokeWidth || 0,
                    opacity: opacity,
                    borderOpacity: opacity
                });
            }
            else if (el.type === 'circle') {
                page.drawEllipse({
                    x: el.x + (el.width / 2),
                    y: height - el.y - (el.height / 2), // anchor is center
                    xScale: el.width / 2,
                    yScale: el.height / 2,
                    color: el.fillColor ? hexToRgb(el.fillColor) : undefined,
                    borderColor: el.strokeColor ? hexToRgb(el.strokeColor) : undefined,
                    borderWidth: el.strokeWidth || 0,
                    opacity: opacity,
                    borderOpacity: opacity
                });
            }
            else if (el.type === 'line') {
                page.drawLine({
                    start: { x: el.x, y: height - el.y - (el.height / 2) },
                    end: { x: el.x + el.width, y: height - el.y - (el.height / 2) },
                    color: el.strokeColor ? hexToRgb(el.strokeColor) : undefined,
                    thickness: el.strokeWidth || 1,
                    opacity: opacity
                });
            }
            else if (el.type === 'path') {
                // Freehand SVG paths. The path coordinates from the browser are Top-Down.
                // pdf-lib's drawSvgPath correctly scales Y if we set coordinate mapping.
                page.drawSvgPath(el.pathData, {
                    x: el.x,
                    y: height - el.y, // SVG origin at Top-Left relative to page
                    borderColor: hexToRgb(el.strokeColor || '#000000'),
                    borderWidth: el.strokeWidth || 2,
                    opacity: opacity
                });
            }
            else if (el.type === 'image') {
                try {
                    // Extract base64 part
                    const base64Data = el.dataUrl.split(',')[1];
                    const imgBuffer = Buffer.from(base64Data, 'base64');
                    
                    let pdfImage;
                    if (el.dataUrl.startsWith('data:image/png')) {
                        pdfImage = await pdfDoc.embedPng(imgBuffer);
                    } else {
                        pdfImage = await pdfDoc.embedJpg(imgBuffer);
                    }
                    
                    page.drawImage(pdfImage, {
                        x: el.x,
                        y: height - el.y - el.height, // bottom-left anchor
                        width: el.width,
                        height: el.height,
                        opacity: opacity
                    });
                } catch (e) {
                    console.error('Failed to embed image:', e);
                }
            }
        }

        const modifiedPdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="edited_${fileId}.pdf"`);
        res.send(Buffer.from(modifiedPdfBytes));

    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Failed to export PDF: ' + err.message });
    }
});

// DELETE /api/pdf/:id
router.delete('/:id', (req, res) => {
    const filePath = path.join(uploadsDir, `${req.params.id}.pdf`);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return res.json({ success: true });
    }
    res.status(404).json({ error: 'File not found' });
});

module.exports = router;

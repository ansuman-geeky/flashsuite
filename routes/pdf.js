const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Target directory for temporary uploads
const TEMP_DIR = path.join(__dirname, '..', 'uploads', 'temp');

// Ensure the directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, TEMP_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueId = crypto.randomUUID();
        cb(null, `${uniqueId}.pdf`);
    }
});

// Multer upload middleware
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 150 * 1024 * 1024 // 150MB limit
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.pdf') {
            return cb(new Error('Only PDF files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Helper to sanitize filename
function sanitizeFilename(name) {
    if (!name) return 'document.pdf';
    return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

// API: Upload PDF
router.post('/upload', (req, res) => {
    upload.single('pdf')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const filePath = req.file.path;

        // Perform magic bytes check to prevent MIME spoofing
        try {
            const fd = fs.openSync(filePath, 'r');
            const buffer = Buffer.alloc(4);
            fs.readSync(fd, buffer, 0, 4, 0);
            fs.closeSync(fd);

            const signature = buffer.toString('utf-8');
            if (signature !== '%PDF') {
                // Not a valid PDF, delete immediately
                fs.unlinkSync(filePath);
                return res.status(400).json({ error: 'Security verification failed: Invalid PDF structure.' });
            }
        } catch (e) {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            return res.status(500).json({ error: 'Internal validation error.' });
        }

        // Generate clean original filename
        const cleanName = sanitizeFilename(req.file.originalname);
        const fileId = path.basename(req.file.filename, '.pdf');

        res.json({
            success: true,
            id: fileId,
            name: cleanName,
            size: req.file.size
        });
    });
});

// API: Stream PDF (supports HTTP range requests via res.sendFile)
router.get('/:id', (req, res) => {
    const fileId = req.params.id;
    // Validate UUID format to prevent directory traversal
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fileId)) {
        return res.status(400).json({ error: 'Invalid file ID.' });
    }

    const filePath = path.join(TEMP_DIR, `${fileId}.pdf`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found or session expired.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Accept-Ranges', 'bytes');
    res.sendFile(filePath);
});

// API: Debounce Annotations Save
router.post('/:id/save', express.json(), (req, res) => {
    const fileId = req.params.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fileId)) {
        return res.status(400).json({ error: 'Invalid file ID.' });
    }

    const annotationsPath = path.join(TEMP_DIR, `${fileId}.json`);
    
    try {
        fs.writeFileSync(annotationsPath, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save annotation draft.' });
    }
});

// API: Load Annotations
router.get('/:id/annotations', (req, res) => {
    const fileId = req.params.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fileId)) {
        return res.status(400).json({ error: 'Invalid file ID.' });
    }

    const annotationsPath = path.join(TEMP_DIR, `${fileId}.json`);

    if (fs.existsSync(annotationsPath)) {
        try {
            const data = fs.readFileSync(annotationsPath, 'utf-8');
            return res.json(JSON.parse(data));
        } catch (e) {
            return res.status(500).json({ error: 'Failed to read annotations.' });
        }
    }
    
    res.json({ pages: {} });
});

// Periodic Temp File Cleanup function
function cleanupTempFiles() {
    console.log(`[PDF Cleanup] Scanning temp directory: ${TEMP_DIR}`);
    const expirationMs = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    fs.readdir(TEMP_DIR, (err, files) => {
        if (err) {
            console.error('[PDF Cleanup] Error reading directory:', err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(TEMP_DIR, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error(`[PDF Cleanup] Error stating file ${file}:`, err);
                    return;
                }

                if (now - stats.mtimeMs > expirationMs) {
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error(`[PDF Cleanup] Failed to delete ${file}:`, err);
                        } else {
                            console.log(`[PDF Cleanup] Successfully deleted expired file: ${file}`);
                        }
                    });
                }
            });
        });
    });
}

module.exports = {
    router,
    cleanupTempFiles
};

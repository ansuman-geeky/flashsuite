// pdf-editor.js
// Main Application State and Initialization

window.PDFEditor = {
    state: {
        fileId: null,
        fileName: null,
        tempPath: null,

        pdfDoc: null,         // PDF.js Document Proxy
        totalPages: 0,
        currentPage: 1,
        zoom: 1.0,

        currentTool: 'select',
        selectedElement: null,

        elements: [],         // Array of annotation objects
        replacements: [],     // Array of inline text replacements
        extractedText: [],    // Array of detected text from PDF

        isDirty: false
    },

    config: {
        maxFileSize: 50 * 1024 * 1024,
        scaleFactor: window.devicePixelRatio || 1
    },

    init: function () {
        this.bindUploadEvents();
        if (window.Toolbar && window.Toolbar.init) window.Toolbar.init();
        if (window.AnnotationLayer && window.AnnotationLayer.init) window.AnnotationLayer.init();
    },

    bindUploadEvents: function () {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const selectBtn = dropZone.querySelector('button');

        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });

        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-indigo-500', 'bg-indigo-100/50');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-indigo-500', 'bg-indigo-100/50');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-indigo-500', 'bg-indigo-100/50');
            if (e.dataTransfer.files.length > 0) {
                this.handleFileUpload(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });
    },

    handleFileUpload: async function (file) {
        if (file.type !== 'application/pdf') {
            alert('Please upload a valid PDF file.');
            return;
        }
        if (file.size > this.config.maxFileSize) {
            alert('File exceeds 50MB limit.');
            return;
        }

        // Show progress UI
        document.getElementById('dropZone').classList.add('hidden');
        document.getElementById('uploadProgress').classList.remove('hidden');
        const progBar = document.getElementById('uploadProgressBar');

        const formData = new FormData();
        formData.append('pdf', file);

        try {
            // Fake progress animation while uploading
            let prog = 0;
            const progInt = setInterval(() => {
                prog += Math.random() * 15;
                if (prog > 90) prog = 90;
                progBar.style.width = prog + '%';
            }, 200);

            const response = await fetch('/api/pdf/upload', {
                method: 'POST',
                body: formData
            });

            clearInterval(progInt);
            progBar.style.width = '100%';

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();

            // Set state
            this.state.fileId = data.fileId;
            this.state.fileName = data.filename;
            this.state.tempPath = data.tempPath;

            // Update UI
            document.getElementById('fileNameDisplay').textContent = data.filename;
            document.getElementById('infoFileName').textContent = data.filename;
            document.getElementById('infoFileSize').textContent = data.fileSizeKB + ' KB';

            // Update text before long extraction process
            document.getElementById('uploadProgressText').textContent = 'Extracting document text and properties...';

            // Proceed to render
            await window.PDFRenderer.loadDocument(data.tempPath);

            // Hide upload screen
            setTimeout(() => {
                document.getElementById('uploadScreen').classList.add('hidden');
                document.getElementById('viewControls').style.display = 'flex';
                document.getElementById('btnExport').disabled = false;
            }, 300);

        } catch (err) {
            console.error(err);
            alert('Error uploading file: ' + err.message);
            document.getElementById('dropZone').classList.remove('hidden');
            document.getElementById('uploadProgress').classList.add('hidden');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.PDFEditor.init();
});

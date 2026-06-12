// pdf-renderer.js
// Handles PDF.js loading and rendering

window.PDFRenderer = {
    loadDocument: async function (url) {
        try {
            const loadingTask = pdfjsLib.getDocument(url);
            const pdfDoc = await loadingTask.promise;

            const state = window.PDFEditor.state;
            state.pdfDoc = pdfDoc;
            state.totalPages = pdfDoc.numPages;

            document.getElementById('totalPagesDisplay').textContent = state.totalPages;
            document.getElementById('infoPageCount').textContent = state.totalPages;

            await this.renderAllPages();

            // Extract text properties before allowing system access
            await window.PDFExtractor.extractAll(pdfDoc);

            // Init tools
            window.Toolbar.init();
            window.AnnotationLayer.init();

        } catch (err) {
            console.error('Error loading PDF:', err);
            throw err;
        }
    },

    renderAllPages: async function () {
        const state = window.PDFEditor.state;
        const container = document.getElementById('pagesContainer');
        container.innerHTML = ''; // Clear

        for (let pageNum = 1; pageNum <= state.totalPages; pageNum++) {
            const page = await state.pdfDoc.getPage(pageNum);

            // Create page wrapper
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page-container';
            pageDiv.id = `page-${pageNum}`;
            pageDiv.dataset.page = pageNum;

            // Create canvas layer (read-only PDF render)
            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-render-layer';

            // Create SVG layer for freehand drawing
            const svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svgLayer.setAttribute("class", "svg-layer");
            svgLayer.setAttribute("id", `svg-${pageNum}`);

            // Create annotation layer (interactive)
            const annoLayer = document.createElement('div');
            annoLayer.className = 'annotation-layer';
            annoLayer.id = `anno-${pageNum}`;

            pageDiv.appendChild(canvas);
            pageDiv.appendChild(svgLayer);
            pageDiv.appendChild(annoLayer);
            container.appendChild(pageDiv);

            // Render
            await this.renderPage(page, pageDiv, canvas);
        }
    },

    renderPage: async function (page, pageDiv, canvas) {
        const state = window.PDFEditor.state;
        const viewport = page.getViewport({ scale: state.zoom });

        // Match CSS width/height
        pageDiv.style.width = `${viewport.width}px`;
        pageDiv.style.height = `${viewport.height}px`;

        const ctx = canvas.getContext('2d');
        const scaleFactor = window.PDFEditor.config.scaleFactor;

        // High DPI scaling
        canvas.width = viewport.width * scaleFactor;
        canvas.height = viewport.height * scaleFactor;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        ctx.scale(scaleFactor, scaleFactor);

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        await page.render(renderContext).promise;
    },

    updateZoom: async function () {
        const state = window.PDFEditor.state;
        document.getElementById('zoomLevelDisplay').textContent = Math.round(state.zoom * 100) + '%';

        const container = document.getElementById('pagesContainer');
        const pages = container.querySelectorAll('.page-container');

        for (let i = 0; i < pages.length; i++) {
            const pageDiv = pages[i];
            const pageNum = parseInt(pageDiv.dataset.page);
            const canvas = pageDiv.querySelector('canvas');

            const page = await state.pdfDoc.getPage(pageNum);
            await this.renderPage(page, pageDiv, canvas);
        }

        // Also re-render annotations to match new zoom
        window.AnnotationLayer.recalculateZoom();
    }
};

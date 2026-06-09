
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-3B61CKGJL7');
    

        fetch('/components/footer.html')
            .then(response => response.text())
            .then(data => {
                document.getElementById('footer-placeholder').innerHTML = data;
            });
    

        // Set PDF.js Worker Src globally
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

        // Editor Application State
        let fileId = null;
        let pdfDoc = null;
        let originalName = 'document.pdf';
        let pagesData = []; // Array of page objects
        let zoomScale = 1.0;
        let activeTool = 'pan'; // pan, select, highlight, draw, sticky, text, shape, forms, insert, signature
        let activeMode = 'annotate'; // annotate, edit
        let currentActivePage = 1;
        let isUndoingRedoing = false; // Lock to prevent history pollution during loads
        
        // Settings/Shapes/Drawing default values
        let strokeColor = '#EF4444';
        let fillColor = 'transparent';
        let brushWidth = 4;
        
        // Watermark & Page Number States
        let globalWatermarkText = '';
        let globalWatermarkOpacity = 0.15;
        let globalPageNumbersEnabled = false;
        let globalPageNumbersFormat = 'detailed';
        let globalPageNumbersPosition = 'bottom-right';

        // Predefined color palette values
        const colorsList = ['#000000', '#FFFFFF', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', 'transparent'];

        const pdfBuffers = {};

        // DOM elements cache
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const uploadPanel = document.getElementById('uploadPanel');
        const studioWorkspace = document.getElementById('studioWorkspace');
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const thumbnailsList = document.getElementById('thumbnailsList');
        const workspaceCenter = document.getElementById('workspaceCenter');
        const pageNumInput = document.getElementById('pageNumInput');
        const totalPagesLabel = document.getElementById('totalPagesLabel');
        const zoomPercentLabel = document.getElementById('zoomPercentLabel');

        // Initialize Lucide Icons
        window.addEventListener('DOMContentLoaded', () => { if (window.lucide) lucide.createIcons(); else window.addEventListener('load', () => window.lucide && lucide.createIcons()); });

        // ------------------ PDF UPLOAD & CACHING ------------------
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });

        async function handleFileUpload(file) {
            if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
                alert('Only PDF files are supported.');
                return;
            }

            // Show progress bar
            dropZone.classList.add('hidden');
            progressContainer.style.display = 'block';
            progressFill.style.width = '100%';
            progressText.innerText = 'Loading vector file...';

            try {
                const arrayBuffer = await file.arrayBuffer();
                fileId = crypto.randomUUID();
                originalName = file.name;
                pdfBuffers[fileId] = arrayBuffer;

                await initializeStudio(arrayBuffer);
            } catch (e) {
                console.error(e);
                alert('Failed to read PDF document.');
                resetUploadPanel();
            }
        }

        function resetUploadPanel() {
            progressContainer.style.display = 'none';
            dropZone.classList.remove('hidden');
            fileInput.value = '';
        }

        // ------------------ STUDIO INITIALIZATION ------------------
        async function initializeStudio(pdfData) {
            try {
                document.body.classList.add('studio-active');
                uploadPanel.classList.add('hidden');
                studioWorkspace.style.display = 'flex';

                const loadingTask = pdfjsLib.getDocument({
                    data: pdfData
                });
                
                pdfDoc = await loadingTask.promise;
                const totalPages = pdfDoc.numPages;

                totalPagesLabel.innerText = totalPages;
                pageNumInput.max = totalPages;

                pagesData = [];
                for (let i = 1; i <= totalPages; i++) {
                    const page = await pdfDoc.getPage(i);
                    const viewport = page.getViewport({ scale: 1.0 });
                    pagesData.push({
                        pageIndex: i, // reference to actual page order in file
                        pageNumber: i, // current layout index
                        width: viewport.width,
                        height: viewport.height,
                        rotation: 0,
                        fabricData: null, // annotations state
                        fabricCanvas: null,
                        rendered: false,
                        history: [],
                        historyIndex: -1
                    });
                }

                // Render page frames dynamically
                renderWorkspaceShell();
                setupIntersectionObserver();
                renderThumbnails();
                setupToolEvents();
                setupResizablePanels();

                // Select first page
                jumpToPage(1);

            } catch (e) {
                console.error(e);
                alert('Error rendering PDF layout.');
                resetUploadPanel();
            }
        }

        // ------------------ WORKSPACE LAYOUT & VIRTUALIZATION ------------------
        function renderWorkspaceShell() {
            workspaceCenter.innerHTML = '';
            pagesData.forEach(page => {
                const pageId = `page-container-${page.pageNumber}`;
                const container = document.createElement('div');
                container.className = 'page-container';
                container.id = pageId;
                container.style.width = `${page.width * zoomScale}px`;
                container.style.height = `${page.height * zoomScale}px`;
                container.style.marginBottom = '40px';
                container.setAttribute('data-pagenum', page.pageNumber);
                workspaceCenter.appendChild(container);
            });
        }

        // Intersection Observer for Virtualization / Lazy loading
        let pageObserver;
        function setupIntersectionObserver() {
            if (pageObserver) pageObserver.disconnect();

            const options = {
                root: workspaceCenter,
                rootMargin: '100px 0px 100px 0px',
                threshold: 0.1
            };

            pageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const pageNum = parseInt(entry.target.getAttribute('data-pagenum'));
                    const page = pagesData.find(p => p.pageNumber === pageNum);

                    if (entry.isIntersecting) {
                        if (page && !page.rendered) {
                            renderPageCanvas(page);
                        }
                    } else {
                        if (page && page.rendered) {
                            unloadPageCanvas(page);
                        }
                    }
                });
            }, options);

            document.querySelectorAll('.page-container').forEach(el => pageObserver.observe(el));
        }

        // Render visible page background (pdf.js) & overlay (fabric.js)
        async function renderPageCanvas(page) {
            page.rendered = true;
            const container = document.getElementById(`page-container-${page.pageNumber}`);
            if (!container) return;

            // 1. Render PDF background
            const bgCanvas = document.createElement('canvas');
            bgCanvas.className = 'pdf-canvas-bg';
            bgCanvas.width = page.width * zoomScale;
            bgCanvas.height = page.height * zoomScale;
            container.appendChild(bgCanvas);

            const pdfPage = await pdfDoc.getPage(page.pageIndex);
            const ctx = bgCanvas.getContext('2d');
            const viewport = pdfPage.getViewport({ scale: zoomScale, rotation: page.rotation });
            
            await pdfPage.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;

            // 2. Render Text Layer for click-to-edit
            const textLayerDiv = document.createElement('div');
            textLayerDiv.className = 'textLayer';
            container.appendChild(textLayerDiv);

            const textContent = await pdfPage.getTextContent();
            pdfjsLib.renderTextLayer({
                textContent: textContent,
                container: textLayerDiv,
                viewport: viewport,
                textDivs: []
            });

            // Bind click to textLayer spans
            textLayerDiv.addEventListener('mousedown', (e) => {
                if (activeMode !== 'edit' || e.target.tagName !== 'SPAN') return;
                convertPdfTextToFabric(e.target, page);
            });

            // 3. Create Fabric Canvas Overlay
            const overlayCanvas = document.createElement('canvas');
            overlayCanvas.className = 'fabric-canvas-overlay';
            overlayCanvas.id = `fabric-canvas-${page.pageNumber}`;
            overlayCanvas.width = page.width * zoomScale;
            overlayCanvas.height = page.height * zoomScale;
            container.appendChild(overlayCanvas);

            const fCanvas = new fabric.Canvas(overlayCanvas.id, {
                selection: activeTool === 'select',
                isDrawingMode: activeTool === 'draw'
            });

            page.fabricCanvas = fCanvas;
            fCanvas.setHeight(page.height * zoomScale);
            fCanvas.setWidth(page.width * zoomScale);
            fCanvas.setZoom(zoomScale);

            // Setup history array if not present (e.g. initial load)
            if (!page.history || page.history.length === 0) {
                const initialJSON = page.fabricData || JSON.stringify(fCanvas.toJSON(['isModifiedText', 'associatedSpanId', 'isWhiteoutMask', 'associatedMask', 'excludeFromExport', 'isFormField', 'fieldType', 'fieldName', 'fieldRequired', 'fieldOptions', 'isStickyNote', 'commentId', 'commentText', 'isSignature', 'isImage', 'stampText']));
                page.history = [ initialJSON ];
                page.historyIndex = 0;
            }

            // Re-load annotations from state
            if (page.fabricData) {
                isUndoingRedoing = true;
                fCanvas.loadFromJSON(page.fabricData, () => {
                    fCanvas.renderAll();
                    isUndoingRedoing = false;
                    updateObjectListeners(fCanvas, page);
                    syncHiddenSpans(page);
                    updateUndoRedoButtons();
                });
            } else {
                updateObjectListeners(fCanvas, page);
                syncHiddenSpans(page);
                updateUndoRedoButtons();
            }

            // Sync drawing brush values
            fCanvas.freeDrawingBrush.color = strokeColor;
            fCanvas.freeDrawingBrush.width = brushWidth;

            // Mouse Click interaction events depending on selected tool
            fCanvas.on('mouse:down', (options) => {
                handleCanvasClick(options, page);
            });
        }

        // Unload invisible canvas to free browser RAM
        function unloadPageCanvas(page) {
            if (page.fabricCanvas) {
                // Save state to pagesData with custom attributes
                page.fabricData = JSON.stringify(page.fabricCanvas.toJSON(['isModifiedText', 'associatedSpanId', 'isWhiteoutMask', 'associatedMask', 'excludeFromExport', 'isFormField', 'fieldType', 'fieldName', 'fieldRequired', 'fieldOptions', 'isStickyNote', 'commentId', 'commentText', 'isSignature', 'isImage', 'stampText']));
                page.fabricCanvas.dispose();
                page.fabricCanvas = null;
            }
            const container = document.getElementById(`page-container-${page.pageNumber}`);
            if (container) {
                container.innerHTML = ''; // wipe elements
            }
            page.rendered = false;
        }

        // ------------------ THUMBNAILS RENDER ------------------
        async function renderThumbnails() {
            thumbnailsList.innerHTML = '';
            for (let page of pagesData) {
                const thumbItem = document.createElement('div');
                thumbItem.className = `thumb-item ${page.pageNumber === currentActivePage ? 'active' : ''}`;
                thumbItem.setAttribute('data-pagenum', page.pageNumber);
                thumbItem.onclick = () => jumpToPage(page.pageNumber);
                
                // HTML5 Drag & Drop page reordering support
                thumbItem.setAttribute('draggable', 'true');
                thumbItem.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', page.pageNumber);
                });
                thumbItem.addEventListener('dragover', (e) => {
                    e.preventDefault();
                });
                thumbItem.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    const srcPageNum = parseInt(e.dataTransfer.getData('text/plain'));
                    const destPageNum = page.pageNumber;
                    if (srcPageNum === destPageNum) return;

                    // Reorder pagesData
                    const srcIndex = pagesData.findIndex(p => p.pageNumber === srcPageNum);
                    const destIndex = pagesData.findIndex(p => p.pageNumber === destPageNum);

                    const [movedPage] = pagesData.splice(srcIndex, 1);
                    pagesData.splice(destIndex, 0, movedPage);

                    // Reassign sequential pageNumbers
                    pagesData.forEach((p, idx) => {
                        p.pageNumber = idx + 1;
                    });

                    // Sync active fabric canvasses back to state
                    pagesData.forEach(p => {
                        if (p.fabricCanvas) {
                            p.fabricData = JSON.stringify(p.fabricCanvas.toJSON(['isModifiedText', 'associatedSpanId', 'isWhiteoutMask', 'associatedMask', 'excludeFromExport', 'isFormField', 'fieldType', 'fieldName', 'fieldRequired', 'fieldOptions', 'isStickyNote', 'commentId', 'commentText', 'isSignature', 'isImage', 'stampText']));
                        }
                    });

                    renderWorkspaceShell();
                    setupIntersectionObserver();
                    await renderThumbnails();
                    jumpToPage(destPageNum);
                });

                const canvas = document.createElement('canvas');
                canvas.width = 110;
                canvas.height = 145;
                thumbItem.appendChild(canvas);

                const label = document.createElement('div');
                label.className = 'thumb-number';
                label.innerText = page.pageNumber;
                thumbItem.appendChild(label);

                // Thumbnail Actions
                const actions = document.createElement('div');
                actions.className = 'thumb-actions';
                actions.innerHTML = `
                    <button class="thumb-act-btn" onclick="rotatePage(${page.pageNumber}, event)" title="Rotate 90"><i data-lucide="rotate-cw"></i></button>
                    <button class="thumb-act-btn" onclick="duplicatePage(${page.pageNumber}, event)" title="Duplicate Page"><i data-lucide="copy"></i></button>
                    <button class="thumb-act-btn" onclick="deletePage(${page.pageNumber}, event)" title="Delete Page" style="color:#EF4444;"><i data-lucide="trash-2"></i></button>
                `;
                thumbItem.appendChild(actions);

                thumbnailsList.appendChild(thumbItem);

                // Render thumbnail asynchronously using pdf.js
                const pdfPage = await pdfDoc.getPage(page.pageIndex);
                const ctx = canvas.getContext('2d');
                const viewport = pdfPage.getViewport({ scale: 110 / viewportWidth(pdfPage), rotation: page.rotation });
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await pdfPage.render({ canvasContext: ctx, viewport: viewport }).promise;
            }
            window.addEventListener('DOMContentLoaded', () => { if (window.lucide) lucide.createIcons(); else window.addEventListener('load', () => window.lucide && lucide.createIcons()); });
        }

        function viewportWidth(page) {
            const vp = page.getViewport({ scale: 1.0 });
            return vp.width;
        }

        // ------------------ VIEWER NAVIGATION & ZOOM ------------------
        function jumpToPage(num) {
            if (num < 1 || num > pagesData.length) return;
            currentActivePage = num;
            pageNumInput.value = num;
            
            document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('active'));
            const activeThumb = document.querySelector(`.thumb-item[data-pagenum="${num}"]`);
            if (activeThumb) activeThumb.classList.add('active');

            const container = document.getElementById(`page-container-${num}`);
            if (container) {
                container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            updateUndoRedoButtons();
        }

        // Track active page scrolling
        workspaceCenter.addEventListener('scroll', () => {
            const containers = document.querySelectorAll('.page-container');
            let activePage = 1;
            let maxVisibleHeight = 0;
            const viewportRect = workspaceCenter.getBoundingClientRect();

            containers.forEach(el => {
                const rect = el.getBoundingClientRect();
                const visibleHeight = Math.min(rect.bottom, viewportRect.bottom) - Math.max(rect.top, viewportRect.top);
                if (visibleHeight > maxVisibleHeight) {
                    maxVisibleHeight = visibleHeight;
                    activePage = parseInt(el.getAttribute('data-pagenum'));
                }
            });

            if (activePage !== currentActivePage) {
                currentActivePage = activePage;
                pageNumInput.value = activePage;
                document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('active'));
                const activeThumb = document.querySelector(`.thumb-item[data-pagenum="${activePage}"]`);
                if (activeThumb) activeThumb.classList.add('active');
                updateUndoRedoButtons();
            }
        });

        // Zoom Operations
        document.getElementById('btnZoomIn').onclick = () => applyZoom(zoomScale + 0.1);
        document.getElementById('btnZoomOut').onclick = () => applyZoom(zoomScale - 0.1);
        document.getElementById('btnZoomFit').onclick = () => {
            const containerWidth = workspaceCenter.clientWidth - 80;
            const docWidth = pagesData[0].width;
            applyZoom(containerWidth / docWidth);
        };

        function applyZoom(newScale) {
            zoomScale = Math.min(Math.max(newScale, 0.4), 2.5);
            zoomPercentLabel.innerText = `${Math.round(zoomScale * 100)}%`;
            
            // Serialize all active canvases
            pagesData.forEach(p => {
                if (p.fabricCanvas) {
                    p.fabricData = JSON.stringify(p.fabricCanvas.toJSON());
                }
            });

            // Re-render layout shell
            renderWorkspaceShell();
            setupIntersectionObserver();
        }

        pageNumInput.onchange = (e) => jumpToPage(parseInt(e.target.value));

        // ------------------ INTERACTIVE DRAWING & CLICKS ------------------
        function handleCanvasClick(options, page) {
            const fCanvas = page.fabricCanvas;
            if (!fCanvas || activeTool === 'pan' || activeTool === 'select') return;

            const pointer = fCanvas.getPointer(options.e);

            if (activeTool === 'text') {
                const textbox = new fabric.Textbox('Type your text here...', {
                    left: pointer.x,
                    top: pointer.y,
                    width: 150,
                    fontSize: parseInt(document.getElementById('textFontSize').value),
                    fontFamily: document.getElementById('textFontFamily').value,
                    fill: strokeColor,
                    hasControls: true
                });
                fCanvas.add(textbox);
                fCanvas.setActiveObject(textbox);
                textbox.enterEditing();
                setTool('select');
            } else if (activeTool === 'highlight') {
                const highlight = new fabric.Rect({
                    left: pointer.x,
                    top: pointer.y,
                    width: 120,
                    height: 24,
                    fill: 'rgba(255, 255, 0, 0.4)',
                    stroke: 'transparent',
                    hasControls: true
                });
                fCanvas.add(highlight);
                setTool('select');
            } else if (activeTool === 'sticky') {
                const comment = prompt('Enter your sticky comment text:');
                if (comment) {
                    addStickyNote(pointer.x, pointer.y, comment, fCanvas, page);
                }
                setTool('select');
            } else if (activeTool === 'shape') {
                createActiveShape(pointer.x, pointer.y, fCanvas);
                setTool('select');
            } else if (activeTool === 'forms') {
                createFormFieldPlaceholder(pointer.x, pointer.y, fCanvas);
                setTool('select');
            }
        }

        // ------------------ CLICK TO EDIT TEXT CONVERSION ------------------
        function extractColorFromCanvas(span, page) {
            try {
                const container = document.getElementById("page-container-" + page.pageNumber);
                const bgCanvas = container.querySelector(".pdf-canvas-bg");
                if (!bgCanvas) return "#000000";
                const canvasRect = bgCanvas.getBoundingClientRect();
                const spanRect = span.getBoundingClientRect();
                const scaleX = bgCanvas.width / canvasRect.width;
                const scaleY = bgCanvas.height / canvasRect.height;
                const searchHeight = spanRect.height * 0.4;
                const searchTop = spanRect.top + (spanRect.height * 0.3);
                const x = Math.floor((spanRect.left - canvasRect.left) * scaleX);
                const y = Math.floor((searchTop - canvasRect.top) * scaleY);
                const w = Math.floor(spanRect.width * scaleX);
                const h = Math.floor(searchHeight * scaleY);
                if (w <= 0 || h <= 0) return "#000000";
                const ctx = bgCanvas.getContext("2d");
                const imgData = ctx.getImageData(x, y, w, h).data;
                let r = 0, g = 0, b = 0, count = 0;
                for (let i = 0; i < imgData.length; i += 4) {
                    const alpha = imgData[i+3];
                    const red = imgData[i];
                    const green = imgData[i+1];
                    const blue = imgData[i+2];
                    if (alpha > 50 && (red < 240 || green < 240 || blue < 240)) {
                        r += red; g += green; b += blue; count++;
                    }
                }
                if (count > 0) {
                    r = Math.round(r / count);
                    g = Math.round(g / count);
                    b = Math.round(b / count);
                    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).padStart(6, "0").slice(-6).toUpperCase();
                }
                const cssColor = window.getComputedStyle(span).color;
                if (cssColor && cssColor !== "rgba(0, 0, 0, 0)" && cssColor !== "transparent") {
                    const match = cssColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
                    if (match) {
                        return "#" + (1 << 24 | parseInt(match[1]) << 16 | parseInt(match[2]) << 8 | parseInt(match[3])).toString(16).padStart(6, "0").slice(-6).toUpperCase();
                    }
                }
                return "#000000";
            } catch (e) {
                return "#000000";
            }
        }

        function convertPdfTextToFabric(span, page) {
            const rect = span.getBoundingClientRect();
            const parentRect = span.parentNode.parentNode.getBoundingClientRect();
            const relativeLeft = (rect.left - parentRect.left) / zoomScale;
            const relativeTop = (rect.top - parentRect.top) / zoomScale;
            const relativeWidth = rect.width / zoomScale;
            const relativeHeight = rect.height / zoomScale;

            const textStr = span.innerText || span.textContent;
            if (!textStr || !textStr.trim()) return;

            const spanId = span.getAttribute("data-span-id") || ("span-" + Math.random().toString(36).substr(2, 9));
            span.setAttribute("data-span-id", spanId);
            span.classList.add("hidden-text");

            const fCanvas = page.fabricCanvas;
            if (!fCanvas) return;

            const whiteoutMask = new fabric.Rect({
                left: relativeLeft,
                top: relativeTop,
                width: relativeWidth + 4,
                height: relativeHeight + 2,
                fill: "#ffffff",
                stroke: "transparent",
                selectable: false,
                evented: false,
                excludeFromExport: false,
                isWhiteoutMask: true
            });
            fCanvas.add(whiteoutMask);
            fCanvas.sendToBack(whiteoutMask);

            const computedStyle = window.getComputedStyle(span);
            let textColor = extractColorFromCanvas(span, page);

            let fontFamily = computedStyle.fontFamily || "Helvetica";
            const fontLower = fontFamily.toLowerCase().replace(/["']/g, "").trim();
            if (fontLower.startsWith("g_") || fontLower.startsWith("g_d") || fontLower.match(/^g_d\d/)) {
                const fallbacks = fontFamily.split(",").map(f => f.trim().replace(/["']/g, ""));
                const knownFonts = ["Arial", "Helvetica", "Times New Roman", "Times", "Courier New", "Courier", "Georgia", "Verdana", "sans-serif", "serif", "monospace"];
                let resolved = "Arial";
                for (let i = 1; i < fallbacks.length; i++) {
                    if (knownFonts.some(k => k.toLowerCase() === fallbacks[i].toLowerCase())) {
                        resolved = fallbacks[i];
                        break;
                    }
                }
                if (resolved === "serif") resolved = "Times New Roman";
                else if (resolved === "monospace") resolved = "Courier New";
                else if (resolved === "sans-serif") resolved = "Arial";
                fontFamily = resolved;
            }

            let cssScaleX = 1;
            let cssScaleY = 1;
            const transformStr = computedStyle.transform;
            if (transformStr && transformStr !== "none") {
                const matrixMatch = transformStr.match(/matrix\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+)/);
                if (matrixMatch) {
                    const parsedX = parseFloat(matrixMatch[1]);
                    const parsedY = parseFloat(matrixMatch[4]);
                    if (parsedX > 0 && isFinite(parsedX)) cssScaleX = parsedX;
                    if (parsedY > 0 && isFinite(parsedY)) cssScaleY = parsedY;
                }
            }

            // Normalize PDF font size to web font size strictly
            let rawFontSize = parseFloat(computedStyle.fontSize) || 12;
            let computedFontSize = (rawFontSize / zoomScale) * 0.85; // Standard PDF.js to Web font normalization

            // Adjust width to undo CSS stretch so text doesn't reflow incorrectly
            const naturalWidth = (cssScaleX !== 1 && cssScaleX > 0) ? (relativeWidth / cssScaleX) + 15 : relativeWidth + 15;

            const editableTextbox = new fabric.Textbox(textStr, {
                left: relativeLeft,
                top: relativeTop,
                width: naturalWidth,
                fontSize: computedFontSize,
                fontFamily: fontFamily,
                fontWeight: computedStyle.fontWeight === "bold" || parseInt(computedStyle.fontWeight) >= 700 ? "bold" : "normal",
                fontStyle: computedStyle.fontStyle === "italic" ? "italic" : "normal",
                fill: textColor,
                scaleX: cssScaleX,
                scaleY: cssScaleY,
                lineHeight: 1.0,
                hasControls: true,
                selectable: true,
                editable: true,
                isModifiedText: true,
                associatedMask: whiteoutMask,
                associatedSpanId: spanId
            });

            fCanvas.add(editableTextbox);
            document.body.classList.add("editing-fabric-text");
            setTool("select");

            setTimeout(() => {
                fCanvas.setActiveObject(editableTextbox);
                if (fCanvas.hiddenTextarea) {
                    fCanvas.hiddenTextarea.focus = function() {
                        HTMLElement.prototype.focus.call(this, { preventScroll: true });
                    };
                }
                editableTextbox.enterEditing();
                editableTextbox.selectAll();
                fCanvas.renderAll();
            }, 50);

            editableTextbox.on("editing:exited", () => {
                document.body.classList.remove("editing-fabric-text");
            });
        }


        // ------------------ PROPERTIES PANEL CONTROLS ------------------
        function setupToolEvents() {
            // Modes
            document.getElementById('modeAnnotate').onclick = () => setMode('annotate');
            document.getElementById('modeEdit').onclick = () => setMode('edit');

            // Category Tools
            document.getElementById('toolPan').onclick = () => setTool('pan');
            document.getElementById('toolSelect').onclick = () => setTool('select');
            document.getElementById('toolHighlight').onclick = () => setTool('highlight');
            document.getElementById('toolDraw').onclick = () => setTool('draw');
            document.getElementById('toolText').onclick = () => setTool('text');
            document.getElementById('toolSticky').onclick = () => setTool('sticky');
            document.getElementById('toolShape').onclick = () => setTool('shape');
            document.getElementById('toolForms').onclick = () => setTool('forms');
            document.getElementById('toolInsert').onclick = () => openModal('stampsModal');
            document.getElementById('toolSignature').onclick = () => openModal('sigModal');

            // Watermark & Headers
            document.getElementById('btnWatermarkModal').onclick = () => openModal('watermarkModal');
            document.getElementById('btnPageNumModal').onclick = () => openModal('pageNumModal');

            // Text configuration bindings
            document.getElementById('textFontFamily').onchange = (e) => updateTextProp('fontFamily', e.target.value);
            document.getElementById('textFontSize').onchange = (e) => updateTextProp('fontSize', parseInt(e.target.value));
            
            document.getElementById('btnBold').onclick = () => toggleTextFormat('bold');
            document.getElementById('btnItalic').onclick = () => toggleTextFormat('italic');
            document.getElementById('btnUnderline').onclick = () => toggleTextFormat('underline');
            document.getElementById('btnStrike').onclick = () => toggleTextFormat('linethrough');

            document.getElementById('btnAlignLeft').onclick = () => updateTextProp('textAlign', 'left');
            document.getElementById('btnAlignCenter').onclick = () => updateTextProp('textAlign', 'center');
            document.getElementById('btnAlignRight').onclick = () => updateTextProp('textAlign', 'right');

            // Shapes panel bindings
            document.getElementById('shapeStrokeWidth').onchange = (e) => updateShapeProp('strokeWidth', parseInt(e.target.value));

            // Color palettes rendering
            renderColorPalette('shapeStrokePalette', colorsList, (color) => {
                strokeColor = color;
                updateShapeProp('stroke', color);
                updateTextProp('fill', color);
                pagesData.forEach(p => {
                    if (p.fabricCanvas) {
                        p.fabricCanvas.freeDrawingBrush.color = color;
                    }
                });
            });

            renderColorPalette('shapeFillPalette', colorsList, (color) => {
                fillColor = color;
                updateShapeProp('fill', color);
            });
        }

        function setMode(mode) {
            activeMode = mode;
            document.getElementById('modeAnnotate').classList.toggle('active', mode === 'annotate');
            document.getElementById('modeEdit').classList.toggle('active', mode === 'edit');
            
            if (mode === 'edit') {
                document.body.classList.add('studio-edit-mode');
                setTool('select');
            } else {
                document.body.classList.remove('studio-edit-mode');
                document.body.classList.remove('editing-fabric-text');
            }
        }

        function setTool(tool) {
            activeTool = tool;
            document.querySelectorAll('.tool-btn').forEach(el => el.classList.remove('active'));
            
            const btn = document.getElementById(`tool${tool.charAt(0).toUpperCase() + tool.slice(1)}`);
            if (btn) btn.classList.add('active');

            pagesData.forEach(p => {
                const canvas = p.fabricCanvas;
                if (!canvas) return;

                canvas.selection = (tool === 'select');
                canvas.isDrawingMode = (tool === 'draw');
                canvas.forEachObject(obj => {
                    obj.selectable = (tool === 'select');
                });
                canvas.renderAll();
            });
        }

        function renderColorPalette(id, list, callback) {
            const container = document.getElementById(id);
            container.innerHTML = '';
            list.forEach(c => {
                const b = document.createElement('div');
                b.className = 'color-bubble';
                b.style.backgroundColor = c === 'transparent' ? 'white' : c;
                if (c === 'transparent') b.style.backgroundImage = 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)';
                b.onclick = () => {
                    container.querySelectorAll('.color-bubble').forEach(el => el.classList.remove('active'));
                    b.classList.add('active');
                    callback(c);
                };
                container.appendChild(b);
            });
        }

        // Contextual updates on Fabric Canvas
        function updateTextProp(prop, val) {
            pagesData.forEach(p => {
                if (p.fabricCanvas) {
                    const active = p.fabricCanvas.getActiveObject();
                    if (active && (active.type === 'textbox' || active.type === 'text')) {
                        active.set(prop, val);
                        p.fabricCanvas.renderAll();
                        saveCanvasHistory(p);
                    }
                }
            });
        }

        function toggleTextFormat(format) {
            pagesData.forEach(p => {
                if (p.fabricCanvas) {
                    const active = p.fabricCanvas.getActiveObject();
                    if (active && (active.type === 'textbox' || active.type === 'text')) {
                        if (format === 'bold') active.set('fontWeight', active.fontWeight === 'bold' ? 'normal' : 'bold');
                        if (format === 'italic') active.set('fontStyle', active.fontStyle === 'italic' ? 'normal' : 'italic');
                        if (format === 'underline') active.set('underline', !active.underline);
                        if (format === 'linethrough') active.set('linethrough', !active.linethrough);
                        p.fabricCanvas.renderAll();
                        saveCanvasHistory(p);
                    }
                }
            });
        }

        function updateShapeProp(prop, val) {
            pagesData.forEach(p => {
                if (p.fabricCanvas) {
                    const active = p.fabricCanvas.getActiveObject();
                    if (active && active.type !== 'textbox' && active.type !== 'text') {
                        active.set(prop, val);
                        p.fabricCanvas.renderAll();
                        saveCanvasHistory(p);
                    }
                }
            });
        }

        // Listener for Undo Stack
        function updateObjectListeners(canvas, page) {
            canvas.on('object:added', () => saveCanvasHistory(page));
            canvas.on('object:modified', () => saveCanvasHistory(page));
            canvas.on('object:removed', () => saveCanvasHistory(page));
            canvas.on('selection:created', (e) => updatePropertiesPanel(e.selected[0]));
            canvas.on('selection:updated', (e) => updatePropertiesPanel(e.selected[0]));
        }

        function updatePropertiesPanel(obj) {
            if (!obj) return;
            if (obj.type === "textbox" || obj.type === "text") {
                const selectEl = document.getElementById("textFontFamily");
                if (obj.fontFamily) {
                    let found = Array.from(selectEl.options).some(opt => opt.value === obj.fontFamily);
                    if (!found) {
                        selectEl.add(new Option(obj.fontFamily, obj.fontFamily));
                    }
                    selectEl.value = obj.fontFamily;
                } else {
                    selectEl.value = "Helvetica";
                }
                document.getElementById("textFontSize").value = Math.round(obj.fontSize) || 12;
                document.getElementById("btnBold").classList.toggle("active", obj.fontWeight === "bold");
                document.getElementById("btnItalic").classList.toggle("active", obj.fontStyle === "italic");
                document.getElementById("btnUnderline").classList.toggle("active", obj.underline === true);
                if (obj.fill) {
                    strokeColor = obj.fill;
                    const container = document.getElementById("shapeStrokePalette");
                    if (container) {
                        container.querySelectorAll(".color-bubble").forEach(el => {
                            el.classList.remove("active");
                            const bg = el.style.backgroundColor.replace(/\s/g, "");
                            if (bg === obj.fill || bg === obj.fill.replace(/\s/g, "") || (obj.fill === "transparent" && bg === "white" && el.style.backgroundImage)) {
                                el.classList.add("active");
                            }
                        });
                    }
                }
            }
        }


        // ------------------ UNDO / REDO & SYNC ------------------
        function saveCanvasHistory(page) {
            if (isUndoingRedoing || !page.fabricCanvas) return;
            const currentState = JSON.stringify(page.fabricCanvas.toJSON(['isModifiedText', 'associatedSpanId', 'isWhiteoutMask', 'associatedMask', 'excludeFromExport', 'isFormField', 'fieldType', 'fieldName', 'fieldRequired', 'fieldOptions', 'isStickyNote', 'commentId', 'commentText', 'isSignature', 'isImage', 'stampText']));
            
            // If identical to current state, ignore
            if (page.historyIndex >= 0 && page.history[page.historyIndex] === currentState) {
                return;
            }

            // Truncate redo
            page.history = page.history.slice(0, page.historyIndex + 1);
            page.history.push(currentState);
            page.historyIndex = page.history.length - 1;

            updateUndoRedoButtons();
        }

        function updateUndoRedoButtons() {
            const page = pagesData.find(p => p.pageNumber === currentActivePage);
            if (page && page.history && page.historyIndex !== undefined) {
                document.getElementById('btnUndo').disabled = (page.historyIndex <= 0);
                document.getElementById('btnRedo').disabled = (page.historyIndex >= page.history.length - 1);
            } else {
                document.getElementById('btnUndo').disabled = true;
                document.getElementById('btnRedo').disabled = true;
            }
        }

        function syncHiddenSpans(page) {
            const container = document.getElementById(`page-container-${page.pageNumber}`);
            if (!container) return;

            // Unhide all text layer spans first
            container.querySelectorAll('.textLayer span').forEach(span => {
                span.classList.remove('hidden-text');
            });

            // Find all active textboxes that modify existing PDF text and hide their associated spans
            if (page.fabricCanvas) {
                page.fabricCanvas.forEachObject(obj => {
                    if (obj.isModifiedText && obj.associatedSpanId) {
                        const span = container.querySelector(`.textLayer span[data-span-id="${obj.associatedSpanId}"]`);
                        if (span) {
                            span.classList.add('hidden-text');
                        }
                    }
                });
            }
        }

        document.getElementById('btnUndo').onclick = () => {
            const page = pagesData.find(p => p.pageNumber === currentActivePage);
            if (!page || !page.fabricCanvas || page.historyIndex <= 0 || isUndoingRedoing) return;

            // Exit any active text editing state before restoring history
            page.fabricCanvas.discardActiveObject();
            document.body.classList.remove('editing-fabric-text');

            isUndoingRedoing = true;
            page.historyIndex--;
            const prevState = page.history[page.historyIndex];

            page.fabricCanvas.loadFromJSON(prevState, () => {
                page.fabricCanvas.renderAll();
                isUndoingRedoing = false;
                syncHiddenSpans(page);
                updateUndoRedoButtons();
            });
        };

        document.getElementById('btnRedo').onclick = () => {
            const page = pagesData.find(p => p.pageNumber === currentActivePage);
            if (!page || !page.fabricCanvas || !page.history || page.historyIndex >= page.history.length - 1 || isUndoingRedoing) return;

            // Exit any active text editing state before restoring history
            page.fabricCanvas.discardActiveObject();
            document.body.classList.remove('editing-fabric-text');

            isUndoingRedoing = true;
            page.historyIndex++;
            const nextState = page.history[page.historyIndex];

            page.fabricCanvas.loadFromJSON(nextState, () => {
                page.fabricCanvas.renderAll();
                isUndoingRedoing = false;
                syncHiddenSpans(page);
                updateUndoRedoButtons();
            });
        };

        // Keyboard bindings
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (!document.getElementById('btnUndo').disabled) {
                    document.getElementById('btnUndo').click();
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                if (!document.getElementById('btnRedo').disabled) {
                    document.getElementById('btnRedo').click();
                }
            }
        });

        // ------------------ MODALS POPUP LOGIC ------------------
        function openModal(id) {
            document.getElementById(id).style.display = 'flex';
        }
        function closeModal(id) {
            document.getElementById(id).style.display = 'none';
        }

        // ------------------ PAGE TOOLS & OPERATIONS ------------------
        async function rotatePage(num, event) {
            if (event) event.stopPropagation();
            const page = pagesData.find(p => p.pageNumber === num);
            if (page) {
                page.rotation = (page.rotation + 90) % 360;
                
                // Swap dimensions for 90/270 deg
                const temp = page.width;
                page.width = page.height;
                page.height = temp;

                // Re-render
                renderWorkspaceShell();
                setupIntersectionObserver();
                await renderThumbnails();
            }
        }

        async function duplicatePage(num, event) {
            if (event) event.stopPropagation();
            const page = pagesData.find(p => p.pageNumber === num);
            if (page) {
                if (page.fabricCanvas) {
                    page.fabricData = JSON.stringify(page.fabricCanvas.toJSON(['isModifiedText', 'associatedSpanId', 'isWhiteoutMask', 'associatedMask', 'excludeFromExport', 'isFormField', 'fieldType', 'fieldName', 'fieldRequired', 'fieldOptions', 'isStickyNote', 'commentId', 'commentText', 'isSignature', 'isImage', 'stampText']));
                }
                const newPage = Object.assign({}, page);
                newPage.pageNumber = pagesData.length + 1;
                newPage.fabricCanvas = null;
                newPage.rendered = false;
                newPage.history = [];
                newPage.historyIndex = -1;
                pagesData.push(newPage);

                renderWorkspaceShell();
                setupIntersectionObserver();
                await renderThumbnails();
            }
        }

        async function deletePage(num, event) {
            if (event) event.stopPropagation();
            if (pagesData.length <= 1) {
                alert('Document must contain at least one page.');
                return;
            }
            pagesData = pagesData.filter(p => p.pageNumber !== num);
            
            // Re-order page layout numbering
            pagesData.forEach((p, idx) => {
                p.pageNumber = idx + 1;
            });

            renderWorkspaceShell();
            setupIntersectionObserver();
            await renderThumbnails();
        }

        // ------------------ MERGE & SPLIT PDFS ------------------
        // Merging PDFs: Append uploaded document pages to the editor
        document.getElementById('btnMerge').onclick = async () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf';
            input.onchange = async (e) => {
                if (e.target.files.length > 0) {
                    try {
                        const file = e.target.files[0];
                        const arrayBuffer = await file.arrayBuffer();
                        const externalDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        
                        const externalFileId = crypto.randomUUID();
                        pdfBuffers[externalFileId] = arrayBuffer;

                        const startIdx = pagesData.length;
                        for (let i = 1; i <= externalDoc.numPages; i++) {
                            const page = await externalDoc.getPage(i);
                            const viewport = page.getViewport({ scale: 1.0 });
                            
                            pagesData.push({
                                pageIndex: i,
                                pageNumber: startIdx + i,
                                width: viewport.width,
                                height: viewport.height,
                                rotation: 0,
                                fabricData: null,
                                fabricCanvas: null,
                                rendered: false,
                                isMergedSource: true,
                                sourceFileId: externalFileId,
                                history: [],
                                historyIndex: -1
                            });
                        }
                        renderWorkspaceShell();
                        setupIntersectionObserver();
                        await renderThumbnails();
                    } catch (err) {
                        console.error(err);
                        alert('Failed to merge PDF.');
                    }
                }
            };
            input.click();
        };

        // Splitting PDFs: Download a sliced PDF
        document.getElementById('btnSplit').onclick = async () => {
            const rangeStr = prompt('Enter page numbers/ranges to split (e.g. 1-2, 4):');
            if (!rangeStr) return;

            try {
                // Parse range string
                const targetPages = [];
                const parts = rangeStr.split(',');
                parts.forEach(p => {
                    if (p.includes('-')) {
                        const bounds = p.split('-');
                        const start = parseInt(bounds[0]);
                        const end = parseInt(bounds[1]);
                        for (let idx = start; idx <= end; idx++) {
                            targetPages.push(idx);
                        }
                    } else {
                        targetPages.push(parseInt(p));
                    }
                });

                // Load source document from local memory
                const mainBuffer = pdfBuffers[fileId];
                if (!mainBuffer) throw new Error("Document buffer not found in memory.");
                const srcPdfDoc = await PDFLib.PDFDocument.load(mainBuffer);
                const outPdfDoc = await PDFLib.PDFDocument.create();

                for (let pageNum of targetPages) {
                    if (pageNum >= 1 && pageNum <= srcPdfDoc.getPageCount()) {
                        const [copiedPage] = await outPdfDoc.copyPages(srcPdfDoc, [pageNum - 1]);
                        outPdfDoc.addPage(copiedPage);
                    }
                }

                const pdfBytes = await outPdfDoc.save();
                downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), `split_${originalName}`);
            } catch (e) {
                alert('Invalid page range format.');
            }
        };

        // ------------------ ANNOTATION INSERTS ------------------
        function createActiveShape(x, y, canvas) {
            // Draw dummy rectangle shape
            const rect = new fabric.Rect({
                left: x,
                top: y,
                width: 100,
                height: 100,
                fill: fillColor,
                stroke: strokeColor,
                strokeWidth: parseInt(document.getElementById('shapeStrokeWidth').value),
                hasControls: true
            });
            canvas.add(rect);
        }

        function createFormFieldPlaceholder(x, y, canvas) {
            // Render styled form control placeholder
            const field = new fabric.Rect({
                left: x,
                top: y,
                width: 140,
                height: 30,
                fill: 'rgba(59, 130, 246, 0.1)',
                stroke: '#3B82F6',
                strokeWidth: 1.5,
                rx: 4,
                ry: 4,
                hasControls: true,
                isFormField: true,
                fieldType: 'text',
                fieldName: `field_${Date.now()}`
            });
            canvas.add(field);
        }

        // Stamps
        function insertStamp(text, color) {
            const page = pagesData.find(p => p.pageNumber === currentActivePage);
            if (!page || !page.fabricCanvas) return;
            
            const stamp = new fabric.Group([
                new fabric.Rect({
                    width: 160,
                    height: 48,
                    fill: 'transparent',
                    stroke: color,
                    strokeWidth: 3,
                    rx: 8,
                    ry: 8
                }),
                new fabric.Text(text, {
                    fontSize: 18,
                    fontWeight: 'bold',
                    fill: color,
                    originX: 'center',
                    originY: 'center',
                    left: 80,
                    top: 24
                })
            ], {
                left: 100,
                top: 100,
                angle: -15,
                hasControls: true
            });

            page.fabricCanvas.add(stamp);
            closeModal('stampsModal');
        }

        // Sticky Notes (Comments log)
        const commentsList = [];
        function addStickyNote(x, y, text, canvas, page) {
            const id = Date.now();
            const note = new fabric.Path('M 0 0 L 24 0 L 24 24 L 8 24 L 0 32 Z', {
                left: x,
                top: y,
                fill: '#F59E0B',
                stroke: '#D97706',
                strokeWidth: 1,
                hasControls: false,
                isStickyNote: true,
                commentId: id,
                commentText: text
            });
            canvas.add(note);

            commentsList.push({ id, text, pageNum: page.pageNumber });
            renderCommentsLog();
        }

        function renderCommentsLog() {
            const container = document.getElementById('commentsListContainer');
            container.innerHTML = '';
            if (commentsList.length === 0) {
                container.innerHTML = '<div style="font-size:0.8rem; color:#94A3B8; font-style:italic;">No comments placed.</div>';
                return;
            }
            commentsList.forEach(c => {
                const div = document.createElement('div');
                div.className = 'comment-item';
                div.innerHTML = `
                    <div>
                        <strong>Pg ${c.pageNum}:</strong> ${c.text}
                    </div>
                    <button onclick="deleteComment(${c.id})"><i data-lucide="trash-2" style="width:12px;"></i></button>
                `;
                container.appendChild(div);
            });
            window.addEventListener('DOMContentLoaded', () => { if (window.lucide) lucide.createIcons(); else window.addEventListener('load', () => window.lucide && lucide.createIcons()); });
        }

        // ------------------ GLOBAL SETTINGS APPLIERS ------------------
        function applyWatermarkSettings() {
            globalWatermarkText = document.getElementById('watermarkText').value;
            globalWatermarkOpacity = parseFloat(document.getElementById('watermarkOpacity').value) / 100;
            closeModal('watermarkModal');
        }

        function applyPageNumberSettings() {
            globalPageNumbersEnabled = document.getElementById('pageNumEnabled').checked;
            globalPageNumbersFormat = document.getElementById('pageNumFormat').value;
            globalPageNumbersPosition = document.getElementById('pageNumPosition').value;
            closeModal('pageNumModal');
        }

        // ------------------ SIGNATURE PAD LOGIC ------------------
        let sigDrawing = false;
        const sigCanvas = document.getElementById('sigCanvas');
        const sigCtx = sigCanvas.getContext('2d');

        sigCanvas.onmousedown = (e) => {
            sigDrawing = true;
            sigCtx.beginPath();
            sigCtx.moveTo(e.offsetX, e.offsetY);
        };
        sigCanvas.onmousemove = (e) => {
            if (sigDrawing) {
                sigCtx.lineTo(e.offsetX, e.offsetY);
                sigCtx.stroke();
            }
        };
        window.addEventListener('mouseup', () => sigDrawing = false);

        document.getElementById('clearSigDraw').onclick = () => {
            sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
        };

        // Tabs switcher inside Signature Modal
        document.getElementById('tabSigDraw').onclick = () => switchSigTab('SigDraw');
        document.getElementById('tabSigType').onclick = () => switchSigTab('SigType');
        document.getElementById('tabSigUpload').onclick = () => switchSigTab('SigUpload');

        function switchSigTab(tab) {
            document.querySelectorAll('.sig-tab-btn').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.sig-tab-content').forEach(el => el.classList.remove('active'));
            document.getElementById(`tab${tab}`).classList.add('active');
            document.getElementById(`content${tab}`).classList.add('active');
        }

        // Type signature preview handler
        document.getElementById('sigTextInput').oninput = (e) => {
            const preview = document.getElementById('sigTypePreview');
            preview.style.fontFamily = document.getElementById('sigFontSelect').value;
            preview.innerText = e.target.value;
        };

        document.getElementById('sigFontSelect').onchange = (e) => {
            const preview = document.getElementById('sigTypePreview');
            preview.style.fontFamily = e.target.value;
        };

        // Apply signature image to active canvas
        document.getElementById('btnApplySignature').onclick = async () => {
            const activeTab = document.querySelector('.sig-tab-btn.active').id;
            let imgDataUrl = '';

            if (activeTab === 'tabSigDraw') {
                imgDataUrl = sigCanvas.toDataURL();
            } else if (activeTab === 'tabSigType') {
                const text = document.getElementById('sigTextInput').value;
                const font = document.getElementById('sigFontSelect').value;
                
                // Draw text onto temporary hidden canvas
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = 460;
                tempCanvas.height = 150;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.font = `48px "${font}"`;
                tempCtx.fillStyle = '#000000';
                tempCtx.textAlign = 'center';
                tempCtx.textBaseline = 'middle';
                tempCtx.fillText(text, 230, 75);
                imgDataUrl = tempCanvas.toDataURL();
            } else if (activeTab === 'tabSigUpload') {
                const file = document.getElementById('sigImageFile').files[0];
                if (!file) return;
                imgDataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
            }

            if (imgDataUrl) {
                const page = pagesData.find(p => p.pageNumber === currentActivePage);
                if (page && page.fabricCanvas) {
                    fabric.Image.fromURL(imgDataUrl, (img) => {
                        img.scale(0.5);
                        img.set({
                            left: 100,
                            top: 100,
                            hasControls: true
                        });
                        page.fabricCanvas.add(img);
                    });
                }
            }
            closeModal('sigModal');
        };

        // ------------------ PANEL RESIZING (interact.js) ------------------
        function setupResizablePanels() {
            interact('#sidebarLeft').resizable({
                edges: { right: '#sidebarHandle', bottom: false, top: false, left: false },
                listeners: {
                    move(event) {
                        let target = event.target;
                        let x = (parseFloat(target.getAttribute('data-x')) || 0);
                        target.style.width = event.rect.width + 'px';
                        x += event.deltaRect.left;
                        target.setAttribute('data-x', x);
                    }
                },
                modifiers: [
                    interact.modifiers.restrictSize({
                        min: { width: 150 },
                        max: { width: 400 }
                    })
                ]
            });

            interact('#propertiesPanel').resizable({
                edges: { left: '#propsHandle', bottom: false, top: false, right: false },
                listeners: {
                    move(event) {
                        let target = event.target;
                        let x = (parseFloat(target.getAttribute('data-x')) || 0);
                        target.style.width = event.rect.width + 'px';
                        x += event.deltaRect.left;
                        target.setAttribute('data-x', x);
                    }
                },
                modifiers: [
                    interact.modifiers.restrictSize({
                        min: { width: 200 },
                        max: { width: 500 }
                    })
                ]
            });
        }

        // ------------------ COMPILATION & SAVE (pdf-lib) ------------------
        document.getElementById('btnExportPDF').onclick = async () => {
            // Save state from all currently open/active canvases
            pagesData.forEach(p => {
                if (p.fabricCanvas) {
                    p.fabricData = JSON.stringify(p.fabricCanvas.toJSON(['isModifiedText', 'associatedSpanId', 'isWhiteoutMask', 'associatedMask', 'excludeFromExport', 'isFormField', 'fieldType', 'fieldName', 'fieldRequired', 'fieldOptions', 'isStickyNote', 'commentId', 'commentText', 'isSignature', 'isImage', 'stampText']));
                }
            });

            try {
                // Initialize pdf-lib document
                const mainBuffer = pdfBuffers[fileId];
                if (!mainBuffer) throw new Error("Document buffer not found in memory.");
                const pdfLibDoc = await PDFLib.PDFDocument.load(mainBuffer);
                const outDoc = await PDFLib.PDFDocument.create();

                // Standard Fonts embedding
                const helveticaFont = await outDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                const form = outDoc.getForm();

                // Loop through virtual page index sorting
                for (let pageConfig of pagesData) {
                    // Copy page from source document or external merge sources
                    let copiedPage;
                    if (pageConfig.isMergedSource) {
                        const extBuffer = pdfBuffers[pageConfig.sourceFileId];
                        if (!extBuffer) throw new Error("Merged document buffer not found in memory.");
                        const extDoc = await PDFLib.PDFDocument.load(extBuffer);
                        [copiedPage] = await outDoc.copyPages(extDoc, [pageConfig.pageIndex - 1]);
                    } else {
                        [copiedPage] = await outDoc.copyPages(pdfLibDoc, [pageConfig.pageIndex - 1]);
                    }

                    // Set rotation
                    copiedPage.setRotation(PDFLib.degrees(pageConfig.rotation));
                    
                    const newPage = outDoc.addPage(copiedPage);
                    const { width, height } = newPage.getSize();

                    // Map coordinates scale
                    const scaleX = width / pageConfig.width;
                    const scaleY = height / pageConfig.height;

                    // Write Watermark if enabled
                    if (globalWatermarkText) {
                        newPage.drawText(globalWatermarkText, {
                            x: width / 4,
                            y: height / 2,
                            size: 40,
                            font: helveticaFont,
                            color: PDFLib.rgb(0.5, 0.5, 0.5),
                            opacity: globalWatermarkOpacity,
                            rotate: PDFLib.degrees(45)
                        });
                    }

                    // Draw Page Numbers if enabled
                    if (globalPageNumbersEnabled) {
                        let labelText = `Page ${pageConfig.pageNumber}`;
                        if (globalPageNumbersFormat === 'detailed') {
                            labelText += ` of ${pagesData.length}`;
                        }
                        
                        let numX = width - 80;
                        let numY = 24;
                        if (globalPageNumbersPosition === 'bottom-center') {
                            numX = width / 2 - 20;
                        } else if (globalPageNumbersPosition === 'top-right') {
                            numX = width - 80;
                            numY = height - 24;
                        }

                        newPage.drawText(labelText, {
                            x: numX,
                            y: numY,
                            size: 10,
                            font: helveticaFont,
                            color: PDFLib.rgb(0.2, 0.2, 0.2)
                        });
                    }

                    // Check custom Fabric annotations overlay data
                    if (pageConfig.fabricData) {
                        const canvasState = JSON.parse(pageConfig.fabricData);
                        for (let obj of canvasState.objects) {
                            
                            // Map coordinate axes
                            const left = obj.left * scaleX;
                            const bottom = (pageConfig.height - (obj.top + obj.height * obj.scaleY)) * scaleY;
                            const w = obj.width * obj.scaleX * scaleX;
                            const h = obj.height * obj.scaleY * scaleY;

                            if (obj.type === 'textbox' || obj.type === 'text') {
                                // Draw text box back losslessly
                                newPage.drawText(obj.text || '', {
                                    x: left,
                                    y: bottom + (h - (obj.fontSize * scaleY)), // baseline vertical positioning offset
                                    size: obj.fontSize * scaleY,
                                    font: helveticaFont,
                                    color: hexToPdfColor(obj.fill),
                                    maxWidth: w,
                                    lineHeight: (obj.fontSize * scaleY) * 1.2
                                });
                            } else if (obj.type === 'rect') {
                                if (obj.isWhiteoutMask) {
                                    // Mask rect overlay
                                    newPage.drawRectangle({
                                        x: left,
                                        y: bottom,
                                        width: w,
                                        height: h,
                                        color: PDFLib.rgb(1, 1, 1) // white
                                    });
                                } else if (obj.isFormField) {
                                    // Add real interactive PDF Form Field
                                    const textField = form.createTextField(`${obj.fieldName}`);
                                    textField.setText('');
                                    textField.addToPage(newPage, {
                                        x: left,
                                        y: bottom,
                                        width: w,
                                        height: h
                                    });
                                } else {
                                    // Default shape rectangle / highlights
                                    newPage.drawRectangle({
                                        x: left,
                                        y: bottom,
                                        width: w,
                                        height: h,
                                        borderColor: hexToPdfColor(obj.stroke),
                                        borderWidth: obj.strokeWidth ? obj.strokeWidth * scaleY : 0,
                                        color: hexToPdfColor(obj.fill),
                                        opacity: obj.fill.startsWith('rgba') ? 0.4 : 1.0
                                    });
                                }
                            } else if (obj.type === 'image') {
                                const embeddedImg = await outDoc.embedPng(obj.src);
                                newPage.drawImage(embeddedImg, {
                                    x: left,
                                    y: bottom,
                                    width: w,
                                    height: h
                                });
                            } else if (obj.type === 'path') {
                                // Vector Pen stroke lines drawing
                                const paths = obj.path;
                                let pathStr = '';
                                paths.forEach(pt => {
                                    if (pt[0] === 'M') pathStr += `M ${pt[1] * scaleX} ${(pageConfig.height - pt[2]) * scaleY} `;
                                    if (pt[0] === 'Q') pathStr += `Q ${pt[1] * scaleX} ${(pageConfig.height - pt[2]) * scaleY} ${pt[3] * scaleX} ${(pageConfig.height - pt[4]) * scaleY} `;
                                    if (pt[0] === 'L') pathStr += `L ${pt[1] * scaleX} ${(pageConfig.height - pt[2]) * scaleY} `;
                                });
                                
                                newPage.drawSvgPath(pathStr, {
                                    x: 0,
                                    y: 0,
                                    borderColor: hexToPdfColor(obj.stroke),
                                    borderWidth: obj.strokeWidth ? obj.strokeWidth * scaleY : 2
                                });
                            }
                        }
                    }
                }

                const compiledBytes = await outDoc.save();
                downloadBlob(new Blob([compiledBytes], { type: 'application/pdf' }), `edited_${originalName}`);

            } catch (e) {
                console.error(e);
                alert('Export failed. Verify parameters.');
            }
        };

        function hexToPdfColor(hex) {
            if (!hex || hex === 'transparent') return null;
            if (hex.startsWith('rgba')) {
                const parts = hex.match(/\d+(\.\d+)?/g);
                return PDFLib.rgb(parseFloat(parts[0])/255, parseFloat(parts[1])/255, parseFloat(parts[2])/255);
            }
            if (hex.startsWith('#')) {
                const cleanHex = hex.replace('#', '');
                const num = parseInt(cleanHex, 16);
                return PDFLib.rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
            }
            return PDFLib.rgb(0,0,0);
        }

        function downloadBlob(blob, name) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // Toggle panel logic for mobile and desktop sidebars
        function setupTogglePanels() {
            const btnToggleSidebar = document.getElementById('btnToggleSidebar');
            const btnToggleProps = document.getElementById('btnToggleProps');
            const sidebarLeft = document.getElementById('sidebarLeft');
            const propertiesPanel = document.getElementById('propertiesPanel');
            const sidebarHandle = document.getElementById('sidebarHandle');
            const propsHandle = document.getElementById('propsHandle');

            if (btnToggleSidebar) {
                btnToggleSidebar.addEventListener('click', () => {
                    const isCollapsed = sidebarLeft.classList.toggle('collapsed');
                    sidebarLeft.classList.toggle('show-mobile');
                    btnToggleSidebar.classList.toggle('active');
                    if (sidebarHandle) {
                        if (isCollapsed || sidebarLeft.classList.contains('show-mobile')) {
                            sidebarHandle.style.display = 'none';
                        } else {
                            sidebarHandle.style.display = '';
                        }
                    }
                });
            }

            if (btnToggleProps) {
                btnToggleProps.addEventListener('click', () => {
                    const isCollapsed = propertiesPanel.classList.toggle('collapsed');
                    propertiesPanel.classList.toggle('show-mobile');
                    btnToggleProps.classList.toggle('active');
                    if (propsHandle) {
                        if (isCollapsed || propertiesPanel.classList.contains('show-mobile')) {
                            propsHandle.style.display = 'none';
                        } else {
                            propsHandle.style.display = '';
                        }
                    }
                });
            }
        }

        // Run panel toggles setup
        setupTogglePanels();
    
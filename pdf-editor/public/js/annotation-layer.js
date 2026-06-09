// annotation-layer.js
// Handles user interactions (adding text, shapes, images, drawing, moving, resizing)

window.AnnotationLayer = {
    init: function () {
        const state = window.PDFEditor.state;

        // Listen for clicks/drags on the viewport for new elements
        const container = document.getElementById('pagesContainer');

        let isDrawing = false;
        let currentSvgPath = null;
        let currentPathData = '';

        container.addEventListener('mousedown', (e) => {
            if (state.currentTool === 'select') return;

            // Only left click
            if (e.button !== 0) return;

            // Find which page was clicked
            const pageDiv = e.target.closest('.page-container');
            if (!pageDiv) return;

            const annoLayer = pageDiv.querySelector('.annotation-layer');
            const svgLayer = pageDiv.querySelector('.svg-layer');

            if (!annoLayer || !svgLayer) return;

            const rect = annoLayer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const pageNum = parseInt(pageDiv.dataset.page);

            if (state.currentTool === 'text') {
                document.querySelector('.tool-btn[data-tool="select"]').click();
                this.addTextElement(pageNum, x, y);
            }
            else if (state.currentTool === 'shape') {
                document.querySelector('.tool-btn[data-tool="select"]').click();
                this.addShapeElement(pageNum, x, y);
            }
            else if (state.currentTool === 'draw') {
                isDrawing = true;
                const zoom = state.zoom;
                // Start SVG path
                currentPathData = `M ${x / zoom} ${y / zoom}`;

                currentSvgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                currentSvgPath.setAttribute("d", currentPathData);
                currentSvgPath.setAttribute("fill", "none");

                const propStroke = document.getElementById('propShapeStroke').value || '#4f46e5';
                const propStrokeWidth = document.getElementById('propShapeStrokeWidth').value || 2;

                currentSvgPath.setAttribute("stroke", propStroke);
                currentSvgPath.setAttribute("stroke-width", propStrokeWidth);
                currentSvgPath.setAttribute("stroke-linecap", "round");
                currentSvgPath.setAttribute("stroke-linejoin", "round");

                svgLayer.appendChild(currentSvgPath);

                window.History.saveState();

                // Add to state elements
                const elState = {
                    id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    type: 'path',
                    pageIndex: pageNum - 1,
                    pathData: currentPathData,
                    strokeColor: propStroke,
                    strokeWidth: parseInt(propStrokeWidth),
                    opacity: 1.0,
                    x: 0, // Paths use internal SVG coords relative to 0,0
                    y: 0
                };
                state.elements.push(elState);
                currentSvgPath.id = elState.id;
            }
        });

        container.addEventListener('mousemove', (e) => {
            if (!isDrawing || state.currentTool !== 'draw' || !currentSvgPath) return;

            const pageDiv = e.target.closest('.page-container');
            if (!pageDiv) return;

            const rect = pageDiv.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const zoom = state.zoom;

            currentPathData += ` L ${x / zoom} ${y / zoom}`;
            currentSvgPath.setAttribute("d", currentPathData);

            // Update state
            const elState = state.elements.find(el => el.id === currentSvgPath.id);
            if (elState) {
                elState.pathData = currentPathData;
            }
        });

        container.addEventListener('mouseup', () => {
            if (isDrawing) {
                isDrawing = false;
                currentSvgPath = null;
                currentPathData = '';
            }
        });

        // Deselect on click outside
        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.interactive-element') &&
                !e.target.closest('.pdf-text-box') &&
                !e.target.closest('.tool-btn') &&
                !e.target.closest('aside')) {
                this.deselectAll();
            }
        });
    },

    deselectAll: function () {
        document.querySelectorAll('.interactive-element.selected, .pdf-text-box.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Reset properties panels to empty state
        document.getElementById('propTextState').classList.add('hidden');
        document.getElementById('propShapeState').classList.add('hidden');
        document.getElementById('propImageState').classList.add('hidden');
        document.getElementById('propEmptyState').classList.remove('hidden');
    },

    addTextElement: function (pageNum, layerX, layerY) {
        const state = window.PDFEditor.state;
        window.History.saveState();

        const id = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const annoLayer = document.getElementById(`anno-${pageNum}`);

        const zoom = state.zoom;
        const elState = {
            id: id,
            type: 'text',
            pageIndex: pageNum - 1,
            x: layerX / zoom,
            y: layerY / zoom,
            text: '',
            fontFamily: 'Helvetica',
            fontSize: 14,
            color: '#000000',
            opacity: 1.0,
            lineHeight: 1.2
        };

        state.elements.push(elState);
        const el = this.createElementNode(elState, zoom);
        annoLayer.appendChild(el);

        this.selectElement(el, elState);
        el.focus();
    },

    addShapeElement: function (pageNum, layerX, layerY) {
        const state = window.PDFEditor.state;
        window.History.saveState();

        const id = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const annoLayer = document.getElementById(`anno-${pageNum}`);

        // Get active sub-tool
        const activeSub = document.querySelector('.sub-tool.active');
        const shapeType = activeSub ? activeSub.dataset.subTool : 'rect';

        const zoom = state.zoom;
        const elState = {
            id: id,
            type: shapeType, // 'rect', 'circle', 'line'
            pageIndex: pageNum - 1,
            x: layerX / zoom,
            y: layerY / zoom,
            width: 100,
            height: shapeType === 'line' ? 2 : 100,
            fillColor: shapeType === 'line' ? null : '#000000',
            strokeColor: '#4f46e5',
            strokeWidth: 2,
            opacity: 1.0
        };

        state.elements.push(elState);
        const el = this.createElementNode(elState, zoom);
        annoLayer.appendChild(el);

        this.selectElement(el, elState);
    },

    addImageElement: function (pageNum, dataUrl, imgWidth, imgHeight) {
        const state = window.PDFEditor.state;
        window.History.saveState();

        const id = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const annoLayer = document.getElementById(`anno-${pageNum}`);

        const zoom = state.zoom;
        // Default size logic: limit max width to 200px initially
        let w = imgWidth;
        let h = imgHeight;
        if (w > 200) {
            h = (200 / w) * h;
            w = 200;
        }

        const elState = {
            id: id,
            type: 'image',
            pageIndex: pageNum - 1,
            x: 50, // default offset
            y: 50,
            width: w,
            height: h,
            dataUrl: dataUrl,
            opacity: 1.0
        };

        state.elements.push(elState);
        const el = this.createElementNode(elState, zoom);
        annoLayer.appendChild(el);

        this.selectElement(el, elState);
    },

    createElementNode: function (elState, zoom) {
        const el = document.createElement('div');
        el.className = 'interactive-element';
        el.id = elState.id;

        el.style.left = (elState.x * zoom) + 'px';
        el.style.top = (elState.y * zoom) + 'px';
        el.style.opacity = elState.opacity;

        if (elState.type === 'text') {
            el.classList.add('editable-text-element');
            el.contentEditable = true;
            el.style.fontFamily = elState.fontFamily;
            el.style.fontSize = (elState.fontSize * zoom) + 'px';
            el.style.color = elState.color;
            el.style.lineHeight = elState.lineHeight;
            el.textContent = elState.text || '';

            el.addEventListener('input', () => { elState.text = el.innerText; });
            el.addEventListener('blur', () => {
                if (!el.innerText.trim()) {
                    el.remove();
                    window.PDFEditor.state.elements = window.PDFEditor.state.elements.filter(e => e.id !== elState.id);
                }
            });
        }
        else if (['rect', 'circle', 'line'].includes(elState.type)) {
            el.classList.add('shape-element');
            el.style.width = (elState.width * zoom) + 'px';
            el.style.height = (elState.height * zoom) + 'px';

            if (elState.fillColor) el.style.backgroundColor = elState.fillColor;
            if (elState.strokeColor && elState.strokeWidth) {
                el.style.border = `${elState.strokeWidth * zoom}px solid ${elState.strokeColor}`;
            }
            if (elState.type === 'circle') {
                el.style.borderRadius = '50%';
            }
        }
        else if (elState.type === 'image') {
            el.style.width = (elState.width * zoom) + 'px';
            el.style.height = (elState.height * zoom) + 'px';
            const img = document.createElement('img');
            img.src = elState.dataUrl;
            img.className = 'image-element';
            el.appendChild(img);
        }

        this.addResizeHandles(el);

        // Interactions
        el.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            // If clicking a resize handle, let the resize logic handle it
            if (e.target.classList.contains('resize-handle')) return;
            this.startDrag(e, el, elState);
        });

        return el;
    },

    addResizeHandles: function (el) {
        const positions = ['tl', 'tr', 'bl', 'br', 'tc', 'bc', 'ml', 'mr'];
        positions.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle rh-${pos}`;
            handle.addEventListener('mousedown', (e) => this.startResize(e, el, pos));
            el.appendChild(handle);
        });
    },

    selectElement: function (el, elState) {
        if (window.PDFEditor.state.currentTool !== 'select') return;

        this.deselectAll();
        el.classList.add('selected');
        window.PDFEditor.state.selectedElement = elState;

        // Populate properties panel
        document.getElementById('propEmptyState').classList.add('hidden');

        if (elState.type === 'text') {
            document.getElementById('propTextState').classList.remove('hidden');
            document.getElementById('propFontFamily').value = elState.fontFamily;
            document.getElementById('propFontSize').value = elState.fontSize;
            document.getElementById('propFontColor').value = elState.color;
            document.getElementById('propOpacityText').value = elState.opacity;
            document.getElementById('propOpacityTextVal').textContent = Math.round(elState.opacity * 100) + '%';
        }
        else if (['rect', 'circle', 'line'].includes(elState.type)) {
            document.getElementById('propShapeState').classList.remove('hidden');
            if (elState.fillColor) {
                document.getElementById('propShapeFill').value = elState.fillColor;
                document.getElementById('propShapeFillNone').checked = false;
            } else {
                document.getElementById('propShapeFillNone').checked = true;
            }
            document.getElementById('propShapeStroke').value = elState.strokeColor;
            document.getElementById('propShapeStrokeWidth').value = elState.strokeWidth;
            document.getElementById('propOpacityShape').value = elState.opacity;
            document.getElementById('propOpacityShapeVal').textContent = Math.round(elState.opacity * 100) + '%';
        }
        else if (elState.type === 'image') {
            document.getElementById('propImageState').classList.remove('hidden');
            document.getElementById('propOpacityImage').value = elState.opacity;
            document.getElementById('propOpacityImageVal').textContent = Math.round(elState.opacity * 100) + '%';
        }
    },

    startDrag: function (e, el, elState) {
        if (window.PDFEditor.state.currentTool !== 'select') return;
        e.stopPropagation();

        // Don't drag if actively typing text
        if (elState.type === 'text' && document.activeElement === el) return;

        this.selectElement(el, elState);

        const zoom = window.PDFEditor.state.zoom;
        const startX = e.clientX;
        const startY = e.clientY;
        const startElX = elState.x * zoom;
        const startElY = elState.y * zoom;

        let dragged = false;

        const onMouseMove = (ev) => {
            dragged = true;
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            const newX = startElX + dx;
            const newY = startElY + dy;

            el.style.left = newX + 'px';
            el.style.top = newY + 'px';

            elState.x = newX / zoom;
            elState.y = newY / zoom;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            if (dragged) window.History.saveState();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    },

    startResize: function (e, el, pos) {
        e.stopPropagation();
        const state = window.PDFEditor.state;
        const elState = state.selectedElement;
        if (!elState) return;

        const zoom = state.zoom;
        const startX = e.clientX;
        const startY = e.clientY;

        const startElX = elState.x * zoom;
        const startElY = elState.y * zoom;

        // Text elements resize via font size mostly, but for shapes/images we resize container
        const startW = (elState.width || el.offsetWidth / zoom) * zoom;
        const startH = (elState.height || el.offsetHeight / zoom) * zoom;

        let dragged = false;

        const onMouseMove = (ev) => {
            dragged = true;
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            let newW = startW;
            let newH = startH;
            let newX = startElX;
            let newY = startElY;

            if (pos.includes('r')) newW = startW + dx;
            if (pos.includes('l')) { newW = startW - dx; newX = startElX + dx; }
            if (pos.includes('b')) newH = startH + dy;
            if (pos.includes('t')) { newH = startH - dy; newY = startElY + dy; }

            // Constraints
            if (newW < 10) { newW = 10; if (pos.includes('l')) newX = startElX + startW - 10; }
            if (newH < 10) { newH = 10; if (pos.includes('t')) newY = startElY + startH - 10; }

            el.style.width = newW + 'px';
            el.style.height = newH + 'px';
            el.style.left = newX + 'px';
            el.style.top = newY + 'px';

            elState.width = newW / zoom;
            elState.height = newH / zoom;
            elState.x = newX / zoom;
            elState.y = newY / zoom;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            if (dragged) window.History.saveState();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    },

    recalculateZoom: function () {
        const state = window.PDFEditor.state;
        const zoom = state.zoom;

        state.elements.forEach(elState => {
            if (elState.type === 'path') {
                // Update SVG path scaling
                const svg = document.getElementById(elState.id);
                if (svg) {
                    // SVG paths are strictly defined by 'd', need to transform them if we zoom
                    // The easiest way is via CSS transform on the path element
                    svg.setAttribute('transform', `scale(${zoom})`);
                    svg.setAttribute('stroke-width', (elState.strokeWidth || 2) * zoom);
                }
            } else {
                const el = document.getElementById(elState.id);
                if (el) {
                    el.style.left = (elState.x * zoom) + 'px';
                    el.style.top = (elState.y * zoom) + 'px';
                    if (elState.type === 'text') {
                        el.style.fontSize = (elState.fontSize * zoom) + 'px';
                    } else if (elState.width && elState.height) {
                        el.style.width = (elState.width * zoom) + 'px';
                        el.style.height = (elState.height * zoom) + 'px';

                        if (elState.strokeWidth) {
                            el.style.borderWidth = `${elState.strokeWidth * zoom}px`;
                        }
                    }
                }
            }
        });
    },

};

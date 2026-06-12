// toolbar.js
// Handles left toolbar, top bar controls, and right properties panel

window.Toolbar = {
    init: function () {
        this.bindZoomControls();
        this.bindPageControls();
        this.bindToolSelection();
        this.bindPropertiesPanel();

        // Export button
        document.getElementById('btnExport').addEventListener('click', () => {
            window.PDFExporter.export();
        });

        // Undo/Redo
        document.getElementById('btnUndo').addEventListener('click', () => {
            window.History.undo();
        });
        document.getElementById('btnRedo').addEventListener('click', () => {
            window.History.redo();
        });

        // --- DELETE ---
        const deleteSelectedElement = () => {
            const selected = document.querySelector('.interactive-element.selected');
            if (selected) {
                window.History.saveState();
                selected.remove();
                const state = window.PDFEditor.state;
                state.elements = state.elements.filter(el => el.id !== selected.id);
                window.AnnotationLayer.deselectAll();
            }
        };

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // If user is typing in an input or contenteditable, don't delete the element!
                if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable) return;
                deleteSelectedElement();
            }
        });

        document.getElementById('btnDelete').addEventListener('click', deleteSelectedElement);

        // Image Tool File Input
        document.getElementById('imageInput').addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = function (evt) {
                    // Create an offscreen image to get intrinsic dimensions
                    const img = new Image();
                    img.onload = function () {
                        const state = window.PDFEditor.state;
                        // Default to placing image on current page center (or page 1)
                        const pageNum = state.currentPage || 1;
                        window.AnnotationLayer.addImageElement(pageNum, evt.target.result, img.width, img.height);
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);

                // Reset input
                e.target.value = '';
                // Auto switch back to select tool
                document.querySelector('.tool-btn[data-tool="select"]').click();
            }
        });
    },

    bindZoomControls: function () {
        const state = window.PDFEditor.state;
        document.getElementById('btnZoomIn').addEventListener('click', () => {
            if (state.zoom < 3.0) { state.zoom += 0.25; window.PDFRenderer.updateZoom(); }
        });
        document.getElementById('btnZoomOut').addEventListener('click', () => {
            if (state.zoom > 0.5) { state.zoom -= 0.25; window.PDFRenderer.updateZoom(); }
        });
    },

    bindPageControls: function () {
        const state = window.PDFEditor.state;
        const container = document.getElementById('viewport');

        document.getElementById('btnPrevPage').addEventListener('click', () => {
            container.scrollBy({ top: -container.clientHeight * 0.8, behavior: 'smooth' });
        });
        document.getElementById('btnNextPage').addEventListener('click', () => {
            container.scrollBy({ top: container.clientHeight * 0.8, behavior: 'smooth' });
        });

        container.addEventListener('scroll', () => {
            const pages = document.querySelectorAll('.page-container');
            let current = 1;
            pages.forEach(p => {
                const rect = p.getBoundingClientRect();
                if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
                    current = parseInt(p.dataset.page);
                }
            });
            document.getElementById('currentPageDisplay').textContent = current;
            state.currentPage = current;
        });
    },

    bindToolSelection: function () {
        const state = window.PDFEditor.state;
        const btns = document.querySelectorAll('.tool-btn[data-tool]');

        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentTool = btn.dataset.tool;

                const annoLayers = document.querySelectorAll('.annotation-layer');
                const svgLayers = document.querySelectorAll('.svg-layer');

                if (state.currentTool === 'text') {
                    annoLayers.forEach(l => l.style.cursor = 'text');
                    svgLayers.forEach(l => l.classList.remove('active'));
                } else if (state.currentTool === 'shape') {
                    annoLayers.forEach(l => l.style.cursor = 'crosshair');
                    svgLayers.forEach(l => l.classList.remove('active'));
                } else if (state.currentTool === 'draw') {
                    annoLayers.forEach(l => l.style.cursor = 'crosshair');
                    svgLayers.forEach(l => l.classList.add('active'));
                } else if (state.currentTool === 'image') {
                    annoLayers.forEach(l => l.style.cursor = 'default');
                    svgLayers.forEach(l => l.classList.remove('active'));
                    document.getElementById('imageInput').click();
                    setTimeout(() => document.querySelector('.tool-btn[data-tool="select"]').click(), 50);
                } else {
                    annoLayers.forEach(l => l.style.cursor = 'default');
                    svgLayers.forEach(l => l.classList.remove('active'));
                }

                window.AnnotationLayer.deselectAll();
            });
        });

        // Shape sub-tools
        const subBtns = document.querySelectorAll('.sub-tool');
        subBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent closing menu immediately
                subBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Set primary tool to shape and update icon
                document.querySelector('.tool-btn[data-tool="shape"]').click();
                const primaryIcon = document.querySelector('.tool-btn[data-tool="shape"] > i');
                primaryIcon.setAttribute('data-lucide', btn.querySelector('i').getAttribute('data-lucide'));
                lucide.createIcons();
            });
        });
    },

    bindPropertiesPanel: function () {
        const state = window.PDFEditor.state;

        // --- TEXT PROPERTIES ---
        document.getElementById('propFontFamily').addEventListener('change', (e) => {
            this.updateSelectedElement({ fontName: e.target.value }, el => el.style.fontFamily = e.target.value);
        });
        document.getElementById('propFontSize').addEventListener('input', (e) => {
            const size = parseInt(e.target.value) || 14;
            this.updateSelectedElement({ fontSize: size }, el => el.style.fontSize = (size * state.zoom) + 'px');
        });
        document.getElementById('propFontSize').addEventListener('change', () => window.History.saveState());
        document.getElementById('propFontColor').addEventListener('input', (e) => {
            this.updateSelectedElement({ color: e.target.value }, el => el.style.color = e.target.value);
        });
        document.getElementById('propFontColor').addEventListener('change', () => window.History.saveState());
        document.getElementById('propOpacityText').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById('propOpacityTextVal').textContent = Math.round(val * 100) + '%';
            this.updateSelectedElement({ opacity: val }, el => el.style.opacity = val);
        });
        document.getElementById('propOpacityText').addEventListener('change', () => window.History.saveState());

        // --- SHAPE PROPERTIES ---
        document.getElementById('propShapeFill').addEventListener('input', (e) => {
            document.getElementById('propShapeFillNone').checked = false;
            this.updateSelectedElement({ fillColor: e.target.value }, el => el.style.backgroundColor = e.target.value);
        });
        document.getElementById('propShapeFill').addEventListener('change', () => window.History.saveState());
        document.getElementById('propShapeFillNone').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.updateSelectedElement({ fillColor: null }, el => el.style.backgroundColor = 'transparent');
                window.History.saveState();
            } else {
                const color = document.getElementById('propShapeFill').value;
                this.updateSelectedElement({ fillColor: color }, el => el.style.backgroundColor = color);
                window.History.saveState();
            }
        });
        document.getElementById('propShapeStroke').addEventListener('input', (e) => {
            this.updateSelectedElement({ strokeColor: e.target.value }, el => {
                const elState = state.elements.find(x => x.id === el.id);
                el.style.borderColor = e.target.value;
            });
        });
        document.getElementById('propShapeStrokeWidth').addEventListener('input', (e) => {
            const w = parseInt(e.target.value) || 0;
            this.updateSelectedElement({ strokeWidth: w }, el => {
                el.style.borderWidth = `${w * state.zoom}px`;
            });
        });
        document.getElementById('propOpacityShape').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById('propOpacityShapeVal').textContent = Math.round(val * 100) + '%';
            this.updateSelectedElement({ opacity: val }, el => el.style.opacity = val);
        });

        // --- IMAGE PROPERTIES ---
        document.getElementById('propOpacityImage').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById('propOpacityImageVal').textContent = Math.round(val * 100) + '%';
            this.updateSelectedElement({ opacity: val }, el => el.style.opacity = val);
        });
    },

    updateSelectedElement: function (changes, domCallback) {
        const state = window.PDFEditor.state;
        const selected = document.querySelector('.interactive-element.selected');

        if (selected) {
            const elState = state.elements.find(e => e.id === selected.id);
            if (elState) {
                Object.assign(elState, changes);
                if (domCallback) domCallback(selected);
            }
        } else {
            // Check if it's an extracted text box
            const extracted = document.querySelector('.pdf-text-box.selected');
            if (extracted) {
                // Find original extracted item
                const item = state.extractedText.find(e => e.id === extracted.id);
                if (!item) return;

                window.History.saveState();

                // Ensure replacement exists
                let replacement = state.replacements.find(r => r.originalText === item.text && r.x === item.x && r.y === item.y);
                if (!replacement) {
                    replacement = {
                        type: 'text-replacement',
                        pageIndex: item.pageIndex,
                        originalText: item.text,
                        newText: item.text, // Text hasn't changed, just props
                        x: item.x,
                        y: item.y,
                        width: item.width,
                        height: item.height,
                        fontSize: item.fontSize,
                        fontName: item.humanFontName || item.fontFamily,
                        color: item.color,
                        fontWeight: item.fontWeight,
                        fontStyle: item.fontStyle
                    };
                    state.replacements.push(replacement);
                }

                Object.assign(replacement, changes);

                // Update visual styling of the box to overlay original
                extracted.textContent = replacement.newText;
                extracted.style.whiteSpace = 'nowrap';
                extracted.style.fontFamily = replacement.fontName;
                extracted.style.fontSize = (replacement.fontSize * state.zoom) + 'px';
                extracted.style.color = replacement.color;
                extracted.style.fontWeight = replacement.fontWeight;
                extracted.style.fontStyle = replacement.fontStyle;
                extracted.style.backgroundColor = 'transparent';
            }
        }
    }
};

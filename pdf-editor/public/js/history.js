// history.js
// Handles undo/redo stack (minimum 50 steps)

window.History = {
    stack: [],
    currentIndex: -1,
    maxSteps: 50,

    saveState: function() {
        const state = window.PDFEditor.state;
        
        if (this.currentIndex < this.stack.length - 1) {
            this.stack = this.stack.slice(0, this.currentIndex + 1);
        }

        const snapshot = {
            elements: JSON.parse(JSON.stringify(state.elements)),
            replacements: JSON.parse(JSON.stringify(state.replacements || []))
        };
        
        this.stack.push(snapshot);
        
        if (this.stack.length > this.maxSteps) {
            this.stack.shift();
        } else {
            this.currentIndex++;
        }
        
        state.isDirty = true;
    },

    undo: function() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.applyState(this.stack[this.currentIndex]);
        } else if (this.currentIndex === 0) {
            this.currentIndex = -1;
            this.applyState({ elements: [], replacements: [] });
        }
    },

    redo: function() {
        if (this.currentIndex < this.stack.length - 1) {
            this.currentIndex++;
            this.applyState(this.stack[this.currentIndex]);
        }
    },

    applyState: function(snapshot) {
        const state = window.PDFEditor.state;
        const zoom = state.zoom;
        
        state.elements = JSON.parse(JSON.stringify(snapshot.elements || []));
        state.replacements = JSON.parse(JSON.stringify(snapshot.replacements || []));
        
        document.querySelectorAll('.interactive-element').forEach(el => el.remove());
        document.querySelectorAll('.svg-layer path').forEach(el => el.remove());
        window.AnnotationLayer.deselectAll();
        
        // Restore replaced text overlay UI
        document.querySelectorAll('.pdf-text-box').forEach(box => {
            const item = state.extractedText.find(e => e.id === box.id);
            if (item) {
                box.textContent = item.text;
                box.style.color = 'transparent';
                box.style.fontFamily = item.fontFamily;
                box.style.fontSize = (item.fontSize * zoom) + 'px';
                box.style.fontWeight = item.fontWeight;
                box.style.fontStyle = item.fontStyle;
                box.dataset.modifiedFont = '';
                
                const mask = document.getElementById(`mask_${item.id}`);
                if (mask) mask.style.display = 'none';
            }
        });
        
        state.replacements.forEach(r => {
            // Find the corresponding box by coords
            const item = state.extractedText.find(e => e.x === r.x && e.y === r.y && e.text === r.originalText);
            if (item) {
                const box = document.getElementById(item.id);
                if (box) {
                    box.textContent = r.newText;
                    box.style.color = r.color;
                    box.style.fontFamily = r.fontName;
                    box.style.fontSize = (r.fontSize * zoom) + 'px';
                    box.style.fontWeight = r.fontWeight;
                    box.style.fontStyle = r.fontStyle;
                    box.style.whiteSpace = 'nowrap';
                    box.style.backgroundColor = 'transparent';
                    
                    const mask = document.getElementById(`mask_${item.id}`);
                    if (mask) mask.style.display = 'block';
                }
            }
        });
        
        state.elements.forEach(elState => {
            if (elState.type === 'path') {
                const svgLayer = document.getElementById(`svg-${elState.pageIndex + 1}`);
                if (svgLayer) {
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.id = elState.id;
                    path.setAttribute("d", elState.pathData);
                    path.setAttribute("fill", "none");
                    path.setAttribute("stroke", elState.strokeColor);
                    path.setAttribute("stroke-width", elState.strokeWidth);
                    path.setAttribute("stroke-linecap", "round");
                    path.setAttribute("stroke-linejoin", "round");
                    path.setAttribute("transform", `scale(${zoom})`);
                    svgLayer.appendChild(path);
                }
            } else {
                const annoLayer = document.getElementById(`anno-${elState.pageIndex + 1}`);
                if (annoLayer) {
                    const el = window.AnnotationLayer.createElementNode(elState, zoom);
                    annoLayer.appendChild(el);
                }
            }
        });
    }
};

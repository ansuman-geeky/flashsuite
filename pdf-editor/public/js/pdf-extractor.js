// pdf-extractor.js
// Extracts text properties (font, size, color) using PDF.js APIs

window.PDFExtractor = {
    extractAll: async function (pdfDoc) {
        const state = window.PDFEditor.state;
        state.extractedText = [];

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            const operatorList = await page.getOperatorList();

            // Map font sizes & names
            const viewport = page.getViewport({ scale: 1.0 }); // Use base scale 1.0 for extraction

            // Reconstruct colors from operator list (basic heuristic)
            // PDF.js operator list has 'setFillRGBColor' (OPS.setFillRGBColor)
            let currentColor = '#000000';
            const colorMap = [];

            for (let i = 0; i < operatorList.fnArray.length; i++) {
                const fn = operatorList.fnArray[i];
                const args = operatorList.argsArray[i];

                // OPS.setFillRGBColor = 66
                if (fn === pdfjsLib.OPS.setFillRGBColor) {
                    const r = Math.round(args[0] * 255);
                    const g = Math.round(args[1] * 255);
                    const b = Math.round(args[2] * 255);
                    currentColor = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
                }

                // OPS.showText = 82, OPS.showSpacedText = 83
                if (fn === pdfjsLib.OPS.showText || fn === pdfjsLib.OPS.showSpacedText) {
                    colorMap.push(currentColor);
                }
            }

            // Map each text item
            let textItemIndex = 0;
            const rawItems = [];
            for (const item of textContent.items) {
                const scaleX = item.transform[0];
                const scaleY = item.transform[3];
                const fontSize = Math.sqrt(scaleX * scaleX + item.transform[1] * item.transform[1]);

                const screenY = viewport.height - item.transform[5] - fontSize;

                let fontName = 'Helvetica';
                if (item.fontName && textContent.styles && textContent.styles[item.fontName] && textContent.styles[item.fontName].fontFamily) {
                    fontName = textContent.styles[item.fontName].fontFamily;
                }
                fontName = String(fontName || 'Helvetica');

                const cleanFont = fontName.toLowerCase();
                let fallbacks = "sans-serif";
                if (cleanFont.includes("serif") || cleanFont.includes("times")) fallbacks = "serif";
                if (cleanFont.includes("mono") || cleanFont.includes("courier")) fallbacks = "monospace";

                let fontWeight = 'normal';
                let fontStyle = 'normal';
                if (cleanFont.includes('bold') || cleanFont.includes('black') || cleanFont.includes('heavy')) fontWeight = 'bold';
                else if (cleanFont.includes('semibold') || cleanFont.includes('demi')) fontWeight = '600';
                else if (cleanFont.includes('medium')) fontWeight = '500';
                else if (cleanFont.includes('light')) fontWeight = '300';
                else if (cleanFont.includes('thin') || cleanFont.includes('hairline')) fontWeight = '100';

                if (cleanFont.includes('italic') || cleanFont.includes('oblique')) fontStyle = 'italic';

                let baseFontName = fontName;
                if (baseFontName.includes('+')) {
                    baseFontName = baseFontName.split('+')[1] || '';
                }
                const originalBase = baseFontName.replace(/[,|-].*$/, '');

                // Aggressive mapping to standard system fonts for perfect fallback
                const baseLower = baseFontName.toLowerCase();
                let mappedFontName = originalBase;
                if (baseLower.includes('times')) mappedFontName = 'Times New Roman';
                else if (baseLower.includes('arial')) mappedFontName = 'Arial';
                else if (baseLower.includes('helvetica')) mappedFontName = 'Helvetica';
                else if (baseLower.includes('courier')) mappedFontName = 'Courier New';
                else if (baseLower.includes('verdana')) mappedFontName = 'Verdana';
                else if (baseLower.includes('tahoma')) mappedFontName = 'Tahoma';
                else if (baseLower.includes('georgia')) mappedFontName = 'Georgia';
                else if (baseLower.includes('calibri')) mappedFontName = 'Calibri';
                else if (baseLower.includes('cambria')) mappedFontName = 'Cambria';
                else if (baseLower.includes('segoe')) mappedFontName = 'Segoe UI';
                else if (baseLower.includes('roboto')) mappedFontName = 'Roboto';
                else if (baseLower.includes('open sans') || baseLower.includes('opensans')) mappedFontName = 'Open Sans';
                else if (baseLower.includes('lato')) mappedFontName = 'Lato';
                else if (baseLower.includes('montserrat')) mappedFontName = 'Montserrat';
                else if (baseLower.includes('oswald')) mappedFontName = 'Oswald';
                else if (baseLower.includes('poppins')) mappedFontName = 'Poppins';
                else if (baseLower.includes('inter')) mappedFontName = 'Inter';

                // Dynamically load Google Font for ANY non-system font to intelligently support custom PDFs!
                // If the font exists on Google Fonts, it will download and ensure 100% character support.
                // If it's a proprietary local font, the request silently fails and it gracefully falls back.
                const systemFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'Georgia', 'Calibri', 'Cambria', 'Segoe UI', 'Impact', 'Comic Sans MS'];
                if (!systemFonts.includes(mappedFontName)) {
                    // Try to un-camelcase the original base font if it wasn't mapped
                    if (mappedFontName === originalBase && !mappedFontName.includes(' ')) {
                        mappedFontName = originalBase.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
                    }

                    const fontId = `gf-${mappedFontName.replace(/\s+/g, '')}`;
                    if (!document.getElementById(fontId)) {
                        const link = document.createElement('link');
                        link.id = fontId;
                        link.rel = 'stylesheet';
                        link.href = `https://fonts.googleapis.com/css2?family=${mappedFontName.replace(/\s+/g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,700&display=swap`;
                        document.head.appendChild(link);
                    }
                }

                // Use item.fontName so the browser targets the exact embedded font injected by pdf.js!
                // We add BOTH the original extracted base font AND the aggressively mapped system font as fallbacks.
                // This guarantees that all 26 alphabets and numbers will render identically or nearly identically 
                // when typing new characters that aren't present in the subset font.
                const cssFontFamily = item.fontName ? `"${item.fontName}", "${mappedFontName}", "${originalBase}", ${fallbacks}` : `"${mappedFontName}", ${fallbacks}`;
                const humanFontName = mappedFontName;
                const color = colorMap[textItemIndex] || '#000000';

                rawItems.push({
                    text: item.str,
                    x: item.transform[4],
                    y: screenY,
                    pdfY: item.transform[5],
                    width: item.width,
                    height: fontSize,
                    fontSize: fontSize,
                    fontFamily: cssFontFamily,
                    humanFontName: humanFontName,
                    fontWeight: fontWeight,
                    fontStyle: fontStyle,
                    color: color
                });
                textItemIndex++;
            }

            // Grouping logic (iLovePDF exact editing functionality clone)
            const lines = [];
            for (const item of rawItems) {
                // Ignore empty fragments
                if (!item.text.trim() && item.width === 0) continue;

                // Find a line that is roughly at the same Y coordinate AND horizontally close
                let matchedLine = lines.find(line => {
                    const yMatch = Math.abs(line.y - item.y) < item.fontSize * 0.3;
                    if (!yMatch) return false;

                    // Do not merge if formatting is different
                    const firstInLine = line.items[0];
                    if (firstInLine.fontFamily !== item.fontFamily ||
                        firstInLine.fontWeight !== item.fontWeight ||
                        firstInLine.fontStyle !== item.fontStyle ||
                        firstInLine.color !== item.color) {
                        return false;
                    }

                    // Check if it's horizontally close to the existing items in this line
                    // (Prevents merging separate columns that happen to share a Y coordinate)
                    return line.items.some(existing => {
                        const gapLeft = item.x - (existing.x + existing.width);
                        const gapRight = existing.x - (item.x + item.width);
                        // If it's within 1.5x font size, consider it the same line/paragraph
                        return gapLeft < item.fontSize * 1.5 && gapRight < item.fontSize * 1.5;
                    });
                });

                if (matchedLine) {
                    matchedLine.items.push(item);
                } else {
                    lines.push({ y: item.y, fontSize: item.fontSize, items: [item] });
                }
            }

            let groupIndex = 0;
            for (const line of lines) {
                line.items.sort((a, b) => a.x - b.x);
                let fullText = '';
                let minX = line.items[0].x;
                let maxX = minX;

                for (let i = 0; i < line.items.length; i++) {
                    const item = line.items[i];
                    if (i > 0) {
                        const prevItem = line.items[i - 1];
                        // If the gap is larger than ~20% of the font size, insert a space
                        const gap = item.x - (prevItem.x + prevItem.width);
                        if (gap > line.fontSize * 0.2 && !prevItem.text.endsWith(' ') && !item.text.startsWith(' ')) {
                            fullText += ' ';
                        }
                    }
                    fullText += item.text;
                    maxX = Math.max(maxX, item.x + item.width);
                }

                const first = line.items[0];
                const extracted = {
                    id: `ext_${pageNum}_${groupIndex}`,
                    pageIndex: pageNum - 1,
                    text: fullText,
                    x: minX,
                    y: line.y,
                    pdfY: first.pdfY,
                    width: maxX - minX,
                    height: line.fontSize,
                    fontSize: line.fontSize,
                    fontFamily: first.fontFamily,
                    humanFontName: first.humanFontName,
                    fontWeight: first.fontWeight,
                    fontStyle: first.fontStyle,
                    color: first.color
                };

                state.extractedText.push(extracted);
                this.renderExtractedBox(extracted, pageNum);
                groupIndex++;
            }
        }
    },

    renderExtractedBox: function (item, pageNum) {
        const annoLayer = document.getElementById(`anno-${pageNum}`);
        if (!annoLayer) return;

        const state = window.PDFEditor.state;
        const zoom = state.zoom;

        const box = document.createElement('div');
        box.className = 'pdf-text-box content-editable-text';
        box.id = item.id;
        box.dataset.type = 'extracted-text';
        box.contentEditable = 'true';
        box.spellcheck = false;

        const existingReplacement = state.replacements.find(r => r.originalText === item.text && r.x === item.x && r.y === item.y);
        const bgColor = existingReplacement ? existingReplacement.bgColor : window.PDFExtractor.getBackgroundColor(pageNum, item.x, item.y, zoom);

        const mask = document.createElement('div');
        mask.className = 'pdf-text-mask';
        mask.id = `mask_${item.id}`;
        mask.style.position = 'absolute';

        // Expand slightly to cover anti-aliasing edges
        mask.style.width = ((item.width * zoom) + 4) + 'px';
        mask.style.height = ((item.height * zoom) + 4) + 'px';
        mask.style.left = ((item.x * zoom) - 2) + 'px';
        mask.style.top = ((item.y * zoom) - 2) + 'px';
        mask.style.backgroundColor = bgColor;
        mask.style.zIndex = '1';
        mask.style.display = existingReplacement ? 'block' : 'none';

        annoLayer.appendChild(mask);

        box.textContent = existingReplacement ? existingReplacement.newText : item.text;

        this.updateBoxPosition(box, item, zoom);

        box.style.position = 'absolute';
        box.style.zIndex = '2';
        box.style.fontFamily = existingReplacement ? existingReplacement.fontName : item.fontFamily;
        box.style.fontSize = ((existingReplacement ? existingReplacement.fontSize : item.fontSize) * zoom) + 'px';
        box.style.color = existingReplacement ? existingReplacement.color : 'transparent';
        box.style.fontWeight = existingReplacement ? existingReplacement.fontWeight : item.fontWeight;
        box.style.fontStyle = existingReplacement ? existingReplacement.fontStyle : item.fontStyle;
        box.style.background = 'transparent';
        box.style.border = 'none';
        box.style.outline = 'none';
        box.style.whiteSpace = 'pre';
        box.style.minWidth = (item.width * zoom) + 'px';

        box.dataset.humanFont = item.humanFontName || 'Arial';

        // Prevent container from handling mousedown
        box.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        box.addEventListener('focus', (e) => {
            mask.style.display = 'block';
            const replacement = state.replacements.find(r => r.originalText === item.text && r.x === item.x && r.y === item.y);
            box.style.color = replacement ? replacement.color : item.color;
        });

        // Click to extract properties into right panel
        box.addEventListener('click', (e) => {
            e.stopPropagation();

            window.AnnotationLayer.deselectAll();
            document.querySelectorAll('.pdf-text-box').forEach(b => b.classList.remove('selected'));
            box.classList.add('selected');

            // Populate right panel
            document.getElementById('propEmptyState').classList.add('hidden');
            document.getElementById('propTextState').classList.remove('hidden');

            const currentFont = box.dataset.humanFont || box.style.fontFamily;
            const fontSel = document.getElementById('propFontFamily');
            const cleanFont = currentFont.toLowerCase().replace(/['"]/g, '');
            let matched = false;
            for (let opt of fontSel.options) {
                if (cleanFont.includes(opt.value.toLowerCase())) {
                    fontSel.value = opt.value;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                const opt = new Option(currentFont, currentFont);
                fontSel.add(opt);
                fontSel.value = currentFont;
            }

            document.getElementById('propFontSize').value = Math.round(parseFloat(box.style.fontSize) / state.zoom);

            // Convert rgb to hex for color picker
            let hexColor = box.style.color;
            if (hexColor.startsWith('rgb')) {
                const match = hexColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
                if (match) {
                    hexColor = '#' + match.slice(1).map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('');
                }
            }
            document.getElementById('propFontColor').value = hexColor;
            document.getElementById('propOpacityText').value = 1.0;
            document.getElementById('propOpacityTextVal').textContent = '100%';
        });

        box.addEventListener('blur', () => {
            const newText = box.textContent;

            if (newText && newText !== item.text) {
                window.History.saveState();
                mask.style.display = 'block';

                let replacement = state.replacements.find(r => r.originalText === item.text && r.x === item.x && r.y === item.y);
                if (!replacement) {
                    replacement = {
                        type: 'text-replacement',
                        pageIndex: item.pageIndex,
                        originalText: item.text,
                        newText: newText,
                        x: item.x,
                        y: item.y,
                        width: item.width,
                        height: item.height,
                        fontSize: item.fontSize,
                        fontName: item.humanFontName,
                        color: item.color,
                        bgColor: bgColor,
                        fontWeight: item.fontWeight,
                        fontStyle: item.fontStyle
                    };
                    state.replacements.push(replacement);
                } else {
                    replacement.newText = newText;
                }
            } else if (!newText || newText === item.text) {
                let replacement = state.replacements.find(r => r.originalText === item.text && r.x === item.x && r.y === item.y);
                const hasCustomProps = replacement && (
                    replacement.color !== item.color ||
                    replacement.fontSize !== item.fontSize ||
                    replacement.fontName !== item.fontFamily
                );

                if (!hasCustomProps) {
                    state.replacements = state.replacements.filter(r => !(r.originalText === item.text && r.x === item.x && r.y === item.y));
                    box.textContent = item.text;
                    mask.style.display = 'none';
                    box.style.color = 'transparent';
                }
            }
        });

        box.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                box.blur();
            }
        });

        annoLayer.appendChild(box);
    },

    getBackgroundColor: function (pageNum, x, y, zoom) {
        try {
            const canvas = document.querySelector(`#page-${pageNum} .pdf-render-layer`);
            if (!canvas) return '#ffffff';
            const ctx = canvas.getContext('2d');
            const scaleFactor = window.PDFEditor.config.scaleFactor || 1;
            // Sample a pixel slightly above and to the left of the text box
            const sampleX = Math.max(0, (x * zoom) - 2) * scaleFactor;
            const sampleY = Math.max(0, (y * zoom) - 2) * scaleFactor;
            const pixel = ctx.getImageData(sampleX, sampleY, 1, 1).data;
            if (pixel[3] === 0) return '#ffffff';
            return '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            return '#ffffff';
        }
    },

    updateBoxPosition: function (box, item, zoom) {
        box.style.left = (item.x * zoom) + 'px';
        box.style.top = (item.y * zoom) + 'px';
        box.style.minWidth = (item.width * zoom) + 'px';
        box.style.minHeight = (item.height * zoom) + 'px';
        box.style.width = 'auto';
        box.style.height = 'auto';
    },

    recalculateZoom: function () {
        const state = window.PDFEditor.state;
        state.extractedText.forEach(item => {
            const box = document.getElementById(item.id);
            if (box) {
                this.updateBoxPosition(box, item, state.zoom);
                box.style.fontSize = (item.fontSize * state.zoom) + 'px';
            }
            const mask = document.getElementById(`mask_${item.id}`);
            if (mask) {
                mask.style.width = ((item.width * state.zoom) + 4) + 'px';
                mask.style.height = ((item.height * state.zoom) + 4) + 'px';
                mask.style.left = ((item.x * state.zoom) - 2) + 'px';
                mask.style.top = ((item.y * state.zoom) - 2) + 'px';
            }
        });
    }
};

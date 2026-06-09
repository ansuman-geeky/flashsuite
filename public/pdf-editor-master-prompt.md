# 🧠 MASTER PROMPT — Professional Online PDF Editor Tool
### For Node.js + HTML5 Stack Integration

---

## 📌 OVERVIEW

You are building a **professional-grade, browser-based PDF Editor** to be integrated as a new feature into an existing Node.js + HTML5 website. The editor must be feature-complete, performant, and visually polished — comparable to tools like ilovepdf.com/edit-pdf.

The tool must allow users to **upload a PDF, detect all its existing properties** (fonts, sizes, colors, styles), and **edit it in-browser** using a rich toolbar — then **download the modified PDF**.

---

## 🏗️ TECH STACK

| Layer | Technology |
|---|---|
| **Backend** | Node.js (Express.js) |
| **Frontend** | HTML5, CSS3, Vanilla JS (or integrate with existing framework) |
| **PDF Rendering** | [PDF.js](https://mozilla.github.io/pdf.js/) — render PDF pages as canvas |
| **PDF Manipulation** | [pdf-lib](https://pdf-lib.js.org/) — create/modify PDF bytes |
| **PDF Text Extraction** | [pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist) — extract text + properties |
| **Font Detection** | PDF.js operator list API — extract font name, size, color per text block |
| **File Upload** | [Multer](https://www.npmjs.com/package/multer) (Node.js middleware) |
| **Color Picker** | [Pickr](https://simonweniger.com/pickr) or native `<input type="color">` |
| **Signatures** | [Signature Pad](https://github.com/szimek/signature_pad) |
| **Icons** | Lucide Icons or Phosphor Icons |

---

## 📁 PROJECT STRUCTURE

```
/pdf-editor
├── /public
│   ├── /css
│   │   └── pdf-editor.css
│   ├── /js
│   │   ├── pdf-editor.js        ← Main editor logic
│   │   ├── pdf-renderer.js      ← PDF.js rendering layer
│   │   ├── pdf-extractor.js     ← Font/color/style detection
│   │   ├── pdf-exporter.js      ← pdf-lib export/download
│   │   ├── toolbar.js           ← Toolbar state & actions
│   │   ├── annotation-layer.js  ← Overlay canvas for annotations
│   │   └── history.js           ← Undo/redo stack
│   └── pdf-editor.html          ← Main page (embed in existing site)
├── /server
│   ├── routes
│   │   └── pdf.routes.js        ← Upload, process, download endpoints
│   └── utils
│       └── pdf.utils.js         ← Server-side PDF helpers (optional)
├── /uploads                     ← Temp storage (auto-cleared)
└── package.json
```

---

## 🎨 UI/UX LAYOUT SPECIFICATION

### Overall Layout
```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Logo | File name | Save | Download | Share      │
├──────────┬──────────────────────────────┬────────────────┤
│ LEFT     │   PDF CANVAS VIEWPORT        │  RIGHT PANEL   │
│ TOOLBAR  │   (scrollable, zoomable)     │  (Properties)  │
│          │                              │                │
│ [Text]   │   ┌──────────────────────┐   │ Font Family    │
│ [Shape]  │   │   Rendered PDF Page  │   │ Font Size      │
│ [Draw]   │   │   + Annotation Layer │   │ Bold/Italic/UL │
│ [Image]  │   │   (SVG/Canvas)       │   │ Color Picker   │
│ [Sign]   │   └──────────────────────┘   │ Opacity        │
│ [Erase]  │                              │ Alignment      │
│ [Select] │   Page controls: ◀ 1/5 ▶    │ Line Height    │
│          │   Zoom: 75% [−][+][Fit]      │ Border/Fill    │
│ [Undo]   │                              │ Z-Index        │
│ [Redo]   │                              │ Delete Element │
└──────────┴──────────────────────────────┴────────────────┘
```

### Upload Screen (shown before file is loaded)
- Centered drag-and-drop zone with dashed border
- "Click to upload or drag PDF here" with file size limit note
- Animated file icon on hover
- Accept: `.pdf` only
- Show progress bar during upload + parsing

---

## 🛠️ FEATURE SPECIFICATION

### 1. 📥 FILE UPLOAD & PROPERTY DETECTION

**Frontend:**
- Accept PDF via drag-and-drop or file picker
- Show upload progress bar
- On load, use PDF.js to render all pages to `<canvas>` elements
- Use `PDFPageProxy.getOperatorList()` + `PDFPageProxy.getTextContent()` to extract per-text-block:
  - `fontName` — map to actual font family using `PDFDocumentProxy.getFontData()`
  - `fontSize` — from transform matrix
  - `fillColor` / `strokeColor` — RGB values from operator list
  - `fontWeight`, `fontStyle` — infer from font name (e.g., "Bold", "Italic" suffixes)
  - `textPosition` — x, y coordinates
  - `pageIndex` — which page

**Extracted Data Model (per element):**
```javascript
{
  id: "elem_001",
  type: "text" | "image" | "annotation",
  pageIndex: 0,
  x: 72,          // PDF points from bottom-left
  y: 720,
  width: 200,
  height: 14,
  text: "Hello World",
  fontFamily: "Helvetica",
  fontSize: 12,
  fontWeight: "bold",
  fontStyle: "italic",
  color: "#1a1a1a",       // hex
  opacity: 1.0,
  lineHeight: 1.2,
  textAlign: "left"
}
```

### 2. ✏️ TEXT TOOL

- Click anywhere on canvas to place a text box
- Inline editing (contenteditable div overlaid on canvas)
- Live preview while typing
- When text element is selected, right panel populates with its detected properties:
  - Font Family dropdown (standard + detected fonts)
  - Font Size (number input + slider)
  - Bold / Italic / Underline / Strikethrough toggles
  - Text color picker (hex + RGB + opacity)
  - Text alignment (left/center/right/justify)
  - Line height
- Support multi-line text
- Double-click existing text to edit it

**Font Families to support:**
`Helvetica, Arial, Times New Roman, Courier New, Georgia, Verdana, Trebuchet MS, Impact, Comic Sans MS, Palatino, Garamond, Bookman, Tahoma` + any fonts detected in the PDF.

### 3. 🔷 SHAPES TOOL

Sub-tools in toolbar:
- Rectangle (outline or filled)
- Circle/Ellipse
- Line
- Arrow (single/double)
- Polygon (click to add points)

Each shape supports:
- Stroke color + width
- Fill color + opacity
- Corner radius (rectangle)
- Dashed/dotted/solid border
- Resize handles (8-point)
- Rotate handle

### 4. 🖊️ FREEHAND DRAW TOOL

- Smooth bezier curve drawing
- Pen size slider (1–20px)
- Color picker
- Opacity control
- Pressure-sensitivity simulation (mouse speed affects stroke width)
- Eraser sub-tool (erase drawn strokes by segment)

### 5. 🖼️ IMAGE INSERTION

- Upload image (PNG, JPG, SVG, WebP)
- Drag to position
- Resize with handles (maintain aspect ratio with Shift)
- Rotate
- Opacity control
- Bring to front / Send to back

### 6. ✍️ SIGNATURE TOOL

- Draw signature on canvas pad (Signature Pad library)
- Type signature (styled cursive font)
- Upload signature image
- Place on PDF at desired location
- Resize/reposition after placement

### 7. 💬 ANNOTATION / COMMENT TOOLS

- **Highlight**: Select text → apply yellow/green/blue/pink highlight
- **Underline**: Selected text gets underline annotation
- **Strikethrough**: Cross out text
- **Sticky Note**: Click to place collapsible note icon; shows text on hover/click
- **Comment Box**: Visible text box with speech-bubble style border

### 8. 🔲 SELECTION & TRANSFORM TOOL

- Click to select any element (text, shape, image, annotation)
- Drag to move
- Resize handles (corners + edges)
- Rotate handle
- Multi-select with Shift+click or drag-select box
- Group/Ungroup selection
- Alignment tools: align left/center/right/top/middle/bottom
- Distribute spacing evenly (horizontal/vertical)
- Delete with Delete/Backspace key

### 9. 🔙 UNDO / REDO

- Full history stack (Ctrl+Z / Ctrl+Y)
- Minimum 50 steps
- History panel (optional: show list of actions)

### 10. 🔍 ZOOM & NAVIGATION

- Zoom in/out (buttons + mouse wheel + pinch on touch)
- Fit to width / Fit to page / 50% / 75% / 100% / 150% / 200%
- Page navigation (previous/next, jump to page)
- Thumbnail sidebar (optional, collapsible)
- Mini-map for large PDFs

### 11. 🔒 SECURITY / FORM FEATURES

- **Fill PDF Forms**: Detect existing form fields (AcroForm), make them editable
- **Redact**: Black-out sensitive content permanently
- **Watermark**: Add text/image watermark with opacity and angle controls
- **Page Numbers**: Add custom page number with position/format options

---

## ⚙️ NODE.JS BACKEND API

### Endpoints

```
POST   /api/pdf/upload         → Upload PDF, return file ID + metadata
GET    /api/pdf/:id/pages      → Return page count, dimensions
GET    /api/pdf/:id/fonts      → Return detected font list
POST   /api/pdf/:id/export     → Receive JSON annotations, return modified PDF
DELETE /api/pdf/:id            → Clean up temp file
```

### `/api/pdf/upload`
```javascript
// Uses multer for file handling
// Returns:
{
  fileId: "uuid-1234",
  filename: "document.pdf",
  pageCount: 5,
  fileSizeKB: 842,
  tempPath: "/uploads/uuid-1234.pdf"
}
```

### `/api/pdf/:id/export`
```javascript
// Receives:
{
  fileId: "uuid-1234",
  annotations: [ ...elementArray ]  // see data model above
}

// Uses pdf-lib to:
// 1. Load original PDF bytes
// 2. Iterate over annotations
// 3. Draw text/shapes/images onto correct pages
// 4. Return modified PDF as binary download
```

### Server-Side PDF Manipulation with pdf-lib:
```javascript
const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');

async function applyAnnotations(pdfBytes, annotations) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  for (const el of annotations) {
    const page = pages[el.pageIndex];
    const { width, height } = page.getSize();

    if (el.type === 'text') {
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText(el.text, {
        x: el.x,
        y: height - el.y - el.fontSize, // convert from top-left to PDF coords
        size: el.fontSize,
        font,
        color: hexToRgb(el.color),
        opacity: el.opacity,
      });
    }

    if (el.type === 'rectangle') {
      page.drawRectangle({
        x: el.x,
        y: height - el.y - el.height,
        width: el.width,
        height: el.height,
        color: hexToRgb(el.fillColor),
        borderColor: hexToRgb(el.strokeColor),
        borderWidth: el.strokeWidth,
        opacity: el.opacity,
      });
    }

    if (el.type === 'image') {
      const imgBytes = Buffer.from(el.imageData, 'base64');
      const img = await pdfDoc.embedPng(imgBytes); // or embedJpg
      page.drawImage(img, {
        x: el.x,
        y: height - el.y - el.height,
        width: el.width,
        height: el.height,
        opacity: el.opacity,
        rotate: degrees(el.rotation || 0),
      });
    }
  }

  return await pdfDoc.save();
}
```

---

## 🖥️ FRONTEND CANVAS ARCHITECTURE

### Two-Layer Rendering System

```
┌─────────────────────────────────────┐
│  DIV.page-container                 │
│                                     │
│  ┌──────────────────────────────┐   │
│  │  CANVAS.pdf-render-layer     │   ← PDF.js renders here (read-only)
│  │  (z-index: 1)                │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │  SVG.annotation-layer        │   ← User edits here (interactive)
│  │  (z-index: 2, position:abs)  │   │
│  └──────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

- PDF.js renders PDF pages pixel-perfectly to canvas (non-interactive)
- SVG overlay (or second canvas) handles all user-added elements
- Coordinates must be normalized between PDF point space and screen pixel space:
  ```javascript
  // PDF points to screen pixels
  const scaleX = canvasWidth / page.view[2];   // page.view[2] = PDF width in points
  const scaleY = canvasHeight / page.view[3];
  ```

### State Management
```javascript
// Global editor state
const editorState = {
  currentTool: 'select',       // 'select'|'text'|'draw'|'shape'|'image'|'sign'|'annotate'
  currentPage: 0,
  totalPages: 0,
  zoom: 1.0,
  selectedElement: null,
  elements: [],                // All user-added elements (all pages)
  history: [],                 // Undo stack
  historyIndex: -1,
  isDirty: false               // Unsaved changes flag
};
```

---

## 🎨 UI COMPONENT DETAILS

### Left Toolbar (vertical, icon-based)
```html
<div class="toolbar-left">
  <button data-tool="select"   title="Select (V)">   <!-- cursor icon -->
  <button data-tool="text"     title="Text (T)">     <!-- T icon -->
  <button data-tool="draw"     title="Draw (D)">     <!-- pen icon -->
  <button data-tool="shape"    title="Shapes (S)">   <!-- shape icon, opens sub-menu -->
  <button data-tool="image"    title="Image (I)">    <!-- image icon -->
  <button data-tool="sign"     title="Signature">    <!-- signature icon -->
  <button data-tool="annotate" title="Annotate (A)"> <!-- highlight icon, opens sub-menu -->
  <hr>
  <button data-action="undo"   title="Undo (Ctrl+Z)">
  <button data-action="redo"   title="Redo (Ctrl+Y)">
  <button data-action="delete" title="Delete (Del)">
</div>
```

### Right Properties Panel
Dynamically renders based on `selectedElement.type`:
- **Text selected**: Font family, size, B/I/U/S, color, alignment, line height, opacity
- **Shape selected**: Fill color, stroke color, stroke width, stroke style, opacity, corner radius
- **Image selected**: Width, height (lock aspect ratio), rotation, opacity, flip H/V
- **Annotation selected**: Color, opacity, note text (for sticky notes)
- **Nothing selected**: Show document info (page count, file size, PDF version)

### Keyboard Shortcuts
| Key | Action |
|---|---|
| `V` | Select tool |
| `T` | Text tool |
| `D` | Draw tool |
| `S` | Shapes tool |
| `I` | Image insert |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete selected |
| `Ctrl+A` | Select all on page |
| `Ctrl+D` | Duplicate selected |
| `Ctrl+S` | Save/Export |
| `Escape` | Deselect / Cancel |
| `+` / `-` | Zoom in/out |
| `0` | Fit to screen |
| `Arrow keys` | Nudge selected element 1px |
| `Shift+Arrow` | Nudge 10px |

---

## 📦 PACKAGE.JSON DEPENDENCIES

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "pdf-lib": "^1.17.1",
    "uuid": "^9.0.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

**Frontend (CDN or local):**
```html
<!-- PDF.js -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>

<!-- Signature Pad -->
<script src="https://cdn.jsdelivr.net/npm/signature_pad@4.1.7/dist/signature_pad.umd.min.js"></script>

<!-- Pickr Color Picker -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@simonweniger/pickr/dist/themes/classic.min.css">
<script src="https://cdn.jsdelivr.net/npm/@simonweniger/pickr/dist/pickr.min.js"></script>
```

---

## 🔐 SECURITY REQUIREMENTS

1. **File validation**: Only accept `application/pdf` MIME type on backend
2. **File size limit**: Enforce max 50MB (configurable) via Multer
3. **Temp file cleanup**: Auto-delete uploaded files after 30 minutes (use `node-cron`)
4. **No persistent storage**: Don't store user PDFs permanently unless auth is implemented
5. **CORS**: Restrict to your domain only
6. **Sanitize filenames**: Use UUID for server-side storage, never use original filename as path
7. **Rate limiting**: Add `express-rate-limit` to upload endpoint (e.g., 10 uploads/min per IP)
8. **Content Security Policy**: Set CSP headers for the editor page

---

## 🚀 INTEGRATION INTO EXISTING SITE

### Step 1: Add route to existing Express app
```javascript
// In your main app.js / server.js
const pdfEditorRouter = require('./pdf-editor/server/routes/pdf.routes');
app.use('/pdf-editor', express.static('./pdf-editor/public'));
app.use('/api/pdf', pdfEditorRouter);
```

### Step 2: Link to editor from your site
```html
<a href="/pdf-editor/pdf-editor.html">Open PDF Editor</a>
```

### Step 3: Optional — embed in existing layout
Use an `<iframe>` or integrate the HTML/CSS/JS directly into your existing layout system (copy the editor HTML into your template engine — EJS, Handlebars, Pug, etc.).

---

## 📋 DEVELOPMENT PHASES

### Phase 1 — Core (MVP)
- [ ] File upload UI + backend endpoint
- [ ] PDF.js rendering (all pages)
- [ ] Zoom + page navigation
- [ ] Text tool (add new text)
- [ ] Property detection (font, size, color of existing text)
- [ ] pdf-lib export (download modified PDF)
- [ ] Undo/redo

### Phase 2 — Editing Tools
- [ ] Shapes tool (rect, circle, line, arrow)
- [ ] Freehand draw tool
- [ ] Image insertion
- [ ] Select + move + resize existing elements
- [ ] Right panel (live property editing)

### Phase 3 — Advanced
- [ ] Annotation tools (highlight, underline, sticky notes)
- [ ] Signature tool
- [ ] Form field detection + filling
- [ ] Redaction tool
- [ ] Watermark + page numbers
- [ ] Thumbnail sidebar
- [ ] Keyboard shortcuts (full set)

### Phase 4 — Polish & Performance
- [ ] Large PDF optimization (lazy-load pages)
- [ ] Touch/mobile support
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Loading states, error handling, empty states
- [ ] Auto-save to localStorage (recover unsaved work)

---

## 💡 KEY IMPLEMENTATION NOTES

1. **Coordinate System**: PDF uses bottom-left origin; browsers use top-left. Always convert: `pdfY = pageHeight - browserY`.

2. **Font Embedding**: When exporting, only `StandardFonts` from pdf-lib are guaranteed. For custom fonts, embed TTF/OTF as `ArrayBuffer` using `pdfDoc.embedFont(fontBytes)`.

3. **Text Extraction Accuracy**: `getTextContent()` returns text items with transform matrices. Font size = `Math.sqrt(transform[0]^2 + transform[1]^2)`. Color comes from `getOperatorList()` by finding `setFillRGBColor` operators before each text-paint operator.

4. **Performance**: For PDFs with many pages, render only the visible page + 1 page ahead. Use `IntersectionObserver` to trigger rendering as user scrolls.

5. **Canvas DPI**: Use `devicePixelRatio` for crisp rendering on retina screens:
   ```javascript
   const scale = window.devicePixelRatio * zoom;
   canvas.width = viewport.width * scale;
   canvas.height = viewport.height * scale;
   ctx.scale(scale, scale);
   ```

6. **Annotation Export Format**: Maintain a JSON array of all added elements in memory. On export, send to Node.js backend which uses pdf-lib to burn them into the PDF permanently.

---

## ✅ ACCEPTANCE CRITERIA

- [ ] Upload any valid PDF and render all pages correctly
- [ ] Detect and display font name, size, and color of existing text content
- [ ] Add, edit, move, resize, and delete text elements
- [ ] Add shapes with color/size controls
- [ ] Draw freehand strokes
- [ ] Insert images
- [ ] Add and place signatures
- [ ] Highlight, underline, and annotate text
- [ ] Undo/redo works for all operations (min 50 steps)
- [ ] Download the final edited PDF with all changes embedded
- [ ] Works on Chrome, Firefox, Safari, Edge (latest 2 versions)
- [ ] Works on mobile (touch events for draw/select)
- [ ] Handles PDFs up to 50MB
- [ ] Integrates cleanly into existing Node.js site with zero conflicts

---

*This master prompt is the single source of truth for building the PDF Editor. Hand it to any AI coding assistant (Claude, Copilot, Cursor) or developer team to implement the full feature.*

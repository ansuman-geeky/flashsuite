// pdf-exporter.js
// Exports annotations to the server and downloads the burned PDF

window.PDFExporter = {
    export: async function() {
        const state = window.PDFEditor.state;
        const btn = document.getElementById('btnExport');
        const origText = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Exporting...';
        lucide.createIcons();

        try {
            const payload = {
                fileId: state.fileId,
                annotations: state.elements,
                replacements: state.replacements
            };

            const response = await fetch(`/api/pdf/${state.fileId}/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Export failed');
            }

            // Trigger download of the binary blob
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `edited_${state.fileName}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to export PDF: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = origText;
            lucide.createIcons();
        }
    }
};

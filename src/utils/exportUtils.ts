import { StoryCardData } from '@/types';

export async function exportToJson(cards: StoryCardData[]): Promise<void> {
    const sorted = [...cards].sort((a, b) => a.order - b.order);
    const exportData = sorted.map((card) => ({
        order: card.order,
        sectionLabel: card.sectionLabel,
        lyrics: card.lyrics,
        timestamp: card.timestamp,
        prompt: card.prompt,
        imageUrl: card.imageUrl,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
    });
    downloadFile(blob, 'storyboard.json');
}

export async function exportToCsv(cards: StoryCardData[]): Promise<void> {
    const sorted = [...cards].sort((a, b) => a.order - b.order);
    const headers = ['order', 'section', 'lyrics', 'timestamp', 'prompt'];
    const rows = sorted.map((card) => [
        card.order.toString(),
        card.sectionLabel || '',
        `"${card.lyrics.replace(/"/g, '""')}"`,
        card.timestamp !== null ? card.timestamp.toFixed(2) : '',
        `"${card.prompt.replace(/"/g, '""')}"`,
    ]);

    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    downloadFile(blob, 'storyboard.csv');
}

export async function exportToPdf(
    canvasElement: HTMLElement
): Promise<void> {
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const canvas = await html2canvas(canvasElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // A4横向き
    const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgWidth / 2, imgHeight / 2],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth / 2, imgHeight / 2);
    pdf.save('storyboard.pdf');
}

export async function exportToImage(
    canvasElement: HTMLElement
): Promise<void> {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(canvasElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
    });

    const link = document.createElement('a');
    link.download = 'storyboard.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

async function downloadFile(blob: Blob, filename: string): Promise<void> {
    // 1. Modern File System Access API (Recommended for Windows Chrome/Edge)
    if ('showSaveFilePicker' in window) {
        try {
            const ext = filename.split('.').pop();
            const types = ext === 'json' ? [{
                description: 'JSON File',
                accept: { 'application/json': ['.json'] },
            }] : [{
                description: 'CSV File',
                accept: { 'text/csv': ['.csv'] },
            }];

            const win = window as any;
            const handle = await win.showSaveFilePicker({
                suggestedName: filename,
                types: types,
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err: any) {
            // User cancelled the "Save As" dialog
            if (err.name === 'AbortError') return;
            console.warn('File System API failed, falling back:', err);
        }
    }

    // 2. Fallback: Classic Anchor Tag with Next.js interception prevention
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = filename;
    link.rel = 'noopener noreferrer';
    link.target = '_blank'; // Prevents Next.js Link interception

    document.body.appendChild(link);

    // ネイティブのMouseEventを直接発火
    const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
    });
    link.dispatchEvent(event);

    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 1000);
}

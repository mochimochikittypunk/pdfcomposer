import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

// Helper to get pdfjs library dynamically
async function getPdfJs() {
    const pdfjs = await import('pdfjs-dist');
    // Configure worker
    if (typeof window !== 'undefined' && 'Worker' in window) {
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }
    return pdfjs;
}

/**
 * Loads a PDF file and returns the PDFDocumentProxy from pdfjs-dist
 */
export async function loadPdf(file: File): Promise<PDFDocumentProxy> {
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    return loadingTask.promise;
}

/**
 * Renders a specific page of a PDF to a standard HTML canvas and returns the Data URL.
 */
export async function renderPageToImage(
    pdf: PDFDocumentProxy,
    pageNumber: number, // 1-based index for pdfjs
    scale = 0.5 // Default scale down for thumbnails
): Promise<string> {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Canvas context not available');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
        canvasContext: context,
        viewport: viewport,
    } as any).promise;

    return canvas.toDataURL('image/png');
}

/**
 * Creates a new PDF document containing only the specified pages.
 */
/**
 * Creates a new PDF document merging pages from multiple source documents.
 */
export async function createNewPdfFromPages(
    sourceDocs: Map<string, ArrayBuffer>, // map of docId -> ArrayBuffer
    pagesToMerge: { docId: string; pageIndex: number }[]
): Promise<Uint8Array> {
    const newPdf = await PDFDocument.create();

    // Cache loaded PDFDocuments to avoid reloading
    const loadedDocs = new Map<string, PDFDocument>();

    for (const page of pagesToMerge) {
        let pdfDoc = loadedDocs.get(page.docId);

        if (!pdfDoc) {
            const bytes = sourceDocs.get(page.docId);
            if (!bytes) {
                console.warn(`Document bytes not found for docId: ${page.docId}`);
                continue;
            }
            pdfDoc = await PDFDocument.load(bytes);
            loadedDocs.set(page.docId, pdfDoc);
        }

        if (pdfDoc) {
            // copyPages takes an array of indices, we copy one by one here for correct order
            const [copiedPage] = await newPdf.copyPages(pdfDoc, [page.pageIndex]);
            newPdf.addPage(copiedPage);
        }
    }

    const pdfBytes = await newPdf.save();
    return pdfBytes;
}

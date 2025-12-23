'use client';

import React, { useState, useCallback } from 'react';
import { loadPdf, renderPageToImage, createNewPdfFromPages } from '@/lib/pdf-utils';
import { FileDropzone } from '@/components/pdf/file-dropzone';
import { PageGrid } from '@/components/pdf/page-grid';
import { ActionBar } from '@/components/pdf/action-bar';
import { Loader2 } from 'lucide-react';

interface PdfDocument {
  id: string;
  name: string;
  bytes: ArrayBuffer;
}

interface PdfPage {
  docId: string;
  pageIndex: number; // 1-based index (original PDF)
  image: string;
}

export default function Home() {
  const [documents, setDocuments] = useState<Map<string, PdfDocument>>(new Map());
  const [pdfPages, setPdfPages] = useState<PdfPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set()); // indices of pdfPages array
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const handleFileSelect = useCallback(async (files: File[]) => {
    try {
      setError(null);
      setIsProcessing(true);

      const newDocs = new Map(documents);
      const newPages = [...pdfPages];

      for (const file of files) {
        const docId = generateId();
        const buffer = await file.arrayBuffer();

        newDocs.set(docId, {
          id: docId,
          name: file.name,
          bytes: buffer
        });

        const pdf = await loadPdf(file);
        const numPages = pdf.numPages;

        for (let i = 1; i <= numPages; i++) {
          const dataUrl = await renderPageToImage(pdf, i, 0.4);
          newPages.push({
            docId,
            pageIndex: i - 1, // Store 0-based index for pdf-lib usage
            image: dataUrl
          });
        }
      }

      setDocuments(newDocs);
      setPdfPages(newPages);

    } catch (err: any) {
      console.error(err);
      setError('Failed to process one or more files.');
    } finally {
      setIsProcessing(false);
    }
  }, [documents, pdfPages]);

  const togglePage = useCallback((index: number) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const all = new Set(pdfPages.map((_, i) => i));
    setSelectedPages(all);
  }, [pdfPages]);

  const deselectAll = useCallback(() => {
    setSelectedPages(new Set());
  }, []);

  const reset = useCallback(() => {
    setDocuments(new Map());
    setPdfPages([]);
    setSelectedPages(new Set());
    setError(null);
  }, []);

  const download = useCallback(async () => {
    if (documents.size === 0 || selectedPages.size === 0) return;

    try {
      setIsDownloading(true);

      // Prepare map of docId -> ArrayBuffer for the utility
      const docMap = new Map<string, ArrayBuffer>();
      documents.forEach((doc, id) => {
        docMap.set(id, doc.bytes);
      });

      // Get selected pages in order
      const sortedIndices = Array.from(selectedPages).sort((a, b) => a - b);
      const pagesToMerge = sortedIndices.map(index => {
        const p = pdfPages[index];
        return {
          docId: p.docId,
          pageIndex: p.pageIndex // 0-based
        };
      });

      const newPdfBytes = await createNewPdfFromPages(docMap, pagesToMerge);

      const blob = new Blob([newPdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Determine filename
      const count = documents.size;
      const firstDocName = documents.values().next().value?.name.replace(/\.pdf$/i, '') || 'document';
      const filename = count > 1 ? `merged_${count}_docs.pdf` : `${firstDocName}_selected.pdf`;

      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      setError('Failed to generate PDF download.');
    } finally {
      setIsDownloading(false);
    }
  }, [documents, selectedPages, pdfPages]);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b bg-muted/30 sticky top-0 z-10 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">PDF Composer</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Beta</span>
        </div>
        {documents.size > 0 && (
          <div className="text-sm text-muted-foreground">
            {documents.size} file{documents.size !== 1 ? 's' : ''} loaded
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto p-4 md:p-8 gap-8">
        {documents.size === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-full max-w-md space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Split & Merge PDFs</h2>
                <p className="text-muted-foreground">Upload multiple documents to combine pages.</p>
              </div>
              <FileDropzone onFileSelect={handleFileSelect} isProcessing={isProcessing} />
              {error && (
                <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm text-center">
                  {error}
                </div>
              )}
              {isProcessing && (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <p className="text-sm">Processing documents...</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Pages</h2>
                <p className="text-sm text-muted-foreground">{pdfPages.length} pages total.</p>
              </div>
              <div className="w-64">
                {/* Mini dropzone style could go here for "Add more", but reusing main dropzone below grid or modal is easier 
                             For now, let's keep it simple. If user wants to add more, they can drag to body? 
                             Or maybe add a small drop area. 
                             Let's add a small "Add more" button that triggers file input? 
                             Or just show dropzone at bottom?
                         */}
              </div>
            </div>

            <PageGrid
              pages={pdfPages.map(p => p.image)}
              selectedPages={selectedPages}
              onTogglePage={togglePage}
            />

            {/* Allow adding more files */}
            <div className="mt-8 border-t pt-8">
              <h3 className="text-sm font-medium mb-4">Add more files</h3>
              <FileDropzone onFileSelect={handleFileSelect} isProcessing={isProcessing} className="max-w-md mx-auto h-32" />
            </div>
          </div>
        )}
      </div>

      {documents.size > 0 && (
        <ActionBar
          totalDocs={pdfPages.length}
          selectedCount={selectedPages.size}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onReset={reset}
          onDownload={download}
          isDownloading={isDownloading}
        />
      )}
    </main>
  );
}

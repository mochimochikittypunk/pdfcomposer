'use client';

import React, { useState, useCallback } from 'react';
import { loadPdf, renderPageToImage } from '@/lib/pdf-utils';
import { downloadImagesAsZip } from '@/lib/download-utils';
import { FileDropzone } from '@/components/pdf/file-dropzone';
import { PageGrid } from '@/components/pdf/page-grid';
import { Button } from '@/components/ui/button';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PdfPage {
    pageIndex: number;
    image: string;
}

export function PdfToImage() {
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PdfPage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = useCallback(async (files: File[]) => {
        if (files.length === 0) return;
        // Only handle the first file for simplicity in this version, 
        // or we could handle multiple. Let's start with single PDF for "PDF -> Images" 
        // to keep UI simple (one zip per PDF or merged zip? usually one PDF source is typical use case).
        // Task description mainly implied "Upload PDF -> Render -> Download".
        // Let's stick to single file for this feature to distinct it from "Splitter".

        const selectedFile = files[0];

        try {
            setError(null);
            setIsProcessing(true);
            setFile(selectedFile);
            setPages([]);

            const pdf = await loadPdf(selectedFile);
            const numPages = pdf.numPages;
            const newPages: PdfPage[] = [];

            for (let i = 1; i <= numPages; i++) {
                // High quality for export? Or just preview quality?
                // Usually people want decent quality for "PDF to Image". 
                // 0.4 was for thumbnails. Let's use 1.0 or 1.5 for "preview" here?
                // Actually, if we want to download HIGH RES, we should probably re-render on download 
                // OR render high res now. Rendering high res now might be slow for many pages.
                // Let's render @ scale 1.0 for now, which is better than 0.4.
                const dataUrl = await renderPageToImage(pdf, i, 1.0);
                newPages.push({
                    pageIndex: i,
                    image: dataUrl
                });
            }

            setPages(newPages);

        } catch (err: any) {
            console.error(err);
            setError('Failed to process PDF.');
            setFile(null);
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const handleDownload = useCallback(async () => {
        if (!file || pages.length === 0) return;

        try {
            setIsZipping(true);
            const imagesToZip = pages.map(p => ({
                dataUrl: p.image,
                name: `page_${p.pageIndex.toString().padStart(3, '0')}.png`
            }));

            const zipName = file.name.replace(/\.pdf$/i, '') + '_images.zip';
            await downloadImagesAsZip(imagesToZip, zipName);

        } catch (err) {
            console.error(err);
            setError('Failed to create ZIP file.');
        } finally {
            setIsZipping(false);
        }
    }, [file, pages]);

    const reset = useCallback(() => {
        setFile(null);
        setPages([]);
        setError(null);
    }, []);

    return (
        <div className="flex flex-col w-full">
            <div className="flex items-center justify-between mb-8 px-4 md:px-8">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold tracking-tight">PDF to Image Converter</h2>
                    <p className="text-muted-foreground">Convert PDF pages into high-quality images.</p>
                </div>
                {file && (
                    <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {pages.length} pages ready
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 md:px-8 gap-8">
                {!file ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-full max-w-md space-y-8">
                            <FileDropzone onFileSelect={handleFileSelect} isProcessing={isProcessing} />
                            {error && (
                                <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm text-center">
                                    {error}
                                </div>
                            )}
                            {isProcessing && (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <p className="text-sm">Processing PDF pages...</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">{file.name}</h2>
                                <p className="text-sm text-muted-foreground">Preview of converted images</p>
                            </div>
                        </div>

                        {/* We can reuse PageGrid, but PageGrid has selection logic which we might not need 
                if we just download ALL. However, reusing it is fine, just ignore selection props 
                or modify PageGrid to be optional selection. 
                Actually PageGrid requires onTogglePage and selectedPages.
                Let's just pass a dummy empty set and no-op toggle if we don't want selection,
                OR we let user select which pages to download?
                Requirement: "PDF -> PDF Imageization". Usually implies all. 
                Let's just show them.
                Actually, let's create a simple grid here or reuse PageGrid. 
                PageGrid is nice. Let's make selection optional in PageGrid?
                Or just pass everything as selected?
                Let's use PageGrid but pass dummy props for now to save time, 
                or better, implement a simple grid here since we don't need selection logic.
            */}

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4 border rounded-md bg-muted/20">
                            {pages.map((p) => (
                                <div key={p.pageIndex} className="relative aspect-[3/4] w-full overflow-hidden rounded-md border bg-white shadow-sm">
                                    <img
                                        src={p.image}
                                        alt={`Page ${p.pageIndex}`}
                                        className="object-contain w-full h-full"
                                    />
                                    <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-0.5 rounded shadow-sm backdrop-blur-sm">
                                        {p.pageIndex}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-center">
                            <Button variant="outline" onClick={reset} className="mr-4">
                                Start Over
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {file && (
                <div className="sticky bottom-0 z-10 p-4 bg-background/80 backdrop-blur-md border-t flex flex-wrap items-center justify-between gap-4 shadow-2xl safe-area-bottom">
                    <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-sm px-3 py-1">
                            {pages.length} images
                        </Badge>
                    </div>
                    <div className="flex items-center gap-3 ml-auto">
                        <Button variant="outline" onClick={reset}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reset
                        </Button>
                        <Button onClick={handleDownload} disabled={isZipping}>
                            {isZipping ? (
                                <>Compressing...</>
                            ) : (
                                <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download ZIP
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

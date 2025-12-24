'use client';

import React, { useState, useCallback } from 'react';
import { createPdfFromImages, readFileAsDataURL } from '@/lib/image-pdf-utils';
import { ImageDropzone } from '@/components/image-to-pdf/image-dropzone';
import { ImageGrid } from '@/components/image-to-pdf/image-grid';
import { ImageActionBar } from '@/components/image-to-pdf/image-action-bar';
import { Loader2 } from 'lucide-react';

interface ImageData {
    id: string;
    url: string;
    file: File;
}

export function ImageToPdf() {
    const [images, setImages] = useState<ImageData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateId = () => Math.random().toString(36).substring(2, 9);

    const handleFilesSelect = useCallback(async (files: File[]) => {
        try {
            setError(null);
            setIsProcessing(true);

            const newImages: ImageData[] = [];
            for (const file of files) {
                const url = await readFileAsDataURL(file);
                newImages.push({
                    id: generateId(),
                    url,
                    file
                });
            }

            setImages(prev => [...prev, ...newImages]);

        } catch (err: any) {
            console.error(err);
            setError('Failed to process one or more images.');
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const handleRemoveImage = useCallback((id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
    }, []);

    const reset = useCallback(() => {
        setImages([]);
        setError(null);
    }, []);

    const download = useCallback(async () => {
        if (images.length === 0) return;

        try {
            setIsGenerating(true);
            const files = images.map(img => img.file);
            const pdfBytes = await createPdfFromImages(files);

            const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'converted_images.pdf';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (err) {
            console.error(err);
            setError('Failed to generate PDF.');
        } finally {
            setIsGenerating(false);
        }
    }, [images]);

    return (
        <div className="flex flex-col w-full">
            <div className="flex items-center justify-between mb-8 px-4 md:px-8">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold tracking-tight">Images into PDF</h2>
                    <p className="text-muted-foreground">Combine multiple images into a single PDF document.</p>
                </div>
                {images.length > 0 && (
                    <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {images.length} image{images.length !== 1 ? 's' : ''} loaded
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 md:px-8 gap-8">
                {images.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-full max-w-md space-y-8">
                            <ImageDropzone onFilesSelect={handleFilesSelect} isProcessing={isProcessing} />
                            {error && (
                                <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm text-center">
                                    {error}
                                </div>
                            )}
                            {isProcessing && (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <p className="text-sm">Processing images...</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Images</h2>
                                <p className="text-sm text-muted-foreground">Review and order your images.</p>
                            </div>
                        </div>

                        <ImageGrid
                            images={images}
                            onRemove={handleRemoveImage}
                        />

                        <div className="mt-8 border-t pt-8">
                            <h3 className="text-sm font-medium mb-4">Add more images</h3>
                            <ImageDropzone onFilesSelect={handleFilesSelect} isProcessing={isProcessing} className="max-w-md mx-auto h-32" />
                        </div>
                    </div>
                )}
            </div>

            {images.length > 0 && (
                <ImageActionBar
                    totalImages={images.length}
                    onReset={reset}
                    onDownload={download}
                    isDownloading={isGenerating}
                />
            )}
        </div>
    );
}

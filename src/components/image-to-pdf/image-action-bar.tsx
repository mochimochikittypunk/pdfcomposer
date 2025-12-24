'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ImageActionBarProps {
    totalImages: number;
    onReset: () => void;
    onDownload: () => void;
    isDownloading: boolean;
}

export function ImageActionBar({
    totalImages,
    onReset,
    onDownload,
    isDownloading
}: ImageActionBarProps) {
    return (
        <div className="sticky bottom-0 z-10 p-4 bg-background/80 backdrop-blur-md border-t flex flex-wrap items-center justify-between gap-4 shadow-2xl safe-area-bottom">
            <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-sm px-3 py-1">
                    {totalImages} images selected
                </Badge>
            </div>

            <div className="flex items-center gap-3 ml-auto">
                <Button variant="outline" onClick={onReset} disabled={isDownloading}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear All
                </Button>
                <Button
                    onClick={onDownload}
                    disabled={totalImages === 0 || isDownloading}
                    className="min-w-[160px]"
                >
                    {isDownloading ? (
                        <>Generating PDF...</>
                    ) : (
                        <>
                            <Download className="w-4 h-4 mr-2" />
                            Convert to PDF
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

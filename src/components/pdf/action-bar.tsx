'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckSquare, Square, Download, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ActionBarProps {
    totalDocs: number;
    selectedCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onReset: () => void;
    onDownload: () => void;
    isDownloading: boolean;
}

export function ActionBar({
    totalDocs,
    selectedCount,
    onSelectAll,
    onDeselectAll,
    onReset,
    onDownload,
    isDownloading
}: ActionBarProps) {
    return (
        <div className="sticky bottom-0 z-10 p-4 bg-background/80 backdrop-blur-md border-t flex flex-wrap items-center justify-between gap-4 shadow-2xl safe-area-bottom">
            <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-sm px-3 py-1">
                    {selectedCount} / {totalDocs} selected
                </Badge>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={onSelectAll} disabled={isDownloading}>
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onDeselectAll} disabled={isDownloading || selectedCount === 0}>
                        <Square className="w-4 h-4 mr-2" />
                        Deselect
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-3 ml-auto">
                <Button variant="outline" onClick={onReset} disabled={isDownloading}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Start Over
                </Button>
                <Button
                    onClick={onDownload}
                    disabled={selectedCount === 0 || isDownloading}
                    className="min-w-[140px]"
                >
                    {isDownloading ? (
                        <>Downloading...</>
                    ) : (
                        <>
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

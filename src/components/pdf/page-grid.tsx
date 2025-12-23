'use client';

import React from 'react';
import { PageThumbnail } from './page-thumbnail';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PageGridProps {
    pages: string[]; // Array of data URLs
    selectedPages: Set<number>; // Set of selected page indices (0-based)
    onTogglePage: (index: number) => void;
}

export function PageGrid({ pages, selectedPages, onTogglePage }: PageGridProps) {
    if (pages.length === 0) return null;

    return (
        <ScrollArea className="h-[calc(100vh-250px)] w-full rounded-md border bg-muted/20 p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4">
                {pages.map((dataUrl, index) => (
                    <PageThumbnail
                        key={index}
                        pageNumber={index + 1}
                        image={dataUrl}
                        isSelected={selectedPages.has(index)}
                        onToggle={() => onTogglePage(index)}
                    />
                ))}
            </div>
        </ScrollArea>
    );
}

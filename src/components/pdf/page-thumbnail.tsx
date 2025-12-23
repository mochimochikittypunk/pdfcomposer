'use client';

import React from 'react';
import Image from 'next/image';
import { Check, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface PageThumbnailProps {
    pageNumber: number;
    image: string;
    isSelected: boolean;
    onToggle: () => void;
}

export function PageThumbnail({ pageNumber, image, isSelected, onToggle }: PageThumbnailProps) {
    return (
        <div
            className={cn(
                "group relative flex flex-col gap-2 p-2 rounded-lg border-2 transition-all duration-200 cursor-pointer",
                isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-transparent hover:border-muted-foreground/25 hover:bg-muted/50"
            )}
            onClick={onToggle}
        >
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md border bg-white shadow-sm">
                {/* We use standard img for data URLs often because Next Image requires domain config or loader for generic handling, 
            but unoptimized prop works for data URLs too. */}
                <Image
                    src={image}
                    alt={`Page ${pageNumber}`}
                    fill
                    className="object-contain"
                    unoptimized
                />

                {/* Overlay for selection indication */}
                <div className={cn(
                    "absolute inset-0 transition-colors flex items-center justify-center",
                    isSelected ? "bg-primary/10" : "bg-transparent group-hover:bg-black/5"
                )}>
                    {isSelected && (
                        <div className="bg-primary text-primary-foreground rounded-full p-2 shadow-lg animate-in zoom-in-50">
                            <Check className="w-6 h-6" />
                        </div>
                    )}
                </div>

                {/* Page Number Badge */}
                <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-0.5 rounded shadow-sm backdrop-blur-sm">
                    Page {pageNumber}
                </div>
            </div>

            <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    Page {pageNumber}
                </span>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={onToggle}
                    className={cn(
                        "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
                        // Stop propagation to prevent double toggle if container click handles it
                    )}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </div>
    );
}

'use client';

import React from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface ImageData {
    id: string;
    url: string;
    file: File;
}

interface ImageGridProps {
    images: ImageData[];
    onRemove: (id: string) => void;
}

export function ImageGrid({ images, onRemove }: ImageGridProps) {
    if (images.length === 0) return null;

    return (
        <ScrollArea className="h-[calc(100vh-250px)] w-full rounded-md border bg-muted/20 p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4">
                {images.map((img, index) => (
                    <div
                        key={img.id}
                        className="group relative flex flex-col gap-2 p-2 rounded-lg border-2 border-transparent hover:border-muted-foreground/25 hover:bg-muted/50 transition-all duration-200"
                    >
                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md border bg-white shadow-sm">
                            <Image
                                src={img.url}
                                alt={`Image ${index + 1}`}
                                fill
                                className="object-contain"
                                unoptimized
                            />

                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(img.id);
                                    }}
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>

                            <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-0.5 rounded shadow-sm backdrop-blur-sm">
                                {index + 1}
                            </div>
                        </div>
                        <div className="px-1">
                            <p className="text-xs text-muted-foreground truncate" title={img.file.name}>
                                {img.file.name}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}

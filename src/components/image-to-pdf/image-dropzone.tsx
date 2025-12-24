'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ImageDropzoneProps {
    onFilesSelect: (files: File[]) => void;
    className?: string;
    isProcessing?: boolean;
}

export function ImageDropzone({ onFilesSelect, className, isProcessing }: ImageDropzoneProps) {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            onFilesSelect(acceptedFiles);
        }
    }, [onFilesSelect]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
        },
        disabled: isProcessing,
    });

    return (
        <Card
            {...getRootProps()}
            className={cn(
                "border-2 border-dashed transition-colors cursor-pointer hover:bg-muted/50",
                isDragActive ? "border-primary bg-muted/50" : "border-muted-foreground/25",
                isProcessing ? "opacity-50 cursor-not-allowed" : "",
                className
            )}
        >
            <CardContent className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
                <input {...getInputProps()} />
                <div className="p-4 rounded-full bg-primary/10">
                    <UploadCloud className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-1">
                    <h3 className="font-semibold text-lg tracking-tight">
                        {isDragActive ? "Drop images here" : "Upload Images"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Drag and drop or click to select multiple images
                    </p>
                </div>
                {!isDragActive && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        <ImageIcon className="w-3 h-3" />
                        <span>JPG, PNG</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

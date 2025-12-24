'use client';

import React, { useState, useCallback } from 'react';
import { loadSbiCsv, generatePortfolioCsv, SbiPortfolioRow } from '@/lib/csv-utils';
import { CsvDropzone } from '@/components/csv/csv-dropzone';
import { CsvPreview } from '@/components/csv/csv-preview';
import { Button } from '@/components/ui/button';
import { Download, Loader2, RefreshCw, FileCheck } from 'lucide-react';

export function SbiCsvConverter() {
    const [data, setData] = useState<SbiPortfolioRow[]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = useCallback(async (file: File) => {
        try {
            setError(null);
            setIsProcessing(true);
            setFileName(file.name);

            const rows = await loadSbiCsv(file);

            if (rows.length === 0) {
                throw new Error("No valid portfolio data found. Please check the file format.");
            }

            setData(rows);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to process CSV file.');
            setData([]);
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const handleDownload = useCallback(() => {
        if (data.length === 0) return;

        const csvContent = generatePortfolioCsv(data);
        // Add BOM for Excel UTF-8 compatibility
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'portfolio.csv';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    }, [data]);

    const reset = useCallback(() => {
        setData([]);
        setFileName('');
        setError(null);
    }, []);

    return (
        <div className="flex flex-col w-full">
            <div className="flex items-center justify-between mb-8 px-4 md:px-8">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold tracking-tight">SBI CSV Converter</h2>
                    <p className="text-muted-foreground">Format SBI Securities portfolio data for better readability.</p>
                </div>
                {data.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                        <FileCheck className="w-4 h-4" />
                        Conversion Ready
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 md:px-8 gap-8">
                {data.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-full max-w-md space-y-8">
                            <CsvDropzone onFileSelect={handleFileSelect} isProcessing={isProcessing} />
                            {error && (
                                <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm text-center">
                                    {error}
                                </div>
                            )}
                            {isProcessing && (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <p className="text-sm">Decoding Shift-JIS & Parsing...</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">{fileName}</h2>
                                <p className="text-sm text-muted-foreground">{data.length} records found.</p>
                            </div>
                        </div>

                        <CsvPreview data={data} />

                        <div className="mt-8 flex justify-center gap-4">
                            <Button variant="outline" onClick={reset}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reset
                            </Button>
                            <Button onClick={handleDownload} className="min-w-[200px]">
                                <Download className="w-4 h-4 mr-2" />
                                Download portfolio.csv
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

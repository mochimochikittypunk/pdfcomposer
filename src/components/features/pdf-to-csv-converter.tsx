'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, Download, Trash2, Edit3, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    extractPdfToTable,
    pagesToCsvData,
    toCsvWithBom,
    downloadCsv,
    ExtractedPage,
    TableRow
} from '@/lib/pdf-table-utils';

type EditableRow = {
    id: string;
    cells: string[];
    originalY: number;
};

type PageData = {
    pageNumber: number;
    rows: EditableRow[];
};

export function PdfToCsvConverter() {
    const [fileName, setFileName] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [pages, setPages] = useState<PageData[]>([]);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file || !file.name.endsWith('.pdf')) {
            setError('PDFファイルを選択してください');
            return;
        }

        setFileName(file.name);
        setIsProcessing(true);
        setError(null);

        try {
            const extractedPages = await extractPdfToTable(file);

            // Convert to editable format
            const editablePages: PageData[] = extractedPages.map(page => ({
                pageNumber: page.pageNumber,
                rows: page.rows.map((row, idx) => ({
                    id: `p${page.pageNumber}-r${idx}`,
                    cells: row.cells.map(c => c.text),
                    originalY: row.y,
                })),
            }));

            setPages(editablePages);
        } catch (err: any) {
            console.error('PDF extraction error:', err);
            setError(`抽出エラー: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 1,
    });

    const handleCellChange = (pageIdx: number, rowIdx: number, cellIdx: number, value: string) => {
        setPages(prev => {
            const newPages = [...prev];
            newPages[pageIdx] = {
                ...newPages[pageIdx],
                rows: newPages[pageIdx].rows.map((row, ri) =>
                    ri === rowIdx
                        ? { ...row, cells: row.cells.map((c, ci) => ci === cellIdx ? value : c) }
                        : row
                ),
            };
            return newPages;
        });
    };

    const handleDeleteRow = (pageIdx: number, rowIdx: number) => {
        setPages(prev => {
            const newPages = [...prev];
            newPages[pageIdx] = {
                ...newPages[pageIdx],
                rows: newPages[pageIdx].rows.filter((_, ri) => ri !== rowIdx),
            };
            return newPages;
        });
    };

    const handleAddCell = (pageIdx: number, rowIdx: number) => {
        setPages(prev => {
            const newPages = [...prev];
            newPages[pageIdx] = {
                ...newPages[pageIdx],
                rows: newPages[pageIdx].rows.map((row, ri) =>
                    ri === rowIdx
                        ? { ...row, cells: [...row.cells, ''] }
                        : row
                ),
            };
            return newPages;
        });
    };

    const handleExportCsv = () => {
        const allRows: string[][] = [];

        for (const page of pages) {
            if (pages.length > 1) {
                allRows.push([`--- Page ${page.pageNumber} ---`]);
            }
            for (const row of page.rows) {
                allRows.push(row.cells);
            }
        }

        const csvContent = toCsvWithBom(allRows);
        downloadCsv(csvContent, fileName || 'export.csv');
    };

    const handleReset = () => {
        setPages([]);
        setFileName('');
        setError(null);
    };

    const totalRows = pages.reduce((sum, p) => sum + p.rows.length, 0);

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">PDF to CSV Converter</h2>
                <p className="text-muted-foreground">
                    PDFからテキストを抽出し、編集可能なCSVとしてエクスポートします。
                    Numbers/Excelで文字化けしない形式で出力されます。
                </p>
            </div>

            {/* Dropzone */}
            {pages.length === 0 && (
                <div
                    {...getRootProps()}
                    className={`
                        border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                        transition-colors duration-200
                        ${isDragActive
                            ? 'border-primary bg-primary/5'
                            : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'
                        }
                        ${isProcessing ? 'pointer-events-none opacity-50' : ''}
                    `}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-4">
                        {isProcessing ? (
                            <>
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                                <p className="text-lg font-medium">PDFを解析中...</p>
                            </>
                        ) : (
                            <>
                                <Upload className="h-12 w-12 text-muted-foreground" />
                                <div>
                                    <p className="text-lg font-medium">
                                        PDFファイルをドラッグ&ドロップ
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        またはクリックしてファイルを選択
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
                    {error}
                </div>
            )}

            {/* Data Grid */}
            {pages.length > 0 && (
                <div className="space-y-6">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary" />
                            <span className="font-medium">{fileName}</span>
                            <span className="text-sm text-muted-foreground">
                                ({pages.length}ページ, {totalRows}行)
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleReset}>
                                <RotateCcw className="h-4 w-4 mr-1" />
                                リセット
                            </Button>
                            <Button size="sm" onClick={handleExportCsv}>
                                <Download className="h-4 w-4 mr-1" />
                                CSVダウンロード
                            </Button>
                        </div>
                    </div>

                    {/* Editable Grid per Page */}
                    {pages.map((page, pageIdx) => (
                        <div key={page.pageNumber} className="border rounded-lg overflow-hidden">
                            <div className="bg-muted/50 px-4 py-2 border-b font-medium">
                                Page {page.pageNumber}
                            </div>
                            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <tbody>
                                        {page.rows.map((row, rowIdx) => (
                                            <tr key={row.id} className="border-b hover:bg-muted/20 group">
                                                <td className="px-2 py-1 text-muted-foreground text-xs w-12 text-center bg-muted/10">
                                                    {rowIdx + 1}
                                                </td>
                                                {row.cells.map((cell, cellIdx) => (
                                                    <td key={cellIdx} className="px-1 py-0.5">
                                                        <Input
                                                            value={cell}
                                                            onChange={(e) => handleCellChange(pageIdx, rowIdx, cellIdx, e.target.value)}
                                                            className="h-7 text-xs border-transparent hover:border-border focus:border-primary"
                                                        />
                                                    </td>
                                                ))}
                                                <td className="px-2 py-1 w-20">
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => handleAddCell(pageIdx, rowIdx)}
                                                            title="セルを追加"
                                                        >
                                                            <Edit3 className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-destructive hover:text-destructive"
                                                            onClick={() => handleDeleteRow(pageIdx, rowIdx)}
                                                            title="行を削除"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* Footer Actions */}
                    <div className="flex justify-end">
                        <Button size="lg" onClick={handleExportCsv}>
                            <Download className="h-5 w-5 mr-2" />
                            CSVをダウンロード (BOM付きUTF-8)
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        ※ 各セルをクリックして直接編集できます。不要な行は右側のゴミ箱アイコンで削除できます。
                    </p>
                </div>
            )}
        </div>
    );
}

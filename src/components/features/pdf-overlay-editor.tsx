'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Trash2, Type, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// Available fonts with their Google Fonts URL and display name
// Available fonts with their Google Fonts URL and display name, plus direct TTF URL for export
// Available fonts with their Google Fonts URL and display name, plus direct TTF URL for export
const AVAILABLE_FONTS = [
    { id: 'noto-sans-jp', name: 'Noto Sans JP', googleFamily: 'Noto+Sans+JP', weight: 400, url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP-Regular.ttf' },
    { id: 'noto-serif-jp', name: 'Noto Serif JP', googleFamily: 'Noto+Serif+JP', weight: 400, url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifjp/NotoSerifJP-Regular.otf' },
    { id: 'shippori-mincho', name: '明朝体 (MS明朝風 / Shippori)', googleFamily: 'Shippori+Mincho', weight: 400, url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/shipporimincho/ShipporiMincho-Regular.ttf' },
    { id: 'm-plus-1p', name: 'M PLUS 1p', googleFamily: 'M+PLUS+1p', weight: 400, url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/mplus1p/MPLUS1p-Regular.ttf' },
    { id: 'kosugi-maru', name: 'Kosugi Maru', googleFamily: 'Kosugi+Maru', weight: 400, url: 'https://raw.githubusercontent.com/googlefonts/kosugi-maru/main/fonts/ttf/KosugiMaru-Regular.ttf' },
    { id: 'sawarabi-gothic', name: 'Sawarabi Gothic', googleFamily: 'Sawarabi+Gothic', weight: 400, url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/sawarabigothic/SawarabiGothic-Regular.ttf' },
    { id: 'roboto', name: 'Roboto', googleFamily: 'Roboto', weight: 400, url: 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/Roboto-Regular.ttf' },
    { id: 'roboto-mono', name: 'Roboto Mono', googleFamily: 'Roboto+Mono', weight: 400, url: 'https://raw.githubusercontent.com/google/fonts/main/apache/robotomono/RobotoMono-Regular.ttf' },
    { id: 'courier-prime', name: 'Courier Prime', googleFamily: 'Courier+Prime', weight: 400, url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/courierprime/CourierPrime-Regular.ttf' },
    { id: 'ocr-a', name: 'Share Tech Mono (OCR風)', googleFamily: 'Share+Tech+Mono', weight: 400, url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/sharetechmono/ShareTechMono-Regular.ttf' },
    { id: 'source-code-pro', name: 'Source Code Pro', googleFamily: 'Source+Code+Pro', weight: 400, url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/sourcecodepro/SourceCodePro-Regular.ttf' },
] as const;

type FontId = typeof AVAILABLE_FONTS[number]['id'];

interface Annotation {
    id: string;
    pageIndex: number;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fontId: FontId;
    useWhiteBox: boolean;
    boxWidth: number;
    boxHeight: number;
    alignment: 'left' | 'center' | 'right';
}

// Cache for loaded fonts
const fontCache = new Map<string, ArrayBuffer>();

async function loadFont(fontId: FontId): Promise<ArrayBuffer> {
    const font = AVAILABLE_FONTS.find(f => f.id === fontId);
    if (!font) throw new Error(`Font ${fontId} not found`);

    if (fontCache.has(fontId)) {
        return fontCache.get(fontId)!;
    }

    // Use our local proxy API to bypass CORS with direct URL
    try {
        const response = await fetch(`/api/font-proxy?url=${encodeURIComponent(font.url)}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch font: ${response.statusText}`);
        }

        const fontBuffer = await response.arrayBuffer();
        fontCache.set(fontId, fontBuffer);
        return fontBuffer;
    } catch (error) {
        console.error('Font loading error:', error);
        throw error;
    }
}

export function PdfOverlayEditor() {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
    const [pageImages, setPageImages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scale] = useState(1.5);

    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    // Load Google Fonts CSS for preview
    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?${AVAILABLE_FONTS.map(f => `family=${f.googleFamily}:wght@${f.weight}`).join('&')}&display=swap`;
        document.head.appendChild(link);
        return () => { document.head.removeChild(link); };
    }, []);

    const loadPdf = useCallback(async (file: File) => {
        setIsProcessing(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            // Store a clean copy for pdf-lib export
            setPdfBytes(arrayBuffer.slice(0));

            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            // Pass a separate clone to PDF.js to avoid detachment of the original
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
            const images: string[] = [];

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                const renderContext = { canvasContext: context, viewport: viewport };
                await page.render(renderContext as any).promise;
                images.push(canvas.toDataURL('image/png'));
            }

            setPageImages(images);
            setCurrentPage(0);
            setPdfFile(file);
        } catch (err) {
            console.error('PDF load error:', err);
        } finally {
            setIsProcessing(false);
        }
    }, [scale]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file?.name.endsWith('.pdf')) {
            loadPdf(file);
        }
    }, [loadPdf]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 1,
    });

    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!canvasContainerRef.current) return;

        const rect = canvasContainerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const newAnnotation: Annotation = {
            id: `ann-${Date.now()}`,
            pageIndex: currentPage,
            x,
            y,
            text: '編集テキスト',
            fontSize: 13,
            fontId: 'kosugi-maru', // Default to Kosugi Maru as requested
            useWhiteBox: true,
            boxWidth: 80,
            boxHeight: 20,
            alignment: 'right', // Default to right alignment
        };

        setAnnotations(prev => [...prev, newAnnotation]);
        setSelectedAnnotation(newAnnotation.id);
    };

    const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
        setAnnotations(prev => prev.map(ann =>
            ann.id === id ? { ...ann, ...updates } : ann
        ));
    };

    const deleteAnnotation = (id: string) => {
        setAnnotations(prev => prev.filter(ann => ann.id !== id));
        if (selectedAnnotation === id) setSelectedAnnotation(null);
    };

    const handleDrag = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canvasContainerRef.current) return;

        const rect = canvasContainerRef.current.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const ann = annotations.find(a => a.id === id);
        if (!ann) return;

        const startAnnX = ann.x;
        const startAnnY = ann.y;

        const onMove = (moveE: MouseEvent) => {
            const deltaX = ((moveE.clientX - startX) / rect.width) * 100;
            const deltaY = ((moveE.clientY - startY) / rect.height) * 100;
            updateAnnotation(id, {
                x: Math.max(0, Math.min(100, startAnnX + deltaX)),
                y: Math.max(0, Math.min(100, startAnnY + deltaY)),
            });
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    const handleContextMenu = (e: React.MouseEvent, ann: Annotation) => {
        e.preventDefault();
        e.stopPropagation();

        const newAnnotation: Annotation = {
            ...ann,
            id: `ann-${Date.now()}`,
            x: ann.x + 2, // Slight offset
            y: ann.y + 2, // Slight offset
            alignment: ann.alignment || 'right', // Copy alignment or default
        };

        setAnnotations(prev => [...prev, newAnnotation]);
        setSelectedAnnotation(newAnnotation.id);
    };

    const handleExport = async () => {
        if (!pdfBytes) return;

        setIsProcessing(true);
        try {
            // Clone buffer to avoid "Buffer is already detached" error
            const pdfDoc = await PDFDocument.load(pdfBytes.slice(0));
            pdfDoc.registerFontkit(fontkit);

            // Collect unique fonts needed
            const neededFonts = new Set(annotations.map(a => a.fontId));
            const embeddedFonts = new Map<string, any>();

            for (const fontId of neededFonts) {
                const fontInfo = AVAILABLE_FONTS.find(f => f.id === fontId);
                if (fontInfo) {
                    try {
                        const fontBuffer = await loadFont(fontId as FontId);
                        const font = await pdfDoc.embedFont(fontBuffer);
                        embeddedFonts.set(fontId, font);
                    } catch (err) {
                        console.error(`Failed to load font ${fontId}:`, err);
                    }
                }
            }

            const pages = pdfDoc.getPages();

            for (const ann of annotations) {
                if (ann.pageIndex >= pages.length) continue;

                const page = pages[ann.pageIndex];
                const { width, height } = page.getSize();

                // Calculate scale factor between preview container and actual PDF page
                // Use a default width if containerSize is not yet determined
                const containerWidth = containerSize.width || 600;
                // We calculate scaling based on width ratio
                const scaleFactor = width / containerWidth;

                // Position calculation:
                // ann.x/y are percentages of the container
                const pdfX = (ann.x / 100) * width;
                // PDF Y coordinates start from bottom, so we invert.
                // Note: ann.y is percentage from top
                const pdfY = height - ((ann.y / 100) * height);

                // Box size calculation:
                // ann.boxWidth/Height are in screen pixels.
                // We need to scale them to PDF coordinate system.
                const boxWidthPdf = ann.boxWidth * scaleFactor;
                const boxHeightPdf = ann.boxHeight * scaleFactor;

                if (ann.useWhiteBox) {
                    page.drawRectangle({
                        x: pdfX,
                        y: pdfY - boxHeightPdf, // Draw up from the bottom-left corner
                        width: boxWidthPdf,
                        height: boxHeightPdf,
                        color: rgb(1, 1, 1),
                        // No border - just fill
                    });
                }

                const font = embeddedFonts.get(ann.fontId);
                if (font) {
                    // Font size scaling:
                    // ann.fontSize is in screen pixels (approx).
                    // We need to scale it to PDF points.
                    // Usually screen pixels roughly map to points, but due to our preview scaling,
                    // we probably need to apply the same scaleFactor or a tuned multiplier.
                    // Let's try applying the scaleFactor to keep it proportional to the white box.
                    const scaledFontSize = ann.fontSize * scaleFactor;

                    // Calculate text width for alignment
                    const textWidth = font.widthOfTextAtSize(ann.text, scaledFontSize);
                    let xOffset = 2 * scaleFactor; // Default padding for left alignment

                    if (ann.alignment === 'center') {
                        xOffset = (boxWidthPdf - textWidth) / 2;
                    } else if (ann.alignment === 'right') {
                        xOffset = boxWidthPdf - textWidth - (2 * scaleFactor);
                    }

                    page.drawText(ann.text, {
                        x: pdfX + xOffset, // Apply alignment offset
                        y: pdfY - scaledFontSize - (2 * scaleFactor),
                        size: scaledFontSize,
                        font: font,
                        color: rgb(0, 0, 0),
                    });
                }
            }

            const modifiedPdfBytes = await pdfDoc.save();
            const blob = new Blob([new Uint8Array(modifiedPdfBytes)], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = pdfFile?.name.replace('.pdf', '_edited.pdf') || 'edited.pdf';
            a.click();
            URL.revokeObjectURL(url);

        } catch (err) {
            console.error('Export error:', err);
            alert('エクスポート中にエラーが発生しました。コンソールを確認してください。');
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        if (canvasContainerRef.current) {
            const rect = canvasContainerRef.current.getBoundingClientRect();
            setContainerSize({ width: rect.width, height: rect.height });
        }
    }, [pageImages, currentPage]);

    const currentAnnotations = annotations.filter(a => a.pageIndex === currentPage);
    const selectedAnn = annotations.find(a => a.id === selectedAnnotation);

    // Get font family for preview
    const getFontFamily = (fontId: FontId): string => {
        const font = AVAILABLE_FONTS.find(f => f.id === fontId);
        return font ? font.googleFamily.replace(/\+/g, ' ') : 'sans-serif';
    };

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">PDF Overlay Editor</h2>
                <p className="text-muted-foreground">
                    PDFの上にテキストを追加・編集します。元のレイアウトを維持したまま数値を修正できます。
                </p>
            </div>

            {pageImages.length === 0 && (
                <div
                    {...getRootProps()}
                    className={`
                        border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                        transition-colors duration-200
                        ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'}
                        ${isProcessing ? 'pointer-events-none opacity-50' : ''}
                    `}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-4">
                        {isProcessing ? (
                            <>
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                                <p className="text-lg font-medium">PDFを読み込み中...</p>
                            </>
                        ) : (
                            <>
                                <Upload className="h-12 w-12 text-muted-foreground" />
                                <p className="text-lg font-medium">PDFファイルをドラッグ&ドロップ</p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {pageImages.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {pageImages.map((_, idx) => (
                                    <Button
                                        key={idx}
                                        variant={currentPage === idx ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setCurrentPage(idx)}
                                    >
                                        Page {idx + 1}
                                    </Button>
                                ))}
                            </div>
                            <Button onClick={handleExport} disabled={isProcessing}>
                                <Download className="h-4 w-4 mr-2" />
                                {isProcessing ? 'エクスポート中...' : 'PDFをダウンロード'}
                            </Button>
                        </div>

                        <div
                            ref={canvasContainerRef}
                            className="relative border rounded-lg overflow-hidden cursor-crosshair bg-gray-100"
                            onClick={handleCanvasClick}
                        >
                            <img
                                src={pageImages[currentPage]}
                                alt={`Page ${currentPage + 1}`}
                                className="w-full h-auto"
                                draggable={false}
                            />

                            {currentAnnotations.map(ann => (
                                <div
                                    key={ann.id}
                                    className={`absolute cursor-move ${selectedAnnotation === ann.id ? 'ring-2 ring-blue-500' : ''}`}
                                    style={{
                                        left: `${ann.x}%`,
                                        top: `${ann.y}%`,
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedAnnotation(ann.id);
                                    }}
                                    onMouseDown={(e) => handleDrag(ann.id, e)}
                                    onContextMenu={(e) => handleContextMenu(e, ann)}
                                >
                                    {ann.useWhiteBox && (
                                        <div
                                            className="absolute bg-white"
                                            style={{
                                                width: ann.boxWidth,
                                                height: ann.boxHeight,
                                            }}
                                        />
                                    )}
                                    <div
                                        className="absolute whitespace-nowrap"
                                        style={{
                                            fontSize: ann.fontSize,
                                            fontFamily: getFontFamily(ann.fontId),
                                            padding: '2px 4px', // Add horizontal padding
                                            width: ann.boxWidth, // Enforce width for alignment
                                            textAlign: ann.alignment || 'right', // Apply alignment
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        {ann.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="text-xs text-muted-foreground mt-2">
                            💡 画像をクリックして編集ボックスを追加。ドラッグで移動可能。
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="border rounded-lg p-4">
                            <h3 className="font-bold mb-3 flex items-center gap-2">
                                <Type className="h-4 w-4" />
                                編集ボックス一覧
                            </h3>

                            {currentAnnotations.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    PDFをクリックして編集ボックスを追加してください
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {currentAnnotations.map((ann, idx) => (
                                        <div
                                            key={ann.id}
                                            className={`p-2 border rounded cursor-pointer ${selectedAnnotation === ann.id ? 'border-blue-500 bg-blue-50' : ''}`}
                                            onClick={() => setSelectedAnnotation(ann.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">#{idx + 1}: {ann.text.slice(0, 15)}...</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteAnnotation(ann.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedAnn && (
                            <div className="border rounded-lg p-4 space-y-4">
                                <h3 className="font-bold">編集オプション</h3>

                                <div>
                                    <Label>テキスト内容</Label>
                                    <Input
                                        value={selectedAnn.text}
                                        onChange={(e) => updateAnnotation(selectedAnn.id, { text: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label>フォント</Label>
                                    <Select
                                        value={selectedAnn.fontId}
                                        onValueChange={(value: FontId) => updateAnnotation(selectedAnn.id, { fontId: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {AVAILABLE_FONTS.map(font => (
                                                <SelectItem key={font.id} value={font.id}>
                                                    <span style={{ fontFamily: font.googleFamily.replace(/\+/g, ' ') }}>
                                                        {font.name}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>フォントサイズ</Label>
                                    <Input
                                        type="number"
                                        value={selectedAnn.fontSize}
                                        onChange={(e) => updateAnnotation(selectedAnn.id, { fontSize: Number(e.target.value) })}
                                        min={6}
                                        max={72}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>文字揃え</Label>
                                    <div className="flex items-center gap-1 border rounded-md p-1">
                                        <Button
                                            variant={selectedAnn.alignment === 'left' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => updateAnnotation(selectedAnn.id, { alignment: 'left' })}
                                        >
                                            <AlignLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant={selectedAnn.alignment === 'center' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => updateAnnotation(selectedAnn.id, { alignment: 'center' })}
                                        >
                                            <AlignCenter className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant={selectedAnn.alignment === 'right' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => updateAnnotation(selectedAnn.id, { alignment: 'right' })}
                                        >
                                            <AlignRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>白い背景ボックスを使用</Label>
                                    <Switch
                                        checked={selectedAnn.useWhiteBox}
                                        onCheckedChange={(checked: boolean) => updateAnnotation(selectedAnn.id, { useWhiteBox: checked })}
                                    />
                                </div>

                                {selectedAnn.useWhiteBox && (
                                    <>
                                        <div>
                                            <Label>ボックス幅 (px)</Label>
                                            <Input
                                                type="number"
                                                value={selectedAnn.boxWidth}
                                                onChange={(e) => updateAnnotation(selectedAnn.id, { boxWidth: Number(e.target.value) })}
                                                min={10}
                                                max={500}
                                            />
                                        </div>
                                        <div>
                                            <Label>ボックス高さ (px)</Label>
                                            <Input
                                                type="number"
                                                value={selectedAnn.boxHeight}
                                                onChange={(e) => updateAnnotation(selectedAnn.id, { boxHeight: Number(e.target.value) })}
                                                min={10}
                                                max={200}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
                            <p className="font-medium text-green-800">✓ 日本語フォント対応</p>
                            <p className="text-green-700 mt-1">
                                Google Fontsから日本語を含む複数のフォントを選択できます。
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

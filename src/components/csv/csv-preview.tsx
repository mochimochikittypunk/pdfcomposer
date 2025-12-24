'use client';

import React from 'react';
import { SbiPortfolioRow } from '@/lib/csv-utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CsvPreviewProps {
    data: SbiPortfolioRow[];
}

export function CsvPreview({ data }: CsvPreviewProps) {
    // Preview first 5 rows
    const previewRows = data.slice(0, 5);

    return (
        <div className="border rounded-md">
            <div className="bg-muted/50 p-2 text-xs text-muted-foreground border-b text-center">
                Previewing first 5 of {data.length} rows
            </div>
            <ScrollArea className="h-[300px] w-full">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>銘柄コード</TableHead>
                            <TableHead>銘柄名称</TableHead>
                            <TableHead className="text-right">株数</TableHead>
                            <TableHead className="text-right">取得価格</TableHead>
                            <TableHead className="text-right">現在値</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {previewRows.map((row, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium">{row.code}</TableCell>
                                <TableCell>{row.name}</TableCell>
                                <TableCell className="text-right">{row.count.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{row.avgPrice.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{row.currentPrice.toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
}

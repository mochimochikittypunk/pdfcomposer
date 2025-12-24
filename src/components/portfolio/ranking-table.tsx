'use client';

import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export interface RankingRow {
    code: string;
    name: string;
    value: number; // 評価額
    ratio: number; // 構成比 %
    dividend: number; // 配当金合計
    dps: number; // 1株当たり配当
}

interface RankingTableProps {
    data: RankingRow[];
}

export function RankingTable({ data }: RankingTableProps) {
    // Show all data, or maybe top 100
    const displayData = data;

    return (
        <div className="border rounded-md max-h-[600px] overflow-y-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                        <TableHead className="w-[60px]">Rank</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Valuation</TableHead>
                        <TableHead className="text-right">DPS</TableHead>
                        <TableHead className="text-right">Dividend (Est)</TableHead>
                        <TableHead className="text-right">Yield</TableHead>
                        <TableHead className="text-right">Ratio</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {displayData.map((row, index) => (
                        <TableRow key={row.code}>
                            <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                            <TableCell>{row.code}</TableCell>
                            <TableCell className="max-w-[150px] truncate" title={row.name}>{row.name}</TableCell>
                            <TableCell className="text-right">¥{row.value.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                                {row.dps > 0 ? `¥${row.dps}` : '-'}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                                {row.dividend > 0 ? `¥${row.dividend.toLocaleString()}` : <span className="text-yellow-500">¥0</span>}
                            </TableCell>
                            <TableCell className="text-right">
                                {row.value > 0 ? ((row.dividend / row.value) * 100).toFixed(2) : '0.00'}%
                            </TableCell>
                            <TableCell className="text-right">{row.ratio.toFixed(1)}%</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

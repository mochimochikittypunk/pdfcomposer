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
}

interface RankingTableProps {
    data: RankingRow[];
}

export function RankingTable({ data }: RankingTableProps) {
    // Take top 10
    const top10 = data.slice(0, 10);

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60px]">Rank</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Valuation</TableHead>
                        <TableHead className="text-right">Ratio</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {top10.map((row, index) => (
                        <TableRow key={row.code}>
                            <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                            <TableCell>{row.code}</TableCell>
                            <TableCell className="max-w-[150px] truncate" title={row.name}>{row.name}</TableCell>
                            <TableCell className="text-right">¥{row.value.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{row.ratio.toFixed(1)}%</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DividendChartProps {
    data: { name: string; value: number }[]; // name: 銘柄名, value: 評価額
    centerText?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#a4de6c', '#d0ed57', '#a4c8e0'];

export function DividendChart({ data, centerText }: DividendChartProps) {
    // Sort data and probably limit to top X? Or bundle small ones into "Others"?
    // For simplicity, let's just show all for now, assuming usually < 50 stocks.
    // Recharts handles many segments okay, but labels might overlap.

    return (
        <div className="w-full h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: number | undefined) => `¥${(value || 0).toLocaleString()}`}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
            {centerText && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <p className="text-xs text-muted-foreground">Est. Net Income</p>
                    <p className="text-sm font-bold text-primary">{centerText}</p>
                </div>
            )}
        </div>
    );
}

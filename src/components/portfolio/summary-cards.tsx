'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Percent, TrendingUp, PiggyBank } from 'lucide-react';

interface SummaryCardsProps {
    totalInvestment: number; // 合計取得額
    totalEvaluation: number; // 合計評価額
    totalDividend: number;   // 予想配当合計(税引前)
    taxedDividend: number;   // 予想配当合計(税引後)
}

export function SummaryCards({ totalInvestment, totalEvaluation, totalDividend, taxedDividend }: SummaryCardsProps) {
    const yieldOnCost = totalInvestment > 0 ? (totalDividend / totalInvestment) * 100 : 0;
    const yieldOnValue = totalEvaluation > 0 ? (totalDividend / totalEvaluation) * 100 : 0;
    const profit = totalEvaluation - totalInvestment;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Valuation */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Valuation</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">¥{totalEvaluation.toLocaleString()}</div>
                    <p className={`text-xs ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {profit >= 0 ? '+' : ''}¥{profit.toLocaleString()} (Profit)
                    </p>
                </CardContent>
            </Card>

            {/* Yield (on Cost) */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Yield (on Cost)</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{yieldOnCost.toFixed(2)}%</div>
                    <p className="text-xs text-muted-foreground">
                        Investment: ¥{totalInvestment.toLocaleString()}
                    </p>
                </CardContent>
            </Card>

            {/* Yield (on Value) */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Yield (Current)</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{yieldOnValue.toFixed(2)}%</div>
                    <p className="text-xs text-muted-foreground">
                        Annual Dividend: ¥{totalDividend.toLocaleString()}
                    </p>
                </CardContent>
            </Card>

            {/* After-Tax Dividend */}
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-primary">Est. Net Dividend</CardTitle>
                    <PiggyBank className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-primary">¥{Math.round(taxedDividend).toLocaleString()}</div>
                    <p className="text-xs text-primary/80">
                        After 20.315% Tax
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

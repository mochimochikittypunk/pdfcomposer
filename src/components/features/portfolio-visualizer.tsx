'use client';

import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { loadSbiCsv, loadPortfolioCsv, SbiPortfolioRow } from '@/lib/csv-utils';
import { CsvDropzone } from '@/components/csv/csv-dropzone';
import { SummaryCards } from '@/components/portfolio/summary-cards';
import { DividendChart } from '@/components/portfolio/dividend-chart';
import { RankingTable, RankingRow } from '@/components/portfolio/ranking-table';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface EnrichedPortfolioRow extends SbiPortfolioRow {
    dividendPerShare: number; // 配当金(予想)
    totalDividend: number;    // 配当金合計(予想)
}

export function PortfolioVisualizer() {
    const [data, setData] = useState<EnrichedPortfolioRow[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const fetchDividendData = async (rows: SbiPortfolioRow[]) => {
        setIsAnalyzing(true);
        setProgress(0);
        setError(null);

        const enrichedData: EnrichedPortfolioRow[] = [];
        const total = rows.length;
        let completed = 0;

        // Concurrency control: Process in batches of 3
        const BATCH_SIZE = 3;

        try {
            for (let i = 0; i < total; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE);

                const promises = batch.map(async (row) => {
                    try {
                        // API Call
                        const res = await axios.get(`/api/dividend?code=${row.code}`);
                        return {
                            ...row,
                            dividendPerShare: res.data.dividend || 0,
                            totalDividend: (res.data.dividend || 0) * row.count
                        };
                    } catch (e) {
                        console.error(`Failed to fetch for ${row.code}`, e);
                        // Fallback to 0 dividend if failed
                        return {
                            ...row,
                            dividendPerShare: 0,
                            totalDividend: 0
                        };
                    }
                });

                const results = await Promise.all(promises);
                enrichedData.push(...results);

                completed += batch.length;
                setProgress(Math.round((completed / total) * 100));

                // Small delay to be nice to the server?
                await new Promise(r => setTimeout(r, 500));
            }

            setData(enrichedData);

        } catch (err: any) {
            console.error(err);
            setError('Failed to analyze portfolio data.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFileSelect = useCallback(async (file: File) => {
        try {
            setError(null);
            // Try loading as Formatted CSV first (UTF-8)
            let rows: SbiPortfolioRow[] = [];
            try {
                rows = await loadPortfolioCsv(file);
            } catch (e) {
                // Ignore error, try next format
            }

            // If empty or failed, maybe they uploaded the raw SaveFile.csv?
            if (rows.length === 0) {
                rows = await loadSbiCsv(file);
            }

            if (rows.length === 0) {
                throw new Error("No valid portfolio data found. Please upload 'portfolio.csv' or 'SaveFile.csv'.");
            }
            // Start analysis immediately after parse
            await fetchDividendData(rows);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to process CSV file.');
        }
    }, []);

    const reset = useCallback(() => {
        setData([]);
        setError(null);
        setProgress(0);
    }, []);

    // Calculations for Dashboard
    const totalInvestment = data.reduce((sum, item) => sum + (item.avgPrice * item.count), 0);
    const totalEvaluation = data.reduce((sum, item) => sum + (item.currentPrice * item.count), 0);
    const totalDividend = data.reduce((sum, item) => sum + item.totalDividend, 0);
    const taxedDividend = totalDividend * 0.79685;

    // Chart Data (Group small items?)
    // Sort by evaluation value for the chart
    const sortedData = [...data].sort((a, b) => (b.currentPrice * b.count) - (a.currentPrice * a.count));
    const chartData = sortedData.map(item => ({
        name: item.name,
        value: item.currentPrice * item.count
    }));

    // Ranking Data
    const rankingData: RankingRow[] = sortedData.map(item => ({
        code: item.code,
        name: item.name,
        value: item.currentPrice * item.count,
        ratio: totalEvaluation > 0 ? ((item.currentPrice * item.count) / totalEvaluation) * 100 : 0
    }));

    return (
        <div className="flex flex-col w-full space-y-8">
            <div className="flex items-center justify-between px-4 md:px-8">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold tracking-tight">Portfolio Visualizer</h2>
                    <p className="text-muted-foreground">Analyze your portfolio's yield and distribution.</p>
                </div>
            </div>

            <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pb-12">
                {data.length === 0 && !isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-full max-w-md space-y-8">
                            <CsvDropzone onFileSelect={handleFileSelect} isProcessing={isAnalyzing} />
                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </div>
                ) : isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-6">
                        <div className="w-full max-w-md space-y-2">
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Analyzing holdings...</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="w-full h-2" />
                        </div>
                        <div className="flex items-center text-muted-foreground text-sm">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Fetching dividend data from IR Bank... (Slow to avoid bans)
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-8 animate-in slide-in-from-bottom-4 duration-500">

                        {/* Summary Cards */}
                        <SummaryCards
                            totalInvestment={totalInvestment}
                            totalEvaluation={totalEvaluation}
                            totalDividend={totalDividend}
                            taxedDividend={taxedDividend}
                        />

                        <div className="grid gap-8 lg:grid-cols-3">
                            {/* Chart */}
                            <div className="lg:col-span-1 border rounded-lg p-6 bg-card text-card-foreground shadow-sm flex flex-col items-center justify-center">
                                <h3 className="text-lg font-semibold mb-4 w-full">Asset Allocation</h3>
                                <DividendChart
                                    data={chartData}
                                    centerText={`¥${Math.round(taxedDividend).toLocaleString()}`}
                                />
                            </div>

                            {/* Ranking Table */}
                            <div className="lg:col-span-2">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">Top Holdings</h3>
                                </div>
                                <RankingTable data={rankingData} />
                            </div>
                        </div>

                        <div className="mt-4 flex justify-center">
                            <Button variant="outline" onClick={reset}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Analyze New File
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

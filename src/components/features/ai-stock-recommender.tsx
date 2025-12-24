'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Recommendation {
    code: string;
    name: string;
    yield: string;
    reason: string;
}

interface AIResponse {
    marketCapAnalysis: string;
    recommendations: Recommendation[];
}

interface AIStockRecommenderProps {
    portfolio: any[]; // We pass the ranking data
}

export function AIStockRecommender({ portfolio }: AIStockRecommenderProps) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AIResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.post('/api/ai/recommend', { portfolio });
            setResult(res.data);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.details || 'Failed to generate recommendations. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (portfolio.length === 0) return null;

    return (
        <div className="w-full space-y-4 animate-in fade-in duration-500">
            {!result && !loading && (
                <div className="flex justify-center">
                    <Button
                        onClick={handleAnalyze}
                        size="lg"
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg transition-all hover:scale-105"
                    >
                        <Sparkles className="w-5 h-5 mr-2" />
                        Ask AI for High-Yield Recommendations
                    </Button>
                </div>
            )}

            {loading && (
                <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-muted/30 rounded-lg border border-dashed">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-sm text-muted-foreground animate-pulse">
                        Analyzing your portfolio's market cap balance and searching for yield boosters...
                    </p>
                </div>
            )}

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>AI Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {result && (
                <div className="space-y-6">
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900">
                        <h4 className="font-semibold flex items-center mb-2 text-indigo-700 dark:text-indigo-300">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Portfolio Analysis
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {result.marketCapAnalysis}
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {result.recommendations.map((rec, idx) => (
                            <Card key={idx} className="relative overflow-hidden border-indigo-200 dark:border-indigo-800 shadow-md hover:shadow-lg transition-shadow bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-purple-500" />
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                                {rec.name}
                                                <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                    {rec.code}
                                                </span>
                                            </CardTitle>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full border border-green-200 dark:border-green-800">
                                                Yield: {rec.yield}
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {rec.reason}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, RotateCcw, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompetitionTimer, AEROPRESS_PHASES, TimerPhase } from '@/hooks/use-competition-timer';
import { cn } from '@/lib/utils';

// Sound effect (simple beep)
const playBeep = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);

        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
        console.error("Audio play failed", e);
    }
};

const RECIPE_DETAILS = [
    "1投目 120ml注ぐ",
    "1~2回 攪拌",
    "30秒 浸漬",
    "188mlまで注ぐ",
    "20秒 浸漬",
    "プレス 35秒",
    "バイパス 62ml"
];

export function AeroPressTimer() {
    const { timeLeft, isRunning, startTimer, stopTimer, resetTimer } = useCompetitionTimer(600);
    const prevPhaseRef = useRef<string | null>(null);

    // Format time mm:ss
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Determine current phase
    const currentPhase: TimerPhase | undefined = useMemo(() => {
        // Find phase that covers current timeLeft
        // Phase is active if startTime >= timeLeft > endTime
        return AEROPRESS_PHASES.find(p => p.startTime >= timeLeft && timeLeft > p.endTime);
    }, [timeLeft]);

    // Handle Phase Change Feedback
    useEffect(() => {
        if (!currentPhase) return;

        if (prevPhaseRef.current !== currentPhase.instruction) {
            // Phase changed!
            if (isRunning) {
                // Vibration
                if (navigator.vibrate) {
                    navigator.vibrate(200);
                }
                // Sound
                playBeep();
            }
            prevPhaseRef.current = currentPhase.instruction;
        }
    }, [currentPhase, isRunning]);

    // Reset ref on stop/reset
    useEffect(() => {
        if (!isRunning && timeLeft === 600) {
            prevPhaseRef.current = null;
        }
    }, [isRunning, timeLeft]);

    const getBgColor = (type?: string) => {
        switch (type) {
            case 'action': return 'bg-blue-600 animate-pulse-slow'; // Slow pulse to indicate active
            case 'critical': return 'bg-orange-600 animate-pulse';
            case 'info': return 'bg-slate-800';
            default: return 'bg-neutral-800';
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] w-full max-w-md mx-auto relative overflow-hidden">
            {/* Top: Time */}
            <div className="flex-[0.35] flex items-center justify-center bg-black">
                <div className="text-[25vw] sm:text-[150px] font-mono font-bold leading-none tracking-tighter text-white">
                    {formatTime(timeLeft)}
                </div>
            </div>

            {/* Middle: Instruction Card */}
            <div className={cn(
                "flex-[0.45] w-full flex items-center justify-center p-6 transition-colors duration-300",
                getBgColor(currentPhase?.type)
            )}>
                <div className="w-full text-center">
                    {currentPhase?.instruction === "レシピ詳細表示" ? (
                        <div className="text-left bg-black/20 p-4 rounded-lg backdrop-blur-sm">
                            <h3 className="text-white font-bold mb-2 text-xl border-b border-white/20 pb-1">RECIPE</h3>
                            <ul className="space-y-1">
                                {RECIPE_DETAILS.map((line, i) => (
                                    <li key={i} className="text-white text-lg font-medium">• {line}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight drop-shadow-md">
                            {currentPhase?.instruction || "待機 / 準備"}
                        </h2>
                    )}

                    {currentPhase?.type !== 'normal' && currentPhase?.instruction !== "レシピ詳細表示" && (
                        <div className="mt-4 text-white/80 font-medium text-xl uppercase tracking-widest border-t border-white/30 pt-2 inline-block">
                            {currentPhase?.type === 'action' ? 'ACTION' : 'IMPORTANT'}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom: Controls */}
            <div className="flex-[0.2] bg-neutral-900 flex items-center justify-between px-8 pb-8 pt-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={resetTimer}
                    className="h-16 w-16 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                    <RotateCcw className="h-8 w-8" />
                </Button>

                <Button
                    variant="default"
                    size="lg"
                    onClick={isRunning ? stopTimer : startTimer}
                    className={cn(
                        "h-24 w-48 rounded-2xl text-3xl font-bold shadow-lg transition-all active:scale-95",
                        isRunning
                            ? "bg-neutral-700 hover:bg-neutral-600 text-neutral-300" // Stop style
                            : "bg-green-600 hover:bg-green-500 text-white" // Start style
                    )}
                >
                    {isRunning ? (
                        <div className="flex items-center gap-2">
                            <Pause className="h-8 w-8 fill-current" /> STOP
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Play className="h-8 w-8 fill-current" /> START
                        </div>
                    )}
                </Button>

                {/* Spacer for balance */}
                <div className="w-16" />
            </div>

            {/* Hidden Audio Hint for iOS Safari (needs interaction to unlock AudioContext usually) */}
            <div className="absolute top-0 right-0 p-2 opacity-0 pointer-events-none">Audio Enabled</div>
        </div>
    );
}

// Add animation styles to global or component
// We can use standard Tailwind animate-pulse, but 'animate-pulse-slow' is custom. 
// I'll stick to standard 'animate-pulse' for critical.

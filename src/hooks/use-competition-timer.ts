import { useState, useEffect, useRef, useCallback } from 'react';

// Timer Worker Code (as a string to use with Blob)
const workerCode = `
let timerId = null;
let targetTime = null;

self.onmessage = function(e) {
  const { type, payload } = e.data;

  if (type === 'START') {
    const { durationSeconds } = payload;
    // Calculate target end time based on current time
    targetTime = Date.now() + (durationSeconds * 1000);
    
    // Start interval
    if (timerId) clearInterval(timerId);
    
    timerId = setInterval(() => {
      const now = Date.now();
      const difference = targetTime - now;
      
      if (difference <= 0) {
        self.postMessage({ type: 'TICK', payload: 0 });
        self.postMessage({ type: 'COMPLETE' });
        clearInterval(timerId);
        timerId = null;
      } else {
        // Send meaningful seconds remaining (ceil to avoid 9.99 showing as 9)
        self.postMessage({ type: 'TICK', payload: Math.ceil(difference / 1000) });
      }
    }, 100); // Check every 100ms for responsiveness
  } else if (type === 'STOP') {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }
};
`;

export type TimerPhase = {
    name?: string;
    duration?: number; // in seconds logic is implicit by time range
    startTime: number; // seconds remaining at start of phase (e.g. 600)
    endTime: number; // seconds remaining at end of phase (e.g. 590)
    instruction: string;
    type: 'normal' | 'action' | 'critical' | 'info';
    details?: string;
};

// Define the schedule based on 10:00 (600s) start
// 10:00 - 09:50 : 「お湯を沸かす」
// 09:50 - 09:40 : 「豆をグラインドする」
// 09:10 - 09:00 : 「パウダーコントロールをする」
// ...
// Note: There are gaps in the user's provided schedule (e.g. 9:40 - 9:10). 
// I will fill gaps with "待機 / 準備" (Waiting/Preparation) or just keep previous instruction?
// Usually explicit phases are better. I'll "Waiting" for gaps.

export const AEROPRESS_PHASES: TimerPhase[] = [
    { startTime: 600, endTime: 590, instruction: "お湯を沸かす", type: 'normal' },
    { startTime: 590, endTime: 580, instruction: "豆をグラインドする", type: 'action' },
    { startTime: 580, endTime: 550, instruction: "準備 / 待機", type: 'normal' }, // Gap filled
    { startTime: 550, endTime: 540, instruction: "パウダーコントロール", type: 'normal' },
    { startTime: 540, endTime: 510, instruction: "準備 / 待機", type: 'normal' }, // Gap filled
    { startTime: 510, endTime: 500, instruction: "チャフを飛ばす", type: 'normal' },
    { startTime: 500, endTime: 480, instruction: "レシピ確認 / 準備", type: 'normal' }, // Gap filled
    { startTime: 480, endTime: 450, instruction: "レシピ詳細表示", type: 'info' }, // 8:00 - 7:30
    { startTime: 450, endTime: 310, instruction: "準備 / 待機", type: 'normal' }, // Gap
    { startTime: 310, endTime: 300, instruction: "器具の保温", type: 'action' }, // 5:10 - 5:00
    { startTime: 300, endTime: 250, instruction: "準備 / 待機", type: 'normal' }, // Gap
    { startTime: 250, endTime: 240, instruction: "お湯捨て・豆投入", type: 'action' }, // 4:10 - 4:00
    { startTime: 240, endTime: 210, instruction: "準備 / 待機", type: 'normal' }, // Gap
    { startTime: 210, endTime: 200, instruction: "120ml注ぐ + 2回攪拌", type: 'action' }, // 3:30 - 3:20 (User said 3:30, so 210s)
    { startTime: 200, endTime: 160, instruction: "浸漬中 (待機)", type: 'normal' }, // Gap
    { startTime: 160, endTime: 150, instruction: "188mlまで注ぐ + フィルター", type: 'action' }, // 2:40 - 2:30 (160s-150s)
    { startTime: 150, endTime: 130, instruction: "浸漬中 (待機)", type: 'normal' }, // Gap
    { startTime: 130, endTime: 120, instruction: "35秒でプレスする", type: 'critical' }, // 2:10 - 2:00 (130s-120s)
    { startTime: 120, endTime: 90, instruction: "抽出完了 / 待機", type: 'normal' }, // Gap
    { startTime: 90, endTime: 80, instruction: "提出用カップ保温", type: 'normal' }, // 1:30 - 1:20
    { startTime: 80, endTime: 75, instruction: "準備 / 待機", type: 'normal' }, // Gap
    { startTime: 75, endTime: 65, instruction: "温度計セット", type: 'normal' }, // 1:15 - 1:05
    { startTime: 65, endTime: 60, instruction: "準備 / 待機", type: 'normal' }, // Gap
    { startTime: 60, endTime: 30, instruction: "バイパス・味調整", type: 'critical' }, // 1:00 - 0:30
    { startTime: 30, endTime: 15, instruction: "最終確認", type: 'normal' }, // Gap
    { startTime: 15, endTime: 5, instruction: "制限時間！提出！", type: 'critical' }, // 0:15 - 0:05
    { startTime: 5, endTime: 0, instruction: "終了", type: 'normal' },
] as const;


export const useCompetitionTimer = (initialSeconds: number = 600) => {
    const [timeLeft, setTimeLeft] = useState(initialSeconds);
    const [isRunning, setIsRunning] = useState(false);
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Create worker
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        workerRef.current = worker;

        worker.onmessage = (e) => {
            const { type, payload } = e.data;
            if (type === 'TICK') {
                setTimeLeft(payload);
            } else if (type === 'COMPLETE') {
                setIsRunning(false);
                // Play final sound?
            }
        };

        return () => {
            worker.terminate();
        };
    }, []);

    const startTimer = useCallback(() => {
        if (workerRef.current && !isRunning) {
            if (timeLeft <= 0) {
                // Reset if starting from 0
                setTimeLeft(initialSeconds);
                workerRef.current.postMessage({ type: 'START', payload: { durationSeconds: initialSeconds } });
            } else {
                // Resume? Worker logic above resets targetTime based on NOW + duration.
                // If we want to resume, we should pass current timeLeft.
                workerRef.current.postMessage({ type: 'START', payload: { durationSeconds: timeLeft } });
            }
            setIsRunning(true);

            // Wake Lock
            if ('wakeLock' in navigator) {
                navigator.wakeLock.request('screen').catch((err) => console.error('Wake Lock error:', err));
            }
        }
    }, [isRunning, timeLeft, initialSeconds]);

    const stopTimer = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'STOP' });
            setIsRunning(false);
        }
    }, []);

    const resetTimer = useCallback(() => {
        stopTimer();
        setTimeLeft(initialSeconds);
    }, [stopTimer, initialSeconds]);

    return { timeLeft, isRunning, startTimer, stopTimer, resetTimer };
};

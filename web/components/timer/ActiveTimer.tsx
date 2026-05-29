"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTimerStore } from "@/store/timerStore";

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ActiveTimer() {
  const {
    config,
    status,
    phase,
    currentRound,
    remainingSeconds,
    pause,
    resume,
    reset,
    tick,
  } = useTimerStore();

  useEffect(() => {
    if (status !== "running") return;
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [status, tick]);

  const phaseDuration =
    phase === "work" ? config.workDurationSeconds : config.restDurationSeconds;
  const elapsedInPhase = phaseDuration - remainingSeconds;
  const progress = phaseDuration > 0 ? (elapsedInPhase / phaseDuration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            {config.planName ?? config.mode}
          </p>
          <h1 className="text-2xl font-semibold text-gray-800">Live Timer</h1>
        </div>
        <Badge variant="secondary" className="capitalize">
          {phase}
        </Badge>
      </div>

      <Card className="border border-gray-100 bg-white shadow-sm">
        <CardContent className="p-6 space-y-5 text-center">
          <div>
            <p className="text-sm text-gray-500">
              Round {currentRound} of {config.roundCount}
            </p>
            <p className="mt-2 text-5xl font-bold text-indigo-600">
              {formatSeconds(remainingSeconds)}
            </p>
            <p className="mt-2 text-sm text-gray-500 capitalize">{phase} phase</p>
          </div>

          <Progress value={progress} className="h-2" />

          <div className="grid grid-cols-3 gap-3 text-sm text-gray-600">
            <div className="rounded-2xl bg-gray-50 p-3">
              <p className="text-xs text-gray-400">Work</p>
              <p className="font-semibold">{config.workDurationSeconds}s</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3">
              <p className="text-xs text-gray-400">Rest</p>
              <p className="font-semibold">{config.restDurationSeconds}s</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3">
              <p className="text-xs text-gray-400">Rounds</p>
              <p className="font-semibold">{config.roundCount}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {status === "running" ? (
              <Button variant="outline" className="flex-1" onClick={pause}>
                Pause
              </Button>
            ) : (
              <Button className="flex-1" onClick={resume}>
                Resume
              </Button>
            )}

            {status === "paused" && (
              <Button className="flex-1" onClick={resume}>
                Resume
              </Button>
            )}

            <Button variant="ghost" className="flex-1" onClick={reset}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
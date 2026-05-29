"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTimerStore } from "@/store/timerStore";
import { api } from "@/lib/api";

interface TimerCompleteProps {
  totalSeconds: number;
  roundsCompleted: number;
  onSave: () => void;
  onDiscard: () => void;
}

export function TimerComplete({
  totalSeconds,
  roundsCompleted,
  onSave,
  onDiscard,
}: TimerCompleteProps) {
  const { config, reset } = useTimerStore();

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const modeLabel: Record<string, string> = {
    hiit: "HIIT",
    tabata: "Tabata",
    custom: "Custom",
  };

  async function handleSave() {
    try {
      await api.post("/timer/complete", {
        mode: config.mode,
        plan_name: config.planName ?? null,
        duration_seconds: totalSeconds,
        round_count: roundsCompleted,
      });
    } catch {
      // Save failed silently
    }
    reset();
    onSave();
  }

  function handleDiscard() {
    reset();
    onDiscard();
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto space-y-6"
    >
      <div className="text-center">
        <div className="text-5xl mb-3">🏆</div>
        <h2 className="text-2xl font-semibold text-gray-800">
          Workout Complete!
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {modeLabel[config.mode] ?? config.mode} session
          {config.planName ? ` — ${config.planName}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 bg-indigo-50">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total Time</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-emerald-50">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {roundsCompleted}
            </p>
            <p className="text-xs text-gray-500 mt-1">Rounds</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-amber-50">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-amber-600 uppercase text-lg">
              {modeLabel[config.mode] ?? config.mode}
            </p>
            <p className="text-xs text-gray-500 mt-1">Mode</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <Button className="w-full" onClick={handleSave}>
          Save Session
        </Button>
        <Button
          variant="ghost"
          className="w-full text-gray-500"
          onClick={handleDiscard}
        >
          Discard
        </Button>
      </div>
    </motion.div>
  );
}

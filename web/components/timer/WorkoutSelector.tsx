"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTimerStore, TimerConfig, TimerMode } from "@/store/timerStore";
import { api } from "@/lib/api";
import {
  normalizeTimerSessionRecord,
  normalizeTimerWorkoutPlan,
  type TimerWorkoutPlanView,
  type TimerSessionRecordApi,
  type TimerWorkoutPlanApi,
} from "@/lib/wellness";

const MODE_CARDS: { mode: TimerMode; label: string; emoji: string; desc: string }[] = [
  { mode: "hiit", label: "HIIT", emoji: "🔥", desc: "High-intensity intervals" },
  { mode: "tabata", label: "Tabata", emoji: "⚡", desc: "20s work / 10s rest" },
  { mode: "custom", label: "Custom", emoji: "⚙️", desc: "Set your own intervals" },
];

interface WorkoutSelectorProps {
  onStart: () => void;
}

export function WorkoutSelector({ onStart }: WorkoutSelectorProps) {
  const { config, setConfig, sessionHistory, setSessionHistory } = useTimerStore();
  const [plans, setPlans] = useState<TimerWorkoutPlanView[]>([]);
  const [selectedMode, setSelectedMode] = useState<TimerMode>(config.mode);
  const [selectedPlanName, setSelectedPlanName] = useState<string | undefined>(
    config.planName,
  );

  // Custom inputs
  const [workSecs, setWorkSecs] = useState(config.workDurationSeconds);
  const [restSecs, setRestSecs] = useState(config.restDurationSeconds);
  const [rounds, setRounds] = useState(config.roundCount);

  useEffect(() => {
    api
      .get<TimerWorkoutPlanApi[]>("/timer/workouts")
      .then((r) => setPlans(r.data.map(normalizeTimerWorkoutPlan)))
      .catch(() => {});

    api
      .get<TimerSessionRecordApi[]>("/timer/history")
      .then((r) => setSessionHistory(r.data.map(normalizeTimerSessionRecord)))
      .catch(() => {});
  }, [setSessionHistory]);

  function applyPlan(plan: TimerWorkoutPlanView) {
    setSelectedMode(plan.mode);
    setSelectedPlanName(plan.name);
    setWorkSecs(plan.workDurationSeconds);
    setRestSecs(plan.restDurationSeconds);
    setRounds(plan.roundCount);
  }

  function handleModeChange(mode: TimerMode) {
    setSelectedMode(mode);
    setSelectedPlanName(undefined);
  }

  function handleStart() {
    const cfg: TimerConfig = {
      mode: selectedMode,
      workDurationSeconds: workSecs,
      restDurationSeconds: restSecs,
      roundCount: rounds,
      planName: selectedPlanName,
    };
    setConfig(cfg);
    onStart();
  }

  const modeBadgeColor: Record<TimerMode, string> = {
    hiit: "bg-red-100 text-red-600",
    tabata: "bg-purple-100 text-purple-600",
    custom: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Fitness Timer</h1>
        <p className="text-sm text-gray-400 mt-1">
          Pick a mode or a pre-built workout plan
        </p>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-3">
        {MODE_CARDS.map((m) => (
          <button
            key={m.mode}
            onClick={() => handleModeChange(m.mode)}
            className={`rounded-2xl p-4 text-left border-2 transition-all ${
              selectedMode === m.mode
                ? "border-indigo-400 bg-indigo-50"
                : "border-gray-100 bg-white hover:border-gray-200"
            }`}
          >
            <div className="text-2xl mb-1">{m.emoji}</div>
            <p className="text-sm font-semibold text-gray-800">{m.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Custom inputs */}
      {selectedMode === "custom" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Work (seconds)</Label>
            <Input
              type="number"
              min={5}
              max={300}
              value={workSecs}
              onChange={(e) => setWorkSecs(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Rest (seconds)</Label>
            <Input
              type="number"
              min={5}
              max={300}
              value={restSecs}
              onChange={(e) => setRestSecs(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Rounds</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
            />
          </div>
        </motion.div>
      )}

      {/* Pre-built plans */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Pre-built Plans
        </h2>
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="border border-gray-100 hover:border-indigo-200 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-800">
                    {plan.name}
                  </CardTitle>
                  <Badge
                    className={`text-xs uppercase ${modeBadgeColor[plan.mode as TimerMode] ?? ""}`}
                    variant="secondary"
                  >
                    {plan.mode}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-gray-500">{plan.description}</p>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>🏃 {plan.workDurationSeconds}s work</span>
                  <span>😮‍💨 {plan.restDurationSeconds}s rest</span>
                  <span>🔄 {plan.roundCount} rounds</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => applyPlan(plan)}
                >
                  Use this plan
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {sessionHistory.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Recent Sessions
          </h2>
          <div className="space-y-2">
            {sessionHistory.slice(0, 5).map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {record.planName ?? record.mode}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(record.completedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-indigo-600">
                    {Math.round(record.durationSeconds / 60)} min
                  </p>
                  <p className="text-xs text-gray-400">
                    {record.roundCount} rounds
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config summary + start */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
        <div className="flex gap-4 text-sm text-gray-600">
          <span>
            <strong>{workSecs}s</strong> work
          </span>
          <span>
            <strong>{restSecs}s</strong> rest
          </span>
          <span>
            <strong>{rounds}</strong> rounds
          </span>
        </div>
        <Button className="w-full" onClick={handleStart}>
          Start Timer
        </Button>
      </div>
    </div>
  );
}

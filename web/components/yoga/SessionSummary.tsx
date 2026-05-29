"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useYogaStore } from "@/store/yogaStore";
import { api } from "@/lib/api";

interface SessionSummaryProps {
  durationSeconds: number;
  averageScore: number;
  onSave: () => void;
  onDiscard: () => void;
}

export function SessionSummary({
  durationSeconds,
  averageScore,
  onSave,
  onDiscard,
}: SessionSummaryProps) {
  const { selectedPlan, resetSession } = useYogaStore();
  const calories = Math.round(durationSeconds * 0.1);
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  const handleSave = async () => {
    if (!selectedPlan) {
      onSave();
      return;
    }
    try {
      await api.post("/yoga/complete", {
        plan_name: selectedPlan.name,
        duration_seconds: durationSeconds,
        average_pose_score: averageScore,
        calories_estimate: calories,
      });
    } catch {
      // Save failed silently — still reset
    }
    onSave();
  };

  const handleDiscard = () => {
    onDiscard();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto space-y-6"
    >
      <div className="text-center">
        <div className="text-5xl mb-3">🧘‍♀️</div>
        <h2 className="text-2xl font-semibold text-gray-800">
          Session Complete!
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {selectedPlan?.name ?? "Yoga Session"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 bg-indigo-50">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </p>
            <p className="text-xs text-gray-500 mt-1">Duration</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-emerald-50">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {averageScore.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Avg Score</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-amber-50">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{calories}</p>
            <p className="text-xs text-gray-500 mt-1">Calories</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <Button className="w-full" onClick={handleSave}>
          Save &amp; Finish
        </Button>
        <Button variant="ghost" className="w-full text-gray-500" onClick={handleDiscard}>
          Discard
        </Button>
      </div>
    </motion.div>
  );
}

"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useYogaStore, SessionPlan, YogaSessionRecord } from "@/store/yogaStore";
import { api } from "@/lib/api";
import {
  normalizeYogaSessionPlan,
  normalizeYogaSessionRecord,
  type YogaSessionPlanApi,
  type YogaSessionRecordApi,
} from "@/lib/wellness";

interface PlanSelectorProps {
  onStart: (plan: SessionPlan) => void;
}

export function PlanSelector({ onStart }: PlanSelectorProps) {
  const { plans, setPlans, sessionHistory, setSessionHistory } = useYogaStore();

  useEffect(() => {
    api
      .get<YogaSessionPlanApi[]>("/yoga/sessions")
      .then((r) => setPlans(r.data.map(normalizeYogaSessionPlan)))
      .catch(() => {});

    api
      .get<YogaSessionRecordApi[]>("/yoga/history")
      .then((r) => setSessionHistory(r.data.map(normalizeYogaSessionRecord)))
      .catch(() => {});
  }, [setPlans, setSessionHistory]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Yoga Coach</h1>
        <p className="text-sm text-gray-400 mt-1">
          Choose a session plan to begin your practice
        </p>
      </div>

      <div className="space-y-3">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="border border-gray-100 hover:border-indigo-200 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-semibold text-gray-800">
                    {plan.name}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {plan.poses.length} poses
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-500">{plan.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {plan.poses.map((pose, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5"
                    >
                      {pose.name}
                    </span>
                  ))}
                </div>
                <Button
                  className="w-full"
                  onClick={() => onStart(plan)}
                >
                  Start Session
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
                    {record.planName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(record.completedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-indigo-600">
                    {record.averagePoseScore.toFixed(0)}
                    <span className="text-xs font-normal text-gray-400 ml-0.5">
                      /100
                    </span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {Math.round(record.durationSeconds / 60)} min
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

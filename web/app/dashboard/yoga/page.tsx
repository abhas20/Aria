"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useYogaStore, SessionPlan } from "@/store/yogaStore";
import { PlanSelector } from "@/components/yoga/PlanSelector";
import { ActiveSession } from "@/components/yoga/ActiveSession";
import { SessionSummary } from "@/components/yoga/SessionSummary";
import { useRef } from "react";

export default function YogaPage() {
  const { sessionStatus, selectPlan, startSession, resetSession } =
    useYogaStore();

  // Track session results to pass to summary
  const summaryRef = useRef<{ durationSeconds: number; averageScore: number }>({
    durationSeconds: 0,
    averageScore: 0,
  });

  function handleStart(plan: SessionPlan) {
    selectPlan(plan);
    startSession();
  }

  function handleSessionComplete(
    durationSeconds: number,
    averageScore: number
  ) {
    summaryRef.current = { durationSeconds, averageScore };
    // completeSession() is already called inside ActiveSession
  }

  return (
    <div className="p-4 md:p-6">
      <AnimatePresence mode="wait">
        {sessionStatus === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <PlanSelector onStart={handleStart} />
          </motion.div>
        )}

        {sessionStatus === "active" && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ActiveSession onComplete={handleSessionComplete} />
          </motion.div>
        )}

        {sessionStatus === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
          >
            <SessionSummary
              durationSeconds={summaryRef.current.durationSeconds}
              averageScore={summaryRef.current.averageScore}
              onSave={() => resetSession()}
              onDiscard={() => resetSession()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PeriodLogForm } from "@/components/log/PeriodLogForm";
import { MoodLogForm } from "@/components/log/MoodLogForm";
import { SymptomLogForm } from "@/components/log/SymptomLogForm";
import { MoodCalendar } from "@/components/log/MoodCalendar";
import { WeeklySummaryCard } from "@/components/log/WeeklySummaryCard";
import { WaterLogCard } from "@/components/log/WaterLogCard";
import { MeditationLogForm } from "@/components/log/MeditationLogForm";
import { SleepLogForm } from "@/components/log/SleepLogForm";
import { useTodayData } from "@/app/hooks/useTodayData";

const TABS = [
  { id: "today", label: "Today", emoji: "📋" },
  { id: "water", label: "Water", emoji: "💧" },
  { id: "period", label: "Period", emoji: "🌸" },
  { id: "mood", label: "Mood", emoji: "😊" },
  { id: "meditation", label: "Meditation", emoji: "🧘‍♀️" },
  { id: "sleep", label: "Sleep", emoji: "😴" },
  { id: "summary", label: "Summary", emoji: "📊" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function LogPage() {
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [moodRefreshKey, setMoodRefreshKey] = useState(0);

  // ── ADD: single fetch that populates the store for all child forms ────────
  const { loading, error } = useTodayData();

  // ── ADD: loading skeleton ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="space-y-2">
          <div className="h-6 w-32 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Health Log</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Track your period, mood, symptoms and water intake
        </p>
      </div>

      {/* ── ADD: error banner — doesn't block the UI, forms still work ─────── */}
      {error && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
          <p className="text-xs text-amber-700">
            Couldn&apos;t load today&apos;s data — forms will still save
            correctly.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-amber-600 underline">
            Retry
          </button>
        </div>
      )}

      {/* Tab bar — unchanged */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}>
            <span className="text-base">{tab.emoji}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content — unchanged */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}>
          {activeTab === "today" && (
            <div className="space-y-4">
              <MoodLogForm onLogged={() => setMoodRefreshKey((k) => k + 1)} />
              <SymptomLogForm />
            </div>
          )}
          {activeTab === "water" && <WaterLogCard />}
          {activeTab === "period" && <PeriodLogForm />}
          {activeTab === "meditation" && <MeditationLogForm />}
          {activeTab === "sleep" && <SleepLogForm />}
          {activeTab === "mood" && <MoodCalendar refreshKey={moodRefreshKey} />}
          {activeTab === "summary" && <WeeklySummaryCard />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

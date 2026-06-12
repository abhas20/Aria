"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PeriodLogForm } from "@/components/log/PeriodLogForm";
import { MoodLogForm } from "@/components/log/MoodLogForm";
import { SymptomLogForm } from "@/components/log/SymptomLogForm";
import { MoodCalendar } from "@/components/log/MoodCalendar";
import { WaterLogCard } from "@/components/log/WaterLogCard";
import { MeditationLogForm } from "@/components/log/MeditationLogForm";
import { SleepLogForm } from "@/components/log/SleepLogForm";
import { useTodayData } from "@/app/hooks/useTodayData";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

const TABS = [
  { id: "today", label: "Today", emoji: "📋" },
  { id: "water", label: "Water", emoji: "💧" },
  { id: "period", label: "Period", emoji: "🌸" },
  { id: "mood", label: "Mood", emoji: "😊" },
  { id: "meditation", label: "Meditation", emoji: "🧘‍♀️" },
  { id: "sleep", label: "Sleep", emoji: "😴" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function LogPage() {
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [moodRefreshKey, setMoodRefreshKey] = useState(0);

  // Single fetch that populates the store for all child forms
  const { loading, error } = useTodayData();

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">
        <div className="space-y-3">
          <div className="h-4 w-20 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-4 w-80 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="h-14 bg-slate-100/60 rounded-2xl animate-pulse" />
        <div className="h-72 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6 text-slate-800 pb-20">
      
      {/* Header and Subtitles */}
      <div className="space-y-1">
        <Badge className="bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white border-0 px-2.5 py-0.5 mb-1 shadow-xs">
          Daily Wellness
        </Badge>
        <h1 className="text-3xl font-bold font-serif text-slate-800 leading-tight">
          Health Logger
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Log symptoms, cycle states, water intake, meditation sessions, sleep quality, and keep track of your moods.
        </p>
      </div>

      {/* Error banner (forms still work on fallback) */}
      {error && (
        <div className="flex items-center justify-between bg-amber-50/50 border border-amber-100/60 rounded-2xl px-4 py-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-800 font-medium">
              Couldn&apos;t synchronize latest data — forms will still save correctly.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-amber-600 hover:text-amber-700 font-bold underline ml-3 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Sliding Tab Switcher */}
      <div className="flex gap-1 bg-slate-100/60 backdrop-blur-xs p-1.5 rounded-2xl border border-slate-200/40 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap z-10 ${
                active ? "text-slate-800" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="activeLogTab"
                  className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/10 -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="text-sm leading-none">{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels with AnimatePresence transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {activeTab === "today" && (
            <div className="space-y-5">
              <MoodLogForm onLogged={() => setMoodRefreshKey((k) => k + 1)} />
              <SymptomLogForm />
            </div>
          )}
          {activeTab === "water" && <WaterLogCard />}
          {activeTab === "period" && <PeriodLogForm />}
          {activeTab === "meditation" && <MeditationLogForm />}
          {activeTab === "sleep" && <SleepLogForm />}
          {activeTab === "mood" && <MoodCalendar refreshKey={moodRefreshKey} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

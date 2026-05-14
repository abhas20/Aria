"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useRequireAuth } from "../hooks/useAuth";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CheckinData {
  mood_score: number | null;
  mood_tags: string[];
  energy_level: number | null;
  stress_level: number | null;
  symptoms: Record<string, number>;
}
interface SleepData { sleep_hours: number; quality_score: number | null }
interface WaterData { total_ml: number; entries: { amount_ml: number }[] }
interface MeditationData { duration_minutes: number; meditation_type: string }
interface PeriodStatus {
  active: boolean;
  day_number: number | null;
  flow_intensity: string | null;
  pain_level: number | null;
}
interface TodayData {
  date: string;
  checkin: CheckinData | null;
  sleep: SleepData | null;
  water: WaterData;
  meditation: MeditationData | null;
  period: PeriodStatus;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function moodEmoji(s: number | null) {
  if (!s) return "—";
  if (s >= 9) return "😄";
  if (s >= 7) return "🙂";
  if (s >= 5) return "😐";
  if (s >= 3) return "😔";
  return "😞";
}

function moodLabel(s: number | null) {
  if (!s) return "Not logged";
  if (s >= 9) return "Great";
  if (s >= 7) return "Good";
  if (s >= 5) return "Neutral";
  if (s >= 3) return "Low";
  return "Terrible";
}

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" as const },
  }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="space-y-2">
        <Skeleton className="h-3 w-28 bg-rose-100/60" />
        <Skeleton className="h-9 w-56 bg-rose-100/60" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-gray-100">
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-3 w-14 bg-gray-100" />
              <Skeleton className="h-8 w-16 bg-gray-100" />
              <Skeleton className="h-1.5 w-full bg-gray-100 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-2xl bg-gray-100" />
        <Skeleton className="h-24 rounded-2xl bg-gray-100" />
      </div>
      <Skeleton className="h-24 rounded-2xl bg-rose-100/60" />
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, accent, href, icon, isEmpty, children, index,
}: {
  label: string; accent: string; href: string; icon: string;
  isEmpty?: boolean; children?: React.ReactNode; index: number;
}) {
  return (
    <motion.div custom={index} variants={fadeUp}>
      <Link href={href} className="block group h-full">
        <Card className="border-gray-100 hover:border-rose-200 hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1 cursor-pointer h-full bg-white">
          <CardContent className="p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className={`text-[10px] font-bold uppercase tracking-widest ${accent}`}>{label}</p>
              <span className="text-lg opacity-60">{icon}</span>
            </div>
            {isEmpty ? (
              <div className="flex-1 flex flex-col justify-center">
                <p className="text-gray-200 text-xl font-light">—</p>
                <p className="text-[11px] text-rose-300 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Tap to log →
                </p>
              </div>
            ) : (
              <div className="flex-1">{children}</div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<TodayData>("/log/today")
      .then((r) => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user) return null;
  if (loading) return <DashboardSkeleton />;

  const firstName = user.name?.split(" ")[0] ?? "there";
  const waterGoal = 2000;
  const waterPct = data ? Math.min(100, Math.round((data.water.total_ml / waterGoal) * 100)) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" as const }}
        className="flex items-start justify-between"
      >
        <div>
          <p className="text-xs text-gray-400 font-medium mb-1">{todayLabel()}</p>
          <h1
            className="text-2xl md:text-3xl text-gray-900"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {greeting()}, {firstName} 🌸
          </h1>
        </div>
        {data && !data.checkin && (
          <Link
            href="/dashboard/log"
            className="hidden sm:inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium px-4 py-2 rounded-full border border-rose-100 transition-colors"
          >
            Log today →
          </Link>
        )}
      </motion.div>

      {/* Mobile log prompt */}
      {data && !data.checkin && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Link
            href="/dashboard/log"
            className="sm:hidden flex items-center justify-between bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3"
          >
            <p className="text-sm text-rose-600 font-medium">Start your daily check-in</p>
            <span className="text-rose-400">→</span>
          </Link>
        </motion.div>
      )}

      {error && (
        <Card className="border-red-100 bg-red-50">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm text-red-500">Couldn&apos;t load your health data.</p>
            <button onClick={() => window.location.reload()} className="text-xs text-red-400 underline">Retry</button>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* ── Stat cards ───────────────────────────────────────────────── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {/* Mood */}
            <StatCard label="Mood" accent="text-violet-400" href="/dashboard/log" icon="🧠" isEmpty={!data.checkin?.mood_score} index={0}>
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <span className="text-2xl">{moodEmoji(data.checkin?.mood_score ?? null)}</span>
                  <span className="text-xl font-semibold text-gray-700 leading-none">
                    {data.checkin?.mood_score}
                    <span className="text-xs text-gray-300 ml-0.5 font-normal">/10</span>
                  </span>
                </div>
                <Progress value={(data.checkin?.mood_score ?? 0) * 10} className="h-1.5 bg-violet-100 [&>div]:bg-violet-400" />
                <p className="text-[11px] text-gray-400 font-medium">{moodLabel(data.checkin?.mood_score ?? null)}</p>
              </div>
            </StatCard>

            {/* Sleep */}
            <StatCard label="Sleep" accent="text-teal-400" href="/dashboard/log" icon="🌙" isEmpty={!data.sleep} index={1}>
              <div className="space-y-2">
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-semibold text-teal-600">{data.sleep?.sleep_hours}</span>
                  <span className="text-sm text-gray-400 mb-0.5">hrs</span>
                </div>
                <Progress value={data.sleep ? Math.min(100, (data.sleep.sleep_hours / 8) * 100) : 0} className="h-1.5 bg-teal-200 [&>div]:bg-teal-400" />
                {data.sleep?.quality_score && (
                  <p className="text-[11px] text-gray-400">
                    Quality {data.sleep.quality_score}/5 · {data.sleep.quality_score >= 4 ? "Good" : data.sleep.quality_score >= 3 ? "Fair" : "Poor"}
                  </p>
                )}
              </div>
            </StatCard>

            {/* Water */}
            <StatCard label="Water" accent="text-sky-400" href="/dashboard/log?tab=water" icon="💧" index={2}>
              <div className="space-y-2">
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-semibold text-sky-600">{data.water.total_ml}</span>
                  <span className="text-sm text-gray-400 mb-0.5">ml</span>
                </div>
                <Progress value={waterPct} className="h-1.5 bg-sky-100 [&>div]:bg-sky-400" />
                <p className="text-[11px] text-gray-400">{waterPct}% of {waterGoal}ml</p>
              </div>
            </StatCard>

            {/* Energy */}
            <StatCard label="Energy" accent="text-amber-400" href="/dashboard/log" icon="⚡" isEmpty={!data.checkin?.energy_level} index={3}>
              <div className="space-y-2">
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-semibold text-amber-500">{data.checkin?.energy_level}</span>
                  <span className="text-xs text-gray-300 mb-0.5">/10</span>
                </div>
                <Progress value={(data.checkin?.energy_level ?? 0) * 10} className="h-1.5 bg-amber-100 [&>div]:bg-amber-400" />
                {data.checkin?.stress_level && (
                  <p className="text-[11px] text-gray-400">Stress {data.checkin.stress_level}/10</p>
                )}
              </div>
            </StatCard>
          </motion.div>

          {/* ── Period + Meditation ───────────────────────────────────────── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {/* Period */}
            <motion.div custom={0} variants={fadeUp}>
              <Link href="/dashboard/log?tab=period" className="block group">
                <Card className="border-gray-100 hover:border-rose-200 hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1 cursor-pointer bg-white">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Period</p>
                      <span className="text-lg opacity-60">🌸</span>
                    </div>
                    {data.period.active ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-3xl font-light text-rose-500" style={{ fontFamily: "'DM Serif Display', serif" }}>
                            Day {data.period.day_number}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge className="bg-rose-50 text-rose-500 border-rose-100 text-[10px] capitalize font-medium">
                              {data.period.flow_intensity} flow
                            </Badge>
                            {data.period.pain_level && (
                              <span className="text-[11px] text-gray-400">Pain {data.period.pain_level}/10</span>
                            )}
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                          <span className="text-2xl">🌸</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-gray-300 text-base font-light">No active period</p>
                        <p className="text-[11px] text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity">Log →</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* Meditation */}
            <motion.div custom={1} variants={fadeUp}>
              <Link href="/dashboard/log" className="block group">
                <Card className="border-gray-100 hover:border-violet-200 hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1 cursor-pointer bg-white">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Meditation</p>
                      <span className="text-lg opacity-60">🧘‍♀️</span>
                    </div>
                    {data.meditation ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-light text-violet-500">{data.meditation.duration_minutes}</span>
                            <span className="text-sm text-gray-400">min</span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1 capitalize">
                            {data.meditation.meditation_type.replace(/_/g, " ")}
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-2xl">
                          🧘‍♀️
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-gray-300 text-base font-light">None today</p>
                        <p className="text-[11px] text-violet-300 opacity-0 group-hover:opacity-100 transition-opacity">Log →</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          </motion.div>

          {/* ── Symptoms ─────────────────────────────────────────────────── */}
          {data.checkin && Object.keys(data.checkin.symptoms).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <Card className="border-gray-100 bg-white">
                <CardContent className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400 mb-3">
                    Today&apos;s symptoms
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.checkin.symptoms).map(([symptom, severity]) => {
                      const color = severity >= 4
                        ? "bg-red-50 border-red-100 text-red-500"
                        : severity >= 2
                          ? "bg-amber-50 border-amber-100 text-amber-600"
                          : "bg-gray-50 border-gray-100 text-gray-500";
                      return (
                        <span key={symptom} className={`inline-flex items-center gap-1.5 text-[11px] border rounded-full px-3 py-1 font-medium ${color}`}>
                          <span className="capitalize">{symptom.replace(/_/g, " ")}</span>
                          <span className="opacity-40">·</span>
                          <span>{severity}/5</span>
                        </span>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Dr. Aria CTA ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.45 }}
          >
            <Link href="/dashboard/aria" className="block group">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-rose-500 to-pink-500 p-5 hover:shadow-xl transition-all duration-300 group-hover:scale-[1.01]">
                {/* Decorative blobs */}
                <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-pink-300/20 blur-xl" />
                {/* Dot grid */}
                <div
                  className="absolute inset-0 opacity-[0.07]"
                  style={{
                    backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-rose-100 text-[10px] font-bold uppercase tracking-widest mb-1.5">
                      Dr. Aria · AI health companion
                    </p>
                    <p className="text-white font-semibold text-lg leading-snug">
                      {data.checkin ? "How are you feeling right now?" : "Talk to Aria about your health"}
                    </p>
                    <p className="text-rose-200 text-xs mt-1 font-light">
                      In Hindi or English — type or speak
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl border border-white/20">
                      🌸
                    </div>
                    <span className="text-rose-200 text-2xl group-hover:translate-x-1.5 transition-transform duration-200">→</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* ── Quick actions ─────────────────────────────────────────────── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-3 gap-3"
          >
            {[
              { label: "Yoga coach",     href: "/dashboard/yoga",  emoji: "🧘‍♀️", accent: "hover:border-amber-200 hover:bg-amber-50/30" },
              { label: "Fitness timer",  href: "/dashboard/timer", emoji: "⏱️",  accent: "hover:border-teal-200 hover:bg-teal-50/30" },
              { label: "Wellness store", href: "/dashboard/store", emoji: "🌿",  accent: "hover:border-green-200 hover:bg-green-50/30" },
            ].map((a, i) => (
              <motion.div key={a.label} custom={i} variants={fadeUp}>
                <Link href={a.href} className="block group">
                  <Card className={`border-gray-100 ${a.accent} hover:shadow-md transition-all duration-200 group-hover:-translate-y-1 cursor-pointer bg-white`}>
                    <CardContent className="p-4 text-center">
                      <span className="text-2xl block mb-2">{a.emoji}</span>
                      <p className="text-[11px] text-gray-500 font-medium leading-tight">{a.label}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* ── Weekly summary nudge ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-2xl px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-rose-700">Weekly health summary</p>
                <p className="text-xs text-rose-400 font-light mt-0.5">
                  Aria analyses your week and gives personalised tips
                </p>
              </div>
              <Link
                href="/dashboard/log"
                className="text-xs bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap font-medium shadow-sm"
              >
                Generate →
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

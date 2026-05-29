"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Droplets,
  HeartPulse,
  MessageCircle,
  Moon,
  RefreshCw,
  Sparkles,
  TimerReset,
  Waves,
} from "lucide-react";
import { WomenHealthLoader } from "@/components/general/WomenHealthLoader";
import { api } from "@/lib/api";
import { useRequireAuth } from "../hooks/useAuth";

interface CheckinData {
  mood_score: number | null;
  mood_tags: string[];
  energy_level: number | null;
  stress_level: number | null;
  symptoms: Record<string, number>;
}

interface SleepData {
  sleep_hours: number;
  quality_score: number | null;
}

interface WaterData {
  total_ml: number;
  entries: { amount_ml: number }[];
}

interface MeditationData {
  duration_minutes: number;
  meditation_type: string;
}

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

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function scoreLabel(score: number | null | undefined, fallback = "Not logged") {
  if (!score) return fallback;
  if (score >= 8) return "Strong";
  if (score >= 6) return "Steady";
  if (score >= 4) return "Needs care";
  return "Low";
}

function pct(value: number, max: number) {
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function formatSymptom(symptom: string) {
  return symptom.replace(/_/g, " ");
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-slate-100 bg-white shadow-sm">
      <WomenHealthLoader label="Building your PCOS dashboard" />
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  progress,
  href,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  progress: number;
  href: string;
  icon: ElementType;
  tone: string;
}) {
  return (
    <Link href={href} className="group block rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-5 text-3xl font-bold text-[#172033]">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#35a99a] transition-all" style={{ width: `${progress}%` }} />
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;

    api
      .get<TodayData>("/log/today")
      .then((response) => {
        setData(response.data);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [user]);

  const symptomEntries = useMemo(() => {
    if (!data?.checkin?.symptoms) return [];
    return Object.entries(data.checkin.symptoms)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [data]);

  if (authLoading || !user) return null;
  if (loading) return <LoadingState />;

  const firstName = user.name?.split(" ")[0] ?? "there";
  const moodScore = data?.checkin?.mood_score ?? null;
  const energyScore = data?.checkin?.energy_level ?? null;
  const stressScore = data?.checkin?.stress_level ?? null;
  const sleepHours = data?.sleep?.sleep_hours ?? 0;
  const waterMl = data?.water.total_ml ?? 0;
  const waterGoal = 2000;

  return (
    <div className="mx-auto max-w-6xl space-y-5 text-[#172033]">
      <section className="overflow-hidden rounded-xl border border-slate-100 bg-[#172033] text-white shadow-sm">
        <div className="grid gap-6 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8">
          <div>
            <p className="text-sm font-semibold text-rose-200">{todayLabel()}</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight md:text-5xl">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-slate-300">
              Your PCOS care dashboard is ready. Log what changed today, watch your patterns, and ask Aria when symptoms feel confusing.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/log"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#e64b6a] px-5 text-sm font-bold text-white shadow-lg shadow-rose-950/20 transition hover:bg-[#d83f5e]"
              >
                Log today
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/dashboard/aria"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-5 text-sm font-bold text-white transition hover:bg-white/15"
              >
                Ask Aria
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-200">Cycle status</p>
                <p className="mt-2 text-2xl font-bold">
                  {data?.period.active ? `Period day ${data.period.day_number ?? "-"}` : "No active period"}
                </p>
              </div>
              <CalendarDays className="h-8 w-8 text-rose-200" aria-hidden="true" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/10 p-4">
                <p className="text-xs text-slate-300">Flow</p>
                <p className="mt-1 font-bold capitalize">{data?.period.flow_intensity ?? "Not logged"}</p>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <p className="text-xs text-slate-300">Pain</p>
                <p className="mt-1 font-bold">{data?.period.pain_level ? `${data.period.pain_level}/10` : "Not logged"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 p-4 text-red-700">
          <p className="text-sm font-semibold">Could not load your latest health data.</p>
          <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 text-sm font-bold">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Mood"
          value={moodScore ? `${moodScore}/10` : "--"}
          detail={scoreLabel(moodScore)}
          progress={(moodScore ?? 0) * 10}
          href="/dashboard/log"
          icon={HeartPulse}
          tone="bg-rose-50 text-rose-700"
        />
        <MetricCard
          label="Energy"
          value={energyScore ? `${energyScore}/10` : "--"}
          detail={scoreLabel(energyScore)}
          progress={(energyScore ?? 0) * 10}
          href="/dashboard/log"
          icon={Activity}
          tone="bg-amber-50 text-amber-700"
        />
        <MetricCard
          label="Sleep"
          value={sleepHours ? `${sleepHours}h` : "--"}
          detail={data?.sleep?.quality_score ? `Quality ${data.sleep.quality_score}/5` : "Not logged"}
          progress={pct(sleepHours, 8)}
          href="/dashboard/log"
          icon={Moon}
          tone="bg-violet-50 text-violet-700"
        />
        <MetricCard
          label="Water"
          value={`${waterMl}ml`}
          detail={`${pct(waterMl, waterGoal)}% of goal`}
          progress={pct(waterMl, waterGoal)}
          href="/dashboard/log?tab=water"
          icon={Droplets}
          tone="bg-sky-50 text-sky-700"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e64b6a]">PCOS pattern check</p>
              <h2 className="mt-2 font-serif text-3xl text-[#172033]">What needs attention today?</h2>
            </div>
            <Sparkles className="h-6 w-6 text-[#e64b6a]" aria-hidden="true" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-100 bg-[#fffaf6] p-4">
              <p className="text-sm font-bold text-slate-500">Stress</p>
              <p className="mt-3 text-3xl font-bold text-[#172033]">{stressScore ? `${stressScore}/10` : "--"}</p>
              <p className="mt-1 text-sm text-slate-500">{scoreLabel(stressScore, "Not logged")}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-[#fffaf6] p-4">
              <p className="text-sm font-bold text-slate-500">Meditation</p>
              <p className="mt-3 text-3xl font-bold text-[#172033]">{data?.meditation?.duration_minutes ?? 0}m</p>
              <p className="mt-1 text-sm capitalize text-slate-500">
                {data?.meditation?.meditation_type?.replace(/_/g, " ") ?? "None today"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-[#fffaf6] p-4">
              <p className="text-sm font-bold text-slate-500">Symptoms</p>
              <p className="mt-3 text-3xl font-bold text-[#172033]">{symptomEntries.length}</p>
              <p className="mt-1 text-sm text-slate-500">Logged today</p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-rose-100 bg-rose-50 p-4">
            <p className="font-bold text-rose-800">Gentle next step</p>
            <p className="mt-1 text-sm leading-6 text-rose-700">
              {data?.checkin
                ? "You have checked in today. Add any new symptoms before bed so your weekly summary stays accurate."
                : "Start with a quick check-in. Mood, stress, energy, and symptoms are enough to build useful PCOS patterns."}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#35a99a]">Symptoms</p>
          <h2 className="mt-2 font-serif text-3xl text-[#172033]">Today's log</h2>

          {symptomEntries.length ? (
            <div className="mt-5 space-y-3">
              {symptomEntries.map(([symptom, severity]) => (
                <div key={symptom}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold capitalize text-slate-700">{formatSymptom(symptom)}</p>
                    <p className="text-sm font-bold text-slate-500">{severity}/5</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#e64b6a]" style={{ width: `${pct(severity, 5)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
              No symptoms logged yet. Add cramps, acne, fatigue, cravings, bloating, or anything else you want Aria to notice.
            </div>
          )}

          <Link
            href="/dashboard/log"
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#172033] px-5 text-sm font-bold text-white transition hover:bg-[#24314c]"
          >
            Update log
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { href: "/dashboard/aria", title: "Talk to Aria", body: "Ask about symptoms, cycle changes, or what to track next.", icon: MessageCircle },
          { href: "/dashboard/yoga", title: "Yoga coach", body: "Choose low-impact movement for stress, energy, and recovery.", icon: Waves },
          { href: "/dashboard/timer", title: "Fitness timer", body: "Run a simple breathing, stretch, or interval session.", icon: TimerReset },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.title} href={action.href} className="group rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <Icon className="h-6 w-6 text-[#e64b6a]" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-bold text-[#172033]">{action.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{action.body}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#172033]">
                Open
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

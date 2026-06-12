"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MoodTrendPoint {
  date: string;
  mood_score: number | null;
  energy_level: number | null;
  stress_level: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreToEmoji(score: number | null): string {
  if (score === null) return "";
  if (score >= 9) return "😄";
  if (score >= 7) return "🙂";
  if (score >= 5) return "😐";
  if (score >= 3) return "😔";
  return "😞";
}

function scoreToLabel(score: number | null): string {
  if (score === null) return "Not logged";
  if (score >= 9) return "Great";
  if (score >= 7) return "Good";
  if (score >= 5) return "Neutral";
  if (score >= 3) return "Low";
  return "Terrible";
}

function scoreToColor(score: number | null): string {
  if (score === null) return "bg-slate-50 text-slate-300 border-slate-100/50";
  if (score >= 9) return "bg-emerald-50/80 text-emerald-700 border-emerald-100/60";
  if (score >= 7) return "bg-green-50/80 text-green-700 border-green-100/60";
  if (score >= 5) return "bg-yellow-50/80 text-yellow-700 border-yellow-100/60";
  if (score >= 3) return "bg-orange-50/80 text-orange-700 border-orange-100/60";
  return "bg-red-50/80 text-red-700 border-red-100/60";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

// Build last 30 days array
function buildLast30Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

// ── MoodCalendar ──────────────────────────────────────────────────────────────

export function MoodCalendar({ refreshKey }: { refreshKey?: number }) {
  const [moodData, setMoodData] = useState<Record<string, MoodTrendPoint>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true); 
      setError("");
      try {
        const res = await api.get<{ mood: MoodTrendPoint[] }>("/log/trends");
        const map: Record<string, MoodTrendPoint> = {};
        for (const point of res.data.mood) {
          map[point.date] = point;
        }
        setMoodData(map);
      } catch {
        setError("Failed to load mood history.");
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshKey]); 

  const days = buildLast30Days();
  const loggedCount = days.filter(
    (d) => moodData[d]?.mood_score !== null && moodData[d] !== undefined,
  ).length;

  // Compute average mood
  const scores = days
    .map((d) => moodData[d]?.mood_score)
    .filter((s): s is number => s !== null && s !== undefined);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  const hovered = hoveredDay ? moodData[hoveredDay] : null;

  return (
    <Card className="border-slate-100 bg-white shadow-xs rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Mood — last 30 days
          </CardTitle>
          {avgScore !== null && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>{scoreToEmoji(avgScore)}</span>
              <span>
                Avg: {scoreToLabel(avgScore)}
              </span>
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">{loggedCount} of 30 days logged</p>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {loading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
        ) : (
          <>
            {/* Calendar grid */}
            <div className="grid grid-cols-10 gap-1.5">
              {days.map((day) => {
                const point = moodData[day];
                const score = point?.mood_score ?? null;
                const isToday = day === new Date().toISOString().split("T")[0];

                return (
                  <button
                    key={day}
                    type="button"
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onFocus={() => setHoveredDay(day)}
                    onBlur={() => setHoveredDay(null)}
                    className={`
                      aspect-square rounded-xl flex items-center justify-center text-sm
                      transition-all cursor-default border
                      ${scoreToColor(score)}
                      ${isToday ? "ring-2 ring-rose-400 ring-offset-1" : ""}
                      ${hoveredDay === day ? "scale-110 shadow-sm" : ""}
                    `}
                    title={`${formatDate(day)}: ${scoreToLabel(score)}`}
                    aria-label={`${formatDate(day)}: ${scoreToLabel(score)}`}>
                    {score !== null ? scoreToEmoji(score) : ""}
                  </button>
                );
              })}
            </div>

            {/* Hover detail */}
            {hoveredDay && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-2 transition-all">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  {formatDate(hoveredDay)}
                </p>
                {hovered ? (
                  <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                    <span>
                      Mood:{" "}
                      <span className="font-bold text-slate-800">
                        {scoreToEmoji(hovered.mood_score)}{" "}
                        {scoreToLabel(hovered.mood_score)}
                      </span>
                    </span>
                    {hovered.energy_level && (
                      <span>
                        Energy:{" "}
                        <span className="font-bold text-amber-600">
                          {hovered.energy_level}/10
                        </span>
                      </span>
                    )}
                    {hovered.stress_level && (
                      <span>
                        Stress:{" "}
                        <span className="font-bold text-purple-600">
                          {hovered.stress_level}/10
                        </span>
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Not logged</p>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Legend:</span>
              {[
                { label: "Great", color: "bg-emerald-50/80 border-emerald-100/60" },
                { label: "Good", color: "bg-green-50/80 border-green-100/60" },
                { label: "Neutral", color: "bg-yellow-50/80 border-yellow-100/60" },
                { label: "Low", color: "bg-orange-50/80 border-orange-100/60" },
                { label: "Terrible", color: "bg-red-50/80 border-red-100/60" },
                { label: "No data", color: "bg-slate-50 border-slate-100/50" },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-md border ${color}`} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>

            {/* Bar chart — mood score over time */}
            {scores.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Mood score trend
                </p>
                <div className="flex items-end gap-1.5 h-16">
                  {days.map((day) => {
                    const score = moodData[day]?.mood_score ?? null;
                    const height =
                      score !== null ? `${(score / 10) * 100}%` : "4px";
                    const isToday =
                      day === new Date().toISOString().split("T")[0];
                    return (
                      <div
                        key={day}
                        className="flex-1 flex items-end h-full"
                        title={`${formatDate(day)}: ${scoreToLabel(score)}`}>
                        <div
                          className={`w-full rounded-t-lg transition-all ${
                            score !== null
                              ? isToday
                                ? "bg-gradient-to-t from-rose-500 to-rose-400"
                                : "bg-gradient-to-t from-rose-200 to-rose-100"
                              : "bg-slate-50 border border-slate-100"
                          }`}
                          style={{ height }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  <span>30 days ago</span>
                  <span>Today</span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

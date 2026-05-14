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
  if (score === null) return "bg-gray-100 text-gray-300";
  if (score >= 9) return "bg-emerald-100 text-emerald-700";
  if (score >= 7) return "bg-green-100 text-green-700";
  if (score >= 5) return "bg-yellow-100 text-yellow-700";
  if (score >= 3) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
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
    <Card className="border-gray-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-800">
            Mood — last 30 days
          </CardTitle>
          {avgScore !== null && (
            <div className="flex items-center gap-1.5 text-sm">
              <span>{scoreToEmoji(avgScore)}</span>
              <span className="text-gray-500 font-medium">
                Avg: {scoreToLabel(avgScore)}
              </span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400">{loggedCount} of 30 days logged</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <>
            {/* Calendar grid */}
            <div className="grid grid-cols-10 gap-1">
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
                      aspect-square rounded-md flex items-center justify-center text-sm
                      transition-all cursor-default
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
              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1 border border-gray-100">
                <p className="font-medium text-gray-700">
                  {formatDate(hoveredDay)}
                </p>
                {hovered ? (
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>
                      Mood:{" "}
                      <span className="font-medium text-gray-700">
                        {scoreToEmoji(hovered.mood_score)}{" "}
                        {scoreToLabel(hovered.mood_score)}
                      </span>
                    </span>
                    {hovered.energy_level && (
                      <span>
                        Energy:{" "}
                        <span className="font-medium text-amber-600">
                          {hovered.energy_level}/10
                        </span>
                      </span>
                    )}
                    {hovered.stress_level && (
                      <span>
                        Stress:{" "}
                        <span className="font-medium text-purple-600">
                          {hovered.stress_level}/10
                        </span>
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Not logged</p>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-400">Legend:</span>
              {[
                { label: "Great", color: "bg-emerald-100" },
                { label: "Good", color: "bg-green-100" },
                { label: "Neutral", color: "bg-yellow-100" },
                { label: "Low", color: "bg-orange-100" },
                { label: "Terrible", color: "bg-red-100" },
                { label: "No data", color: "bg-gray-100" },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-sm ${color}`} />
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
              ))}
            </div>

            {/* Bar chart — mood score over time */}
            {scores.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400 font-medium">
                  Mood score trend
                </p>
                <div className="flex items-end gap-0.5 h-16">
                  {days.map((day) => {
                    const score = moodData[day]?.mood_score ?? null;
                    const height =
                      score !== null ? `${(score / 10) * 100}%` : "4px";
                    const isToday =
                      day === new Date().toISOString().split("T")[0];
                    return (
                      <div
                        key={day}
                        className="flex-1 flex items-end"
                        title={`${formatDate(day)}: ${scoreToLabel(score)}`}>
                        <div
                          className={`w-full rounded-t-sm transition-all ${
                            score !== null
                              ? isToday
                                ? "bg-rose-400"
                                : "bg-rose-200"
                              : "bg-gray-100"
                          }`}
                          style={{ height }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-gray-300">
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

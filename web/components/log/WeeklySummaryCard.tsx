"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeeklySummaryResponse {
  id: string;
  week_start: string;
  week_end: string;
  summary_text: string;
  tips: string[];
  generated_at: string;
  is_stale?: boolean;
}

// ── WeeklySummaryCard ─────────────────────────────────────────────────────────

export function WeeklySummaryCard() {
  const [summary, setSummary] = useState<WeeklySummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLatestSummary();
  }, []);

  async function loadLatestSummary() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<WeeklySummaryResponse[]>("/log/summary/history");
      if (res.data.length > 0) {
        setSummary(res.data[0]); // newest first
      }
    } catch {
      setError("Failed to load summary.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const res = await api.post<WeeklySummaryResponse>("/log/summary/generate");
      console.log(res.data)
      setSummary(res.data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 503) {
        setError("AI service is temporarily unavailable. Showing last saved summary.");
        // Keep existing summary visible with stale flag
        if (summary) {
          setSummary({ ...summary, is_stale: true });
        }
      } else {
        setError("Failed to generate summary. Please try again.");
      }
    } finally {
      setGenerating(false);
    }
  }

  function formatWeekRange(start: string, end: string): string {
    const s = new Date(start).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    const e = new Date(end).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${s} – ${e}`;
  }

  if (loading) {
    return (
      <Card className="border-slate-100 bg-white shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="pt-6 pb-6">
          <div className="h-24 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-100 bg-white shadow-xs rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-50">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 flex-wrap">
              Your Weekly health summary
              {summary?.is_stale && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-amber-300 text-amber-600 bg-amber-50 px-1.5 py-0"
                >
                  Outdated
                </Badge>
              )}
            </CardTitle>
            {summary && (
              <p className="text-xs text-slate-400 mt-1 font-semibold">
                {formatWeekRange(summary.week_start, summary.week_end)}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={generating}
            className="shrink-0 text-xs border-rose-100 hover:bg-rose-50 text-rose-600 h-8 rounded-xl px-3"
          >
            {generating ? (
              <span className="flex items-center gap-1.5 font-bold">
                <span className="w-3 h-3 border border-rose-400 border-t-transparent rounded-full animate-spin" />
                Generating…
              </span>
            ) : (
              "✨ Generate"
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {error && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3.5 py-2.5 border border-amber-100">
            {error}
          </p>
        )}

        {!summary && !error && (
          <div className="text-center py-6 space-y-2">
            <p className="text-3xl">📊</p>
            <p className="text-sm font-bold text-slate-800 uppercase tracking-wider">No summary yet</p>
            <p className="text-xs text-slate-400 font-medium">
              Log at least 7 days of data, then generate your first summary.
            </p>
          </div>
        )}

        {summary && (
          <>
            {/* Staleness indicator */}
            {summary.is_stale && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                <span className="text-amber-500">⚠️</span>
                <p className="text-xs text-amber-700 font-medium">
                  This summary may be outdated. Generate a new one when the AI service is available.
                </p>
              </div>
            )}

            {/* Summary text */}
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {summary.summary_text}
              </p>
            </div>

            {/* Tips */}
            {summary.tips.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Tips for this week
                </p>
                <ul className="space-y-2">
                  {summary.tips.map((tip, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs font-semibold text-slate-600 leading-relaxed"
                    >
                      <span className="text-rose-400 mt-0.5 shrink-0">✦</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Generated at */}
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-right">
              Generated{" "}
              {new Date(summary.generated_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

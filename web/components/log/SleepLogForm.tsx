"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useLogStore, type SleepData } from "@/store/logStore";

// ── Helpers ───────────────────────────────────────────────────────────────────

const QUALITY_LABELS: Record<
  number,
  { label: string; emoji: string; color: string }
> = {
  1: { label: "Terrible", emoji: "😩", color: "text-red-500" },
  2: { label: "Poor", emoji: "😞", color: "text-orange-500" },
  3: { label: "Fair", emoji: "😐", color: "text-amber-500" },
  4: { label: "Good", emoji: "🙂", color: "text-teal-500" },
  5: { label: "Excellent", emoji: "😄", color: "text-green-500" },
};

function formatTime(isoString: string | null): string {
  if (!isoString) return "";
  // Convert ISO datetime to local HH:MM for <input type="time">
  return new Date(isoString).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function toISO(timeStr: string): string | null {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function calcHours(bedTime: string, wakeTime: string): number | null {
  if (!bedTime || !wakeTime) return null;
  const [bh, bm] = bedTime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins < 0) mins += 24 * 60; // past midnight
  return Math.round((mins / 60) * 10) / 10;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SleepLogForm() {
  const { today, patchSleep } = useLogStore();
  const sleepLog = today?.sleep ?? null;

  const [editing, setEditing] = useState(false);

  // Form state
  const [bedTime, setBedTime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [quality, setQuality] = useState<number>(3);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Derived: auto-calculate sleep hours from bed/wake times
  const derivedHours = calcHours(bedTime, wakeTime);

  function startEditing(log: SleepData) {
    setBedTime(formatTime(log.bed_time));
    setWakeTime(formatTime(log.wake_time));
    setQuality(log.quality_score ?? 3);
    setNotes(log.notes ?? "");
    setError("");
    setEditing(true);
  }

  function resetForm() {
    setBedTime("");
    setWakeTime("");
    setQuality(3);
    setNotes("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!bedTime || !wakeTime) {
      setError("Please enter both bed time and wake time.");
      return;
    }
    if (!derivedHours || derivedHours < 0.5 || derivedHours > 24) {
      setError("Sleep duration looks off — check your times.");
      return;
    }

    setError("");
    setLoading(true);

    const payload = {
      sleep_hours: derivedHours,
      quality_score: quality,
      bed_time: toISO(bedTime),
      wake_time: toISO(wakeTime),
      notes: notes.trim() || null,
    };

    try {
      if (editing && sleepLog) {
        const res = await api.patch<SleepData>(
          `/log/sleep/${sleepLog.id}`,
          payload,
        );
        patchSleep(res.data); // ← update store slice, no full refetch
        setEditing(false);
      } else {
        const res = await api.post<SleepData>("/log/sleep", payload);
        patchSleep(res.data);
        resetForm();
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status === 409) {
        setError(
          "Sleep already logged today. Use the edit button to update it.",
        );
      } else {
        setError("Failed to save sleep log. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Already logged — show summary ────────────────────────────────────────

  if (sleepLog && !editing) {
    const q = QUALITY_LABELS[sleepLog.quality_score ?? 3];
    const bedDisplay = formatTime(sleepLog.bed_time);
    const wakeDisplay = formatTime(sleepLog.wake_time);

    return (
      <Card className="border-gray-100">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-800">
              Last night&apos;s sleep
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => startEditing(sleepLog)}
              className="text-xs text-teal-500 hover:text-teal-600 hover:bg-teal-50 h-7 px-2">
              ✏️ Edit
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Main stats */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-teal-50 border border-teal-100 flex flex-col items-center justify-center shrink-0">
              <span className="text-2xl font-semibold text-teal-600 leading-none">
                {sleepLog.sleep_hours}
              </span>
              <span className="text-[10px] text-teal-400 font-medium mt-0.5">
                hrs
              </span>
            </div>

            <div className="space-y-2 flex-1">
              {/* Quality badge */}
              <div className="flex items-center gap-2">
                <span className="text-lg">{q.emoji}</span>
                <span className={`text-sm font-medium ${q.color}`}>
                  {q.label}
                </span>
                <span className="text-xs text-gray-300">
                  · {sleepLog.quality_score}/5
                </span>
              </div>

              {/* Timeline */}
              {(bedDisplay || wakeDisplay) && (
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {bedDisplay && (
                    <span className="flex items-center gap-1">
                      🌙 <span>{bedDisplay}</span>
                    </span>
                  )}
                  {bedDisplay && wakeDisplay && (
                    <span className="text-gray-200">→</span>
                  )}
                  {wakeDisplay && (
                    <span className="flex items-center gap-1">
                      ☀️ <span>{wakeDisplay}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Sleep quality bar */}
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-400 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (sleepLog.sleep_hours / 8) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-400">
                {sleepLog.sleep_hours >= 7
                  ? "Great duration! 🎉"
                  : sleepLog.sleep_hours >= 6
                    ? "Slightly below ideal"
                    : "Below recommended 7–8 hrs"}
              </p>
            </div>
          </div>

          {sleepLog.notes && (
            <p className="text-xs text-gray-500 bg-teal-50/60 rounded-lg px-3 py-2 italic">
              &quot;{sleepLog.notes}&quot;
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────

  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-800">
            {editing ? "Update sleep" : "Log sleep"}
          </CardTitle>
          {editing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                resetForm();
              }}
              className="text-xs text-gray-400 hover:text-gray-600 h-7 px-2">
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Bed time + Wake time ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600 flex items-center gap-1.5">
                🌙 Bed time
              </Label>
              <input
                type="time"
                value={bedTime}
                onChange={(e) => setBedTime(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600 flex items-center gap-1.5">
                ☀️ Wake time
              </Label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Auto-calculated duration pill */}
          {derivedHours !== null && (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${
                derivedHours >= 7
                  ? "bg-teal-50 border-teal-100 text-teal-700"
                  : derivedHours >= 5
                    ? "bg-amber-50 border-amber-100 text-amber-700"
                    : "bg-red-50 border-red-100 text-red-600"
              }`}>
              <span>⏱️</span>
              <span>{derivedHours} hours of sleep</span>
              <span className="ml-auto text-xs opacity-60">
                {derivedHours >= 7
                  ? "Great!"
                  : derivedHours >= 5
                    ? "A bit low"
                    : "Too little"}
              </span>
            </div>
          )}

          {/* ── Sleep quality ─────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">
              Sleep quality
              {quality && (
                <span
                  className={`ml-2 font-medium ${QUALITY_LABELS[quality].color}`}>
                  — {QUALITY_LABELS[quality].label}
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-sm transition-all ${
                    quality === q
                      ? "border-teal-300 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}>
                  <span className="text-lg">{QUALITY_LABELS[q].emoji}</span>
                  <span
                    className={`text-[10px] font-medium ${
                      quality === q ? QUALITY_LABELS[q].color : "text-gray-400"
                    }`}>
                    {q}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Notes ────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="sleep-notes" className="text-sm text-gray-600">
              Notes <span className="text-gray-400">(optional)</span>
            </Label>
            <textarea
              id="sleep-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Woke up during the night, vivid dreams, restless…"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !bedTime || !wakeTime}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white">
            {loading ? "Saving…" : editing ? "Update sleep" : "Log sleep"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

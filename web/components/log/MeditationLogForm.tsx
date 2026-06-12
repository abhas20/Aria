"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useLogStore } from "@/store/logStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MeditationResponse {
  id: string;
  duration_minutes: number;
  meditation_name: string | null;
  meditation_type: string;
  notes: string | null;
  logged_at: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const MEDITATION_TYPES = [
  {
    key: "mindfulness",
    label: "Mindfulness",
    emoji: "🧘‍♀️",
    description: "Present-moment awareness",
  },
  {
    key: "breathing",
    label: "Breathing",
    emoji: "🌬️",
    description: "Breathwork & pranayama",
  },
  {
    key: "yoga_nidra",
    label: "Yoga Nidra",
    emoji: "🌙",
    description: "Deep relaxation & rest",
  },
  {
    key: "guided",
    label: "Guided",
    emoji: "🎧",
    description: "Audio-guided session",
  },
];

const QUICK_DURATIONS = [5, 10, 15, 20, 30, 45];

// ── Component ─────────────────────────────────────────────────────────────────

export function MeditationLogForm() {
  const [editing, setEditing] = useState(false);

  const [meditationName, setMeditationName] = useState<string>(""); 
  const [meditationType, setMeditationType] = useState<string>("mindfulness");
  const [duration, setDuration] = useState<number>(10);
  const [customDuration, setCustomDuration] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { today, patchMeditation } = useLogStore();
  const todayLog = today?.meditation ?? null;


  function startEditing(log: MeditationResponse) {
    setMeditationName(log.meditation_name ?? "");
    setMeditationType(log.meditation_type);
    if (QUICK_DURATIONS.includes(log.duration_minutes)) {
      setDuration(log.duration_minutes);
      setUseCustom(false);
    } else {
      setCustomDuration(String(log.duration_minutes));
      setUseCustom(true);
    }
    setNotes(log.notes ?? "");
    setError("");
    setEditing(true);
  }

  function resolvedDuration(): number {
    if (useCustom) return parseInt(customDuration) || 0;
    return duration;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mins = resolvedDuration();
    if (!mins || mins < 1 || mins > 480) {
      setError("Please enter a valid duration (1–480 minutes).");
      return;
    }
    setError("");
    setLoading(true);

    const payload = {
      duration_minutes: mins,
      meditation_name: meditationName.trim() || null,
      meditation_type: meditationType,
      notes: notes.trim() || null,
    };

    try {
      if (editing && todayLog) {
        const res = await api.patch<MeditationResponse>(
          `/log/meditation/${todayLog.id}`,
          payload,
        );
        patchMeditation(res.data);
        setEditing(false);
      } else {
        const res = await api.post<MeditationResponse>(
          "/log/meditation",
          payload,
        );
        patchMeditation(res.data);
      }
    } catch (err: unknown) {
      setError("Failed to save meditation. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }



  // ── Already logged — show summary ────────────────────────────────────────

  if (todayLog && !editing) {
    const type = MEDITATION_TYPES.find(
      (t) => t.key === todayLog.meditation_type,
    );
    const loggedTime = new Date(todayLog.logged_at).toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    return (
      <Card className="border-slate-100 bg-white shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Today&apos;s meditation
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => startEditing(todayLog)}
              className="text-xs border-violet-100 hover:bg-violet-50 text-violet-600 h-8 rounded-xl px-3">
              ✏️ Edit Meditation
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center gap-4">
            {/* Duration ring */}
            <div className="w-16 h-16 rounded-2xl bg-violet-50/40 border border-violet-100/60 flex flex-col items-center justify-center shrink-0">
              <span className="text-xl font-black text-violet-600 leading-none">
                {todayLog.duration_minutes}
              </span>
              <span className="text-[10px] text-violet-500 font-bold uppercase tracking-wider mt-0.5">
                min
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">{type?.emoji ?? "🧘"}</span>
                <span className="text-sm font-bold text-slate-800">
                  {type?.label ?? todayLog.meditation_type}
                </span>
              </div>
              <p className="text-xs text-slate-500">{type?.description}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Logged at {loggedTime}</p>
            </div>
          </div>
          {todayLog.meditation_name && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100/60 rounded-xl px-3 py-1.5 w-fit">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session name:</span>
              <span className="text-xs font-semibold text-slate-700">
                {todayLog.meditation_name}
              </span>
            </div>
          )}

          {todayLog.notes && (
            <p className="text-xs text-slate-500 bg-violet-50/20 border border-violet-100/20 rounded-xl px-3.5 py-2.5 italic">
              &quot;{todayLog.notes}&quot;
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────

  return (
    <Card className="border-slate-100 bg-white shadow-xs rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            {editing ? "Update meditation" : "Log meditation"}
          </CardTitle>
          {editing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              className="text-xs text-slate-400 hover:text-slate-600 h-8 px-3 rounded-xl">
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Meditation name ──────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="meditation-name" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Name <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </Label>
            <input
              id="meditation-name"
              type="text"
              value={meditationName}
              onChange={(e) => setMeditationName(e.target.value)}
              placeholder="e.g. Morning mindfulness, Evening wind-down"
              className="w-full rounded-xl border border-slate-200 bg-background px-3.5 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:border-violet-400 leading-relaxed transition-all duration-150 h-10"
            />
          </div>

          {/* ── Meditation type ─────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {MEDITATION_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setMeditationType(t.key)}
                  className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl border-2 text-left transition-all ${
                    meditationType === t.key
                      ? "border-violet-300 bg-violet-50/50 text-violet-700 shadow-xs"
                      : "border-slate-100 text-slate-500 hover:border-violet-200 hover:bg-violet-50/10 bg-white"
                  }`}>
                  <span className="text-lg shrink-0 mt-0.5">{t.emoji}</span>
                  <div>
                    <p
                      className={`text-sm font-bold leading-tight ${
                        meditationType === t.key
                          ? "text-violet-700"
                          : "text-slate-700"
                      }`}>
                      {t.label}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                      {t.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Duration ────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</Label>

            {/* Quick picks */}
            <div className="flex flex-wrap gap-2">
              {QUICK_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDuration(d);
                    setUseCustom(false);
                  }}
                  className={`px-3.5 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                    !useCustom && duration === d
                      ? "border-violet-300 bg-violet-50 text-violet-700 shadow-xs"
                      : "border-slate-100 text-slate-500 hover:border-violet-200 hover:bg-violet-50/20 bg-white"
                  }`}>
                  {d} min
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={`px-3.5 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                  useCustom
                    ? "border-violet-300 bg-violet-50 text-violet-700 shadow-xs"
                    : "border-slate-100 text-slate-500 hover:border-violet-200 hover:bg-violet-50/20 bg-white"
                }`}>
                Custom
              </button>
            </div>

            {/* Custom duration input */}
            {useCustom && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min={1}
                  max={480}
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-28 rounded-xl border border-slate-200 bg-background px-3.5 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:border-violet-400 h-10"
                  autoFocus
                />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">minutes</span>
              </div>
            )}
          </div>

          {/* ── Notes ───────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="meditation-notes" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Notes <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </Label>
            <textarea
              id="meditation-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel? Any observations…"
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-background px-3.5 py-2.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:border-violet-400 resize-none leading-relaxed transition-all duration-150"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white rounded-xl h-11 font-bold shadow-md transition-all">
            {loading
              ? "Saving…"
              : editing
                ? "Update meditation"
                : "Log meditation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useLogStore } from "@/store/logStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CheckinResponse {
  id: string;
  mood_score: number | null;
  mood_tags: string[];
  energy_level: number | null;
  stress_level: number | null;
  symptoms: Record<string, number>;
  notes: string | null;
  logged_at: string;
}

// ── Mood options (maps to mood_score 1-10) ────────────────────────────────────

const MOOD_OPTIONS = [
  { label: "Terrible", emoji: "😞", score: 2, color: "border-red-300 bg-red-50 text-red-700" },
  { label: "Low",      emoji: "😔", score: 4, color: "border-orange-300 bg-orange-50 text-orange-700" },
  { label: "Neutral",  emoji: "😐", score: 6, color: "border-yellow-300 bg-yellow-50 text-yellow-700" },
  { label: "Good",     emoji: "🙂", score: 8, color: "border-green-300 bg-green-50 text-green-700" },
  { label: "Great",    emoji: "😄", score: 10, color: "border-emerald-300 bg-emerald-50 text-emerald-700" },
] as const;

const MOOD_TAGS = [
  "happy", "calm", "anxious", "sad", "irritable",
  "grateful", "tired", "motivated", "overwhelmed", "content",
];

function closestMoodOption(score: number | null) {
  if (score === null) return MOOD_OPTIONS[2];
  return (
    [...MOOD_OPTIONS].sort((a, b) => Math.abs(a.score - score) - Math.abs(b.score - score))[0]
  );
}

// ── MoodLogForm ───────────────────────────────────────────────────────────────

export function MoodLogForm({ onLogged }: { onLogged?: () => void }) {
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [energyLevel, setEnergyLevel] = useState<number[]>([5]);
  const [stressLevel, setStressLevel] = useState<number[]>([5]);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const { today, patchCheckin } = useLogStore();
  const todayCheckin = today?.checkin ?? null;

  function startEditing(checkin: CheckinResponse) {
    setSelectedScore(checkin.mood_score);
    setSelectedTags([...checkin.mood_tags]);
    setEnergyLevel([checkin.energy_level ?? 5]);
    setStressLevel([checkin.stress_level ?? 5]);
    setNotes(checkin.notes ?? "");
    setError("");
    setEditing(true);
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedScore === null) {
      setError("Please select a mood.");
      return;
    }
    setError("");
    setLoading(true);

    const payload = {
      mood_score: selectedScore,
      mood_tags: selectedTags,
      energy_level: energyLevel[0],
      stress_level: stressLevel[0],
      symptoms: todayCheckin?.symptoms ?? {},
      notes: notes.trim() || null,
    };

    try {
      if (editing && todayCheckin) {
        // Update existing checkin via PATCH
        const res = await api.patch<CheckinResponse>("/log/checkin", payload);
        patchCheckin(res.data);
        setEditing(false);
      } else {
        // Create new checkin
        const res = await api.post<CheckinResponse>("/log/checkin", payload);
        patchCheckin(res.data);
      }
      onLogged?.();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError("You've already logged today. Use the edit button to update.");
      } else if (status === 404) {
        setError("No check-in found for today to update.");
      } else {
        setError("Failed to save. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }



  // Show logged summary (not editing)
  if (todayCheckin && !editing) {
    const moodOption = closestMoodOption(todayCheckin.mood_score);

    return (
      <Card className="border-slate-100 bg-white shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Today&apos;s mood check-in
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => startEditing(todayCheckin)}
              className="text-xs border-rose-100 hover:bg-rose-50 text-rose-600 h-8 rounded-xl px-3"
            >
              ✏️ Edit Log
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-1 bg-slate-50 rounded-2xl border border-slate-100">{moodOption.emoji}</span>
            <div>
              <p className="font-bold text-slate-800 text-base">{moodOption.label}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                Logged at{" "}
                {new Date(todayCheckin.logged_at).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {todayCheckin.energy_level && (
              <div className="bg-amber-50/40 border border-amber-100/60 rounded-xl px-3.5 py-2.5">
                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Energy level</p>
                <p className="font-black text-amber-700 text-lg mt-0.5">{todayCheckin.energy_level}/10</p>
              </div>
            )}
            {todayCheckin.stress_level && (
              <div className="bg-purple-50/40 border border-purple-100/60 rounded-xl px-3.5 py-2.5">
                <p className="text-[10px] text-purple-500 font-bold uppercase tracking-wider">Stress level</p>
                <p className="font-black text-purple-700 text-lg mt-0.5">{todayCheckin.stress_level}/10</p>
              </div>
            )}
          </div>

          {todayCheckin.mood_tags.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Feelings</p>
              <div className="flex flex-wrap gap-1.5">
                {todayCheckin.mood_tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-slate-50 border border-slate-100 text-slate-600 px-2.5 py-0.5 rounded-xl capitalize font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {todayCheckin.notes && (
            <div className="bg-slate-50 border border-slate-100/60 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Notes</p>
              <p className="text-xs text-slate-600 italic leading-relaxed">&ldquo;{todayCheckin.notes}&rdquo;</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Form (new or editing)
  return (
    <Card className="border-slate-100 bg-white shadow-xs rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            {editing ? "Update today's check-in" : "How are you feeling today?"}
          </CardTitle>
          {editing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              className="text-xs text-slate-400 hover:text-slate-600 h-8 px-3 rounded-xl"
            >
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Mood selector */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Mood</Label>
            <div className="flex gap-2">
              {MOOD_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setSelectedScore(opt.score)}
                  className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border-2 transition-all ${
                    selectedScore === opt.score
                      ? opt.color + " border-2"
                      : "border-gray-100 hover:border-gray-200 text-gray-500"
                  }`}>
                  <span className="text-xl mb-1">{opt.emoji}</span>
                  <span className="text-[11px] font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mood tags */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">
              Tags <span className="text-gray-400">(optional)</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {MOOD_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all capitalize ${
                    selectedTags.includes(tag)
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Energy level */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Energy level</Label>
              <span className="text-sm font-bold text-amber-600">
                {energyLevel[0]}/10
              </span>
            </div>
            <Slider
              min={1}
              max={10}
              step={1}
              value={energyLevel}
              onValueChange={(v) =>
                setEnergyLevel(Array.isArray(v) ? [...v] : [v as number])
              }
            />
            <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Exhausted</span>
              <span>Energised</span>
            </div>
          </div>

          {/* Stress level */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stress level</Label>
              <span className="text-sm font-bold text-purple-600">
                {stressLevel[0]}/10
              </span>
            </div>
            <Slider
              min={1}
              max={10}
              step={1}
              value={stressLevel}
              onValueChange={(v) =>
                setStressLevel(Array.isArray(v) ? [...v] : [v as number])
              }
            />
            <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Relaxed</span>
              <span>Very stressed</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="mood-notes" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Notes <span className="text-slate-400 normal-case font-normal">(optional)</span>
            </Label>
            <textarea
              id="mood-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What's on your mind today?"
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-background px-3.5 py-2.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:border-indigo-400 resize-none leading-relaxed transition-all duration-150"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || selectedScore === null}
            className="w-full bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white rounded-xl h-11 font-bold shadow-md"
          >
            {loading
              ? "Saving…"
              : editing
                ? "Update check-in"
                : "Save check-in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

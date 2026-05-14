"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useLogStore } from "@/store/logStore";

// ── Symptom catalogue (Requirement 6.2) ──────────────────────────────────────

const SYMPTOM_TAGS = [
  { key: "cramps",      label: "Cramps",      emoji: "🤕" },
  { key: "bloating",    label: "Bloating",    emoji: "🫃" },
  { key: "headache",    label: "Headache",    emoji: "🤯" },
  { key: "fatigue",     label: "Fatigue",     emoji: "😴" },
  { key: "acne",        label: "Acne",        emoji: "😣" },
  { key: "mood_swings", label: "Mood swings", emoji: "🎭" },
  { key: "hot_flashes", label: "Hot flashes", emoji: "🔥" },
  { key: "insomnia",    label: "Insomnia",    emoji: "🌙" },
  { key: "nausea",      label: "Nausea",      emoji: "🤢" },
  { key: "back_pain",   label: "Back pain",   emoji: "🦴" },
];

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

// ── SymptomLogForm ────────────────────────────────────────────────────────────

export function SymptomLogForm({ onLogged }: { onLogged?: () => void }) {
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

 const { today, patchCheckin } = useLogStore();
 const todayCheckin = today?.checkin ?? null;

  function startEditing(checkin: CheckinResponse) {
    setSelected({ ...checkin.symptoms });
    setNotes(checkin.notes ?? "");
    setError("");
    setEditing(true);
  }

  function toggleSymptom(key: string) {
    setSelected((prev) => {
      if (key in prev) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: 3 };
    });
  }

  function setSeverity(key: string, value: number[]) {
    setSelected((prev) => ({ ...prev, [key]: value[0] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(selected).length === 0) {
      setError("Please select at least one symptom.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      if (editing && todayCheckin) {
        // PATCH existing checkin — preserve mood/energy/stress, update symptoms
        const res = await api.patch<CheckinResponse>("/log/checkin", {
          mood_score: todayCheckin.mood_score,
          mood_tags: todayCheckin.mood_tags,
          energy_level: todayCheckin.energy_level,
          stress_level: todayCheckin.stress_level,
          symptoms: selected,
          notes: notes.trim() || todayCheckin.notes,
        });
        patchCheckin(res.data);
        setEditing(false);
      } else if (todayCheckin) {
        // Checkin exists but not editing — patch symptoms onto it
        const res = await api.patch<CheckinResponse>("/log/checkin", {
          mood_score: todayCheckin.mood_score,
          mood_tags: todayCheckin.mood_tags,
          energy_level: todayCheckin.energy_level,
          stress_level: todayCheckin.stress_level,
          symptoms: selected,
          notes: notes.trim() || todayCheckin.notes,
        });
        patchCheckin(res.data);
      } else {
        // No checkin in local state — try POST, fall back to PATCH on 409
        try {
          const res = await api.post<CheckinResponse>("/log/checkin", {
            symptoms: selected,
            notes: notes.trim() || null,
          });
          patchCheckin(res.data);
        } catch (postErr: unknown) {
          const postStatus = (postErr as { response?: { status?: number } })
            ?.response?.status;
          if (postStatus === 409) {
            const existing =
              await api.get<CheckinResponse>("/log/checkin/today");
            const current = existing.data;
            const res = await api.patch<CheckinResponse>("/log/checkin", {
              mood_score: current.mood_score,
              mood_tags: current.mood_tags,
              energy_level: current.energy_level,
              stress_level: current.stress_level,
              symptoms: selected,
              notes: notes.trim() || current.notes,
            });
            patchCheckin(res.data);
          } else {
            throw postErr; 
          }
        }
      }
      onLogged?.();
    } 
    catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setError("No check-in found for today.");
      } else {
        setError("Failed to save symptoms. Please try again.");
      }
    } 
    finally {
      setLoading(false);
    }
  }


  // Show logged symptoms (not editing)
  const hasSymptoms = todayCheckin && Object.keys(todayCheckin.symptoms).length > 0;
  if (hasSymptoms && !editing) {
    return (
      <Card className="border-gray-100">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-800">
              Today&apos;s symptoms
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => startEditing(todayCheckin!)}
              className="text-xs text-orange-500 hover:text-orange-600 hover:bg-orange-50 h-7 px-2"
            >
              ✏️ Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {Object.entries(todayCheckin!.symptoms).map(([key, severity]) => {
              const tag = SYMPTOM_TAGS.find((t) => t.key === key);
              return (
                <div
                  key={key}
                  className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-full px-3 py-1"
                >
                  <span className="text-sm">{tag?.emoji ?? "•"}</span>
                  <span className="text-sm text-orange-700 font-medium capitalize">
                    {tag?.label ?? key.replace("_", " ")}
                  </span>
                  <span className="text-xs text-orange-400 ml-1">{severity}/5</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400">Part of today&apos;s check-in</p>
        </CardContent>
      </Card>
    );
  }

  // Show form (new entry or editing, or checkin exists but no symptoms yet)
  const isAddingToExisting = todayCheckin && !editing && !hasSymptoms;

  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-800">
            {editing ? "Update symptoms" : "Log symptoms"}
          </CardTitle>
          {editing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              className="text-xs text-gray-400 hover:text-gray-600 h-7 px-2"
            >
              Cancel
            </Button>
          )}
        </div>
        {isAddingToExisting && (
          <p className="text-xs text-gray-400 mt-0.5">
            Will be added to your existing check-in
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Symptom chips */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">
              Select symptoms <span className="text-gray-400">(tap to add)</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_TAGS.map((tag) => {
                const isSelected = tag.key in selected;
                return (
                  <button
                    key={tag.key}
                    type="button"
                    onClick={() => toggleSymptom(tag.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                      isSelected
                        ? "border-orange-300 bg-orange-50 text-orange-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span>{tag.emoji}</span>
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Per-symptom severity sliders */}
          {Object.keys(selected).length > 0 && (
            <div className="space-y-3 bg-orange-50/50 rounded-xl p-3 border border-orange-100">
              <p className="text-xs font-medium text-orange-700">Severity (1 = mild, 5 = severe)</p>
              {Object.entries(selected).map(([key, severity]) => {
                const tag = SYMPTOM_TAGS.find((t) => t.key === key);
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 flex items-center gap-1.5">
                        <span>{tag?.emoji}</span>
                        {tag?.label ?? key.replace("_", " ")}
                      </span>
                      <span className="text-sm font-semibold text-orange-600">{severity}/5</span>
                    </div>
                    <Slider
                      min={1} max={5} step={1}
                      value={[severity]}
                      onValueChange={(v) => setSeverity(key, Array.isArray(v) ? [...v] : [v as number])}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes (only show when no existing checkin to avoid confusion) */}
          {!todayCheckin && (
            <div className="space-y-1.5">
              <Label htmlFor="symptom-notes" className="text-sm text-gray-600">
                Notes <span className="text-gray-400">(optional)</span>
              </Label>
              <textarea
                id="symptom-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional details…"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || Object.keys(selected).length === 0}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {loading ? "Saving…" : editing ? "Update symptoms" : "Log symptoms"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

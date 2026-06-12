"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useLogStore } from "@/store/logStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PeriodResponse {
  id: string;
  start_date: string;
  end_date: string | null;
  flow_intensity: string;
  pain_level: number | null;
  clot_presence: boolean;
  notes: string | null;
  created_at: string;
}

interface CyclePrediction {
  predicted_next_start: string | null;
  average_cycle_length: number | null;
}

type FlowIntensity = "light" | "medium" | "heavy";

const FLOW_OPTIONS: { value: FlowIntensity; label: string; emoji: string }[] = [
  { value: "light",  label: "Light",  emoji: "🩸" },
  { value: "medium", label: "Medium", emoji: "🩸🩸" },
  { value: "heavy",  label: "Heavy",  emoji: "🩸🩸🩸" },
];

// ── CyclePredictionCard ───────────────────────────────────────────────────────

function CyclePredictionCard({ prediction }: { prediction: CyclePrediction | null }) {
  if (!prediction?.predicted_next_start) return null;

  const date = new Date(prediction.predicted_next_start);
  const formatted = date.toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
  const daysUntil = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <Card className="border-rose-100 bg-rose-50/20 shadow-xs rounded-2xl overflow-hidden">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl p-1 bg-white rounded-2xl border border-rose-100/50 shadow-xs">🌸</span>
          <div>
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Next period predicted</p>
            <p className="text-base font-black text-rose-900 mt-0.5">{formatted}</p>
            {daysUntil > 0 && (
              <p className="text-xs text-rose-600/80 font-medium mt-0.5">
                in {daysUntil} day{daysUntil !== 1 ? "s" : ""}
                {prediction.average_cycle_length && (
                  <> · avg cycle {prediction.average_cycle_length} days</>
                )}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── PeriodEditForm ────────────────────────────────────────────────────────────

function PeriodEditForm({
  period,
  onSave,
  onCancel,
}: {
  period: PeriodResponse;
  onSave: (updated: PeriodResponse) => void;
  onCancel: () => void;
}) {
  const [startDate, setStartDate] = useState(period.start_date);
  const [endDate, setEndDate] = useState(period.end_date ?? "");
  const [flow, setFlow] = useState<FlowIntensity>(period.flow_intensity as FlowIntensity);
  const [painLevel, setPainLevel] = useState<number[]>([period.pain_level ?? 0]);
  const [clotPresence, setClotPresence] = useState(period.clot_presence);
  const [notes, setNotes] = useState(period.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (endDate && endDate < startDate) {
      setError("End date cannot be before start date.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.patch<PeriodResponse>(`/log/period/${period.id}`, {
        start_date: startDate,
        end_date: endDate || null,
        flow_intensity: flow,
        pain_level: painLevel[0] > 0 ? painLevel[0] : null,
        clot_presence: clotPresence,
        notes: notes.trim() || null,
      });
      onSave(res.data);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: { error?: string } } } })
        ?.response?.data?.detail;
      if (detail?.error === "end_date_before_start_date") {
        setError("End date cannot be before start date.");
      } else {
        setError("Failed to update. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-slate-100 bg-white shadow-xs rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">Edit period</CardTitle>
          <Button
            size="sm" variant="ghost"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-slate-600 h-8 px-3 rounded-xl"
          >
            Cancel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-start" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start date</Label>
              <Input
                id="edit-start"
                type="date"
                value={startDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 text-xs rounded-xl border border-slate-200 bg-background px-3.5"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-end" className="text-xs font-bold text-slate-500 uppercase tracking-wider">End date</Label>
              <Input
                id="edit-end"
                type="date"
                value={endDate}
                min={startDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 text-xs rounded-xl border border-slate-200 bg-background px-3.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Flow intensity</Label>
            <div className="flex gap-2">
              {FLOW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFlow(opt.value)}
                  className={`flex-1 flex flex-col items-center py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all capitalize ${
                    flow === opt.value
                      ? "border-rose-300 bg-rose-50 text-rose-700 shadow-xs"
                      : "border-slate-100 text-slate-500 hover:border-rose-200 hover:bg-rose-50/20 bg-white"
                  }`}
                >
                  <span className="text-base mb-0.5">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pain level</Label>
              <span className="text-xs font-black text-rose-600">
                {painLevel[0] === 0 ? "None" : `${painLevel[0]}/10`}
              </span>
            </div>
            <Slider
              min={0} max={10} step={1}
              value={painLevel}
              onValueChange={(v) => setPainLevel(Array.isArray(v) ? [...v] : [v as number])}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="edit-clot"
              type="checkbox"
              checked={clotPresence}
              onChange={(e) => setClotPresence(e.target.checked)}
              className="w-4 h-4 rounded-lg accent-rose-500 cursor-pointer"
            />
            <Label htmlFor="edit-clot" className="text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer">
              Clot presence
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</Label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-background px-3.5 py-2.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:border-rose-400 resize-none leading-relaxed transition-all duration-150"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl h-11 font-bold shadow-md transition-all"
          >
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── ActivePeriodCard ──────────────────────────────────────────────────────────

function ActivePeriodCard({
  period,
  onEnd,
  onEdit,
  ending,
}: {
  period: PeriodResponse;
  onEnd: (endDate: string) => void;
  onEdit: () => void;
  ending: boolean;
}) {
  const [endDate, setEndDate] = useState("");
  const [endError, setEndError] = useState("");

  function handleEnd() {
    if (!endDate) { setEndError("Please select an end date."); return; }
    if (endDate < period.start_date) { setEndError("End date cannot be before start date."); return; }
    setEndError("");
    onEnd(endDate);
  }

  return (
    <Card className="border-slate-100 bg-white shadow-xs rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-rose-600 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Active period
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="text-xs border-rose-100 hover:bg-rose-50 text-rose-600 h-8 rounded-xl px-3"
          >
            ✏️ Edit Period
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="text-xs text-slate-600 bg-rose-50/20 border border-rose-100/40 rounded-xl p-3 leading-relaxed">
          Started <span className="font-bold text-rose-950">
            {new Date(period.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span> · Flow: <span className="capitalize font-bold text-rose-800">{period.flow_intensity}</span>
          {period.pain_level && (
            <> · Pain: <span className="font-bold text-rose-800">{period.pain_level}/10</span></>
          )}
          {period.clot_presence && <> · Clots: <span className="font-bold text-rose-800">Yes</span></>}
        </div>

        {period.notes && (
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 italic">
            &ldquo;{period.notes}&rdquo;
          </p>
        )}

        <div className="space-y-2 pt-2 border-t border-slate-50">
          <Label htmlFor="end-date" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mark period ended</Label>
          <div className="flex gap-2">
            <Input
              id="end-date"
              type="date"
              value={endDate}
              min={period.start_date}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => { setEndDate(e.target.value); setEndError(""); }}
              className="h-10 text-xs rounded-xl border border-slate-200 bg-background px-3.5"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleEnd}
              disabled={ending}
              className="shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl h-10 text-xs font-bold px-4 transition-all"
            >
              {ending ? "Saving…" : "End period"}
            </Button>
          </div>
          {endError && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{endError}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── PeriodHistoryList ─────────────────────────────────────────────────────────

function PeriodHistoryList({
  history,
  onEdit,
}: {
  history: PeriodResponse[];
  onEdit: (period: PeriodResponse) => void;
}) {
  if (history.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Past periods</p>
      {history.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between bg-rose-50/10 border border-rose-100/30 rounded-xl px-3.5 py-2.5"
        >
          <div className="text-xs">
            <span className="font-bold text-slate-700">
              {new Date(p.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
            {p.end_date && (
              <span className="text-slate-400 font-medium">
                {" "}→{" "}
                {new Date(p.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            )}
            <span className="ml-2.5 text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md border border-rose-100/40">
              {p.flow_intensity}
            </span>
          </div>
          <Button
            size="sm" variant="ghost"
            onClick={() => onEdit(p)}
            className="text-xs text-slate-400 hover:text-slate-600 h-7 px-2.5 rounded-lg border border-slate-100 hover:bg-white transition-all"
          >
            ✏️ Edit
          </Button>
        </div>
      ))}
    </div>
  );
}

// ── PeriodLogForm ─────────────────────────────────────────────────────────────

export function PeriodLogForm() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [flow, setFlow] = useState<FlowIntensity>("medium");
  const [painLevel, setPainLevel] = useState<number[]>([0]);
  const [clotPresence, setClotPresence] = useState(false);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");

  const [activePeriod, setActivePeriod] = useState<PeriodResponse | null>(null);
  const [history, setHistory] = useState<PeriodResponse[]>([]);
  const [prediction, setPrediction] = useState<CyclePrediction | null>(null);
  const [editingPeriod, setEditingPeriod] = useState<PeriodResponse | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { patchPeriod } = useLogStore();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [statusRes, historyRes] = await Promise.all([
        api.get("/log/period/current"),
        api.get<PeriodResponse[]>("/log/period/history"),
      ]);

      const hist: PeriodResponse[] = historyRes.data;
      setHistory(hist);

      if (statusRes.data?.active && statusRes.data?.period_id) {
        const active = hist.find((p) => p.id === statusRes.data.period_id);
        if (active) setActivePeriod(active);
      }

      // Compute cycle prediction from history
      if (hist.length >= 2) {
        const starts = hist
          .map((p) => new Date(p.start_date).getTime())
          .sort((a, b) => a - b);
        const gaps: number[] = [];
        for (let i = 1; i < starts.length; i++) {
          gaps.push((starts[i] - starts[i - 1]) / (1000 * 60 * 60 * 24));
        }
        const avgCycle = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
        const lastStart = new Date(Math.max(...starts));
        const predicted = new Date(lastStart.getTime() + avgCycle * 24 * 60 * 60 * 1000);
        setPrediction({
          predicted_next_start: predicted.toISOString().split("T")[0],
          average_cycle_length: avgCycle,
        });
      }
    } catch {
      // silently ignore
    }
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<PeriodResponse>("/log/period/start", {
        start_date: startDate,
        flow_intensity: flow,
        pain_level: painLevel[0] > 0 ? painLevel[0] : null,
        clot_presence: clotPresence,
        notes: notes.trim() || null,
      });
      setActivePeriod(res.data);
      setHistory((prev) => [res.data, ...prev]);
      setNotes("");
      setPainLevel([0]);
      setClotPresence(false);
      patchPeriod({
        active: true,
        day_number: 1,
        period_id: res.data.id,
        start_date: res.data.start_date,
        flow_intensity: res.data.flow_intensity,
        pain_level: res.data.pain_level,
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(typeof msg === "string" ? msg : "Failed to log period.");
    } finally {
      setLoading(false);
    }
  }
  

  async function handleEnd(endDate: string) {
    if (!activePeriod) return;
    setEnding(true);
    try {
      const res = await api.patch<PeriodResponse>(`/log/period/${activePeriod.id}/end`, {
        end_date: endDate,
      });
      setActivePeriod(null);
      setHistory((prev) => prev.map((p) => (p.id === res.data.id ? res.data : p)));
      await loadData(); // refresh prediction
      patchPeriod({
        active: false,
        day_number: null,
        period_id: null,
        start_date: null,
        flow_intensity: null,
        pain_level: null,
      });
    } catch {
      setError("Failed to end period. Please try again.");
    } finally {
      setEnding(false);
    }
  }

  function handleEditSaved(updated: PeriodResponse) {
    setHistory((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (activePeriod?.id === updated.id) setActivePeriod(updated);
    setEditingPeriod(null);
    loadData(); // refresh prediction
  }

  // Editing a specific period
  if (editingPeriod) {
    return (
      <div className="space-y-4">
        <CyclePredictionCard prediction={prediction} />
        <PeriodEditForm
          period={editingPeriod}
          onSave={handleEditSaved}
          onCancel={() => setEditingPeriod(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CyclePredictionCard prediction={prediction} />

      {activePeriod ? (
        <ActivePeriodCard
          period={activePeriod}
          onEnd={handleEnd}
          onEdit={() => setEditingPeriod(activePeriod)}
          ending={ending}
        />
      ) : (
        <Card className="border-slate-100 bg-white shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-50">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">Log period</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleStart} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="start-date" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="h-10 text-xs rounded-xl border border-slate-200 bg-background px-3.5"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Flow intensity</Label>
                <div className="flex gap-2">
                  {FLOW_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFlow(opt.value)}
                      className={`flex-1 flex flex-col items-center py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all capitalize ${
                        flow === opt.value
                          ? "border-rose-300 bg-rose-50 text-rose-700 shadow-xs"
                          : "border-slate-100 text-slate-500 hover:border-rose-200 hover:bg-rose-50/20 bg-white"
                      }`}
                    >
                      <span className="block text-base mb-0.5">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pain level</Label>
                  <span className="text-xs font-black text-rose-600">
                    {painLevel[0] === 0 ? "None" : `${painLevel[0]}/10`}
                  </span>
                </div>
                <Slider
                  min={0} max={10} step={1}
                  value={painLevel}
                  onValueChange={(v) => setPainLevel(Array.isArray(v) ? [...v] : [v as number])}
                />
                <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 pt-1">
                  <span>No pain</span><span>Severe</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="clot"
                  type="checkbox"
                  checked={clotPresence}
                  onChange={(e) => setClotPresence(e.target.checked)}
                  className="w-4 h-4 rounded-lg accent-rose-500 cursor-pointer"
                />
                <Label htmlFor="clot" className="text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer">
                  Clot presence
                </Label>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="period-notes" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Notes <span className="text-slate-400 font-normal normal-case">(optional)</span>
                </Label>
                <textarea
                  id="period-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes…"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-background px-3.5 py-2.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:border-rose-400 resize-none leading-relaxed transition-all duration-150"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl h-11 font-bold shadow-md transition-all"
              >
                {loading ? "Logging…" : "Log period start"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Period history */}
      {history.filter((p) => p.id !== activePeriod?.id).length > 0 && (
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/60 border border-slate-200/40 rounded-xl px-3 py-2 shadow-2xs"
          >
            <span>{showHistory ? "▲" : "▼"}</span>
            <span>{showHistory ? "Hide" : "Show"} history ({history.filter((p) => p.id !== activePeriod?.id).length})</span>
          </button>
          {showHistory && (
            <div className="mt-2">
              <PeriodHistoryList
                history={history.filter((p) => p.id !== activePeriod?.id)}
                onEdit={(p) => setEditingPeriod(p)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

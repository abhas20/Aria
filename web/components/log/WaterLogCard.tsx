"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogStore } from "@/store/logStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WaterEntry {
  id: string;
  amount_ml: number;
  logged_at: string;
}

interface WaterTodayResponse {
  total_ml: number;
  entries: WaterEntry[];
}

// ── Quick-add presets ─────────────────────────────────────────────────────────

const PRESETS = [
  { label: "Sip",    ml: 100,  emoji: "💧" },
  { label: "Glass",  ml: 250,  emoji: "🥛" },
  { label: "Bottle", ml: 500,  emoji: "🍶" },
  { label: "Large",  ml: 750,  emoji: "🫙" },
];

const DAILY_GOAL = 2000; // ml

// ── WaterLogCard ──────────────────────────────────────────────────────────────

export function WaterLogCard({ onUpdate }: { onUpdate?: (total: number) => void }) {
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [totalMl, setTotalMl] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<number | null>(null); // which preset is loading
  const [customMl, setCustomMl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { today, patchWater } = useLogStore();

  useEffect(() => {
    loadToday();
  }, []);

  async function loadToday() {
    // If store already has today's data, use it — skip the fetch
    if (today?.water) {
      setEntries(today.water.entries);
      setTotalMl(today.water.total_ml);
      onUpdate?.(today.water.total_ml);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<WaterTodayResponse>("/log/water/today");
      setEntries(res.data.entries);
      setTotalMl(res.data.total_ml);
      onUpdate?.(res.data.total_ml);
    } catch {
      setError("Failed to load water data.");
    } finally {
      setLoading(false);
    }
  }

  async function addWater(ml: number) {
    if (ml <= 0 || ml > 5000) { setError("Amount must be between 1 and 5000 ml."); return; }
    setError("");
    setAdding(ml);
    try {
      const res = await api.post<WaterEntry>("/log/water", { amount_ml: ml });
      const newEntries = [...entries, res.data];
      const newTotal = totalMl + ml;
      setEntries(newEntries);
      setTotalMl(newTotal);
      patchWater(newTotal, newEntries); 
      onUpdate?.(newTotal);
      setCustomMl("");
    } catch {
      setError("Failed to add water entry.");
    } finally {
      setAdding(null);
    }
  }

  async function updateEntry(id: string, ml: number) {
    if (ml <= 0 || ml > 5000) { setError("Amount must be between 1 and 5000 ml."); return; }
    setError("");
    try {
      const res = await api.patch<WaterEntry>(`/log/water/${id}`, { amount_ml: ml });
      const updated = entries.map((e) => (e.id === id ? res.data : e));
      const newTotal = updated.reduce((s, e) => s + e.amount_ml, 0);
      setEntries(updated);
      setTotalMl(newTotal);
      patchWater(newTotal, updated);
      onUpdate?.(newTotal);
      setEditingId(null);
    } catch {
      setError("Failed to update entry.");
    }
  }

  async function deleteEntry(id: string) {
    setDeletingId(id);
    setError("");
    try {
      await api.delete(`/log/water/${id}`);
      const updated = entries.filter((e) => e.id !== id);
      const newTotal = updated.reduce((s, e) => s + e.amount_ml, 0);
      setEntries(updated);
      setTotalMl(newTotal);
      patchWater(newTotal, updated);
      onUpdate?.(newTotal);
    } catch {
      setError("Failed to delete entry.");
    } finally {
      setDeletingId(null);
    }
  }

  const pct = Math.min(100, Math.round((totalMl / DAILY_GOAL) * 100));
  const goalReached = totalMl >= DAILY_GOAL;

  return (
    <Card className="border-gray-100 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            💧 Water intake
          </CardTitle>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            goalReached
              ? "bg-sky-100 text-sky-600"
              : "bg-gray-100 text-gray-500"
          }`}>
            {goalReached ? "🎉 Goal reached!" : `${pct}% of goal`}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-sky-300 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Progress ring + total */}
            <div className="flex items-center gap-4">
              {/* Circular progress */}
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#e0f2fe" strokeWidth="8" />
                  <motion.circle
                    cx="40" cy="40" r="32"
                    fill="none"
                    stroke={goalReached ? "#0ea5e9" : "#38bdf8"}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - pct / 100) }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-sky-600 leading-none">
                    {pct}%
                  </span>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-baseline gap-1">
                  <motion.span
                    key={totalMl}
                    initial={{ scale: 1.2, color: "#0ea5e9" }}
                    animate={{ scale: 1, color: "#0369a1" }}
                    transition={{ duration: 0.3 }}
                    className="text-3xl font-bold text-sky-700"
                  >
                    {totalMl}
                  </motion.span>
                  <span className="text-sm text-gray-400">/ {DAILY_GOAL} ml</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {DAILY_GOAL - totalMl > 0
                    ? `${DAILY_GOAL - totalMl} ml to go`
                    : "Daily goal achieved 🎉"}
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  {entries.length} entr{entries.length === 1 ? "y" : "ies"} today
                </p>
              </div>
            </div>

            {/* Quick-add presets */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">Quick add</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map((p) => (
                  <motion.button
                    key={p.ml}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => addWater(p.ml)}
                    disabled={adding !== null}
                    className={`flex flex-col items-center py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      adding === p.ml
                        ? "border-sky-300 bg-sky-50 text-sky-600"
                        : "border-gray-200 text-gray-600 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
                    } disabled:opacity-60`}
                  >
                    {adding === p.ml ? (
                      <span className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-1" />
                    ) : (
                      <span className="text-lg mb-0.5">{p.emoji}</span>
                    )}
                    <span className="text-[11px] text-gray-500">{p.label}</span>
                    <span className="text-[10px] text-gray-400">{p.ml}ml</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={customMl}
                  onChange={(e) => setCustomMl(e.target.value)}
                  placeholder="Custom amount"
                  min={1}
                  max={5000}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customMl) addWater(Number(customMl));
                  }}
                  className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 pr-10 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-sky-300 focus:border-sky-300"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-300">ml</span>
              </div>
              <Button
                size="sm"
                onClick={() => customMl && addWater(Number(customMl))}
                disabled={!customMl || adding !== null}
                className="bg-sky-500 hover:bg-sky-600 text-white shrink-0"
              >
                Add
              </Button>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Entry list */}
            <AnimatePresence initial={false}>
              {entries.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-1.5"
                >
                  <p className="text-xs font-medium text-gray-400">Today&apos;s entries</p>
                  {[...entries].reverse().map((entry) => (
                    <motion.div
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-between bg-sky-50/60 border border-sky-100 rounded-xl px-3 py-2"
                    >
                      {editingId === entry.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            min={1}
                            max={5000}
                            autoFocus
                            className="w-20 h-7 rounded-md border border-sky-300 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                          />
                          <span className="text-xs text-gray-400">ml</span>
                          <Button
                            size="sm"
                            onClick={() => updateEntry(entry.id, Number(editValue))}
                            disabled={!editValue}
                            className="h-7 px-2 text-xs bg-sky-500 hover:bg-sky-600 text-white"
                          >
                            Save
                          </Button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sky-500 font-semibold text-sm">
                              {entry.amount_ml} ml
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(entry.logged_at).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingId(entry.id);
                                setEditValue(String(entry.amount_ml));
                              }}
                              className="text-xs text-gray-400 hover:text-sky-500 transition-colors p-1"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              disabled={deletingId === entry.id}
                              className="text-xs text-gray-400 hover:text-red-400 transition-colors p-1 disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingId === entry.id ? (
                                <span className="w-3 h-3 border border-red-300 border-t-transparent rounded-full animate-spin inline-block" />
                              ) : "🗑️"}
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </CardContent>
    </Card>
  );
}

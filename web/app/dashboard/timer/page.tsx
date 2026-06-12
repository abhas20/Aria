"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RefreshCw,
  Flame,
  Wind,
  History,
  Activity,
  Award,
  ChevronRight,
  TrendingUp,
  Sliders,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  normalizeTimerWorkoutPlan,
  normalizeTimerSessionRecord,
  type TimerWorkoutPlanApi,
  type TimerSessionRecordApi,
  type TimerWorkoutPlanView,
} from "@/lib/wellness";

type TimerPhase = "work" | "rest";
type TimerStatus = "idle" | "running" | "paused" | "complete";

// Helper to play beeps using the Web Audio API (completely self-contained)
function playBeep(frequency: number, duration: number) {
  if (typeof window === "undefined") return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (error) {
    // AudioContext blocked by browser policy until interaction
  }
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function TimerPage() {
  // Backend data states
  const [plans, setPlans] = useState<TimerWorkoutPlanView[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Selection states
  const [selectedPlanId, setSelectedPlanId] = useState<string>("custom");
  const [customConfig, setCustomConfig] = useState({
    workDurationSeconds: 40,
    restDurationSeconds: 20,
    roundCount: 6,
  });

  // Timer run states
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [phase, setPhase] = useState<TimerPhase>("work");
  const [round, setRound] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(40);
  const [totalWorkSeconds, setTotalWorkSeconds] = useState(0);

  // Saving states
  const [isSaving, setIsSaving] = useState(false);

  // Load backend presets and history
  const loadData = useRef(() => {});
  loadData.current = () => {
    api
      .get<TimerWorkoutPlanApi[]>("/timer/workouts")
      .then((r) => setPlans(r.data.map(normalizeTimerWorkoutPlan)))
      .catch(() => {});

    api
      .get<TimerSessionRecordApi[]>("/timer/history")
      .then((r) => setHistory(r.data.map(normalizeTimerSessionRecord)))
      .catch(() => {});
  };

  useEffect(() => {
    loadData.current();
  }, []);

  // Get currently active configuration
  const activeConfig = useMemo(() => {
    if (selectedPlanId === "custom") {
      return {
        id: "custom",
        name: "Custom Workout",
        mode: "custom",
        workDurationSeconds: customConfig.workDurationSeconds,
        restDurationSeconds: customConfig.restDurationSeconds,
        roundCount: customConfig.roundCount,
        description: "Your own custom workout interval setup.",
      };
    }
    const plan = plans.find((p) => p.id === selectedPlanId);
    return plan ?? {
      id: "custom",
      name: "Custom Workout",
      mode: "custom",
      workDurationSeconds: customConfig.workDurationSeconds,
      restDurationSeconds: customConfig.restDurationSeconds,
      roundCount: customConfig.roundCount,
      description: "Your own custom workout interval setup.",
    };
  }, [selectedPlanId, plans, customConfig]);

  // Sync initial timer seconds to selected config when idle
  useEffect(() => {
    if (status === "idle") {
      setSecondsLeft(activeConfig.workDurationSeconds);
      setPhase("work");
      setRound(1);
      setTotalWorkSeconds(0);
    }
  }, [activeConfig, status]);

  // Countdown timer loop
  useEffect(() => {
    if (status !== "running") return;

    const intervalId = window.setInterval(() => {
      setSecondsLeft((prevSeconds) => {
        // Track overall session time
        setTotalWorkSeconds((t) => t + 1);

        // Sound alert for final 3 seconds
        if (prevSeconds <= 4 && prevSeconds > 1) {
          playBeep(440, 0.08);
        }

        if (prevSeconds > 1) {
          return prevSeconds - 1;
        }

        // Phase Transition
        playBeep(880, 0.25); // Transition beep

        if (phase === "work") {
          // If we have rest duration, switch to rest
          if (activeConfig.restDurationSeconds > 0) {
            setPhase("rest");
            return activeConfig.restDurationSeconds;
          } else {
            // No rest, move directly to next round
            if (round >= activeConfig.roundCount) {
              setStatus("complete");
              return 0;
            }
            setRound((r) => r + 1);
            return activeConfig.workDurationSeconds;
          }
        } else {
          // End of rest phase
          if (round >= activeConfig.roundCount) {
            setStatus("complete");
            return 0;
          }
          setRound((r) => r + 1);
          setPhase("work");
          return activeConfig.workDurationSeconds;
        }
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [status, phase, round, activeConfig]);

  // Calculate circular progress
  const totalPhaseSeconds = phase === "work" ? activeConfig.workDurationSeconds : activeConfig.restDurationSeconds;
  const progress = useMemo(() => {
    if (totalPhaseSeconds <= 0) return 0;
    return Math.max(0, Math.min(100, ((totalPhaseSeconds - secondsLeft) / totalPhaseSeconds) * 100));
  }, [secondsLeft, totalPhaseSeconds]);

  // Control handlers
  const handleStartPause = () => {
    if (status === "idle" || status === "paused") {
      setStatus("running");
    } else if (status === "running") {
      setStatus("paused");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setSecondsLeft(activeConfig.workDurationSeconds);
    setPhase("work");
    setRound(1);
    setTotalWorkSeconds(0);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.post("/timer/complete", {
        mode: activeConfig.mode,
        plan_name: activeConfig.id === "custom" ? "Custom Interval" : activeConfig.name,
        duration_seconds: totalWorkSeconds,
        round_count: round,
      });
      loadData.current(); // reload history
      handleReset();
    } catch (err) {
      // Still reset on error
      handleReset();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workout from your history?")) return;
    try {
      await api.delete(`/timer/history/${id}`);
      setHistory(history.filter((item) => item.id !== id));
    } catch (err) {
      // Silently handle error
    }
  };

  // Preset configs info helpers
  const caloriesEstimate = Math.round(totalWorkSeconds * 0.14);

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-[#1e293b] p-4 md:p-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        
        {/* ── Left: Preset Workout Selection ─────────────────────────────── */}
        <div className="space-y-6">
          <Card className="border border-slate-100/80 bg-white/70 backdrop-blur-xs shadow-sm">
            <CardHeader className="pb-4">
              <Badge className="w-fit bg-rose-500 hover:bg-rose-600 text-white border-0 px-2.5 py-0.5">
                Interval Coach
              </Badge>
              <CardTitle className="mt-2 font-serif text-3xl text-slate-800 leading-tight">
                Wellness Intervals
              </CardTitle>
              <CardDescription className="text-slate-500 mt-1">
                Choose a session designed to manage stress levels, support PCOS recovery, or build steady cardio endurance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Load backend plans */}
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  disabled={status !== "idle" && status !== "paused"}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
                    selectedPlanId === plan.id
                      ? "border-rose-300 bg-rose-50/50 shadow-sm"
                      : "border-slate-100 bg-slate-50/30 hover:border-rose-100 hover:bg-white"
                  } ${(status !== "idle" && status !== "paused") ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                        {plan.name}
                        {plan.mode === "hiit" && <Flame className="h-3.5 w-3.5 text-rose-500" />}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {plan.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px] bg-white border border-slate-100 text-slate-600 px-2 py-0">
                          Work: {plan.workDurationSeconds}s
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] bg-white border border-slate-100 text-slate-600 px-2 py-0">
                          Rest: {plan.restDurationSeconds}s
                        </Badge>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
                      {plan.roundCount} Rounds
                    </span>
                  </div>
                </button>
              ))}

              {/* Custom Selector */}
              <button
                type="button"
                disabled={status !== "idle" && status !== "paused"}
                onClick={() => setSelectedPlanId("custom")}
                className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
                  selectedPlanId === "custom"
                    ? "border-rose-300 bg-rose-50/50 shadow-sm"
                    : "border-slate-100 bg-slate-50/30 hover:border-rose-100 hover:bg-white"
                } ${(status !== "idle" && status !== "paused") ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-rose-100 text-rose-600">
                    <Sliders className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">Custom Configuration</p>
                    <p className="text-xs text-slate-500">Tune your own active work and recovery periods.</p>
                  </div>
                </div>
              </button>

              {/* Custom Sliders (Only if Custom is selected) */}
              <AnimatePresence>
                {selectedPlanId === "custom" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border border-slate-100/50 bg-slate-50/40 rounded-2xl p-4 mt-2 space-y-4"
                  >
                    {/* Work Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium text-slate-600">
                        <span>Active Phase (Work)</span>
                        <span className="font-bold text-rose-500">{customConfig.workDurationSeconds}s</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="120"
                        step="5"
                        disabled={status !== "idle" && status !== "paused"}
                        value={customConfig.workDurationSeconds}
                        onChange={(e) =>
                          setCustomConfig((c) => ({ ...c, workDurationSeconds: parseInt(e.target.value) }))
                        }
                        className="w-full accent-rose-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Rest Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium text-slate-600">
                        <span>Recovery Phase (Rest)</span>
                        <span className="font-bold text-emerald-500">{customConfig.restDurationSeconds}s</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="90"
                        step="5"
                        disabled={status !== "idle" && status !== "paused"}
                        value={customConfig.restDurationSeconds}
                        onChange={(e) =>
                          setCustomConfig((c) => ({ ...c, restDurationSeconds: parseInt(e.target.value) }))
                        }
                        className="w-full accent-emerald-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Rounds Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium text-slate-600">
                        <span>Rounds count</span>
                        <span className="font-bold text-indigo-500">{customConfig.roundCount} Rounds</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="20"
                        step="1"
                        disabled={status !== "idle" && status !== "paused"}
                        value={customConfig.roundCount}
                        onChange={(e) =>
                          setCustomConfig((c) => ({ ...c, roundCount: parseInt(e.target.value) }))
                        }
                        className="w-full accent-indigo-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Live Interval Timer card ────────────────────────────── */}
        <div className="relative">
          <Card className="h-full border border-slate-100 bg-[#1e293b] text-white shadow-xl overflow-hidden flex flex-col justify-between p-6">
            
            {/* Header info */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                  Round {round} of {activeConfig.roundCount}
                </p>
                <h2 className="font-serif text-3xl tracking-wide flex items-center gap-2">
                  {status === "complete" ? (
                    "Finished!"
                  ) : phase === "work" ? (
                    <>
                      Move Gently <Flame className="h-5 w-5 text-rose-400 animate-pulse" />
                    </>
                  ) : (
                    <>
                      Recover &amp; Soften <Wind className="h-5 w-5 text-emerald-400 animate-pulse" />
                    </>
                  )}
                </h2>
              </div>
              <span className={`grid h-10 w-10 place-items-center rounded-xl transition-colors duration-300 ${
                phase === "work" ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
              }`}>
                {phase === "rest" ? <Wind className="h-5 w-5" /> : <Flame className="h-5 w-5" />}
              </span>
            </div>

            {/* Circular Timer Display */}
            <div className="my-8 flex justify-center items-center flex-1">
              <div className="relative grid h-64 w-64 place-items-center rounded-full border border-white/5 bg-white/[0.02] shadow-inner">
                {/* Outer border track */}
                <div className="absolute inset-4 rounded-full border-8 border-white/5" />
                
                {/* Glowing progress ring */}
                <div
                  className="absolute inset-4 rounded-full transition-all duration-1000"
                  style={{
                    background: `conic-gradient(${
                      phase === "work" ? "#f43f5e" : "#10b981"
                    } ${progress * 3.6}deg, transparent 0deg)`,
                    mask: "radial-gradient(circle, transparent 58%, black 59%)",
                    WebkitMask: "radial-gradient(circle, transparent 58%, black 59%)",
                  }}
                />
                
                {/* Numeric core */}
                <div className="text-center space-y-1">
                  <p className="font-serif text-6xl font-semibold tracking-tight tabular-nums leading-none">
                    {status === "complete" ? "0:00" : formatTime(secondsLeft)}
                  </p>
                  <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                    {status === "complete"
                      ? "Success"
                      : phase === "rest"
                      ? `${activeConfig.restDurationSeconds}s recover`
                      : `${activeConfig.workDurationSeconds}s active`}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions and Controls */}
            <div className="space-y-4">
              {/* Context text helper */}
              <p className="mx-auto max-w-sm text-center text-xs text-slate-400 leading-relaxed italic">
                {status === "complete"
                  ? "Incredible job completing your wellness intervals today! Save your session below."
                  : phase === "rest"
                  ? "Relax your jaw, breathe slowly into your belly, and let your heart rate come down."
                  : "Maintain a steady, conversational pace. Stop or rest early if you experience pain."}
              </p>

              {/* Control buttons */}
              <div className="flex justify-center gap-3">
                {status !== "complete" && (
                  <button
                    type="button"
                    onClick={handleStartPause}
                    className={`inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white transition-all shadow-md active:translate-y-0.5 hover:-translate-y-0.5 ${
                      status === "running"
                        ? "bg-slate-700 hover:bg-slate-600 border border-slate-600"
                        : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/10"
                    }`}
                  >
                    {status === "running" ? (
                      <>
                        <Pause className="h-4 w-4" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" /> Start
                      </>
                    )}
                  </button>
                )}
                
                {status !== "idle" && status !== "complete" && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-white hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0.5 transition-all shadow-sm"
                  >
                    <RefreshCw className="h-4 w-4" /> Reset
                  </button>
                )}
              </div>
            </div>

            {/* Completion Modal/Overlay */}
            <AnimatePresence>
              {status === "complete" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-6 z-20"
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 text-3xl mb-2">
                      🏆
                    </div>
                    <h3 className="font-serif text-3xl text-white">Workout Finished!</h3>
                    <p className="text-sm text-slate-400">
                      {activeConfig.name === "Custom Workout" ? "Custom Interval Flow" : activeConfig.name}
                    </p>
                  </motion.div>

                  {/* Summary Metrics */}
                  <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <p className="text-xl font-bold text-rose-400">{formatTime(totalWorkSeconds)}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-medium mt-1">Duration</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <p className="text-xl font-bold text-emerald-400">{caloriesEstimate}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-medium mt-1">Est Calories</p>
                    </div>
                  </div>

                  {/* Complete actions */}
                  <div className="space-y-2.5 w-full max-w-xs">
                    <Button
                      disabled={isSaving}
                      onClick={handleSave}
                      className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-11 shadow-md gap-1.5"
                    >
                      Save Session
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleReset}
                      className="w-full text-slate-400 hover:text-white hover:bg-white/5 rounded-xl h-11"
                    >
                      Discard &amp; Back
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </div>

      {/* ── Recent Sessions History ────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <History className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
            Recent Workouts
          </h2>
        </div>
        
        {history.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {history.slice(0, 6).map((item) => (
              <Card key={item.id} className="border border-slate-100 bg-white shadow-xs hover:shadow-sm transition-all duration-200 rounded-2xl overflow-hidden relative group">
                <button
                  onClick={() => handleDeleteSession(item.id)}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-50 text-slate-400 opacity-100 md:opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-50 transition-all duration-200 z-10 border border-slate-100/50"
                  title="Delete record"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-slate-800 line-clamp-1">
                      {item.planName ?? "Interval Session"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(item.completedAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Badge className="bg-indigo-50 text-indigo-600 border-0 text-[9px] font-bold px-1.5 py-0">
                        {item.mode.toUpperCase()}
                      </Badge>
                      <Badge className="bg-rose-50 text-rose-600 border-0 text-[9px] font-bold px-1.5 py-0">
                        {item.roundCount} rds
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-sm font-bold text-slate-800">
                      {Math.floor(item.durationSeconds / 60)}m {item.durationSeconds % 60}s
                    </p>
                    <p className="text-[10px] text-slate-400">Duration</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
            No workouts completed yet. Your logs will appear here.
          </div>
        )}
      </section>
    </div>
  );
}

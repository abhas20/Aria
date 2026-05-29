"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  Flame,
  Pause,
  Play,
  RefreshCw,
  TimerReset,
  Wind,
} from "lucide-react";

type TimerMode = "focus" | "rest" | "breath";

const presets = [
  {
    id: "pcos-gentle",
    name: "PCOS gentle reset",
    work: 40,
    rest: 20,
    rounds: 8,
    note: "Low-impact intervals for steady energy.",
  },
  {
    id: "stress-down",
    name: "Stress down",
    work: 30,
    rest: 30,
    rounds: 6,
    note: "Balanced movement and recovery.",
  },
  {
    id: "breath",
    name: "Breathing care",
    work: 45,
    rest: 15,
    rounds: 5,
    note: "Slow breathing for cramps or overwhelm.",
  },
];

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function TimerPage() {
  const [presetId, setPresetId] = useState(presets[0].id);
  const preset = presets.find((item) => item.id === presetId) ?? presets[0];
  const [mode, setMode] = useState<TimerMode>("focus");
  const [round, setRound] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(preset.work);
  const [running, setRunning] = useState(false);

  const totalSeconds = mode === "rest" ? preset.rest : preset.work;
  const progress = useMemo(
    () => Math.max(0, Math.min(100, ((totalSeconds - secondsLeft) / totalSeconds) * 100)),
    [secondsLeft, totalSeconds],
  );

  useEffect(() => {
    setRunning(false);
    setMode(preset.id === "breath" ? "breath" : "focus");
    setRound(1);
    setSecondsLeft(preset.work);
  }, [preset.id, preset.work]);

  useEffect(() => {
    if (!running) return;

    const id = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current > 1) return current - 1;

        if (mode === "rest") {
          if (round >= preset.rounds) {
            setRunning(false);
            return 0;
          }
          setRound((value) => value + 1);
          setMode(preset.id === "breath" ? "breath" : "focus");
          return preset.work;
        }

        setMode("rest");
        return preset.rest;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [mode, preset.id, preset.rest, preset.rounds, preset.work, round, running]);

  function resetTimer() {
    setRunning(false);
    setMode(preset.id === "breath" ? "breath" : "focus");
    setRound(1);
    setSecondsLeft(preset.work);
  }

  const modeLabel = mode === "rest" ? "Recover" : preset.id === "breath" ? "Breathe slowly" : "Move gently";
  const modeCopy =
    mode === "rest"
      ? "Shake out your body, sip water, and let your heart rate settle."
      : preset.id === "breath"
        ? "Inhale through the nose, soften your shoulders, and exhale longer than you inhale."
        : "Keep the movement low-impact. Stop if you feel pain, dizziness, or unusual discomfort.";

  return (
    <div className="mx-auto max-w-6xl space-y-5 text-[#172033]">
      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e64b6a]">Wellness timer</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight">Simple intervals for PCOS care.</h1>
          <p className="mt-4 leading-7 text-slate-600">
            Choose a gentle session, press start, and let Aria guide your work and rest timing.
          </p>

          <div className="mt-6 space-y-3">
            {presets.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPresetId(item.id)}
                className={`w-full rounded-lg border p-4 text-left transition ${
                  presetId === item.id
                    ? "border-[#e64b6a] bg-rose-50"
                    : "border-slate-100 bg-[#fffaf6] hover:border-rose-100"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-[#172033]">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.note}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-slate-500">
                    {item.rounds} rounds
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-[#172033] p-6 text-white shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-200">
                Round {round} of {preset.rounds}
              </p>
              <h2 className="mt-2 font-serif text-4xl">{modeLabel}</h2>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/10 text-rose-200">
              {mode === "rest" ? <Wind className="h-6 w-6" /> : <Flame className="h-6 w-6" />}
            </span>
          </div>

          <div className="my-10 grid place-items-center">
            <div className="relative grid h-64 w-64 place-items-center rounded-full border border-white/10 bg-white/5">
              <div className="absolute inset-4 rounded-full border-8 border-white/10" />
              <div
                className="absolute inset-4 rounded-full"
                style={{
                  background: `conic-gradient(#e64b6a ${progress * 3.6}deg, transparent 0deg)`,
                  mask: "radial-gradient(circle, transparent 58%, black 59%)",
                  WebkitMask: "radial-gradient(circle, transparent 58%, black 59%)",
                }}
              />
              <div className="text-center">
                <p className="font-serif text-7xl leading-none">{formatTime(secondsLeft)}</p>
                <p className="mt-3 text-sm font-semibold text-slate-300">
                  {mode === "rest" ? `${preset.rest}s rest` : `${preset.work}s active`}
                </p>
              </div>
            </div>
          </div>

          <p className="mx-auto max-w-md text-center text-sm leading-6 text-slate-300">{modeCopy}</p>

          <div className="mt-8 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setRunning((value) => !value)}
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#e64b6a] px-6 text-sm font-bold text-white transition hover:bg-[#d83f5e]"
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "Pause" : "Start"}
            </button>
            <button
              type="button"
              onClick={resetTimer}
              className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-5 text-sm font-bold text-white transition hover:bg-white/15"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { icon: TimerReset, title: "Warm up", body: "Start with neck rolls, shoulder circles, and slow marching." },
          { icon: Bell, title: "Listen to your body", body: "Keep intensity conversational and pause if symptoms spike." },
          { icon: ArrowRight, title: "Cool down", body: "Finish with slow breathing and gentle hip stretches." },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <Icon className="h-6 w-6 text-[#e64b6a]" />
              <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.body}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}

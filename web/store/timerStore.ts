/**
 * Timer store — manages fitness timer state machine.
 * Full state machine implementation in task 17.1.
 */

import { create } from "zustand";

export type TimerMode = "hiit" | "tabata" | "custom";
export type TimerPhase = "work" | "rest";
export type TimerStatus = "idle" | "running" | "paused" | "complete";

export interface TimerConfig {
  mode: TimerMode;
  workDurationSeconds: number;
  restDurationSeconds: number;
  roundCount: number;
  planName?: string;
}

export interface TimerSessionRecord {
  id: string;
  mode: TimerMode;
  planName: string | null;
  durationSeconds: number;
  roundCount: number;
  completedAt: string;
}

// Tabata defaults: 20s work / 10s rest × 8 rounds
export const TABATA_CONFIG: TimerConfig = {
  mode: "tabata",
  workDurationSeconds: 20,
  restDurationSeconds: 10,
  roundCount: 8,
};

interface TimerState {
  config: TimerConfig;
  status: TimerStatus;
  phase: TimerPhase;
  currentRound: number;
  remainingSeconds: number;
  sessionHistory: TimerSessionRecord[];

  // Actions
  setConfig: (config: TimerConfig) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: () => void; // called by setInterval every second
  setSessionHistory: (history: TimerSessionRecord[]) => void;
}

export const useTimerStore = create<TimerState>()((set, get) => ({
  config: TABATA_CONFIG,
  status: "idle",
  phase: "work",
  currentRound: 1,
  remainingSeconds: TABATA_CONFIG.workDurationSeconds,
  sessionHistory: [],

  setConfig: (config) =>
    set({
      config,
      status: "idle",
      phase: "work",
      currentRound: 1,
      remainingSeconds: config.workDurationSeconds,
    }),

  start: () =>
    set((state) => ({
      status: "running",
      phase: "work",
      currentRound: 1,
      remainingSeconds: state.config.workDurationSeconds,
    })),

  pause: () => set({ status: "paused" }),

  resume: () => set({ status: "running" }),

  reset: () =>
    set((state) => ({
      status: "idle",
      phase: "work",
      currentRound: 1,
      remainingSeconds: state.config.workDurationSeconds,
    })),

  tick: () => {
    const { status, phase, currentRound, remainingSeconds, config } = get();
    if (status !== "running") return;

    if (remainingSeconds > 1) {
      set({ remainingSeconds: remainingSeconds - 1 });
      return;
    }

    // Phase transition
    if (phase === "work") {
      // Switch to rest
      set({ phase: "rest", remainingSeconds: config.restDurationSeconds });
    } else {
      // End of rest — move to next round
      const nextRound = currentRound + 1;
      if (nextRound > config.roundCount) {
        set({ status: "complete", remainingSeconds: 0 });
      } else {
        set({
          phase: "work",
          currentRound: nextRound,
          remainingSeconds: config.workDurationSeconds,
        });
      }
    }
  },

  setSessionHistory: (sessionHistory) => set({ sessionHistory }),
}));

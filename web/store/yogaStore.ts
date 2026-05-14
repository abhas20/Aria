/**
 * Yoga store — manages yoga session state and history.
 * Full implementation in task 14.
 */

import { create } from "zustand";

export interface YogaPose {
  id: string;
  name: string;
  sanskritName: string;
  referenceImageUrl: string;
  holdDurationSeconds: number;
}

export interface SessionPlan {
  id: string;
  name: string;
  description: string;
  poses: YogaPose[];
}

export interface YogaSessionRecord {
  id: string;
  planName: string;
  durationSeconds: number;
  averagePoseScore: number;
  caloriesEstimate: number;
  completedAt: string;
}

type SessionStatus = "idle" | "active" | "complete";

interface YogaState {
  plans: SessionPlan[];
  selectedPlan: SessionPlan | null;
  currentPoseIndex: number;
  currentPoseScore: number;
  sessionStatus: SessionStatus;
  sessionHistory: YogaSessionRecord[];

  // Actions
  setPlans: (plans: SessionPlan[]) => void;
  selectPlan: (plan: SessionPlan) => void;
  startSession: () => void;
  nextPose: () => void;
  updatePoseScore: (score: number) => void;
  completeSession: () => void;
  resetSession: () => void;
  setSessionHistory: (history: YogaSessionRecord[]) => void;
}

export const useYogaStore = create<YogaState>()((set) => ({
  plans: [],
  selectedPlan: null,
  currentPoseIndex: 0,
  currentPoseScore: 0,
  sessionStatus: "idle",
  sessionHistory: [],

  setPlans: (plans) => set({ plans }),
  selectPlan: (plan) => set({ selectedPlan: plan }),
  startSession: () =>
    set({ sessionStatus: "active", currentPoseIndex: 0, currentPoseScore: 0 }),
  nextPose: () =>
    set((state) => ({ currentPoseIndex: state.currentPoseIndex + 1 })),
  updatePoseScore: (score) => set({ currentPoseScore: score }),
  completeSession: () => set({ sessionStatus: "complete" }),
  resetSession: () =>
    set({
      sessionStatus: "idle",
      currentPoseIndex: 0,
      currentPoseScore: 0,
      selectedPlan: null,
    }),
  setSessionHistory: (sessionHistory) => set({ sessionHistory }),
}));

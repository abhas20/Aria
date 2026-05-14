import { create } from "zustand";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CheckinData {
  id: string;
  mood_score: number | null;
  mood_tags: string[];
  energy_level: number | null;
  stress_level: number | null;
  symptoms: Record<string, number>;
  notes: string | null;
  logged_at: string;
}

export interface SleepData {
  id: string;
  sleep_hours: number;
  quality_score: number | null;
  bed_time: string | null;
  wake_time: string | null;
  notes: string | null;
  logged_at: string;
}

export interface WaterEntry {
  id: string;
  amount_ml: number;
  logged_at: string;
}

export interface WaterTodayData {
  total_ml: number;
  entries: WaterEntry[];
}

export interface MeditationData {
  id: string;
  duration_minutes: number;
  meditation_name: string | null;
  meditation_type: string;
  notes: string | null;
  logged_at: string;
}

export interface PeriodStatus {
  active: boolean;
  day_number: number | null;
  period_id: string | null;
  start_date: string | null;
  flow_intensity: string | null;
  pain_level: number | null;
}

export interface TodayData {
  date: string;
  checkin: CheckinData | null;
  sleep: SleepData | null;
  water: WaterTodayData;
  meditation: MeditationData | null;
  period: PeriodStatus;
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface LogStore {
  today: TodayData | null;
  lastFetchedAt: number | null;

  setToday: (data: TodayData) => void;
  patchCheckin: (checkin: CheckinData) => void;
  patchSleep: (sleep: SleepData) => void;
  patchWater: (total_ml: number, entries: WaterEntry[]) => void;
  patchMeditation: (meditation: MeditationData) => void;
  patchPeriod: (period: PeriodStatus) => void;
  invalidate: () => void;
  clearLog: () => void;
}

export const useLogStore = create<LogStore>()((set) => ({
  today: null,
  lastFetchedAt: null,

  setToday: (today) => set({ today, lastFetchedAt: Date.now() }),

  patchCheckin: (checkin) =>
    set((s) => (s.today ? { today: { ...s.today, checkin } } : {})),

  patchSleep: (sleep) =>
    set((s) => (s.today ? { today: { ...s.today, sleep } } : {})),

  patchWater: (total_ml, entries) =>
    set((s) =>
      s.today ? { today: { ...s.today, water: { total_ml, entries } } } : {},
    ),

  patchMeditation: (meditation) =>
    set((s) => (s.today ? { today: { ...s.today, meditation } } : {})),

  patchPeriod: (period) =>
    set((s) => (s.today ? { today: { ...s.today, period } } : {})),

  invalidate: () => set({ lastFetchedAt: null }),

  // Call this on sign out alongside clearChat()
  clearLog: () => set({ today: null, lastFetchedAt: null }),
}));

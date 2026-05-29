import type { SessionPlan, YogaPose, YogaSessionRecord } from "@/store/yogaStore";
import type { TimerMode, TimerSessionRecord, TimerConfig } from "@/store/timerStore";

export interface YogaPoseApi {
  id: string;
  name: string;
  sanskrit_name: string;
  reference_image_url: string;
  hold_duration_seconds: number;
}

export interface YogaSessionPlanApi {
  id: string;
  name: string;
  description: string;
  poses: YogaPoseApi[];
}

export interface YogaSessionRecordApi {
  id: string;
  plan_name: string;
  duration_seconds: number;
  average_pose_score: number;
  calories_estimate: number;
  completed_at: string;
}

export interface TimerWorkoutPlanApi {
  id: string;
  name: string;
  mode: TimerMode;
  work_duration_seconds: number;
  rest_duration_seconds: number;
  round_count: number;
  description: string;
}

export interface TimerWorkoutPlanView {
  id: string;
  name: string;
  mode: TimerMode;
  workDurationSeconds: number;
  restDurationSeconds: number;
  roundCount: number;
  description: string;
}

export interface TimerSessionRecordApi {
  id: string;
  mode: TimerMode;
  plan_name: string | null;
  duration_seconds: number;
  round_count: number;
  completed_at: string;
}

function normalizeYogaPose(pose: YogaPoseApi): YogaPose {
  return {
    id: pose.id,
    name: pose.name,
    sanskritName: pose.sanskrit_name,
    referenceImageUrl: pose.reference_image_url,
    holdDurationSeconds: pose.hold_duration_seconds,
  };
}

export function normalizeYogaSessionPlan(
  plan: YogaSessionPlanApi,
): SessionPlan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    poses: plan.poses.map(normalizeYogaPose),
  };
}

export function normalizeYogaSessionRecord(
  record: YogaSessionRecordApi,
): YogaSessionRecord {
  return {
    id: record.id,
    planName: record.plan_name,
    durationSeconds: record.duration_seconds,
    averagePoseScore: record.average_pose_score,
    caloriesEstimate: record.calories_estimate,
    completedAt: record.completed_at,
  };
}

export function normalizeTimerWorkoutPlan(
  plan: TimerWorkoutPlanApi,
): TimerWorkoutPlanView {
  return {
    id: plan.id,
    name: plan.name,
    mode: plan.mode,
    workDurationSeconds: plan.work_duration_seconds,
    restDurationSeconds: plan.rest_duration_seconds,
    roundCount: plan.round_count,
    description: plan.description,
  };
}

export function normalizeTimerSessionRecord(
  record: TimerSessionRecordApi,
): TimerSessionRecord {
  return {
    id: record.id,
    mode: record.mode,
    planName: record.plan_name,
    durationSeconds: record.duration_seconds,
    roundCount: record.round_count,
    completedAt: record.completed_at,
  };
}
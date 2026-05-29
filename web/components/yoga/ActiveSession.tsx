"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useYogaStore } from "@/store/yogaStore";
import {
  initPoseLandmarker,
  detectPose,
  calculatePoseScore,
  getCorrectiveCue,
  drawLandmarks,
} from "@/lib/mediapipe";
import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";

interface ActiveSessionProps {
  onComplete: (durationSeconds: number, averageScore: number) => void;
}

const DETECTION_FPS = 15;
const NO_LANDMARK_TIMEOUT_MS = 3000;

export function ActiveSession({ onComplete }: ActiveSessionProps) {
  const {
    selectedPlan,
    currentPoseIndex,
    currentPoseScore,
    nextPose,
    updatePoseScore,
    completeSession,
  } = useYogaStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastDetectionRef = useRef<number>(0);
  const lastLandmarkTimeRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());
  const scoreHistoryRef = useRef<number[]>([]);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [noLandmark, setNoLandmark] = useState(false);
  const [poseTimer, setPoseTimer] = useState(0);
  const [mediapipeReady, setMediapipeReady] = useState(false);

  const poses = selectedPlan?.poses ?? [];
  const currentPose = poses[currentPoseIndex];

  // ── Score colour ──────────────────────────────────────────────────────────
  const scoreColor =
    currentPoseScore >= 80
      ? "text-emerald-500"
      : currentPoseScore >= 60
      ? "text-amber-500"
      : "text-red-500";

  const correctiveCue = currentPose
    ? getCorrectiveCue(currentPoseScore, currentPose.name)
    : null;

  // ── Pose hold countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (!currentPose) return;
    setPoseTimer(currentPose.holdDurationSeconds);

    const interval = setInterval(() => {
      setPoseTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          handleAdvancePose();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPoseIndex]);

  // ── Advance pose / complete session ──────────────────────────────────────
  const handleAdvancePose = useCallback(() => {
    if (!selectedPlan) return;
    if (currentPoseIndex >= poses.length - 1) {
      // Session done
      const durationSeconds = Math.round(
        (Date.now() - sessionStartRef.current) / 1000
      );
      const scores = scoreHistoryRef.current;
      const avgScore =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
      completeSession();
      onComplete(durationSeconds, avgScore);
    } else {
      nextPose();
    }
  }, [currentPoseIndex, poses.length, selectedPlan, nextPose, completeSession, onComplete]);

  // ── Camera setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        if (!cancelled) {
          setCameraError(
            "Camera access denied. Please allow camera permissions in your browser settings and reload the page."
          );
        }
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── MediaPipe init ────────────────────────────────────────────────────────
  useEffect(() => {
    initPoseLandmarker()
      .then(() => setMediapipeReady(true))
      .catch(() => {
        // MediaPipe failed to load — session continues without scoring
        setMediapipeReady(false);
      });
  }, []);

  // ── Detection loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mediapipeReady) return;

    const interval = 1000 / DETECTION_FPS;

    function loop() {
      rafRef.current = requestAnimationFrame(loop);
      const now = performance.now();
      if (now - lastDetectionRef.current < interval) return;
      lastDetectionRef.current = now;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      // Sync canvas size to video
      if (
        canvas.width !== video.videoWidth ||
        canvas.height !== video.videoHeight
      ) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      let result: PoseLandmarkerResult | null = null;
      try {
        result = detectPose(video);
      } catch {
        return;
      }

      if (result && result.landmarks && result.landmarks.length > 0) {
        lastLandmarkTimeRef.current = Date.now();
        setNoLandmark(false);

        drawLandmarks(canvas, result);

        if (currentPose) {
          const score = calculatePoseScore(
            result.landmarks[0] as Array<{ x: number; y: number; z: number }>,
            currentPose.name
          );
          updatePoseScore(score);
          scoreHistoryRef.current.push(score);
        }
      } else {
        // Clear canvas
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);

        if (Date.now() - lastLandmarkTimeRef.current > NO_LANDMARK_TIMEOUT_MS) {
          setNoLandmark(true);
        }
      }
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mediapipeReady, currentPose, updatePoseScore]);

  if (!currentPose) return null;

  const holdProgress =
    ((currentPose.holdDurationSeconds - poseTimer) /
      currentPose.holdDurationSeconds) *
    100;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Left: Camera ─────────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-[4/3]">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <span className="text-4xl mb-3">📷</span>
              <p className="text-white text-sm">{cameraError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover scale-x-[-1]"
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full scale-x-[-1]"
              />
              <AnimatePresence>
                {noLandmark && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50"
                  >
                    <div className="text-center text-white">
                      <p className="text-lg font-semibold">Move into frame</p>
                      <p className="text-sm text-gray-300 mt-1">
                        Make sure your full body is visible
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {!mediapipeReady && (
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    Loading AI…
                  </Badge>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right: Pose info ──────────────────────────────────────────── */}
        <div className="flex flex-col justify-between space-y-4">
          {/* Progress */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Pose {currentPoseIndex + 1} of {poses.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 text-xs"
              onClick={handleAdvancePose}
            >
              Skip pose →
            </Button>
          </div>

          {/* Pose name */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPoseIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-bold text-gray-800">
                {currentPose.name}
              </h2>
              <p className="text-sm text-indigo-400 italic mt-0.5">
                {currentPose.sanskritName}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Score */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Pose Score</span>
              <span className={`text-3xl font-bold ${scoreColor}`}>
                {currentPoseScore}
                <span className="text-base font-normal text-gray-400">/100</span>
              </span>
            </div>
            <Progress value={currentPoseScore} className="h-2" />
            <AnimatePresence>
              {correctiveCue && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2"
                >
                  💡 {correctiveCue}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Hold timer */}
          <div className="bg-indigo-50 rounded-2xl p-4 text-center">
            <p className="text-xs text-indigo-400 uppercase tracking-wide mb-1">
              Hold for
            </p>
            <p className="text-5xl font-bold text-indigo-600">{poseTimer}s</p>
            <Progress value={holdProgress} className="h-1.5 mt-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

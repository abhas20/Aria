"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useYogaStore } from "@/store/yogaStore";
import { Play, Pause, AlertTriangle } from "lucide-react";
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
    resetSession,
    isPaused,
    setPaused,
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
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const poses = selectedPlan?.poses ?? [];
  const currentPose = poses[currentPoseIndex];

  const handleExitEarly = useCallback((save: boolean) => {
    setShowExitConfirm(false);
    if (save) {
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
      resetSession();
    }
  }, [completeSession, onComplete, resetSession]);

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

  // Reset timer on pose change
  useEffect(() => {
    if (currentPose) {
      setPoseTimer(currentPose.holdDurationSeconds);
    }
  }, [currentPoseIndex, currentPose]);

  // ── Pose hold countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (!currentPose || isPaused) return;

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
  }, [currentPose, isPaused, handleAdvancePose]);

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
    if (!mediapipeReady || isPaused) return;

    const interval = 1000 / DETECTION_FPS;

    function loop() {
      if (isPaused) return;
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
  }, [mediapipeReady, currentPose, updatePoseScore, isPaused]);

  if (!currentPose) return null;

  const holdProgress =
    ((currentPose.holdDurationSeconds - poseTimer) /
      currentPose.holdDurationSeconds) *
    100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ── Left: Camera & HUD ────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] shadow-lg border border-slate-800">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900">
              <span className="text-4xl mb-3">📷</span>
              <p className="text-white text-sm font-medium">{cameraError}</p>
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

              {/* HUD scoring status indicator */}
              {mediapipeReady && !isPaused && !showExitConfirm && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-slate-700/30">
                  <span className={`h-2.5 w-2.5 rounded-full ${noLandmark ? "bg-rose-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
                  <span className="text-[10px] text-white/90 font-bold tracking-wider uppercase">
                    {noLandmark ? "Aria looking for you" : "AI Scoring Active"}
                  </span>
                </div>
              )}

              {/* Pause overlay */}
              <AnimatePresence>
                {isPaused && !showExitConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs z-10"
                  >
                    <div className="text-center text-white px-6">
                      <p className="text-2xl font-serif font-bold">Practice Paused</p>
                      <p className="text-xs text-slate-300 mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                        Aria is waiting. Ask a doubt or click resume to continue.
                      </p>
                      <Button
                        onClick={() => setPaused(false)}
                        className="mt-5 bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white rounded-xl gap-2 shadow-lg shadow-indigo-500/20"
                      >
                        <Play className="h-4 w-4 fill-current" /> Resume Practice
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Exit early confirmation overlay */}
                {showExitConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-slate-950/90 backdrop-blur-xs z-20"
                  >
                    <div className="text-center text-white p-6 max-w-sm">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20 text-rose-300 mb-3">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <p className="text-xl font-bold font-serif">End Practice Early?</p>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Would you like to save your progress so far, discard this practice session, or continue your flow?
                      </p>
                      <div className="flex flex-col gap-2.5 mt-5">
                        <Button
                          onClick={() => handleExitEarly(true)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 text-xs font-bold shadow-md"
                        >
                          Save Progress So Far
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleExitEarly(false)}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl h-10 text-xs font-bold"
                        >
                          Discard Session
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowExitConfirm(false);
                            setPaused(false);
                          }}
                          className="border-white/10 hover:bg-white/10 text-white rounded-xl h-10 text-xs font-bold"
                        >
                          Keep Practicing
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Move into frame alert */}
                {noLandmark && !isPaused && !showExitConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-3xs"
                  >
                    <div className="text-center text-white">
                      <p className="text-lg font-bold">Move into frame</p>
                      <p className="text-xs text-slate-300 mt-1 max-w-[200px] mx-auto leading-normal">
                        Make sure your full body is visible to the camera
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!mediapipeReady && (
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs bg-slate-900/80 text-white border-0">
                    Loading AI…
                  </Badge>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right: Pose info & metrics ────────────────────────────────── */}
        <div className="flex flex-col justify-between space-y-4">
          
          {/* Progress & Controls */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pose {currentPoseIndex + 1} of {poses.length}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-8 text-xs border-indigo-100 hover:bg-indigo-50 text-indigo-600 gap-1"
                onClick={() => setPaused(!isPaused)}
              >
                {isPaused ? (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" /> Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-3.5 w-3.5" /> Pause
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-8 text-xs border-rose-100 hover:bg-rose-50 text-rose-600 gap-1.5"
                onClick={() => {
                  setPaused(true);
                  setShowExitConfirm(true);
                }}
              >
                End Early
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-600 text-xs rounded-xl h-8"
                onClick={handleAdvancePose}
              >
                Skip →
              </Button>
            </div>
          </div>

          {/* Pose name */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPoseIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="py-1"
            >
              <h2 className="text-3xl font-bold font-serif text-slate-800 leading-tight">
                {currentPose.name}
              </h2>
              <p className="text-sm font-medium text-indigo-500 italic mt-0.5">
                {currentPose.sanskritName}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Score dashboard */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Alignment Accuracy
              </span>
              <span className={`text-3xl font-black ${scoreColor}`}>
                {currentPoseScore}
                <span className="text-xs font-normal text-slate-400 ml-0.5">/100</span>
              </span>
            </div>
            <Progress value={currentPoseScore} className="h-2 bg-slate-200" />
            <AnimatePresence>
              {correctiveCue && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-amber-700 bg-amber-50/50 border border-amber-100/50 rounded-xl px-3 py-2 leading-relaxed"
                >
                  💡 {correctiveCue}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Hold timer */}
          <div className="bg-indigo-50/60 border border-indigo-100/50 rounded-2xl p-5 text-center shadow-xs">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
              Hold Duration
            </p>
            <p className="text-5xl font-black text-indigo-600 tracking-tight tabular-nums">
              {poseTimer}s
            </p>
            <Progress value={holdProgress} className="h-1.5 mt-3.5 bg-indigo-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

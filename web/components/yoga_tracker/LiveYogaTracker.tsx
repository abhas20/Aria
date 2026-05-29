"use client";

import { useEffect, useRef, useState } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { calculateAngle } from "@/lib/poseMath";

// 1. Define the supported poses from the project roadmap
type YogaPose =
  | "baddha_konasana"
  | "viparita_karani"
  | "balasana"
  | "setu_bandhasana"
  | "shavasana";

interface PoseDefinition {
  name: string;
  instructions: string;
  validate: (landmarks: NormalizedLandmark[]) => {
    isValid: boolean;
    dynamicFeedback: string;
  };
}

export default function LiveYogaTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const requestRef = useRef<number | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [selectedPose, setSelectedPose] = useState<YogaPose>("baddha_konasana");
  const [feedback, setFeedback] = useState("Loading AI Model...");
  const [poseScore, setPoseScore] = useState<number>(0);

  // 2. Define the specific validation rules for each of the 5 foundational poses
  const poses: Record<YogaPose, PoseDefinition> = {
    baddha_konasana: {
      name: "Baddha Konasana (Bound Angle)",
      instructions:
        "Sit straight, bring the soles of your feet together, and let your knees drop outward.",
      validate: (lm) => {
        // Left Hip (23), Knee (25), Ankle (27)
        const leftKneeAngle = calculateAngle(lm[23], lm[25], lm[27]);
        // Right Hip (24), Knee (26), Ankle (28)
        const rightKneeAngle = calculateAngle(lm[24], lm[26], lm[28]);

        if (leftKneeAngle > 90 || rightKneeAngle > 90) {
          return {
            isValid: false,
            dynamicFeedback:
              "Press your feet together and lower your knees further down.",
          };
        }
        return {
          isValid: true,
          dynamicFeedback: "Excellent outward knee rotation. Hold and breathe.",
        };
      },
    },
    viparita_karani: {
      name: "Viparita Karani (Legs-Up-The-Wall)",
      instructions:
        "Lie on your back and extend your legs straight up vertically against a wall or in the air.",
      validate: (lm) => {
        // Shoulder (11), Hip (23), Knee (25) -> Torso to leg angle should be near 90 degrees
        const hipAngle = calculateAngle(lm[11], lm[23], lm[25]);
        // Hip (23), Knee (25), Ankle (27) -> Knee should be straight (near 180 degrees)
        const kneeAngle = calculateAngle(lm[23], lm[25], lm[27]);

        if (kneeAngle < 150) {
          return {
            isValid: false,
            dynamicFeedback: "Straighten your knees out up toward the ceiling.",
          };
        }
        if (hipAngle < 70 || hipAngle > 110) {
          return {
            isValid: false,
            dynamicFeedback:
              "Adjust your hips so your legs are vertical at a 90-degree angle.",
          };
        }
        return {
          isValid: true,
          dynamicFeedback: "Perfect vertical alignment. Relax your shoulders.",
        };
      },
    },
    balasana: {
      name: "Balasana (Child's Pose)",
      instructions:
        "Kneel on the floor, sit back on your heels, and fold forward, extending your arms ahead.",
      validate: (lm) => {
        // Hip (23), Knee (25), Ankle (27) -> High knee flexion (angle is small)
        const kneeAngle = calculateAngle(lm[23], lm[25], lm[27]);
        // Shoulder (11), Hip (23), Knee (25) -> Deep hip fold
        const hipAngle = calculateAngle(lm[11], lm[23], lm[25]);

        if (kneeAngle > 60) {
          return {
            isValid: false,
            dynamicFeedback:
              "Lower your hips all the way back down onto your heels.",
          };
        }
        if (hipAngle > 60) {
          return {
            isValid: false,
            dynamicFeedback: "Lower your chest down toward your thighs.",
          };
        }
        return {
          isValid: true,
          dynamicFeedback: "Great deep resting pose. Keep breathing deeply.",
        };
      },
    },
    setu_bandhasana: {
      name: "Setu Bandhasana (Bridge Pose)",
      instructions:
        "Lie on your back, bend your knees with feet flat, and lift your hips high off the floor.",
      validate: (lm) => {
        // Shoulder (11), Hip (23), Knee (25) -> Hips lifted means extended line
        const hipLineAngle = calculateAngle(lm[11], lm[23], lm[25]);

        if (hipLineAngle < 140) {
          return {
            isValid: false,
            dynamicFeedback:
              "Engage your glutes and press your hips higher up off the floor.",
          };
        }
        return {
          isValid: true,
          dynamicFeedback:
            "Fantastic bridge elevation. Keep your neck relaxed.",
        };
      },
    },
    shavasana: {
      name: "Shavasana (Corpse Pose)",
      instructions:
        "Lie completely flat on your back, arms relaxed by your sides, eyes closed.",
      validate: (lm) => {
        const hipAngle = calculateAngle(lm[11], lm[23], lm[25]);
        const kneeAngle = calculateAngle(lm[23], lm[25], lm[27]);

        if (hipAngle < 165 || kneeAngle < 165) {
          return {
            isValid: false,
            dynamicFeedback:
              "Lie completely flat and relax your body fully onto the surface.",
          };
        }
        return {
          isValid: true,
          dynamicFeedback:
            "Perfect stillness. Allow your breathing to become completely natural.",
        };
      },
    },
  };

  useEffect(() => {
    const initModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        );

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });

        landmarkerRef.current = landmarker;
        setIsModelLoaded(true);
        setFeedback("Model loaded. Initializing camera stream...");
        startCamera();
      } catch (error) {
        console.error("Failed to initialize MediaPipe", error);
        setFeedback(
          "Failed to load tracking engine. Check network connections.",
        );
      }
    };

    initModel();

    return () => {
      // FIXED: Safely clear dynamic animation frame handles using corrected type validations
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
      landmarkerRef.current?.close();
    };
  }, []);

  const startCamera = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", predictWebcam);
    } catch (err) {
      console.error("Camera access denied:", err);
      setFeedback("Camera permission is required to analyze posture accuracy.");
    }
  };

  const predictWebcam = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !canvas || !landmarker) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const drawingUtils = new DrawingUtils(ctx);
    let lastVideoTime = -1;

    const renderLoop = () => {
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const results = landmarker.detectForVideo(video, performance.now());

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.landmarks && results.landmarks.length > 0) {
          const pose = results.landmarks[0];

          // Draw the live aesthetic skeleton overlay layout
          drawingUtils.drawLandmarks(pose, { radius: 3, color: "#E11D48" }); // Rose-600 tracking point
          drawingUtils.drawConnectors(pose, PoseLandmarker.POSE_CONNECTIONS, {
            color: "#FFFFFF",
            lineWidth: 2,
          });

          // Run evaluation rules against the current selected active pose configuration
          const activePose = poses[selectedPose];

          // Ensure critical core tracking landmarks have sufficient visibility metrics before evaluation
          const metricsValid = [11, 12, 23, 24, 25, 26].every(
            (idx) => (pose[idx]?.visibility ?? 0) > 0.5,
          );

          if (metricsValid) {
            const evaluation = activePose.validate(pose);
            setFeedback(evaluation.dynamicFeedback);
            setPoseScore(evaluation.isValid ? 100 : 45); // Set threshold scoring
          } else {
            setFeedback(
              "Ensure your full body is visible to the camera framing window.",
            );
            setPoseScore(0);
          }
        }
      }
      requestRef.current = requestAnimationFrame(renderLoop);
    };

    requestRef.current = requestAnimationFrame(renderLoop);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto p-4">
      {/* Pose Selector Menu Controls */}
      <div className="w-full bg-white p-4 border border-gray-100 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Select Session Flow
          </label>
          <select
            value={selectedPose}
            onChange={(e) => {
              setSelectedPose(e.target.value as YogaPose);
              setFeedback("Switching posture configuration context...");
            }}
            className="bg-gray-50 border border-gray-200 text-gray-800 py-2 px-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-rose-500">
            {Object.entries(poses).map(([key, config]) => (
              <option key={key} value={key}>
                {config.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-center md:text-right">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
            Pose Accuracy
          </span>
          <span className="text-3xl font-extrabold text-rose-600">
            {poseScore}%
          </span>
        </div>
      </div>

      {/* Target Instructions Box */}
      <div className="w-full bg-rose-50/50 border border-rose-100 p-4 rounded-2xl text-sm text-gray-600">
        <strong className="text-rose-700 block mb-1">Target Guide:</strong>
        {poses[selectedPose].instructions}
      </div>

      {/* Live State Action Feedback Banner */}
      <div className="bg-gray-900 text-white px-6 py-4 rounded-2xl font-medium shadow-md w-full text-center tracking-wide border border-gray-800">
        {feedback}
      </div>

      {/* Main Viewfinder Capture Block */}
      <div className="relative w-full aspect-video bg-gray-950 rounded-3xl overflow-hidden shadow-xl border border-gray-900">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover z-10 scale-x-[-1]"
        />

        {!isModelLoaded && (
          <div className="absolute inset-0 flex flex-col gap-3 items-center justify-center text-gray-400 bg-gray-950 z-20">
            <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium tracking-wide">
              Downloading local computer vision engine assets...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

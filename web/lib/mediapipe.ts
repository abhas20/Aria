/**
 * MediaPipe BlazePose wrapper using @mediapipe/tasks-vision.
 * WASM is loaded from CDN — not bundled.
 */

import type {
  PoseLandmarker,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

// Lazy-loaded singleton
let poseLandmarker: PoseLandmarker | null = null;
let initPromise: Promise<void> | null = null;

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

export async function initPoseLandmarker(): Promise<void> {
  if (poseLandmarker) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await import("@mediapipe/tasks-vision");
    const { PoseLandmarker: PL, FilesetResolver } = vision;

    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    poseLandmarker = await PL.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  })();

  return initPromise;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

let lastVideoTime = -1;

export function detectPose(
  video: HTMLVideoElement
): PoseLandmarkerResult | null {
  if (!poseLandmarker) return null;
  if (video.readyState < 2) return null;

  const now = performance.now();
  if (video.currentTime === lastVideoTime) return null;
  lastVideoTime = video.currentTime;

  return poseLandmarker.detectForVideo(video, now);
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

// Key landmark indices (MediaPipe BlazePose)
const LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

interface Point3D {
  x: number;
  y: number;
  z: number;
}

function angle(a: Point3D, b: Point3D, c: Point3D): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
  const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);
  if (magAB === 0 || magCB === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

// Ideal angles per pose (approximate targets)
const IDEAL_ANGLES: Record<
  string,
  { leftKnee?: number; rightKnee?: number; leftHip?: number; rightHip?: number; leftElbow?: number; rightElbow?: number }
> = {
  "Mountain Pose": { leftKnee: 180, rightKnee: 180, leftHip: 180, rightHip: 180 },
  "Child's Pose": { leftKnee: 45, rightKnee: 45, leftHip: 60, rightHip: 60 },
  "Cat-Cow": { leftHip: 90, rightHip: 90, leftKnee: 90, rightKnee: 90 },
  "Warrior I": { leftKnee: 90, rightKnee: 170, leftHip: 90, rightHip: 170 },
  "Legs Up the Wall": { leftKnee: 180, rightKnee: 180, leftHip: 90, rightHip: 90 },
};

export function calculatePoseScore(
  landmarks: Point3D[],
  referencePose: string
): number {
  if (!landmarks || landmarks.length < 29) return 0;

  const lm = landmarks;
  const ideal = IDEAL_ANGLES[referencePose];
  if (!ideal) return 75; // default reasonable score for unknown poses

  const deviations: number[] = [];

  const leftKneeAngle = angle(
    lm[LANDMARKS.LEFT_HIP],
    lm[LANDMARKS.LEFT_KNEE],
    lm[LANDMARKS.LEFT_ANKLE]
  );
  const rightKneeAngle = angle(
    lm[LANDMARKS.RIGHT_HIP],
    lm[LANDMARKS.RIGHT_KNEE],
    lm[LANDMARKS.RIGHT_ANKLE]
  );
  const leftHipAngle = angle(
    lm[LANDMARKS.LEFT_SHOULDER],
    lm[LANDMARKS.LEFT_HIP],
    lm[LANDMARKS.LEFT_KNEE]
  );
  const rightHipAngle = angle(
    lm[LANDMARKS.RIGHT_SHOULDER],
    lm[LANDMARKS.RIGHT_HIP],
    lm[LANDMARKS.RIGHT_KNEE]
  );

  if (ideal.leftKnee !== undefined)
    deviations.push(Math.abs(leftKneeAngle - ideal.leftKnee));
  if (ideal.rightKnee !== undefined)
    deviations.push(Math.abs(rightKneeAngle - ideal.rightKnee));
  if (ideal.leftHip !== undefined)
    deviations.push(Math.abs(leftHipAngle - ideal.leftHip));
  if (ideal.rightHip !== undefined)
    deviations.push(Math.abs(rightHipAngle - ideal.rightHip));

  if (deviations.length === 0) return 75;

  const avgDeviation =
    deviations.reduce((a, b) => a + b, 0) / deviations.length;

  // Scale: 0° deviation = 100, 90° deviation = 0
  const score = Math.max(0, Math.min(100, 100 - avgDeviation * (100 / 90)));
  return Math.round(score);
}

// ---------------------------------------------------------------------------
// Corrective cues
// ---------------------------------------------------------------------------

const CUES: Record<string, string[]> = {
  "Mountain Pose": [
    "Stand tall — imagine a string pulling the crown of your head upward.",
    "Ground all four corners of your feet into the floor.",
    "Relax your shoulders away from your ears.",
  ],
  "Child's Pose": [
    "Sink your hips back toward your heels.",
    "Extend your arms forward and let your forehead rest on the mat.",
    "Breathe into your lower back — let it expand with each inhale.",
  ],
  "Cat-Cow": [
    "On the inhale, drop your belly and lift your gaze (Cow).",
    "On the exhale, round your spine toward the ceiling (Cat).",
    "Keep your wrists directly under your shoulders.",
  ],
  "Warrior I": [
    "Bend your front knee to 90° — knee over ankle.",
    "Square your hips toward the front of the mat.",
    "Reach your arms strongly overhead, palms facing each other.",
  ],
  "Legs Up the Wall": [
    "Scoot your hips closer to the wall so your legs are fully supported.",
    "Let your arms rest by your sides, palms facing up.",
    "Close your eyes and breathe slowly — this is a restorative pose.",
  ],
};

export function getCorrectiveCue(
  score: number,
  poseName: string
): string | null {
  if (score >= 60) return null;
  const cues = CUES[poseName];
  if (!cues || cues.length === 0) return "Adjust your alignment and breathe.";
  // Rotate through cues based on score bucket
  const index = Math.floor(((60 - score) / 60) * cues.length);
  return cues[Math.min(index, cues.length - 1)];
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

// BlazePose connections (pairs of landmark indices)
const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
];

export function drawLandmarks(
  canvas: HTMLCanvasElement,
  result: PoseLandmarkerResult
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!result.landmarks || result.landmarks.length === 0) return;

  const landmarks = result.landmarks[0];
  const w = canvas.width;
  const h = canvas.height;

  // Draw connections
  ctx.strokeStyle = "rgba(99, 102, 241, 0.8)"; // indigo
  ctx.lineWidth = 2;
  for (const [start, end] of POSE_CONNECTIONS) {
    const a = landmarks[start];
    const b = landmarks[end];
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x * w, a.y * h);
    ctx.lineTo(b.x * w, b.y * h);
    ctx.stroke();
  }

  // Draw landmark dots
  ctx.fillStyle = "rgba(236, 72, 153, 0.9)"; // pink
  for (const lm of landmarks) {
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, 4, 0, 2 * Math.PI);
    ctx.fill();
  }
}

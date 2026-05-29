export type Point = { x: number; y: number; z?: number; visibility?: number };

/**
 * Calculates the angle (in degrees) between three points.
 * Point 'b' is the vertex (e.g., the elbow).
 */
export function calculateAngle(a: Point, b: Point, c: Point): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360 - angle;
  }

  return angle;
}

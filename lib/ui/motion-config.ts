/**
 * Shared motion tokens. Durations stay short and functional across themes.
 *
 * Page transitions: 200–300ms ease-out
 * Sheet open/close: max 350ms
 * List stagger: optional, max 30ms per item
 * prefers-reduced-motion → duration 0 / opacity-only
 */

export const MOTION = {
  /** Page / view crossfade or slide (ms). */
  pageMs: 250,
  /** Bottom sheet slide (ms). */
  sheetMs: 300,
  /** Status badge pulse (ms). */
  pulseMs: 180,
  /** Stagger delay between list items (ms). Cap usage. */
  staggerMs: 30,
  /** Card zoom overlay fade / scale (ms). */
  zoomMs: 200,
  /** Ease-out cubic-bezier for CSS transitions. */
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  /** Default CSS transition string for opacity fades. */
  fade: "opacity 250ms cubic-bezier(0.16, 1, 0.3, 1)",
  /** Default CSS transition string for transform slides. */
  slide: "transform 250ms cubic-bezier(0.16, 1, 0.3, 1)",
} as const;

export type MotionDurationKey = keyof Pick<
  typeof MOTION,
  "pageMs" | "sheetMs" | "pulseMs" | "staggerMs" | "zoomMs"
>;

/** Duration in seconds for style props / Framer-like APIs. */
export function motionSeconds(ms: number, reduced: boolean): number {
  return reduced ? 0 : ms / 1000;
}

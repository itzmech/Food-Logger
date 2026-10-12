/**
 * App-local change notifications for activity data.
 *
 * Cardio logging and weight logging must keep the dashboard and
 * the cardio history in sync without a global store — same
 * pattern as `foodEvents.ts`: writers emit, views re-read.
 */

export type ActivityChangeReason =
  | 'cardio-added'
  | 'cardio-removed'
  | 'weight-added'
  | 'measurement-removed'
  | 'strength-set-saved'
  | 'strength-exercise-added'
  | 'strength-exercise-removed'
  | 'strength-exercise-skipped'
  | 'strength-exercise-unskipped'
  | 'day-plan-saved'

const EVENT_NAME = 'freebuff:activity-changed'

export function emitActivityChanged(reason: ActivityChangeReason): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { reason } }))
}

/** Subscribes to activity changes; returns an unsubscribe function. */
export function onActivityChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}

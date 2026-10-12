/**
 * App-local change notifications.
 *
 * Logging food from the dashboard and the Food page must keep both views in
 * sync without a global store. A tiny window event keeps the coupling loose:
 * writers emit, any mounted view can re-read its queries.
 */

export type FoodChangeReason =
  | 'log-added'
  | 'log-updated'
  | 'log-removed'
  | 'food-saved'
  | 'food-removed'
  | 'menu-changed'

const EVENT_NAME = 'freebuff:food-changed'

export function emitFoodChanged(reason: FoodChangeReason): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { reason } }))
}

/** Subscribes to food changes; returns an unsubscribe function. */
export function onFoodChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}

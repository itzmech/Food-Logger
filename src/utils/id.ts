/** Generates a collision-safe entity id. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Deterministic fallback for very old browsers.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Current time as a full ISO-8601 string. */
export function nowIso(): string {
  return new Date().toISOString()
}

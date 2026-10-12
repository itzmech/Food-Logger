/** App-local task change notifications, following the foodEvents pattern. */

export type TaskChangeReason =
  | 'task-created'
  | 'task-updated'
  | 'task-toggled'
  | 'task-deleted'

const EVENT_NAME = 'freebuff:tasks-changed'

export function emitTasksChanged(reason: TaskChangeReason): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { reason } }))
}

/** Subscribes to task changes; returns an unsubscribe function. */
export function onTasksChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}

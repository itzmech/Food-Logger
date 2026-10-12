import { useState, useCallback, useEffect, useRef } from 'react'
import {
  listActiveSessions,
  createWorkoutSession,
  cancelWorkoutSession,
  finishWorkoutSession,
  addSessionExercise,
  removeSessionExercise,
  reorderSessionExercises,
  listSessionExercises,
  upsertSessionSet,
  removeSessionSet,
  listSessionSets,
} from '@/db/workoutQueries'
import type { WorkoutSession, WorkoutSessionExercise, WorkoutSessionSet, CompletedWorkout } from '@/types'

export interface ActiveSessionExercise extends WorkoutSessionExercise {
  exercise?: { id: string; name: string } | undefined
}

export interface ActiveSessionSet extends WorkoutSessionSet {
  workoutExerciseId: string
}

export function useActiveWorkout() {
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [sessionExercises, setSessionExercises] = useState<ActiveSessionExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)

  const elapsedSeconds = Math.round(elapsedRef.current)

  const loadSessionExercises = useCallback(async (sessionId: string) => {
    const rows = await listSessionExercises(sessionId)
    const mapped = rows.map((row) => ({
      ...row,
      exercise: row.exercise ? { id: row.exercise.id, name: row.exercise.name } : undefined,
    })) as ActiveSessionExercise[]
    setSessionExercises(mapped)
  }, [])

  const recomputeElapsed = useCallback(() => {
    if (!session) return
    const start = startedAtRef.current ?? new Date(session.startedAt).getTime()
    elapsedRef.current = Math.max(0, Math.round((Date.now() - start) / 1000))
  }, [session])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const active = await listActiveSessions()
      if (active.length > 0) {
        const s = active[0]
        setSession(s)
        startedAtRef.current = new Date(s.startedAt).getTime()
        if (s.endedAt) {
          elapsedRef.current = s.durationSeconds != null ? Math.round(Number(s.durationSeconds)) : 0
        } else {
          elapsedRef.current = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000))
        }
        await loadSessionExercises(s.id)
        if (!timerRef.current) {
          timerRef.current = setInterval(recomputeElapsed, 250)
        }
      } else {
        setSession(null)
        setSessionExercises([])
        startedAtRef.current = null
        elapsedRef.current = 0
      }
    } catch {
      setSession(null)
      setSessionExercises([])
      startedAtRef.current = null
      elapsedRef.current = 0
    } finally {
      setLoading(false)
    }
  }, [loadSessionExercises, recomputeElapsed])

  useEffect(() => {
    load()

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [load])

  const start = useCallback(async (draft: { templateId: string | null; templateNameSnapshot: string | null; name: string; notes: string | null }) => {
    setSaving(true)
    try {
      const s = await createWorkoutSession(draft)
      setSession(s)
      startedAtRef.current = new Date(s.startedAt).getTime()
      elapsedRef.current = 0
      setSessionExercises([])
      if (!timerRef.current) {
        timerRef.current = setInterval(recomputeElapsed, 250)
      }
      return s
    } finally {
      setSaving(false)
    }
  }, [recomputeElapsed])

  const addExercise = useCallback(async (
    exerciseId: string,
    exerciseNameSnapshot: string,
    exerciseEquipmentSnapshot: string | null,
    exerciseEquipmentOptionsSnapshot: string[],
    builtInSnapshot: boolean,
    order: number,
    notes: string | null,
  ) => {
    if (!session) return null
    const row = await addSessionExercise(
      session.id,
      exerciseId,
      exerciseNameSnapshot,
      exerciseEquipmentSnapshot,
      exerciseEquipmentOptionsSnapshot,
      builtInSnapshot,
      order,
      notes,
    )
    await loadSessionExercises(session.id)
    return row
  }, [session, loadSessionExercises])

  const removeExercise = useCallback(async (exerciseId: string) => {
    if (!session) return false
    const ok = await removeSessionExercise(exerciseId)
    if (ok) {
      await loadSessionExercises(session.id)
    }
    return ok
  }, [session, loadSessionExercises])

  const reorderExercises = useCallback(async (orderedIds: string[]) => {
    if (!session) return
    await reorderSessionExercises(session.id, orderedIds)
    await loadSessionExercises(session.id)
  }, [session, loadSessionExercises])

  const upsertSet = useCallback(async (workoutExerciseId: string, patch: { setNumber: number; weight: number | null; weightUnit: string; reps: number | null; completed: boolean; rpe?: number | null; restSeconds?: number | null; notes?: string | null }) => {
    const updated = await upsertSessionSet(workoutExerciseId, patch)
    return updated
  }, [])

  const refreshExerciseSets = useCallback(async (workoutExerciseId: string) => {
    if (!session) return []
    const sets = await listSessionSets(workoutExerciseId)
    return sets as ActiveSessionSet[]
  }, [session])

  const removeSet = useCallback(async (setId: string) => {
    return removeSessionSet(setId)
  }, [])

  const cancel = useCallback(async () => {
    if (!session) return null
    const cancelled = await cancelWorkoutSession(session.id, elapsedRef.current)
    if (cancelled) {
      setSession(null)
      setSessionExercises([])
      startedAtRef.current = null
      elapsedRef.current = 0
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return cancelled
  }, [session])

  const finish = useCallback(async (): Promise<CompletedWorkout | undefined> => {
    if (!session) return undefined
    setSaving(true)
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      const completed = await finishWorkoutSession(session.id, elapsedRef.current)
      if (completed) {
        setSession(null)
        setSessionExercises([])
        startedAtRef.current = null
        elapsedRef.current = 0
      }
      return completed
    } finally {
      setSaving(false)
    }
  }, [session])

  return {
    session,
    sessionExercises,
    loading,
    saving,
    elapsedSeconds,
    reload: load,
    start,
    addExercise,
    removeExercise,
    reorderExercises,
    upsertSet,
    refreshExerciseSets,
    removeSet,
    cancel,
    finish,
  }
}

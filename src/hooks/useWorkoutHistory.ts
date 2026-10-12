import { useState, useCallback } from 'react'
import { useEffect } from 'react'
import {
  listCompletedWorkouts,
  getCompletedWorkout,
  getCompletedWorkoutExercises,
  getCompletedWorkoutSets,
  deleteCompletedWorkout,
  previousSessionForExerciseFromSessions as previousSessionForExercise,
  computeExercisePRFromSessions as computeExercisePR,
} from '@/db/workoutQueries'
import type { CompletedWorkout, CompletedWorkoutExercise, ExercisePR } from '@/types'

export interface WorkoutHistoryItem {
  workout: CompletedWorkout
  exerciseCount: number
  completedSetCount: number
  totalVolume: number
}

export function useWorkoutHistory() {
  const [workouts, setWorkouts] = useState<CompletedWorkout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await listCompletedWorkouts()
      setWorkouts(rows)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [])

  const removed = useCallback(async (id: string) => {
    const ok = await deleteCompletedWorkout(id)
    if (ok) {
      setWorkouts((prev) => prev.filter((row) => row.id !== id))
    }
    return ok
  }, [])

  const summaryList = useCallback((): WorkoutHistoryItem[] => {
    return workouts.map((workout) => {
      let totalVolume = 0
      let completedSetCount = 0
      for (const _exerciseRecordId of workout.exerciseIds) {
        // Volume is computed in the detail view.
      }
      return {
        workout,
        exerciseCount: workout.exerciseIds.length,
        completedSetCount,
        totalVolume,
      }
    })
  }, [workouts])

  return {
    workouts,
    loading,
    error,
    reload,
    remove: removed,
    summaryList,
  }
}

export function useWorkoutDetail(workoutId: string | null) {
  const [workout, setWorkout] = useState<CompletedWorkout | null>(null)
  const [exercises, setExercises] = useState<CompletedWorkoutExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    if (!workoutId) {
      setWorkout(null)
      setExercises([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [workoutRow, exerciseRows] = await Promise.all([
        getCompletedWorkout(workoutId),
        getCompletedWorkoutExercises(workoutId),
      ])
      if (workoutRow) {
        setWorkout(workoutRow)
        setExercises(exerciseRows)
      } else {
        setWorkout(null)
        setExercises([])
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setWorkout(null)
      setExercises([])
    } finally {
      setLoading(false)
    }
  }, [workoutId])

  const setsForExercise = useCallback(async (exerciseId: string) => {
    return getCompletedWorkoutSets(exerciseId)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return {
    workout,
    exercises,
    loading,
    error,
    reload,
    setsForExercise,
  }
}

export interface ExerciseHistorySession {
  date: string
  sets: { weight: number | null; reps: number | null; repsDisplay: string; completed: boolean }[]
  volume: number
}

export function useExerciseHistory(exerciseId: string | null) {
  const [sessions, setSessions] = useState<ExerciseHistorySession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [pr, setPr] = useState<ExercisePR | null>(null)

  const reload = useCallback(async () => {
    if (!exerciseId) {
      setSessions([])
      setPr(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [prRow, previous] = await Promise.all([
        computeExercisePR(exerciseId),
        previousSessionForExercise(exerciseId),
      ])
      setPr(prRow)
      if (previous) {
        setSessions((prev) => {
          const next = [{ date: new Date().toISOString().slice(0, 10), sets: previous.sets.map((set) => ({ weight: set.weight, reps: set.reps, repsDisplay: set.repsDisplay, completed: true })), volume: 0 }, ...prev]
          return next
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [exerciseId])

  useEffect(() => {
    reload()
  }, [reload])

  return {
    sessions,
    pr,
    loading,
    error,
    reload,
  }
}

export function usePreviousPerformance(exerciseId: string | null) {
  const [previous, setPrevious] = useState<{ exerciseNameSnapshot: string; sets: { weight: number; reps: number | null; repsDisplay: string }[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    if (!exerciseId) {
      setPrevious(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const row = await previousSessionForExercise(exerciseId)
      setPrevious(row)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [exerciseId])

  useEffect(() => {
    reload()
  }, [reload])

  return {
    previous,
    loading,
    error,
    reload,
  }
}

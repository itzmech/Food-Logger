import { useState, useCallback } from 'react'
import { listExercises, createExercise, updateExercise, deleteExercise, searchExercises } from '@/db/workoutQueries'
import type { Exercise } from '@/types'

export function useWorkoutExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await listExercises()
      setExercises(rows)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [])

  const created = useCallback(async (draft: { name: string; category: string; equipment: string; equipmentOptions: string[]; defaultEquipment: string; notes: string | null }) => {
    const exercise = await createExercise(draft)
    setExercises((prev) => [...prev, exercise])
    return exercise
  }, [])

  const updated = useCallback(async (id: string, patch: { name?: string; category?: string; equipment?: string; equipmentOptions?: string[]; defaultEquipment?: string; notes?: string | null }) => {
    const exercise = await updateExercise(id, patch)
    if (exercise) {
      setExercises((prev) => prev.map((row) => (row.id === id ? exercise : row)))
    }
    return exercise
  }, [])

  const removed = useCallback(async (id: string) => {
    const ok = await deleteExercise(id)
    if (ok) {
      setExercises((prev) => prev.filter((row) => row.id !== id))
    }
    return ok
  }, [])

  const searched = useCallback(async (query: string) => {
    const rows = await searchExercises(query)
    setExercises(rows)
    return rows
  }, [])

  return {
    exercises,
    loading,
    error,
    reload,
    create: created,
    update: updated,
    remove: removed,
    search: searched,
  }
}

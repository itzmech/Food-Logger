import { useState, useCallback } from 'react'
import {
  listWorkoutTemplates,
  createWorkoutTemplate,
  updateWorkoutTemplate,
  deleteWorkoutTemplate,
  addTemplateExercise,
  updateTemplateExercise,
  removeTemplateExercise,
  listTemplateExercises,
} from '@/db/workoutQueries'
import type { WorkoutTemplate, WorkoutTemplateExercise } from '@/types'

export interface TemplateExerciseRow extends WorkoutTemplateExercise {
  exerciseName: string
}

export function useWorkoutTemplates() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await listWorkoutTemplates()
      setTemplates(rows)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [])

  const created = useCallback(async (draft: { name: string; notes: string | null }) => {
    const template = await createWorkoutTemplate(draft)
    setTemplates((prev) => [...prev, template])
    return template
  }, [])

  const updated = useCallback(async (id: string, patch: { name?: string; notes?: string | null }) => {
    const template = await updateWorkoutTemplate(id, patch)
    if (template) {
      setTemplates((prev) => prev.map((row) => (row.id === id ? template : row)))
    }
    return template
  }, [])

  const removed = useCallback(async (id: string) => {
    const ok = await deleteWorkoutTemplate(id)
    if (ok) {
      setTemplates((prev) => prev.filter((row) => row.id !== id))
    }
    return ok
  }, [])

  const exercisesForTemplate = useCallback(async (templateId: string) => {
    const rows = await listTemplateExercises(templateId)
    return rows.map((row) => ({
      ...row,
      exerciseName: row.exercise?.name ?? row.exerciseId,
    })) as TemplateExerciseRow[]
  }, [])

  const addExercise = useCallback(async (
    templateId: string,
    exerciseId: string,
    order: number,
    targetSets: number,
    targetReps: string,
    defaultWeight: number | null,
    restSeconds: number,
    notes: string | null,
  ) => {
    const row = await addTemplateExercise(templateId, exerciseId, order, targetSets, targetReps, defaultWeight, restSeconds, notes)
    return row
  }, [])

  const updateExercise = useCallback(async (id: string, patch: { order?: number; targetSets?: number; targetReps?: string; defaultWeight?: number | null; restSeconds?: number; notes?: string | null }) => {
    return updateTemplateExercise(id, patch)
  }, [])

  const removeExercise = useCallback(async (id: string) => {
    return removeTemplateExercise(id)
  }, [])

  return {
    templates,
    loading,
    error,
    reload,
    create: created,
    update: updated,
    remove: removed,
    exercisesForTemplate,
    addExercise,
    updateExercise,
    removeExercise,
  }
}

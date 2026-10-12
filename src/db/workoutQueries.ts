import { newId, nowIso } from '@/utils/id'
import {
  exercisesRepo,
  workoutTemplatesRepo,
  workoutTemplateExercisesRepo,
  workoutSessionsRepo,
  workoutSessionExercisesRepo,
  workoutSessionSetsRepo,
  completedWorkoutsRepo,
  completedWorkoutExercisesRepo,
  completedWorkoutSetsRepo,
} from './repositories'
import type {
  Exercise,
  ExerciseCategory,
  WorkoutTemplate,
  WorkoutTemplateExercise,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSessionSet,
  CompletedWorkout,
  CompletedWorkoutExercise,
  CompletedWorkoutSet,
  ExercisePR,
} from '@/types'
import type { ISODate } from '@/utils/date'
import { formatReps, estimated1RM as estimated1RMFn } from '@/types'

/* ------------------------------------------------------------------ */
/* Exercise library                                                    */
/* ------------------------------------------------------------------ */

export async function listExercises(): Promise<Exercise[]> {
  return exercisesRepo.getAll()
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
  return exercisesRepo.get(id)
}

export async function createExercise(
  draft: {
    name: string
    category: string
    equipment: string
    equipmentOptions: string[]
    defaultEquipment: string
    notes: string | null
  },
): Promise<Exercise> {
  const now = nowIso()
  const trimmedOptions = draft.equipmentOptions
    .map((s) => s.trim())
    .filter(Boolean)
  const defaultEquipment =
    trimmedOptions.includes(draft.equipment.trim())
      ? draft.equipment.trim()
      : (trimmedOptions[0] ?? draft.equipment.trim())
  const next: Exercise = {
    id: newId(),
    name: draft.name.trim(),
    category: draft.category as ExerciseCategory,
    equipment: defaultEquipment,
    equipmentOptions: trimmedOptions.length > 0 ? trimmedOptions : [defaultEquipment],
    defaultEquipment,
    builtIn: false,
    notes: draft.notes?.trim() ?? null,
    createdAt: now,
    updatedAt: now,
  }
  await exercisesRepo.put(next)
  return next
}

export async function updateExercise(
  id: string,
  patch: {
    name?: string
    category?: string
    equipment?: string
    equipmentOptions?: string[]
    defaultEquipment?: string
    notes?: string | null
  },
): Promise<Exercise | undefined> {
  const existing = await exercisesRepo.get(id)
  if (!existing) return undefined
  const trimmedOptions =
    patch.equipmentOptions != null
      ? patch.equipmentOptions.map((s) => s.trim()).filter(Boolean)
      : existing.equipmentOptions
  const defaultEquipment =
    patch.defaultEquipment != null
      ? patch.defaultEquipment.trim()
      : patch.equipment != null
        ? patch.equipment.trim()
        : existing.defaultEquipment
  const next: Exercise = {
    ...existing,
    name: patch.name != null ? patch.name.trim() : existing.name,
    category: patch.category != null ? (patch.category as ExerciseCategory) : existing.category,
    equipment: defaultEquipment,
    equipmentOptions: trimmedOptions.length > 0 ? trimmedOptions : [defaultEquipment],
    defaultEquipment,
    notes: patch.notes != null ? patch.notes.trim() ?? null : existing.notes,
    updatedAt: nowIso(),
  }
  await exercisesRepo.put(next)
  return next
}

export async function deleteExercise(id: string): Promise<boolean> {
  const existing = await exercisesRepo.get(id)
  if (!existing) return false
  if (existing.builtIn) return false
  const templateExercises = await workoutTemplateExercisesRepo.getAllByIndex(
    'exerciseId',
    id,
  )
  for (const te of templateExercises) {
    await workoutTemplateExercisesRepo.remove(te.id)
  }
  await exercisesRepo.remove(id)
  return true
}

export async function searchExercises(query: string): Promise<Exercise[]> {
  const all = await listExercises()
  const needle = query.trim().toLowerCase()
  if (!needle) return all
  return all.filter((exercise) => exercise.name.toLowerCase().includes(needle))
}

/* ------------------------------------------------------------------ */
/* Workout templates                                                   */
/* ------------------------------------------------------------------ */

export async function listWorkoutTemplates(): Promise<WorkoutTemplate[]> {
  return workoutTemplatesRepo.getAll()
}

export async function getWorkoutTemplate(id: string): Promise<WorkoutTemplate | undefined> {
  return workoutTemplatesRepo.get(id)
}

export async function createWorkoutTemplate(
  draft: {
    name: string
    notes: string | null
  },
): Promise<WorkoutTemplate> {
  const now = nowIso()
  const next: WorkoutTemplate = {
    id: newId(),
    name: draft.name.trim(),
    notes: draft.notes?.trim() ?? null,
    createdAt: now,
    updatedAt: now,
  }
  await workoutTemplatesRepo.put(next)
  return next
}

export async function updateWorkoutTemplate(
  id: string,
  patch: {
    name?: string
    notes?: string | null
  },
): Promise<WorkoutTemplate | undefined> {
  const existing = await workoutTemplatesRepo.get(id)
  if (!existing) return undefined
  const next: WorkoutTemplate = {
    ...existing,
    name: patch.name != null ? patch.name.trim() : existing.name,
    notes: patch.notes != null ? patch.notes.trim() ?? null : existing.notes,
    updatedAt: nowIso(),
  }
  await workoutTemplatesRepo.put(next)
  return next
}

export async function deleteWorkoutTemplate(id: string): Promise<boolean> {
  const existing = await workoutTemplatesRepo.get(id)
  if (!existing) return false
  const templateExercises = await workoutTemplateExercisesRepo.getAllByIndex(
    'templateId',
    id,
  )
  for (const te of templateExercises) {
    await workoutTemplateExercisesRepo.remove(te.id)
  }
  await workoutTemplatesRepo.remove(id)
  return true
}

export async function addTemplateExercise(
  templateId: string,
  exerciseId: string,
  order: number,
  targetSets: number,
  targetReps: string,
  defaultWeight: number | null,
  restSeconds: number,
  notes: string | null,
): Promise<WorkoutTemplateExercise> {
  const now = nowIso()
  const next: WorkoutTemplateExercise = {
    id: newId(),
    templateId,
    exerciseId,
    order,
    targetSets,
    targetReps,
    defaultWeight,
    restSeconds,
    notes: notes?.trim() ?? null,
    createdAt: now,
    updatedAt: now,
  }
  await workoutTemplateExercisesRepo.put(next)
  return next
}

export async function updateTemplateExercise(
  id: string,
  patch: {
    order?: number
    targetSets?: number
    targetReps?: string
    defaultWeight?: number | null
    restSeconds?: number
    notes?: string | null
  },
): Promise<WorkoutTemplateExercise | undefined> {
  const existing = await workoutTemplateExercisesRepo.get(id)
  if (!existing) return undefined
  const next: WorkoutTemplateExercise = {
    ...existing,
    order: patch.order != null ? patch.order : existing.order,
    targetSets: patch.targetSets != null ? patch.targetSets : existing.targetSets,
    targetReps: patch.targetReps != null ? patch.targetReps : existing.targetReps,
    defaultWeight: patch.defaultWeight != null ? patch.defaultWeight : existing.defaultWeight,
    restSeconds: patch.restSeconds != null ? patch.restSeconds : existing.restSeconds,
    notes: patch.notes != null ? patch.notes.trim() ?? null : existing.notes,
    updatedAt: nowIso(),
  }
  await workoutTemplateExercisesRepo.put(next)
  return next
}

export async function removeTemplateExercise(id: string): Promise<boolean> {
  const existing = await workoutTemplateExercisesRepo.get(id)
  if (!existing) return false
  await workoutTemplateExercisesRepo.remove(id)
  return true
}

export async function listTemplateExercises(templateId: string): Promise<
  (WorkoutTemplateExercise & { exercise?: Exercise })[]
> {
  const rows = await workoutTemplateExercisesRepo.getAllByIndex('templateId', templateId)
  const exercises = await exercisesRepo.getAll()
  const exerciseById = new Map(exercises.map((ex) => [ex.id, ex]))
  return rows
    .sort((a, b) => a.order - b.order)
    .map((row) => ({
      ...row,
      exercise: exerciseById.get(row.exerciseId) ?? undefined,
    }))
}

/* ------------------------------------------------------------------ */
/* Active workout sessions                                             */
/* ------------------------------------------------------------------ */

export async function listActiveSessions(): Promise<WorkoutSession[]> {
  const rows = await workoutSessionsRepo.getAll()
  const active = rows.filter((row) => row.active === true)
  return active.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export async function getActiveSession(id: string): Promise<WorkoutSession | undefined> {
  return workoutSessionsRepo.get(id)
}

export async function createWorkoutSession(
  draft: {
    templateId: string | null
    templateNameSnapshot: string | null
    name: string
    notes: string | null
  },
): Promise<WorkoutSession> {
  const now = nowIso()
  const next: WorkoutSession = {
    id: newId(),
    templateId: draft.templateId,
    templateNameSnapshot: draft.templateNameSnapshot,
    name: draft.name.trim(),
    startedAt: now,
    endedAt: null,
    durationSeconds: null,
    notes: draft.notes?.trim() ?? null,
    active: true,
    createdAt: now,
    updatedAt: now,
  }
  await workoutSessionsRepo.put(next)
  return next
}

export async function updateSessionNotes(
  id: string,
  notes: string | null,
): Promise<WorkoutSession | undefined> {
  const existing = await workoutSessionsRepo.get(id)
  if (!existing) return undefined
  const next: WorkoutSession = {
    ...existing,
    notes: notes?.trim() ?? null,
    updatedAt: nowIso(),
  }
  await workoutSessionsRepo.put(next)
  return next
}

export async function cancelWorkoutSession(id: string, explicitDurationSeconds?: number | null): Promise<WorkoutSession | undefined> {
  const existing = await workoutSessionsRepo.get(id)
  if (!existing) return undefined
  const now = nowIso()
  const endedAt = now
  const durationSeconds =
    explicitDurationSeconds != null
      ? Math.max(0, Math.round(Number(explicitDurationSeconds)))
      : Math.max(0, Math.round((new Date(now).getTime() - new Date(existing.startedAt).getTime()) / 1000))
  const next: WorkoutSession = {
    ...existing,
    endedAt,
    durationSeconds,
    active: false,
    updatedAt: now,
  }
  await workoutSessionsRepo.put(next)
  return next
}

export async function finishWorkoutSession(id: string, explicitDurationSeconds?: number | null): Promise<CompletedWorkout | undefined> {
  const session = await workoutSessionsRepo.get(id)
  if (!session) return undefined

  const now = nowIso()
  const endedAt = now
  const durationSeconds =
    explicitDurationSeconds != null
      ? Math.max(0, Math.round(Number(explicitDurationSeconds)))
      : Math.max(0, Math.round((new Date(now).getTime() - new Date(session.startedAt).getTime()) / 1000))

  const sessionExerciseRecords = await workoutSessionExercisesRepo.getAllByIndex('sessionId', id)
  if (sessionExerciseRecords.length === 0) {
    await cancelWorkoutSession(id, durationSeconds)
    return undefined
  }

  let sessionExercises = sessionExerciseRecords
  const completedExerciseIds: string[] = []

  await workoutSessionsRepo.put({
    ...session,
    endedAt,
    durationSeconds,
    active: false,
    updatedAt: now,
  })

  const completedSets: CompletedWorkoutSet[] = []

  for (const se of sessionExercises) {
    const completedExercise: CompletedWorkoutExercise = {
      id: newId(),
      sessionId: id,
      exerciseId: se.exerciseId,
      exerciseNameSnapshot: se.exerciseNameSnapshot,
      exerciseEquipmentSnapshot: se.exerciseEquipmentSnapshot,
      exerciseEquipmentOptionsSnapshot: se.exerciseEquipmentOptionsSnapshot,
      builtInSnapshot: se.builtInSnapshot,
      order: se.order,
      notes: se.notes,
      createdAt: se.createdAt,
      updatedAt: now,
    }
    await completedWorkoutExercisesRepo.put(completedExercise)
    completedExerciseIds.push(completedExercise.id)

    const sessionSets = await workoutSessionSetsRepo.getAllByIndex('workoutExerciseId', se.id)
    for (const set of sessionSets) {
      if (!set.completed) continue
      const completedSet: CompletedWorkoutSet = {
        id: set.id,
        workoutExerciseId: se.id,
        setNumber: set.setNumber,
        weight: set.weight,
        weightUnit: set.weightUnit,
        reps: set.reps,
        completed: set.completed,
        rpe: set.rpe,
        restSeconds: set.restSeconds,
        notes: set.notes,
        createdAt: set.createdAt,
        updatedAt: set.updatedAt,
        workoutSessionId: id,
        exerciseNameSnapshot: se.exerciseNameSnapshot,
        completedAt: now,
      }
      await completedWorkoutSetsRepo.put(completedSet)
      completedSets.push(completedSet)
    }
  }

  const completedAtLocal = new Date().toISOString().slice(0, 10)

  const completedWorkout: CompletedWorkout = {
    id: newId(),
    templateId: session.templateId,
    templateNameSnapshot: session.templateNameSnapshot,
    name: session.name,
    startedAt: session.startedAt,
    completedAt: endedAt,
    durationSeconds,
    notes: session.notes,
    workoutSessionId: id,
    exerciseIds: completedExerciseIds,
    createdAt: now,
    updatedAt: now,
    completedAtLocal,
  }

  // Archive session exercises + sets into the completed-workout stores so
  // they survive the session-store clear at the end of this function.
  // (The session exercises/sets are already written above; this keeps the
  // completed-workout stores in sync with the session snapshot.)
  await completedWorkoutExercisesRepo.clear()
  await completedWorkoutSetsRepo.clear()

  await completedWorkoutsRepo.put(completedWorkout)

  await workoutSessionExercisesRepo.clear()
  await workoutSessionSetsRepo.clear()

  return completedWorkout
}

export async function addSessionExercise(
  sessionId: string,
  exerciseId: string,
  exerciseNameSnapshot: string,
  exerciseEquipmentSnapshot: string | null,
  exerciseEquipmentOptionsSnapshot: string[],
  builtInSnapshot: boolean,
  order: number,
  notes: string | null,
): Promise<WorkoutSessionExercise> {
  const now = nowIso()
  const next: WorkoutSessionExercise = {
    id: newId(),
    sessionId,
    exerciseId,
    order,
    exerciseNameSnapshot,
    exerciseEquipmentSnapshot: exerciseEquipmentSnapshot?.trim() ?? null,
    exerciseEquipmentOptionsSnapshot: exerciseEquipmentOptionsSnapshot instanceof Array ? exerciseEquipmentOptionsSnapshot : [],
    builtInSnapshot,
    notes: notes?.trim() ?? null,
    createdAt: now,
    updatedAt: now,
  }
  await workoutSessionExercisesRepo.put(next)
  return next
}

export async function removeSessionExercise(id: string): Promise<boolean> {
  const existing = await workoutSessionExercisesRepo.get(id)
  if (!existing) return false
  const sets = await workoutSessionSetsRepo.getAllByIndex('workoutExerciseId', id)
  for (const set of sets) {
    await workoutSessionSetsRepo.remove(set.id)
  }
  await workoutSessionExercisesRepo.remove(id)
  return true
}

export async function reorderSessionExercises(sessionId: string, orderedIds: string[]): Promise<void> {
  const exercises = await workoutSessionExercisesRepo.getAllByIndex('sessionId', sessionId)
  const byId = new Map(exercises.map((ex) => [ex.id, ex]))
  for (let index = 0; index < orderedIds.length; index += 1) {
    const existing = byId.get(orderedIds[index])
    if (!existing) continue
    const next: WorkoutSessionExercise = {
      ...existing,
      order: index,
      updatedAt: nowIso(),
    }
    await workoutSessionExercisesRepo.put(next)
  }
}

export async function listSessionExercises(sessionId: string): Promise<
  (WorkoutSessionExercise & { exercise?: Exercise })[]
> {
  const rows = await workoutSessionExercisesRepo.getAllByIndex('sessionId', sessionId)
  const exerciseRecords = await exercisesRepo.getAll()
  const exerciseById = new Map(exerciseRecords.map((ex) => [ex.id, ex]))
  return rows
    .sort((a, b) => a.order - b.order)
    .map((row) => ({
      ...row,
      exercise: exerciseById.get(row.exerciseId) ?? undefined,
    }))
}

export async function upsertSessionSet(
  workoutExerciseId: string,
  patch: {
    setNumber: number
    weight: number | null
    weightUnit: string
    reps: number | null
    completed: boolean
    rpe?: number | null
    restSeconds?: number | null
    notes?: string | null
  },
): Promise<WorkoutSessionSet> {
  const existing = await workoutSessionSetsRepo.getAllByIndex('workoutExerciseId', workoutExerciseId)
  const candidate = existing.find((set) => set.setNumber === patch.setNumber)
  const now = nowIso()
  const next: WorkoutSessionSet = {
    id: candidate?.id ?? newId(),
    workoutExerciseId,
    setNumber: patch.setNumber,
    weight: patch.weight,
    weightUnit: patch.weightUnit,
    reps: patch.reps,
    completed: patch.completed,
    rpe: patch.rpe ?? null,
    restSeconds: patch.restSeconds ?? null,
    notes: patch.notes?.trim() ?? null,
    createdAt: candidate?.createdAt ?? now,
    updatedAt: now,
  }
  await workoutSessionSetsRepo.put(next)
  return next
}

export async function removeSessionSet(id: string): Promise<boolean> {
  const existing = await workoutSessionSetsRepo.get(id)
  if (!existing) return false
  await workoutSessionSetsRepo.remove(id)
  return true
}

export async function listSessionSets(workoutExerciseId: string): Promise<WorkoutSessionSet[]> {
  const rows = await workoutSessionSetsRepo.getAllByIndex('workoutExerciseId', workoutExerciseId)
  return rows.sort((a, b) => a.setNumber - b.setNumber)
}/* ------------------------------------------------------------------ */
/* Completed workout history                                           */
/* ------------------------------------------------------------------ */
export async function listCompletedWorkouts(): Promise<CompletedWorkout[]> {
  return completedWorkoutsRepo.getAllByIndex('completedAtLocal')
}

export async function listCompletedWorkoutsBetween(
  from: ISODate,
  to: ISODate,
): Promise<CompletedWorkout[]> {
  return completedWorkoutsRepo.getAllByIndex(
    'completedAtLocal',
    IDBKeyRange.bound(from, to),
  )
}

export async function getCompletedWorkout(id: string): Promise<CompletedWorkout | undefined> {
  return completedWorkoutsRepo.get(id)
}

export async function getCompletedWorkoutExercises(sessionId: string): Promise<CompletedWorkoutExercise[]> {
  return completedWorkoutExercisesRepo.getAllByIndex('sessionId', sessionId)
}

export async function getCompletedWorkoutSets(workoutExerciseId: string): Promise<CompletedWorkoutSet[]> {
  return completedWorkoutSetsRepo.getAllByIndex('workoutExerciseId', workoutExerciseId)
}

export async function deleteCompletedWorkout(id: string): Promise<boolean> {
  const existing = await completedWorkoutsRepo.get(id)
  if (!existing) return false
  const exercises = await completedWorkoutExercisesRepo.getAllByIndex('sessionId', existing.workoutSessionId)
  for (const exercise of exercises) {
    const sets = await completedWorkoutSetsRepo.getAllByIndex('workoutExerciseId', exercise.id)
    for (const set of sets) {
      await completedWorkoutSetsRepo.remove(set.id)
    }
    await completedWorkoutExercisesRepo.remove(exercise.id)
  }
  await completedWorkoutsRepo.remove(id)
  return true
}

/* ------------------------------------------------------------------ */
/* Previous performance                                                */
/* ------------------------------------------------------------------ */

export async function previousSessionForExerciseFromSessions(exerciseId: string): Promise<{
  exerciseNameSnapshot: string
  sets: { weight: number; reps: number | null; repsDisplay: string }[]
} | null> {
  const workouts = await listCompletedWorkouts()
  for (const workout of workouts) {
    const exerciseRecords = await getCompletedWorkoutExercises(workout.workoutSessionId)
    const exerciseRecord = exerciseRecords.find((record) => record.exerciseId === exerciseId)
    if (!exerciseRecord) continue
    const exerciseNameSnapshot = exerciseRecord.exerciseNameSnapshot
    const sets = await getCompletedWorkoutSets(exerciseRecord.id)
    const completedSets = sets
      .filter((set) => set.completed && set.weight != null && set.reps != null)
      .sort((a, b) => a.setNumber - b.setNumber)
    if (completedSets.length === 0) continue
    return {
      exerciseNameSnapshot,
      sets: completedSets.map((set) => ({
        weight: set.weight!,
        reps: set.reps,
        repsDisplay: formatReps(set.reps),
      })),
    }
  }
  return null
}

/* ------------------------------------------------------------------ */
/* PR                                                                  */
/* ------------------------------------------------------------------ */

export async function computeExercisePRFromSessions(exerciseId: string): Promise<ExercisePR | null> {
  const workouts = await listCompletedWorkouts()
  let bestWeight: number | null = null
  let bestRepsAtWeight: number | null = null
  let bestVolume: number | null = null
  let estimated1RM: number | null = null
  let lastSessionDate: string | null = null
  let lastSets: { weight: number; reps: number | null; repsDisplay: string }[] = []

  for (const workout of workouts) {
    const exerciseRecords = await getCompletedWorkoutExercises(workout.workoutSessionId)
    const exerciseRecord = exerciseRecords.find((record) => record.exerciseId === exerciseId)
    if (!exerciseRecord) continue

    const sets = await getCompletedWorkoutSets(exerciseRecord.id)
    const completedSets = sets
      .filter((set) => set.completed && set.weight != null && set.reps != null)
      .sort((a, b) => a.setNumber - b.setNumber)

    if (completedSets.length > 0 && lastSessionDate == null) {
      lastSessionDate = workout.completedAtLocal
      lastSets = completedSets.map((set) => ({
        weight: set.weight!,
        reps: set.reps,
        repsDisplay: formatReps(set.reps),
      }))
    }

    for (const set of completedSets) {
      const weight = set.weight!
      const reps = set.reps!
      if (bestWeight == null || weight > bestWeight) {
        bestWeight = weight
        bestRepsAtWeight = reps
      }
      const volume = weight * reps
      if (bestVolume == null || volume > bestVolume) {
        bestVolume = volume
        if (Number.isFinite(weight) && Number.isFinite(reps)) {
          estimated1RM = estimated1RMFn(weight, reps)
        }
      }
    }
  }

  if (bestWeight == null && bestVolume == null) {
    return null
  }

  return {
    bestWeight,
    bestRepsAtWeight,
    bestVolume,
    estimated1RM,
    lastSessionDate,
    lastSets,
  }
}

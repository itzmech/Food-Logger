import type { ID, ISODate, ISODateTime, Timestamped } from './common'

export type WorkoutStatus = 'planned' | 'in-progress' | 'completed' | 'skipped'
export type WorkoutType = 'strength' | 'cardio' | 'mobility' | 'rest' | 'other'

export interface WorkoutExerciseEntry {
  exerciseId: ID
  name: string
  targetSets: number | null
  targetReps: string | null
  note: string | null
}

export interface Workout extends Timestamped {
  id: ID
  date: ISODate
  name: string
  type: WorkoutType
  status: WorkoutStatus
  startedAt: ISODateTime | null
  completedAt: ISODateTime | null
  durationMinutes: number | null
  notes: string | null
  exercises: WorkoutExerciseEntry[]
}

export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core'
  | 'full-body'
  | 'other'

export const EXERCISE_CATEGORY_LABELS = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
  'full-body': 'Full Body',
  other: 'Other',
} as const satisfies Record<ExerciseCategory, string>

export interface Exercise extends Timestamped {
  id: ID
  name: string
  category: ExerciseCategory
  equipment: string
  equipmentOptions: string[]
  defaultEquipment: string
  builtIn: boolean
  notes: string | null
}

export interface WorkoutTemplateExercise {
  id: ID
  templateId: ID
  exerciseId: ID
  order: number
  targetSets: number
  targetReps: string
  defaultWeight: number | null
  restSeconds: number
  notes: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface WorkoutTemplate extends Timestamped {
  id: ID
  name: string
  notes: string | null
}

export interface WorkoutSessionExercise {
  id: ID
  sessionId: ID
  exerciseId: ID
  order: number
  exerciseNameSnapshot: string
  exerciseEquipmentSnapshot: string | null
  exerciseEquipmentOptionsSnapshot: string[]
  builtInSnapshot: boolean
  notes: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface WorkoutSessionSet {
  id: ID
  workoutExerciseId: ID
  setNumber: number
  weight: number | null
  weightUnit: string
  reps: number | null
  completed: boolean
  rpe: number | null
  restSeconds: number | null
  notes: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface WorkoutSession extends Timestamped {
  id: ID
  templateId: ID | null
  templateNameSnapshot: string | null
  name: string
  startedAt: ISODateTime
  endedAt: ISODateTime | null
  durationSeconds: number | null
  notes: string | null
  active: boolean
}

export interface CompletedWorkoutSet {
  id: ID
  workoutExerciseId: ID
  setNumber: number
  weight: number | null
  weightUnit: string
  reps: number | null
  completed: boolean
  rpe: number | null
  restSeconds: number | null
  notes: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
  workoutSessionId: ID
  exerciseNameSnapshot: string
  completedAt: ISODateTime
}

export interface CompletedWorkoutExercise {
  id: ID
  sessionId: ID
  exerciseId: ID
  exerciseNameSnapshot: string
  exerciseEquipmentSnapshot: string | null
  exerciseEquipmentOptionsSnapshot: string[]
  builtInSnapshot: boolean
  order: number
  notes: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface CompletedWorkout extends Timestamped {
  id: ID
  templateId: ID | null
  templateNameSnapshot: string | null
  name: string
  startedAt: ISODateTime
  completedAt: ISODateTime | null
  durationSeconds: number | null
  notes: string | null
  workoutSessionId: ID
  exerciseIds: ID[]
  completedAtLocal: ISODate
}

export function estimated1RM(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps)) return NaN
  if (weightKg <= 0 || reps <= 0) return NaN
  return weightKg * (1 + reps / 30)
}

export function formatReps(reps: number | null): string {
  if (reps == null) return '—'
  if (reps === Math.floor(reps)) return String(reps)
  return reps.toFixed(1)
}

export function volumeForSet(weight: number | null, reps: number | null): number {
  if (weight == null || reps == null) return 0
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return 0
  return weight * reps
}

export interface ExercisePR {
  bestWeight: number | null
  bestRepsAtWeight: number | null
  bestVolume: number | null
  estimated1RM: number | null
  lastSessionDate: ISODate | null
  lastSets: { weight: number; reps: number | null; repsDisplay: string; id?: string }[]
}

/**
 * New daily strength log model.
 *
 * One record per exercise, per local calendar day. Sets are stored inline so
 * the UI can render a day's log and compute bests without joining to a
 * separate set store. Each set write is an immediate IndexedDB upsert.
 *
 * This is additive: the existing session/completed-workout stores are left
 * intact for compatibility; the new path does not depend on them.
 */

/**
 * Whether a daily strength log represents an actually-performed, counted
 * workout on its date.
 *
 * A date counts as a workout day only when at least one non-skipped log has
 * at least one valid (weight + reps, setNumber > 0) set. Skipped exercises
 * and empty placeholder cards must not inflate workout frequency.
 */
export function isCountedWorkoutDay(log: DailyStrengthLog): boolean {
  if (log.skipped) return false
  return log.sets.some(
    (s) => s.setNumber > 0 && s.weight != null && s.reps != null && Number.isFinite(s.weight) && Number.isFinite(s.reps),
  )
}

/**
 * New daily strength log model.
 *
 * One record per exercise, per local calendar day. Sets are stored inline so
 * the UI can render a day's log and compute bests without joining to a
 * separate set store. Each set write is an immediate IndexedDB upsert.
 *
 * This is additive: the existing session/completed-workout stores are left
 * intact for compatibility; the new path does not depend on them.
 */
export interface StrengthSet {
  id: string
  setNumber: number
  weight: number | null
  reps: number | null
  rpe: number | null
  notes: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface DailyStrengthLog {
  id: string
  exerciseId: string
  exerciseNameSnapshot: string
  exerciseEquipmentSnapshot: string | null
  exerciseEquipmentOptionsSnapshot: string[]
  builtInSnapshot: boolean
  date: ISODate
  order: number
  notes: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
  skipped: boolean
  sets: StrengthSet[]
}

export interface DayPlan {
  id: string
  date: ISODate
  dayOfWeek: number
  name: string
  notes: string | null
  exercises: DayPlanExercise[]
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface DayPlanExercise {
  id: string
  planId: string
  exerciseId: string
  exerciseNameSnapshot: string
  exerciseEquipmentSnapshot: string | null
  exerciseEquipmentOptionsSnapshot: string[]
  builtInSnapshot: boolean
  order: number
  notes: string | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export function bestTodayForLog(log: DailyStrengthLog): {
  bestWeight: number | null
  bestRepsAtWeight: number | null
  bestVolume: number | null
  estimated1RM: number | null
  sets: { weight: number; reps: number | null; repsDisplay: string; id: string }[]
} | null {
  const completed = log.sets.filter((s) => s.weight != null && s.reps != null && s.setNumber > 0)
  if (completed.length === 0) return null

  let bestWeight: number | null = null
  let bestRepsAtWeight: number | null = null
  let bestVolume: number | null = null
  let est1RM: number | null = null

  for (const s of completed) {
    const w = s.weight!
    const r = s.reps!
    if (bestWeight == null || w > bestWeight) {
      bestWeight = w
      bestRepsAtWeight = r
    }
    const volume = w * r
    if (bestVolume == null || volume > bestVolume) {
      bestVolume = volume
      if (Number.isFinite(w) && Number.isFinite(r)) {
        est1RM = estimated1RM(w, r)
      }
    }
  }

  return {
    bestWeight,
    bestRepsAtWeight,
    bestVolume,
    estimated1RM: est1RM,
    sets: completed
      .sort((a, b) => a.setNumber - b.setNumber)
      .map((s) => ({
        weight: s.weight!,
        reps: s.reps,
        repsDisplay: formatReps(s.reps),
        id: s.id,
      })),
  }
}

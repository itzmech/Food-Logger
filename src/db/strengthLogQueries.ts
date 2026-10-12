import { newId, nowIso } from '@/utils/id'
import {
  dailyStrengthLogsRepo,
  dayPlansRepo,
} from './repositories'

// IDBKeyRange is a browser global (DOM lib is in tsconfig.app.json).
import type { DailyStrengthLog, DayPlan, StrengthSet, ExercisePR } from '@/types'
import type { ISODate } from '@/utils/date'
import { formatReps, estimated1RM as estimated1RMFn } from '@/types'
import {
  emitActivityChanged,
  type ActivityChangeReason,
} from '@/lib/activityEvents'
/* ------------------------------------------------------------------ */
/* Per-day exercise log CRUD                                           */
/* ------------------------------------------------------------------ */

/** Returns the single daily log for an exercise on a local day, or undefined. */
export async function getDailyStrengthLog(
  date: ISODate,
  exerciseId: string,
): Promise<DailyStrengthLog | undefined> {
  const rows = await dailyStrengthLogsRepo.getAllByIndex('date+exerciseId', [date, exerciseId])
  return rows[0]
}

/** All logged exercises for one local day, in logged order. */
export async function getStrengthLogsForDate(date: ISODate): Promise<DailyStrengthLog[]> {
  const rows = await dailyStrengthLogsRepo.getAllByIndex('date', date)
  return rows.sort((a, b) => a.order - b.order)
}

/** All logs for an exercise across a local-date range, newest first. */
export async function getStrengthLogsBetween(
  exerciseId: string,
  from: ISODate,
  to: ISODate,
): Promise<DailyStrengthLog[]> {
  const all = await dailyStrengthLogsRepo.getAllByIndex('exerciseId', exerciseId)
  return all
    .filter((log) => log.date >= from && log.date <= to && log.exerciseId === exerciseId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** All logged days for an exercise (date keys), newest first. */
export async function listExerciseLogsForExercise(exerciseId: string): Promise<ISODate[]> {
  const rows = await dailyStrengthLogsRepo.getAllByIndex('exerciseId', exerciseId)
  const seen = new Set<ISODate>()
  const dates: ISODate[] = []
  for (const row of rows) {
    if (seen.has(row.date)) continue
    seen.add(row.date)
    dates.push(row.date)
  }
  return dates.sort((a, b) => b.localeCompare(a))
}

/** All daily strength logs whose `date` falls in [from, to]. */
export async function getStrengthLogsForRange(
  from: ISODate,
  to: ISODate,
): Promise<DailyStrengthLog[]> {
  return dailyStrengthLogsRepo.getAllByIndex(
    'date',
    IDBKeyRange.bound(from, to),
  )
}

/* ------------------------------------------------------------------ */
/* Set persistence (immediate, per-set)                               */
/* ------------------------------------------------------------------ */

const strengthSetIdentity = (
  logId: string,
  setNumber: number,
): { id: string; candidate: StrengthSet } => {
  const id = `${logId}::set::${setNumber}`
  const candidate: StrengthSet = {
    id,
    setNumber,
    weight: null,
    reps: null,
    rpe: null,
    notes: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  return { id, candidate }
}

/**
 * Persist (or update) one set for an exercise on a local day.
 *
 * The first call for a (date, exerciseId) pair creates the daily log and the
 * requested set. Later calls for the same exercise on the same day upsert the
 * matching set by `setNumber`, leaving existing sets untouched.
 */
export async function saveStrengthSet(
  date: ISODate,
  exerciseId: string,
  exerciseNameSnapshot: string,
  exerciseEquipmentSnapshot: string | null,
  exerciseEquipmentOptionsSnapshot: string[],
  builtInSnapshot: boolean,
  setNumber: number,
  patch: {
    weight?: number | null
    reps?: number | null
    rpe?: number | null
    notes?: string | null
  },
): Promise<DailyStrengthLog> {
  const existing = await getDailyStrengthLog(date, exerciseId)

  let log: DailyStrengthLog
  if (existing) {
    log = existing
  } else {
    const order = await nextOrderForDate(date)
    log = {
      id: newId(),
      exerciseId,
      exerciseNameSnapshot,
      exerciseEquipmentSnapshot: exerciseEquipmentSnapshot?.trim() ?? null,
      exerciseEquipmentOptionsSnapshot:
        exerciseEquipmentOptionsSnapshot instanceof Array
          ? exerciseEquipmentOptionsSnapshot
          : [],
      builtInSnapshot: typeof builtInSnapshot === 'boolean' ? builtInSnapshot : false,
      date,
      order,
      notes: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      skipped: false,
      sets: [],
    }
  }

  const idx = log.sets.findIndex((s) => s.setNumber === setNumber)
  const now = nowIso()
  const set: StrengthSet = {
    id: idx >= 0 ? log.sets[idx].id : strengthSetIdentity(log.id, setNumber).id,
    setNumber,
    weight: patch.weight != null ? patch.weight : idx >= 0 ? log.sets[idx].weight : null,
    reps: patch.reps != null ? patch.reps : idx >= 0 ? log.sets[idx].reps : null,
    rpe: patch.rpe != null ? patch.rpe : idx >= 0 ? log.sets[idx].rpe : null,
    notes:
      patch.notes != null
        ? patch.notes.trim() ?? null
        : idx >= 0
          ? log.sets[idx].notes
          : null,
    createdAt: idx >= 0 ? log.sets[idx].createdAt : now,
    updatedAt: now,
  }

  if (idx >= 0) {
    log.sets[idx] = set
  } else {
    log.sets.push(set)
    log.sets.sort((a, b) => a.setNumber - b.setNumber)
  }

  log.updatedAt = now
  await dailyStrengthLogsRepo.put(log)
  void emitActivityChanged('strength-set-saved' as ActivityChangeReason)
  return log
}

/** Highest setNumber in use for a given local day, across all exercises. */
async function nextOrderForDate(date: ISODate): Promise<number> {
  const rows = await dailyStrengthLogsRepo.getAllByIndex('date', date)
  let max = 0
  for (const row of rows) {
    if (row.order > max) max = row.order
  }
  return max + 1
}

/**
 * Add an exercise to today's log as a fresh exercise entry with one empty
 * placeholder set so the exercise shows up in the day's list immediately.
 *
 * This is the “Add exercise” path entry point. Sets are added separately via
 * `saveStrengthSet`.
 */
export async function saveDailyLogExercise(
  date: ISODate,
  exerciseId: string,
  exerciseNameSnapshot: string,
  exerciseEquipmentSnapshot: string | null,
  exerciseEquipmentOptionsSnapshot: string[],
  builtInSnapshot: boolean,
  notes: string | null,
): Promise<DailyStrengthLog> {
  const existing = await getDailyStrengthLog(date, exerciseId)
  if (existing) return existing

  const order = await nextOrderForDate(date)
  const log: DailyStrengthLog = {
    id: newId(),
    exerciseId,
    exerciseNameSnapshot,
    exerciseEquipmentSnapshot: exerciseEquipmentSnapshot?.trim() ?? null,
    exerciseEquipmentOptionsSnapshot:
      exerciseEquipmentOptionsSnapshot instanceof Array
        ? exerciseEquipmentOptionsSnapshot
        : [],
    builtInSnapshot: typeof builtInSnapshot === 'boolean' ? builtInSnapshot : false,
    date,
    order,
    notes: notes?.trim() ?? null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    skipped: false,
    sets: [],
  }
  await dailyStrengthLogsRepo.put(log)
  void emitActivityChanged('strength-exercise-added' as ActivityChangeReason)
  return log
}

/** Remove an exercise + all its sets for a local day. */
export async function deleteDailyLogExercise(date: ISODate, exerciseId: string): Promise<boolean> {
  const log = await getDailyStrengthLog(date, exerciseId)
  if (!log) return false
  await dailyStrengthLogsRepo.remove(log.id)
  void emitActivityChanged('strength-exercise-removed' as ActivityChangeReason)
  return true
}

/** Toggle the skipped status of one exercise on a local day. */
export async function setDailyLogSkipped(
  date: ISODate,
  exerciseId: string,
  skipped: boolean,
): Promise<DailyStrengthLog | null> {
  const log = await getDailyStrengthLog(date, exerciseId)
  if (!log) return null
  log.skipped = skipped
  log.updatedAt = nowIso()
  await dailyStrengthLogsRepo.put(log)
  void emitActivityChanged(
    skipped ? ('strength-exercise-skipped' as ActivityChangeReason) : ('strength-exercise-unskipped' as ActivityChangeReason),
  )
  return log
}

/** Get or create the weekly plan for a local date. */
export async function getDayPlanForDate(date: ISODate): Promise<DayPlan | null> {
  const rows = await dayPlansRepo.getAllByIndex('date', date)
  return rows[0] ?? null
}

/** Get or create the weekly plan for a day-of-week (0=Sun..6=Sat). */
export async function getDayPlanForDayOfWeek(dayOfWeek: number): Promise<DayPlan | null> {
  const rows = await dayPlansRepo.getAllByIndex('dayOfWeek', dayOfWeek)
  return rows[0] ?? null
}

/** Save (upsert) the weekly plan for a local date. */
export async function saveDayPlan(plan: DayPlan): Promise<DayPlan> {
  const existing = await getDayPlanForDate(plan.date)
  const now = nowIso()
  const next: DayPlan = {
    ...plan,
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
  }
  await dayPlansRepo.put(next)
  void emitActivityChanged('day-plan-saved' as ActivityChangeReason)
  return next
}

/** Remove a day plan by id. */
export async function deleteDayPlan(id: string): Promise<boolean> {
  const existing = await dayPlansRepo.get(id)
  if (!existing) return false
  await dayPlansRepo.remove(id)
  return true
}

/** Most recently logged exercise ids (by most recent log date), limited.
 *
 * Used by the add-exercise picker to show “recent” exercises.
 */
export async function recentExerciseIds(limit = 12): Promise<
  { exerciseId: string; exerciseNameSnapshot: string; date: ISODate }[]
> {
  const rows = await dailyStrengthLogsRepo.getAllByIndex('date', IDBKeyRange.bound('1970-01-01', '9999-12-31'))
  const byExercise = new Map<string, ISODate>()
  const nameByExercise = new Map<string, string>()
  for (const row of rows) {
    const prev = byExercise.get(row.exerciseId)
    if (prev == null || row.date > prev) {
      byExercise.set(row.exerciseId, row.date)
      nameByExercise.set(row.exerciseId, row.exerciseNameSnapshot)
    }
  }
  const sorted = [...byExercise.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .slice(0, limit)
  return sorted.map(([exerciseId, date]) => ({
    exerciseId,
    exerciseNameSnapshot: nameByExercise.get(exerciseId) ?? '',
    date,
  }))
}

/* ------------------------------------------------------------------ */
/* History / previous performance (new log-first path)                */
/* ------------------------------------------------------------------ */

/**
 * Most recent prior logged session for an exercise (any day before `asOf`),
 * reading from the new daily strength log when available.
 */
export async function previousSessionForExercise(
  exerciseId: string,
  asOf: ISODate = todayLocal(),
): Promise<{
  exerciseNameSnapshot: string
  sets: { weight: number; reps: number | null; repsDisplay: string; id?: string }[]
} | null> {
  const logs = await getStrengthLogsBetween(exerciseId, '1970-01-01', asOf)
  // Exclude today when asking for "previous" so today's in-progress sets don't count.
  const prior = logs.filter((log) => log.date < asOf)
  for (const log of prior) {
    const completed = log.sets.filter(
      (s) => s.weight != null && s.reps != null && s.setNumber > 0,
    )
    if (completed.length === 0) continue
    return {
      exerciseNameSnapshot: log.exerciseNameSnapshot,
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
  return null
}

/** Personal bests across all logged sets for an exercise. */
export async function computeExercisePR(exerciseId: string): Promise<ExercisePR | null> {
  const logs = await getStrengthLogsBetween(exerciseId, '1970-01-01', '9999-12-31')
  let bestWeight: number | null = null
  let bestRepsAtWeight: number | null = null
  let bestVolume: number | null = null
  let estimated1RM: number | null = null
  let lastSessionDate: ISODate | null = null
  let lastSets: { weight: number; reps: number | null; repsDisplay: string }[] = []

  for (const log of logs) {
    const completed = log.sets.filter(
      (s) => s.weight != null && s.reps != null && s.setNumber > 0,
    )
    if (completed.length > 0 && lastSessionDate == null) {
      lastSessionDate = log.date
      lastSets = completed
        .sort((a, b) => a.setNumber - b.setNumber)
        .map((s) => ({
          weight: s.weight!,
          reps: s.reps,
          repsDisplay: formatReps(s.reps),
        }))
    }

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
          estimated1RM = estimated1RMFn(w, r)
        }
      }
    }
  }

  if (bestWeight == null && bestVolume == null) return null

  return {
    bestWeight,
    bestRepsAtWeight,
    bestVolume,
    estimated1RM,
    lastSessionDate,
    lastSets,
  }
}

/* ------------------------------------------------------------------ */
/* Compatibility read path
 *
 * When history/analytics still read from the old completed-workout stores,
 * keep the old `previousSessionForExercise` / `computeExercisePR` in
 * workoutQueries.ts as a fallback. This file owns the new path only.
 * ------------------------------------------------------------------ */

function todayLocal(): ISODate {
  return new Date().toISOString().slice(0, 10)
}

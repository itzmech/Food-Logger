/**
 * Derived history layer.
 *
 * A QUERY layer, not a second database. Every value comes from real existing
 * records (FoodLog, completed workouts, CardioSession, BodyMeasurement) via
 * the existing repositories. Zero/null values in a summary are legitimate
 * when there is simply no data for that day — we never invent records.
 *
 * Timezone discipline:
 *   - Every "day" is a local `YYYY-MM-DD` key (ISODate).
 *   - All stores index on those local keys, so a record logged at 23:30 local
 *     time stays on its local calendar day — it never shifts because of UTC.
 *   - `getDailyHistory(date)` answers "what happened on this local day".
 */

import type {
  BodyMeasurement,
  CardioSession,
  CompletedWorkout,
  DailyStrengthLog,
  FoodLog,
  MealType,
} from '@/types'
import { isCountedWorkoutDay } from '@/types'
import { estimated1RM as estimated1RMFn, formatReps } from '@/types'
import type { ISODate } from '@/utils/date'
import {
  addDays,
  daysOfMonth,
  eachDay,
} from '@/utils/date'
import { sumEstimatedCalories } from './activityEstimate'
import {
  getCardioBetween,
  getDayPlanForDate,
  getFoodLogsBetween,
  getMeasurementsBetween,
  listCompletedWorkoutsBetween,
  getStrengthLogsForDate,
} from '@/db'
import { dayPlansRepo } from '@/db/repositories'
import type { DayPlan } from '@/types'

// ---------------------------------------------------------------------------
// Date helpers (local calendar discipline)
// ---------------------------------------------------------------------------

// NOTE: monthLabel / addMonths / subMonths are defined in @/utils/date.
// Import them there to avoid duplicate definitions across the codebase.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Which activity signals a day shows on the calendar. */
export type DaySignal =
  | 'food'
  | 'workout'
  | 'cardio'
  | 'weight'
  | 'other-measurement'
  | 'planned'

/** One calendar day's aggregated real data. */
export interface DailyHistorySummary {
  /** Local day key. */
  date: ISODate
  // Food (from FoodLog snapshot nutrition)
  caloriesConsumed: number
  proteinConsumed: number
  carbsConsumed: number | null
  fatConsumed: number | null
  foodEntryCount: number
  mealsWithLogs: MealType[]
  // Workout (completed only)
  completedWorkoutCount: number
  workoutName: string | null
  workoutDurationMinutes: number | null
  // Cardio
  cardioSessionCount: number
  cardioMinutes: number
  cardioActivities: CardioSession['type'][]
  estimatedActivityCalories: number | null
  // Weight / measurements
  weight: number | null
  hasWeightRecord: boolean
  measurements: BodyMeasurement[]
  // Strength log (daily strength sets, new model)
  strengthLogExerciseCount: number
  strengthLogSetCount: number
  strengthLogs: DailyStrengthLogSummary[]
  hasStrengthLog: boolean
  /** True when the day has at least one non-skipped strength log with a valid set. */
  strengthHasWorkout: boolean
  /** True when the day has a planned (not yet performed) day plan with no performed activity. */
  hasPlannedOnly: boolean
  // Convenience flags
  hasActivity: boolean
  hasFood: boolean
  hasWorkout: boolean
}

/** One logged exercise (one day) summarised for daily history cards. */
export interface DailyStrengthLogSummary {
  exerciseId: string
  exerciseNameSnapshot: string
  exerciseEquipmentSnapshot: string | null
  exerciseEquipmentOptionsSnapshot: string[]
  builtInSnapshot: boolean
  order: number
  setCount: number
  completedSetCount: number
  totalVolume: number
  bestWeight: number | null
  bestRepsAtWeight: number | null
  bestVolume: number | null
  estimated1RM: number | null
  sets: { weight: number | null; reps: number | null; repsDisplay: string; setNumber: number }[]
  skipped: boolean
}

/** A month-key → per-day summaries, plus the month label. */
export interface MonthHistory {
  monthKey: string
  label: string
  days: DailyHistorySummary[]
  /** Days that have at least one signal. */
  activeDays: ISODate[]
  signalsByDay: Record<ISODate, DaySignal[]>
}

/** A week (7 local days) with aggregated totals. */
export interface WeekHistory {
  from: ISODate
  to: ISODate
  days: DailyHistorySummary[]
  /** Days with at least one food log. */
  foodDays: ISODate[]
  /** Completed workouts in the week. */
  workoutCount: number
  /** Cardio sessions in the week. */
  cardioSessionCount: number
  /** Total cardio minutes in the week. */
  cardioMinutes: number
  /** Weight records in the week. */
  weightRecordCount: number
  /** Average calories across days that had food logs (null if none). */
  avgCaloriesOnLoggedDays: number | null
  /** Average protein across days that had food logs (null if none). */
  avgProteinOnLoggedDays: number | null
}

// ---------------------------------------------------------------------------
// Per-day aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregates everything that happened on one local day.
 *
 * Food nutrition comes from the FoodLog snapshot stored at log time — never
 * re-derived from the current Food DB. This keeps historical integrity intact
 * when foods are later edited or deleted.
 */
export async function getDailyHistory(date: ISODate): Promise<DailyHistorySummary> {
  const [foodLogs, cardio, completedWorkouts, measurements] = await Promise.all([
    getFoodLogsForDate(date),
    getCardioForDate(date),
    listCompletedWorkoutsForDate(date),
    getMeasurementsForDate(date),
  ])

  // --- Food ---
  let calories = 0
  let protein = 0
  let carbs: number | null = null
  let fat: number | null = null
  const mealsWithLogs: MealType[] = []
  const seenMeals = new Set<MealType>()

  for (const log of foodLogs) {
    calories += Number.isFinite(log.calories) ? log.calories : 0
    protein += Number.isFinite(log.protein) ? log.protein : 0
    if (log.carbs != null && Number.isFinite(log.carbs)) {
      carbs = carbs == null ? log.carbs : carbs + log.carbs
    }
    if (log.fat != null && Number.isFinite(log.fat)) {
      fat = fat == null ? log.fat : fat + log.fat
    }
    if (!seenMeals.has(log.meal)) {
      seenMeals.add(log.meal)
      mealsWithLogs.push(log.meal)
    }
  }

  // Sort meals in a stable, readable order.
  mealsWithLogs.sort(byMealOrder)

  // --- Cardio ---
  const cardioMinutes = cardio.reduce(
    (total, s) => total + (Number.isFinite(s.durationMinutes) ? s.durationMinutes : 0),
    0,
  )
  const cardioActivities = cardio.map((s) => s.type)
  const weightForEstimate = measurements.find((m) => m.type === 'weight')?.value ?? null
  const estimateTotals = sumEstimatedCalories(cardio, weightForEstimate)

  // --- Workout (completed only) ---
  const workoutsToday = completedWorkouts.filter(
    (w) => w.completedAtLocal === date,
  )
  const completedWorkoutCount = workoutsToday.length
  const primaryWorkout = workoutsToday.sort((a, b) =>
    a.completedAtLocal.localeCompare(b.completedAtLocal),
  )[0]
  const workoutName =
    primaryWorkout?.name ??
    primaryWorkout?.templateNameSnapshot ??
    null
  const workoutDurationMinutes = primaryWorkout?.durationSeconds != null
    ? Math.round(primaryWorkout.durationSeconds / 60)
    : null

  // --- Weight / measurements ---
  const weightRecord = measurements.find((m) => m.type === 'weight')
  const weight = weightRecord?.value ?? null
  const otherMeasurements = measurements.filter((m) => m.type !== 'weight')

  // --- Strength log (new daily model) ---
  const strengthLogs = await getStrengthLogsForDate(date)
  const strengthLogSummaries: DailyStrengthLogSummary[] = strengthLogs.map((log) => {
    const sets = log.sets
      .filter((s) => s.setNumber > 0)
      .sort((a, b) => a.setNumber - b.setNumber)
    let totalVolume = 0
    let bestWeight: number | null = null
    let bestRepsAtWeight: number | null = null
    let bestVolume: number | null = null
    let estimated1RM: number | null = null
    for (const s of sets) {
      if (s.weight != null && s.reps != null && Number.isFinite(s.weight) && Number.isFinite(s.reps)) {
        totalVolume += s.weight * s.reps
        if (bestWeight == null || s.weight > bestWeight) {
          bestWeight = s.weight
          bestRepsAtWeight = s.reps
        }
        const volume = s.weight * s.reps
        if (bestVolume == null || volume > bestVolume) {
          bestVolume = volume
          if (Number.isFinite(s.weight) && Number.isFinite(s.reps)) {
            estimated1RM = estimated1RMFn(s.weight, s.reps)
          }
        }
      }
    }
    return {
      exerciseId: log.exerciseId,
      exerciseNameSnapshot: log.exerciseNameSnapshot,
      exerciseEquipmentSnapshot: log.exerciseEquipmentSnapshot,
      exerciseEquipmentOptionsSnapshot: log.exerciseEquipmentOptionsSnapshot,
      builtInSnapshot: log.builtInSnapshot,
      order: log.order,
      setCount: sets.length,
      completedSetCount: sets.filter((s) => s.weight != null && s.reps != null).length,
      totalVolume,
      bestWeight,
      bestRepsAtWeight,
      bestVolume,
      estimated1RM,          sets: sets.map((s) => ({
            weight: s.weight,
            reps: s.reps,
            repsDisplay: formatReps(s.reps),
            setNumber: s.setNumber,
          })),
          skipped: log.skipped,
        }
      })
    const strengthLogExerciseCount = strengthLogs.length
  const strengthLogSetCount = strengthLogSummaries.reduce((n, s) => n + s.setCount, 0)
  const hasStrengthLog = strengthLogExerciseCount > 0
  const strengthHasWorkout = hasStrengthWorkout(strengthLogs)
  const dayPlan = await getDayPlanForDate(date)
  const hasWorkout = completedWorkoutCount > 0 || strengthHasWorkout
  const hasPlannedOnly = !!(dayPlan && !hasWorkout && !cardio.length)

  const hasFood = foodLogs.length > 0
  const hasActivity = hasFood || hasWorkout || cardio.length > 0 || hasStrengthLog

  return {
    date,
    caloriesConsumed: calories,
    proteinConsumed: protein,
    carbsConsumed: carbs,
    fatConsumed: fat,
    foodEntryCount: foodLogs.length,
    mealsWithLogs,
    completedWorkoutCount,
    workoutName,
    workoutDurationMinutes,
    cardioSessionCount: cardio.length,
    cardioMinutes,
    cardioActivities,
    estimatedActivityCalories: estimateTotals.totalCalories,
    weight,
    hasWeightRecord: weightRecord != null,
    measurements: otherMeasurements,
    strengthLogExerciseCount,
    strengthLogSetCount,
    strengthLogs: strengthLogSummaries,
    hasStrengthLog,
    strengthHasWorkout,
    hasPlannedOnly,
    hasActivity,
    hasFood,
    hasWorkout,
  }
}

/** Convenience: day query + range queries, all on local keys. */
export async function getDailyHistoryOrEmpty(date: ISODate): Promise<DailyHistorySummary> {
  try {
    return await getDailyHistory(date)
  } catch {
    return emptyDailyHistory(date)
  }
}

export function emptyDailyHistory(date: ISODate): DailyHistorySummary {
  return {
    date,
    caloriesConsumed: 0,
    proteinConsumed: 0,
    carbsConsumed: null,
    fatConsumed: null,
    foodEntryCount: 0,
    mealsWithLogs: [],
    completedWorkoutCount: 0,
    workoutName: null,
    workoutDurationMinutes: null,
    cardioSessionCount: 0,
    cardioMinutes: 0,
    cardioActivities: [],
    estimatedActivityCalories: null,
    weight: null,
    hasWeightRecord: false,
    measurements: [],
    strengthLogExerciseCount: 0,
    strengthLogSetCount: 0,
    strengthLogs: [],
    hasStrengthLog: false,
    strengthHasWorkout: false,
    hasPlannedOnly: false,
    hasActivity: false,
    hasFood: false,
    hasWorkout: false,
  }
}

// ---------------------------------------------------------------------------
// Range queries
// ---------------------------------------------------------------------------

/**
 * History for every day in an inclusive local-date range.
 *
 * We first collect the records in the range with narrow IndexedDB range
 * queries, then distribute them into per-day summaries. This avoids one
 * query per calendar cell.
 */
export type HistoryRangeOptions = {
  /** When true, load every measurement type (not just weight) and attach
   *  all of them to each day's summary. Used by the analytics measurements
   *  chart so it can render every measurement type that has records.
   *
   *  Default false keeps the existing behaviour for getWeekHistory /
   *  getMonthHistory / calendar callers (only weight is indexed). */
  loadAllMeasurements?: boolean
}

export async function getHistoryRange(
  from: ISODate,
  to: ISODate,
  opts: HistoryRangeOptions = {},
): Promise<DailyHistorySummary[]> {
  const days = eachDay(from, to)
  const loadAllMeasurements = opts.loadAllMeasurements === true

  const measurementTypesToLoad: BodyMeasurement['type'][] =
    loadAllMeasurements
      ? ['weight', 'waist', 'chest', 'hips', 'arm', 'thigh', 'bodyFat', 'other']
      : ['weight']

  const measurementLoads = await Promise.all(
    measurementTypesToLoad.map((t) => getMeasurementsBetween(t, from, to)),
  )
  const measurements = measurementLoads.flat()

  const [foodLogs, cardio, completedWorkouts, strengthLogs, dayPlansRows] = await Promise.all([
    getFoodLogsBetween(from, to),
    getCardioBetween(from, to),
    listCompletedWorkoutsBetween(from, to),
    dailyStrengthLogsForRange(from, to),
    dayPlansForRange(from, to),
  ])

  // Index records by date.
  const foodByDate = new Map<ISODate, FoodLog[]>()
  const cardioByDate = new Map<ISODate, CardioSession[]>()
  const workoutsByDate = new Map<ISODate, CompletedWorkout[]>()
  const measurementsByDate = new Map<ISODate, BodyMeasurement[]>()
  const strengthLogsByDate = new Map<ISODate, DailyStrengthLog[]>()
  const dayPlansByDate = dayPlansRows

  for (const log of foodLogs) {
    const arr = foodByDate.get(log.date) ?? []
    arr.push(log)
    foodByDate.set(log.date, arr)
  }
  for (const s of cardio) {
    const arr = cardioByDate.get(s.date) ?? []
    arr.push(s)
    cardioByDate.set(s.date, arr)
  }
  for (const w of completedWorkouts) {
    const d = w.completedAtLocal
    if (d < from || d > to) continue
    const arr = workoutsByDate.get(d) ?? []
    arr.push(w)
    workoutsByDate.set(d, arr)
  }
  for (const m of measurements) {
    const arr = measurementsByDate.get(m.date) ?? []
    arr.push(m)
    measurementsByDate.set(m.date, arr)
  }
  for (const log of strengthLogs) {
    const arr = strengthLogsByDate.get(log.date) ?? []
    arr.push(log)
    strengthLogsByDate.set(log.date, arr)
  }

  const summaries = days.map((date) => {
    const foodLogsDay = foodByDate.get(date) ?? []
    const cardioDay = cardioByDate.get(date) ?? []
    const workoutsDay = (workoutsByDate.get(date) ?? []).filter(
      (w) => w.completedAtLocal === date,
    )
    const dayMeasurements = measurementsByDate.get(date) ?? []
    const weightRecords = dayMeasurements.filter((m) => m.type === 'weight')
    const dayStrengthLogs = strengthLogsByDate.get(date) ?? []

    // Cardio estimates need a weight for the day when available.
    const weightForEstimate = weightRecords.find((m) => m.type === 'weight')?.value ?? null
    const estimateTotals = sumEstimatedCalories(cardioDay, weightForEstimate)

    // Food totals from snapshot nutrition.
    let calories = 0
    let protein = 0
    let carbs: number | null = null
    let fat: number | null = null
    const meals = new Set<MealType>()
    for (const log of foodLogsDay) {
      calories += Number.isFinite(log.calories) ? log.calories : 0
      protein += Number.isFinite(log.protein) ? log.protein : 0
      if (log.carbs != null && Number.isFinite(log.carbs)) {
        carbs = carbs == null ? log.carbs : carbs + log.carbs
      }
      if (log.fat != null && Number.isFinite(log.fat)) {
        fat = fat == null ? log.fat : fat + log.fat
      }
      meals.add(log.meal)
    }
    const mealsWithLogs = [...meals].sort(byMealOrder)

    const cardioMinutes = cardioDay.reduce(
      (total, s) => total + (Number.isFinite(s.durationMinutes) ? s.durationMinutes : 0),
      0,
    )
    const cardioActivities = cardioDay.map((s) => s.type)
    const workoutName =
      workoutsDay[0]?.name ??
      workoutsDay[0]?.templateNameSnapshot ??
      null
    const workoutDurationMinutes = workoutsDay[0]?.durationSeconds != null
      ? Math.round(workoutsDay[0].durationSeconds / 60)
      : null

    const strengthLogSummaries: DailyStrengthLogSummary[] = dayStrengthLogs
      .sort((a, b) => a.order - b.order)
      .map((log) => {
        const sets = log.sets.filter((s) => s.setNumber > 0).sort((a, b) => a.setNumber - b.setNumber)
        let totalVolume = 0
        let bestWeight: number | null = null
        let bestRepsAtWeight: number | null = null
        let bestVolume: number | null = null
        let estimated1RM: number | null = null
        for (const s of sets) {
          if (s.weight != null && s.reps != null && Number.isFinite(s.weight) && Number.isFinite(s.reps)) {
            totalVolume += s.weight * s.reps
            if (bestWeight == null || s.weight > bestWeight) {
              bestWeight = s.weight
              bestRepsAtWeight = s.reps
            }
            const volume = s.weight * s.reps
            if (bestVolume == null || volume > bestVolume) {
              bestVolume = volume
              if (Number.isFinite(s.weight) && Number.isFinite(s.reps)) {
                estimated1RM = estimated1RMFn(s.weight, s.reps)
              }
            }
          }
        }
        return {
          exerciseId: log.exerciseId,
          exerciseNameSnapshot: log.exerciseNameSnapshot,
          exerciseEquipmentSnapshot: log.exerciseEquipmentSnapshot,
          exerciseEquipmentOptionsSnapshot: log.exerciseEquipmentOptionsSnapshot,
          builtInSnapshot: log.builtInSnapshot,
          order: log.order,
          setCount: sets.length,
          completedSetCount: sets.filter((s) => s.weight != null && s.reps != null).length,
          totalVolume,
          bestWeight,
          bestRepsAtWeight,
          bestVolume,
          estimated1RM,
          sets: sets.map((s) => ({
            weight: s.weight,
            reps: s.reps,
            repsDisplay: formatReps(s.reps),
            setNumber: s.setNumber,
          })),
          skipped: log.skipped,
        }
      })
    const strengthLogExerciseCount = dayStrengthLogs.length
    const strengthLogSetCount = strengthLogSummaries.reduce((n, s) => n + s.setCount, 0)
    const hasStrengthLog = strengthLogExerciseCount > 0
    const strengthHasWorkout = hasStrengthWorkout(dayStrengthLogs)
    const dayPlan = dayPlansByDate.get(date)?.[0] ?? null
    const hasPlannedOnly = !!(dayPlan && !strengthHasWorkout && workoutsDay.length === 0 && cardioDay.length === 0)

    return {
      date,
      caloriesConsumed: calories,
      proteinConsumed: protein,
      carbsConsumed: carbs,
      fatConsumed: fat,
      foodEntryCount: foodLogsDay.length,
      mealsWithLogs,
      completedWorkoutCount: workoutsDay.length,
      workoutName,
      workoutDurationMinutes,
      cardioSessionCount: cardioDay.length,
      cardioMinutes,
      cardioActivities,
      estimatedActivityCalories: estimateTotals.totalCalories,
      weight: weightRecords.find((m) => m.type === 'weight')?.value ?? null,
      hasWeightRecord: weightRecords.length > 0,
      measurements: dayMeasurements.filter((m) => m.type !== 'weight'),
      strengthLogExerciseCount,
      strengthLogSetCount,
      strengthLogs: strengthLogSummaries,
      hasStrengthLog,
      strengthHasWorkout,
      hasPlannedOnly,
      hasActivity:
        foodLogsDay.length > 0 ||
        (workoutsDay.length > 0 || strengthHasWorkout) ||
        cardioDay.length > 0 ||
        hasStrengthLog,
      hasFood: foodLogsDay.length > 0,
      hasWorkout: workoutsDay.length > 0 || strengthHasWorkout,
    }
  })

  return summaries
}

/**
 * History for one calendar month (all its days).
 */
export async function getMonthHistory(
  year: number,
  month: number,
): Promise<MonthHistory> {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const days = daysOfMonth(monthKey)
  const from = days[0]
  const to = days[days.length - 1]

  const daysSummary = await getHistoryRange(from, to)

  const signalsByDay: Record<ISODate, DaySignal[]> = {}
  const activeDays: ISODate[] = []
  for (const d of daysSummary) {
    const sigs: DaySignal[] = []
    if (d.hasFood) sigs.push('food')
    if (d.hasWorkout) sigs.push('workout')
    if (d.hasPlannedOnly) sigs.push('planned')
    if (d.cardioSessionCount > 0) sigs.push('cardio')
    if (d.hasWeightRecord) sigs.push('weight')
    if (d.measurements.length > 0) sigs.push('other-measurement')
    if (sigs.length > 0) {
      signalsByDay[d.date] = sigs
      activeDays.push(d.date)
    }
  }

  return {
    monthKey,
    label: monthLabel(monthKey),
    days: daysSummary,
    activeDays,
    signalsByDay,
  }
}

/**
 * History for the 7-day window starting on `weekStart` (a local day key).
 */
export async function getWeekHistory(weekStart: ISODate): Promise<WeekHistory> {
  const days = eachDay(weekStart, addDays(weekStart, 6))
  const from = days[0]
  const to = days[days.length - 1]

  const daysSummary = await getHistoryRange(from, to)

  let foodDaysCount = 0
  let caloriesSum = 0
  let proteinSum = 0
  let cardioMinutes = 0
  let cardioSessions = 0
  let workoutCount = 0
  let weightRecordCount = 0

  const foodDays: ISODate[] = []
  for (const d of daysSummary) {
    if (d.hasFood) {
      foodDays.push(d.date)
      foodDaysCount += 1
      caloriesSum += d.caloriesConsumed
      proteinSum += d.proteinConsumed
    }
    cardioMinutes += d.cardioMinutes
    cardioSessions += d.cardioSessionCount
    // Count each date at most once for workout frequency, whether from a
    // completed session or a non-skipped strength log with valid sets.
    workoutCount += d.hasWorkout ? 1 : 0
    if (d.hasWeightRecord) weightRecordCount += 1
  }

  return {
    from,
    to,
    days: daysSummary,
    foodDays,
    workoutCount,
    cardioSessionCount: cardioSessions,
    cardioMinutes,
    weightRecordCount,
    avgCaloriesOnLoggedDays:
      foodDaysCount > 0 ? Math.round(caloriesSum / foodDaysCount) : null,
    avgProteinOnLoggedDays:
      foodDaysCount > 0 ? Math.round(proteinSum / foodDaysCount) : null,
  }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function byMealOrder(a: MealType, b: MealType): number {
  return MEAL_ORDER.indexOf(a) - MEAL_ORDER.indexOf(b)
}

import { dailyStrengthLogsRepo } from '@/db/repositories'

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner', 'outside']

/** Month label e.g. "October 2026". */
function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Whether any of the given daily strength logs represents performed workout
 * activity on its date (non-skipped, with at least one valid set).
 */
export function hasStrengthWorkout(logs: DailyStrengthLog[]): boolean {
  return logs.some(isCountedWorkoutDay)
}

// Bulk day-plan loader for range queries.
async function dayPlansForRange(from: ISODate, to: ISODate): Promise<Map<ISODate, DayPlan[]>> {
  const rows = await dayPlansRepo.getAllByIndex(
    'date',
    IDBKeyRange.bound(from, to),
  )
  const byDate = new Map<ISODate, DayPlan[]>()
  for (const plan of rows) {
    const arr = byDate.get(plan.date) ?? []
    arr.push(plan)
    byDate.set(plan.date, arr)
  }
  return byDate
}

// Re-export day-only query helpers used above, expressed in terms of the
// existing date-indexed repositories.
async function getFoodLogsForDate(date: ISODate): Promise<FoodLog[]> {
  return getFoodLogsBetween(date, date)
}

async function getCardioForDate(date: ISODate): Promise<CardioSession[]> {
  return getCardioBetween(date, date)
}

async function listCompletedWorkoutsForDate(date: ISODate): Promise<CompletedWorkout[]> {
  const all = await listCompletedWorkoutsBetween(date, date)
  return all.filter((w) => w.completedAtLocal === date)
}

async function getMeasurementsForDate(date: ISODate): Promise<BodyMeasurement[]> {
  // measurements store is keyed on [type, date]; we want every measurement
  // type for the day, not just weight.
  const weight = await getMeasurementsBetween('weight', date, date)
  const waist = await getMeasurementsBetween('waist', date, date)
  const chest = await getMeasurementsBetween('chest', date, date)
  const hips = await getMeasurementsBetween('hips', date, date)
  const arm = await getMeasurementsBetween('arm', date, date)
  const thigh = await getMeasurementsBetween('thigh', date, date)
  const bodyFat = await getMeasurementsBetween('bodyFat', date, date)
  const other = await getMeasurementsBetween('other', date, date)
  return [
    ...weight,
    ...waist,
    ...chest,
    ...hips,
    ...arm,
    ...thigh,
    ...bodyFat,
    ...other,
  ]
}

/** All daily strength logs whose `date` falls in [from, to]. */
async function dailyStrengthLogsForRange(
  from: ISODate,
  to: ISODate,
): Promise<DailyStrengthLog[]> {
  return dailyStrengthLogsRepo.getAllByIndex(
    'date',
    IDBKeyRange.bound(from, to),
  )
}

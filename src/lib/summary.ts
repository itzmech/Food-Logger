/**
 * Pure aggregation helpers.
 *
 * All numbers the dashboard shows are derived here from real records.
 * When the database is empty these functions return zeros/nulls — never
 * placeholder values.
 */

import type {
  BodyMeasurement,
  CardioSession,
  CompletedWorkout,
  DailyStrengthLog,
  FoodLog,
  Goals,
  Task,
  Workout,
  WorkoutStatus,
} from '@/types'
import { isCountedWorkoutDay } from '@/types'
import type { ISODate } from '@/utils/date'
import { addDays, parseISODate } from '@/utils/date'
import { sumEstimatedCalories } from './activityEstimate'

/** How far back the streak scan looks. */
export const STREAK_WINDOW_DAYS = 120

export interface TodayWorkoutSummary {
  status: WorkoutStatus | null
  name: string | null
  durationMinutes: number | null
}

/**
 * Derived daily activity summary. Every value comes from real
 * records; `estimatedCalories` is null unless enough data
 * exists (sessions + a body weight) to estimate at all.
 */
export interface DailyActivitySummary {
  cardioMinutes: number
  cardioSessions: number
  workoutsCompleted: number
  /** Total manually logged activity records today. */
  loggedActivities: number
  /** Sum of per-session estimates, or null when none could be estimated. */
  estimatedCalories: number | null
  estimatedSessionCount: number
}

export interface DashboardTasks {
  dueToday: Task[]
  overdue: Task[]
  upcoming: Task[]
  completedToday: Task[]
  allPending: Task[]
}

export interface DashboardSummary {
  date: ISODate
  tasks: DashboardTasks
  today: {
    calories: number
    proteinG: number
    loggedMeals: number
    workout: TodayWorkoutSummary
    cardioMinutes: number
    /** Labeled "Estimated activity calories" wherever shown. */
    estimatedActivityCalories: number | null
    activity: DailyActivitySummary
  }
  /** Latest body-weight reading, if the user has logged one. */
  weight: {
    latestKg: number | null
    latestDate: ISODate | null
    /** Change from the most recent previous measurement, if available.
     *  Null when there is no earlier measurement to compare against. */
    previousChangeKg: number | null
    /** ISO date of the measurement this change is compared against, or null. */
    previousDate: ISODate | null
  }
  week: {
    from: ISODate
    to: ISODate
    workouts: number
    cardioMinutes: number
    weightChangeKg: number | null
    weightBaseline: 'week' | 'journey' | null
    /** Days inside the week with at least one logged activity. */
    activeDays: ISODate[]
  }
  streak: {
    days: number
    activeToday: boolean
    lastActiveDate: ISODate | null
  }
}

/* ------------------------------------------------------------------ */
/* Sums                                                                */
/* ------------------------------------------------------------------ */

export function sumFoodLogs(logs: FoodLog[]): { calories: number; proteinG: number } {
  return logs.reduce(
    (total, log) => ({
      calories: total.calories + (Number.isFinite(log.calories) ? log.calories : 0),
      proteinG: total.proteinG + (Number.isFinite(log.protein) ? log.protein : 0),
    }),
    { calories: 0, proteinG: 0 },
  )
}

export function sumCardioMinutes(sessions: CardioSession[]): number {
  return sessions.reduce(
    (total, session) => total + (Number.isFinite(session.durationMinutes) ? session.durationMinutes : 0),
    0,
  )
}

export function countCompletedWorkouts(workouts: Workout[]): number {
  return workouts.filter((workout) => workout.status === 'completed').length
}

/* ------------------------------------------------------------------ */
/* Streak                                                              */
/* ------------------------------------------------------------------ */

/**
 * A day counts as active when anything was logged: a meal, a completed
 * workout or a cardio session. Today without activity does not break the
 * streak until the day is over.
 */
export function computeStreak(
  activeDays: Set<ISODate>,
  today: ISODate,
): { days: number; activeToday: boolean; lastActiveDate: ISODate | null } {
  const activeToday = activeDays.has(today)

  let days = 0
  let cursor = activeToday ? today : addDays(today, -1)
  while (activeDays.has(cursor)) {
    days += 1
    cursor = addDays(cursor, -1)
  }

  let lastActiveDate: ISODate | null = null
  let probe = today
  for (let i = 0; i < 365; i += 1) {
    if (activeDays.has(probe)) {
      lastActiveDate = probe
      break
    }
    probe = addDays(probe, -1)
  }

  return { days, activeToday, lastActiveDate }
}

function collectActiveDays(
  foodLogs: FoodLog[],
  workouts: Workout[],
  cardio: CardioSession[],
  strengthLogs: DailyStrengthLog[] = [],
): Set<ISODate> {
  const days = new Set<ISODate>()
  for (const log of foodLogs) days.add(log.date)
  for (const workout of workouts) {
    if (workout.status === 'completed') days.add(workout.date)
  }
  for (const session of cardio) days.add(session.date)
  for (const log of strengthLogs) {
    if (isCountedWorkoutDay(log)) days.add(log.date)
  }
  return days
}

/**
 * Returns the measurement immediately before `beforeDate` from the given
 * list, plus the latest value at `beforeDate` so the change can be computed
 * even when the latest measurement is not in the passed list.
 * Returns null when there is no earlier measurement.
 * The returned change is always `latestValue - previous.value`.
 * The previous date is the earlier measurement's date — never the week
 * start or goal start.
 *
 * IMPORTANT: `measurements` must include every weight measurement in scope
 * (typically the full week slice), and `latestValue` + `beforeDate` describe
 * the most recent reading. This function will *not* treat a week-first or
 * goal-start reading as "the previous measurement" — it only looks for an
 * earlier entry whose `date < beforeDate`.
 */
export function getPreviousWeightBefore(
  beforeDate: ISODate,
  latestValue: number,
  measurements: BodyMeasurement[],
): { change: number; previousDate: ISODate } | null {
  const earlier = measurements
    .filter((m) => m.date < beforeDate && m.type === 'weight')
    .sort((a, b) => b.date.localeCompare(a.date))
  if (earlier.length === 0) return null
  const previous = earlier[0]
  return {
    change: latestValue - previous.value,
    previousDate: previous.date,
  }
}

/** Returns a human-readable relative day string for a measurement date,
 * e.g. "Oct 9" or "Sep 28". Used for the weight trend readout on the
 * dashboard so the user knows which previous entry the change is compared
 * against. */
export function weightPreviousDateLabel(date: ISODate): string {
  return formatShortDateInternal(date)
}

function formatShortDateInternal(date: ISODate): string {
  const d = parseISODate(date)
  return `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`
}

/* ------------------------------------------------------------------ */
/* Weight change                                                       */
/* ------------------------------------------------------------------ */

function computeWeightChange(
  latest: BodyMeasurement | undefined,
  weekMeasurements: BodyMeasurement[],
  goal: Goals | undefined,
): { change: number | null; baseline: 'week' | 'journey' | null } {
  const sortedWeek = [...weekMeasurements].sort((a, b) => a.date.localeCompare(b.date))

  if (sortedWeek.length >= 2) {
    const first = sortedWeek[0]
    const last = sortedWeek[sortedWeek.length - 1]
    return { change: last.value - first.value, baseline: 'week' }
  }

  if (latest && goal?.startWeightKg != null && goal.startDate < latest.date) {
    return { change: latest.value - goal.startWeightKg, baseline: 'journey' }
  }

  return { change: null, baseline: null }
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */
export interface DashboardInput {
  today: ISODate
  weekStart: ISODate
  todayLogs: FoodLog[]
  weekLogs: FoodLog[]
  todayWorkouts: Workout[]
  weekWorkouts: Workout[]
  /** Completed sessions from the workout recorder (new system). */
  todayCompletedWorkouts: CompletedWorkout[]
  todayStrengthLogs: DailyStrengthLog[]
  weekStrengthLogs: DailyStrengthLog[]
  streakStrengthLogs: DailyStrengthLog[]
  todayCardio: CardioSession[]
  weekCardio: CardioSession[]
  streakFoodLogs: FoodLog[]
  streakWorkouts: Workout[]
  streakCardio: CardioSession[]
  latestWeight?: BodyMeasurement
  weekWeightMeasurements: BodyMeasurement[]
  goal?: Goals
  /** Tasks grouped for `today`, if already loaded. */
  todayTasks?: {
    dueToday: Task[]
    overdue: Task[]
    upcoming: Task[]
    completedToday: Task[]
    allPending: Task[]
  }
}
export function buildDashboardSummary(input: DashboardInput): DashboardSummary {
  const {
    today,
    weekStart,
    todayLogs,
    weekLogs,
    todayWorkouts,
    weekWorkouts,
    todayCompletedWorkouts,
    todayStrengthLogs,
    weekStrengthLogs,
    streakStrengthLogs,
    todayCardio,
    weekCardio,
    streakFoodLogs,
    streakWorkouts,
    streakCardio,
    latestWeight,
    weekWeightMeasurements,
    goal,
  } = input

  const todayTotals = sumFoodLogs(todayLogs)
  const workout = todayWorkouts[0]
  const latestCompleted = [...todayCompletedWorkouts].sort((a, b) =>
    b.completedAtLocal.localeCompare(a.completedAtLocal),
  )[0]
  // A date counts as a workout day when it has a completed session OR a
  // non-skipped strength log with at least one valid set.
  const todayStrengthWorkout = todayStrengthLogs.some(isCountedWorkoutDay)
  const latestStrengthLog = todayStrengthLogs
    .filter(isCountedWorkoutDay)
    .sort((a, b) => b.order - a.order)[0] ?? null
  const weightChange = computeWeightChange(latestWeight, weekWeightMeasurements, goal)
  const weekStrengthWorkoutDays = new Set<ISODate>()
  for (const log of weekStrengthLogs) {
    if (isCountedWorkoutDay(log)) weekStrengthWorkoutDays.add(log.date)
  }

  // Previous weight measurement before the latest, across all time.
  // Only used for the dashboard's "change from previous entry" readout.
  const prevChange = latestWeight
    ? getPreviousWeightBefore(latestWeight.date, latestWeight.value, weekWeightMeasurements)
    : null

  const weekActiveDays = collectActiveDays(weekLogs, weekWorkouts, weekCardio)
  for (const d of weekStrengthWorkoutDays) weekActiveDays.add(d)
  const cardioEstimate = sumEstimatedCalories(todayCardio, latestWeight?.value)
  const workoutsCompletedToday =
    todayWorkouts.filter((w) => w.status === 'completed').length +
    todayCompletedWorkouts.length +
    (todayStrengthWorkout ? 1 : 0)

  return {
    date: today,
    today: {
      calories: todayTotals.calories,
      proteinG: todayTotals.proteinG,
      loggedMeals: todayLogs.length,
      workout: {
        status: workout?.status ?? (latestCompleted ? 'completed' : todayStrengthWorkout ? 'completed' : null),
        name: workout?.name ?? latestCompleted?.name ?? (latestStrengthLog ? latestStrengthLog.exerciseNameSnapshot : null) ?? null,
        durationMinutes:
          workout?.durationMinutes ??
          (latestCompleted?.durationSeconds != null
            ? Math.round(latestCompleted.durationSeconds / 60)
            : null),
      },
      cardioMinutes: sumCardioMinutes(todayCardio),
      estimatedActivityCalories: cardioEstimate.totalCalories,
      activity: {
        cardioMinutes: sumCardioMinutes(todayCardio),
        cardioSessions: todayCardio.length,
        workoutsCompleted: workoutsCompletedToday,
        loggedActivities: todayCardio.length + workoutsCompletedToday,
        estimatedCalories: cardioEstimate.totalCalories,
        estimatedSessionCount: cardioEstimate.estimatedCount,
      },
    },
    weight: {
      latestKg: latestWeight?.value ?? null,
      latestDate: latestWeight?.date ?? null,
      previousChangeKg: prevChange?.change ?? null,
      previousDate: prevChange?.previousDate ?? null,
    },
    tasks: input.todayTasks ?? {
      dueToday: [],
      overdue: [],
      upcoming: [],
      completedToday: [],
      allPending: [],
    },
    week: {
      from: weekStart,
      to: today,
      workouts: countCompletedWorkouts(weekWorkouts) + weekStrengthWorkoutDays.size,
      cardioMinutes: sumCardioMinutes(weekCardio),
      weightChangeKg: weightChange.change,
      weightBaseline: weightChange.baseline,
      activeDays: [...weekActiveDays].sort(),
    },
    streak: computeStreak(
      collectActiveDays(streakFoodLogs, streakWorkouts, streakCardio, streakStrengthLogs),
      today,
    ),
  }
}

/** Week number inside a journey (1-based, clamped to the journey length). */
export function journeyWeekNumber(
  startDate: ISODate,
  today: ISODate,
  totalWeeks: number,
): number {
  const start = new Date(`${startDate}T00:00:00`).getTime()
  const now = new Date(`${today}T00:00:00`).getTime()
  const days = Math.floor((now - start) / 86_400_000)
  const week = Math.floor(Math.max(days, 0) / 7) + 1
  return Math.min(week, Math.max(totalWeeks, 1))
}

/** Progress through the journey as a 0–1 ratio (0 when it has not started). */
export function journeyProgress(
  startDate: ISODate,
  today: ISODate,
  totalWeeks: number,
): number {
  const totalDays = Math.max(totalWeeks, 1) * 7
  const elapsed = Math.floor(
    (new Date(`${today}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) /
      86_400_000,
  )
  return Math.min(Math.max(elapsed / totalDays, 0), 1)
}

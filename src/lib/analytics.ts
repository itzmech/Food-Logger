/**
 * Analytics helpers.
 *
 * A derived, read-only layer on top of `src/lib/history.ts`. Every chart
 * dataset is built from daily summaries, never from separate per-chart IndexedDB
 * queries. This keeps the hot path to one `getHistoryRange` per selected range.
 *
 * Data rules (per spec):
 *  - Missing day ≠ zero. We drop absent days from point series.
 *  - Averages are computed over the days that actually have the data.
 *  - Estimated activity calories are treated as derived, never as measured.
 */

import type {
  BodyMeasurement,
  CardioSession,
  CompletedWorkout,
  MealType,
} from '@/types'
import type { ISODate } from '@/utils/date'
import {
  addDays,
  formatShortDate,
  startOfWeek,
} from '@/utils/date'
import type { DailyHistorySummary } from './history'

// ---------------------------------------------------------------------------
// Range selection
// ---------------------------------------------------------------------------

export type AnalyticsRange = '7d' | '30d' | '90d' | 'all'

export interface AnalyticsRangeMeta {
  label: string
  /** Inclusive first day for the range, given today. */
  from(today: ISODate): ISODate
  /** Inclusive last day for the range, given today. */
  to(today: ISODate): ISODate
  /** Human label for the loaded window, e.g. "Last 30 days". */    windowLabel: (from: ISODate, to: ISODate) => string
}

export const ANALYTICS_RANGES: Record<AnalyticsRange, AnalyticsRangeMeta> = {
  '7d': {
    label: '7 days',
    from: (today) => addDays(today, -6),
    to: () => '',
    windowLabel: (from, to) => `${formatShortDate(from)} – ${formatShortDate(to)}`,
  },
  '30d': {
    label: '30 days',
    from: (today) => addDays(today, -29),
    to: () => '',
    windowLabel: (from, to) => `${formatShortDate(from)} – ${formatShortDate(to)}`,
  },
  '90d': {
    label: '90 days',
    from: (today) => addDays(today, -89),
    to: () => '',
    windowLabel: (from, to) => `${formatShortDate(from)} – ${formatShortDate(to)}`,
  },
  all: {
    label: 'All time',
    from: () => '',
    to: () => '',
    windowLabel: (from, to) => `${formatShortDate(from)} – ${formatShortDate(to)}`,
  },
} as const

// Earliest query bound used for the "all time" range. Actual plotted points
// are never invented — only records that exist in IndexedDB are shown — so a
// fixed early anchor is safe: it is merely a query bound, not a data point.
export const ALL_TIME_FROM: ISODate = '2018-01-01'

/** Pick the first and last day (within `days`) that actually carry any data,
 * for an honest "all time" window label. Returns null when nothing is present.
 */
export function actualDataWindow(
  days: DailyHistorySummary[],
): { from: ISODate; to: ISODate } | null {
  let first: ISODate | null = null
  let last: ISODate | null = null
  for (const d of days) {
    if (
      d.hasFood ||
      d.hasWorkout ||
      d.cardioSessionCount > 0 ||
      d.hasWeightRecord ||
      d.measurements.length > 0
    ) {
      if (first == null || d.date < first) first = d.date
      if (last == null || d.date > last) last = d.date
    }
  }
  if (first == null) return null
  return { from: first, to: last ?? first }
}

/**
 * Resolve the inclusive date window for a chosen range.
 *
 * For finite ranges we use a fixed window ending on `today` (inclusive).
 * For "all", we fall back to the actual data span — earliest relevant record
 * through today — so we never invent dates.
 */
export function resolveRangeWindow(
  range: AnalyticsRange,
  today: ISODate,
  earliestFoodDate: ISODate | null,
  earliestWorkoutDate: ISODate | null,
  earliestCardioDate: ISODate | null,
  earliestWeightDate: ISODate | null,
): { from: ISODate; to: ISODate } {
  const meta = ANALYTICS_RANGES[range]
  if (range === 'all') {
    const candidates = [
      earliestFoodDate,
      earliestWorkoutDate,
      earliestCardioDate,
      earliestWeightDate,
    ].filter((d): d is ISODate => d != null)
    const from = candidates.length > 0 ? earliestOf(...candidates) : today
    return { from, to: today }
  }
  return { from: meta.from(today), to: today }
}

// ---------------------------------------------------------------------------
// Series builders
// ---------------------------------------------------------------------------

/**
 * Weight series: only actual recorded weight measurements.
 * Missing days are never filled in.
 */
export interface WeightPoint {
  date: ISODate
  label: string
  value: number
}

export function weightSeries(days: DailyHistorySummary[]): WeightPoint[] {
  const points: WeightPoint[] = []
  for (const d of days) {
    if (d.weight == null) continue
    points.push({ date: d.date, label: formatShortDate(d.date), value: d.weight })
  }
  return points
}

export interface WeightStats {
  /** Most recent weight within the loaded window. Null when no records. */
  latest: number | null
  latestLabel: string
  /** First weight within the window, when available. */
  starting: number | null
  /** Change = latest − starting, when at least two valid points exist. */
  change: number | null
  pointCount: number
}

export function weightStats(days: DailyHistorySummary[]): WeightStats {
  const points = weightSeries(days)
  const latestPoint = points[points.length - 1] ?? null
  const startingPoint = points[0] ?? null

  let change: number | null = null
  if (points.length >= 2) {
    change = points[points.length - 1].value - points[0].value
  }

  return {
    latest: latestPoint?.value ?? null,
    latestLabel: latestPoint ? `${latestPoint.value.toFixed(1)} kg` : 'No weight data',
    starting: startingPoint?.value ?? null,
    change,
    pointCount: points.length,
  }
}

/**
 * Nutrition series: only days that have food logs.
 * Missing food days are NOT plotted as zero.
 */
export function calorieSeries(days: DailyHistorySummary[]): NutritionPoint[] {
  return nutritionSeries(days, (d) => d.caloriesConsumed)
}

export function proteinSeries(days: DailyHistorySummary[]): NutritionPoint[] {
  return nutritionSeries(days, (d) => d.proteinConsumed)
}

export interface NutritionPoint {
  date: ISODate
  label: string
  value: number
  meals: MealType[]
}

function nutritionSeries(
  days: DailyHistorySummary[],
  valueOf: (d: DailyHistorySummary) => number,
): NutritionPoint[] {
  const points: NutritionPoint[] = []
  for (const d of days) {
    if (!d.hasFood) continue
    points.push({
      date: d.date,
      label: formatShortDate(d.date),
      value: valueOf(d),
      meals: d.mealsWithLogs,
    })
  }
  return points
}

export interface NutritionStats {
  points: NutritionPoint[]
  average: number | null
  loggedDays: number
  /** Target only when one is available from settings/goal. */
  target: number | null
}

export function nutritionStats(
  points: NutritionPoint[],
  target: number | null,
): NutritionStats {
  if (points.length === 0) {
    return { points: [], average: null, loggedDays: 0, target }
  }
  const sum = points.reduce((acc, p) => acc + p.value, 0)
  return {
    points,
    average: Math.round(sum / points.length),
    loggedDays: points.length,
    target,
  }
}

/**
 * Workout frequency: counts completed workouts per bucket.
 *
 * Granularity is chosen by range so the chart stays readable:
 *  - 7d → daily
 *  - 30d / 90d → weekly (Mon-led weeks, matching app settings)
 *  - all → monthly
 *
 * Only completed workouts are counted. Templates, drafts and unfinished
 * sessions are never included.
 */
export type WorkoutBucketGranularity = 'day' | 'week' | 'month'

export interface WorkoutBucket {
  label: string
  value: number
}

export function workoutFrequency(
  workouts: CompletedWorkout[],
  range: AnalyticsRange,
  weekStartsOn: 0 | 1,
): WorkoutBucket[] {
  if (workouts.length === 0) return []

  const gran = workoutGranularity(range)
  const buckets = new Map<string, number>()

  for (const w of workouts) {
    const key = workoutBucketKey(w.completedAtLocal, gran, weekStartsOn)
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  const allKeys = [...buckets.keys()].sort()
  return allKeys.map((key) => ({ label: bucketLabel(key, gran), value: buckets.get(key)! }))
}

/**
 * Workout frequency derived from daily summaries.
 *
 * A date counts as a workout day when it has at least one actually-performed
 * workout — either a completed session or a non-skipped strength log with a
 * valid set. Each date is counted at most once, regardless of how many
 * exercises, sets, or completed sessions it contains. Planned workouts and
 * skipped strength exercises do not count.
 */
export function workoutFrequencyFromSummaries(
  days: DailyHistorySummary[],
  range: AnalyticsRange,
  weekStartsOn: 0 | 1,
): WorkoutBucket[] {
  const gran = workoutGranularity(range)
  const buckets = new Map<string, number>()

  for (const d of days) {
    if (!d.hasWorkout) continue
    const key = workoutBucketKey(d.date, gran, weekStartsOn)
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  const allKeys = [...buckets.keys()].sort()
  return allKeys.map((key) => ({ label: bucketLabel(key, gran), value: buckets.get(key)! }))
}

/**
 * Cardio series: total cardio minutes per bucket.
 *
 * Granularity follows the same rule as workouts. Cardio sessions with no
 * calorie estimate are still included — only minutes matter here.
 */
export interface CardioBucket {
  label: string
  minutes: number
  sessionCount: number
}

export function cardioSeries(
  cardio: CardioSession[],
  range: AnalyticsRange,
  weekStartsOn: 0 | 1,
): CardioBucket[] {
  if (cardio.length === 0) return []

  const gran = cardioGranularity(range)
  const buckets = new Map<string, CardioBucket>()

  for (const s of cardio) {
    const key = bucketKeyForDate(s.date, gran, weekStartsOn)
    const existing = buckets.get(key) ?? { label: '', minutes: 0, sessionCount: 0 }
    buckets.set(key, {
      label: bucketLabel(key, gran),
      minutes: existing.minutes + (Number.isFinite(s.durationMinutes) ? s.durationMinutes : 0),
      sessionCount: existing.sessionCount + 1,
    })
  }

  return [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label))
}

export interface CardioStats {
  totalMinutes: number
  sessionCount: number
  /** Estimated activity calories across the bucket window; null when none available. */
  estimatedActivityCalories: number | null
  pointCount: number
}
export function cardioStats(
  cardio: CardioSession[],
  days: DailyHistorySummary[],
): CardioStats {
  let totalMinutes = 0
  let sessionCount = 0
  for (const s of cardio) {
    totalMinutes += Number.isFinite(s.durationMinutes) ? s.durationMinutes : 0
    sessionCount += 1
  }
  let est = 0
  let estCount = 0
  for (const d of days) {
    if (d.estimatedActivityCalories != null) {
      est += d.estimatedActivityCalories
      estCount += 1
    }
  }
  return {
    totalMinutes,
    sessionCount,
    estimatedActivityCalories: estCount > 0 ? est : null,
    pointCount: cardio.length,
  }
}

/** Cardio minutes + session count derived from daily summaries.
 * A cardio session with no calorie estimate is still valid cardio — only
 * minutes and session count matter here.
 */
export function cardioFromSummaries(
  days: DailyHistorySummary[],
  range: AnalyticsRange,
  weekStartsOn: 0 | 1,
): CardioBucket[] {
  const gran = cardioGranularity(range)
  const buckets = new Map<string, CardioBucket>()

  for (const d of days) {
    if (d.cardioSessionCount <= 0) continue
    const key = bucketKeyForDate(d.date, gran, weekStartsOn)
    const existing = buckets.get(key) ?? { label: '', minutes: 0, sessionCount: 0 }
    buckets.set(key, {
      label: bucketLabel(key, gran),
      minutes: existing.minutes + d.cardioMinutes,
      sessionCount: existing.sessionCount + d.cardioSessionCount,
    })
  }

  return [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label))
}

/** Cardio stats derived from daily summaries. Estimated activity calories
 * are taken only from days that have them; null when none are available.
 */
export function cardioStatsFromSummaries(days: DailyHistorySummary[]): CardioStats {
  let totalMinutes = 0
  let sessionCount = 0
  let est = 0
  let estCount = 0
  for (const d of days) {
    totalMinutes += Number.isFinite(d.cardioMinutes) ? d.cardioMinutes : 0
    sessionCount += d.cardioSessionCount
    if (d.estimatedActivityCalories != null) {
      est += d.estimatedActivityCalories
      estCount += 1
    }
  }
  return {
    totalMinutes,
    sessionCount,
    estimatedActivityCalories: estCount > 0 ? est : null,
    pointCount: sessionCount,
  }
}

/**
 * Body measurement series: one series per measurement type, only when that
 * type has records in the window. No empty lines, no interpolation.
 */
export interface MeasurementSeries {
  type: BodyMeasurement['type']
  unit: BodyMeasurement['unit']
  label: string
  data: MeasurementPoint[]
}

export interface MeasurementPoint {
  date: ISODate
  label: string
  value: number
}

export function measurementSeries(
  measurements: BodyMeasurement[],
  types: BodyMeasurement['type'][],
  labels: Record<BodyMeasurement['type'], string>,
): MeasurementSeries[] {
  const byType = new Map<BodyMeasurement['type'], BodyMeasurement[]>()
  for (const m of measurements) {
    const arr = byType.get(m.type) ?? []
    arr.push(m)
    byType.set(m.type, arr)
  }

  const series: MeasurementSeries[] = []
  for (const type of types) {
    const recs = byType.get(type) ?? []
    if (recs.length === 0) continue
    const unit = recs[0].unit
    const data: MeasurementPoint[] = recs
      .map((m) => ({ date: m.date, label: formatShortDate(m.date), value: m.value }))
      .sort((a, b) => a.date.localeCompare(b.date))
    series.push({ type, unit, label: labels[type], data })
  }
  return series
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

function earliestOf(...dates: ISODate[]): ISODate {
  return dates.reduce((a, b) => (a < b ? a : b))
}

function workoutGranularity(range: AnalyticsRange): WorkoutBucketGranularity {
  if (range === '7d') return 'day'
  if (range === 'all') return 'month'
  return 'week' as const
}

function cardioGranularity(range: AnalyticsRange): WorkoutBucketGranularity {
  if (range === 'all') return 'month'
  if (range === '90d') return 'week'
  return 'day' as const
}

function workoutBucketKey(
  completedAtLocal: ISODate,
  gran: WorkoutBucketGranularity,
  weekStartsOn: 0 | 1,
): string {
  if (gran === 'day') return completedAtLocal
  if (gran === 'month') {
    return completedAtLocal.slice(0, 7)
  }
  // week: use the Monday-led start of the week containing completedAtLocal.
  return startOfWeek(completedAtLocal, weekStartsOn)
}

function bucketKeyForDate(
  date: ISODate,
  gran: WorkoutBucketGranularity,
  weekStartsOn: 0 | 1,
): string {
  if (gran === 'day') return date
  if (gran === 'month') return date.slice(0, 7)
  return startOfWeek(date, weekStartsOn)
}

function bucketLabel(key: string, gran: WorkoutBucketGranularity): string {
  if (gran === 'day') return formatShortDate(key)
  if (gran === 'month') {
    const [y, m] = key.split('-').map(Number)
    return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString(undefined, {
      month: 'short',
      year: 'numeric',
    })
  }
  // week: label with the week's starting day.
  return `${formatShortDate(key)} – ${formatShortDate(addDays(key, 6))}`
}

// ---------------------------------------------------------------------------
// Future chart surface
// ---------------------------------------------------------------------------
//
// The helpers above are intentionally shaped so future charts can consume:
//   - daily calorie/protein/carb/fat totals      → calorieSeries / proteinSeries
//   - workout frequency by day/week/month        → workoutFrequency
//   - cardio minutes by day/week/month           → cardioSeries
//   - estimated activity calories                → cardioStats().estimatedActivityCalories
//   - weight measurements                        → weightSeries
//   - any measurement type                       → measurementSeries
//   - weekly/monthly summaries                   → reuse history.ts getWeekHistory / getMonthHistory
//
// No new records are created here; everything is downstream of history.ts.

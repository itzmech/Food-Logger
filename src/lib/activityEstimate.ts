/**
 * Estimated activity calories.
 *
 * Estimates are DERIVED, never stored. A cardio session keeps exactly
 * what the user (or a future device import) recorded; every calorie
 * number shown from this module is computed on read and must be
 * presented to the user as an estimate.
 *
 * Method (transparent, deliberately simple):
 *   kcal = MET × body weight (kg) × duration (hours)
 *
 * MET (metabolic equivalent) comes from the activity type and is
 * adjusted by recorded speed and incline where available. Values are
 * rounded to the nearest 5 kcal so the estimate never looks like a
 * precise measurement.
 *
 * Rules:
 * - Requires a duration and a body weight. Without a weight there is
 *   no estimate at all — we never invent a "reference" body.
 * - Speed may be given directly or derived from distance ÷ duration.
 * - Incline refines walking/running METs; it never creates an
 *   estimate on its own.
 */

import type { CardioSession, CardioType } from '@/types'

export interface CardioCalorieEstimate {
  /** Rounded to the nearest 5 kcal. */
  calories: number
  /** The MET value used, before rounding. */
  met: number
  weightKg: number
  durationMinutes: number
  speedKmh: number | null
  inclinePercent: number | null
  /** Plain-language basis, e.g. "30 min · 70 kg · 5.0 MET". */
  basis: string
}

/** Baseline MET per activity type (Compendium of Physical Activities, rounded). */
const BASE_MET: Record<CardioType, number> = {
  walk: 3.5,
  jog: 7.0,
  run: 8.3,
  cycling: 6.8,
  swimming: 6.0,
  stairs: 9.0,
  rope: 11.0,
  hiit: 8.0,
  other: 5.0,
}

/** Walking MET by speed band (km/h). */
const WALK_SPEED_MET: [number, number][] = [
  [0, 2.5],
  [3.2, 3.0],
  [4.0, 3.5],
  [4.8, 4.3],
  [5.6, 5.0],
  [6.4, 6.0],
  [7.2, 7.0],
]

/** Running MET by speed band (km/h). */
const RUN_SPEED_MET: [number, number][] = [
  [0, 6.0],
  [8, 7.0],
  [9.7, 8.3],
  [10.8, 9.8],
  [12, 11.5],
  [13, 12.8],
  [14.5, 14.5],
  [16, 16.0],
]

/** Cycling MET by speed band (km/h). */
const CYCLING_SPEED_MET: [number, number][] = [
  [0, 3.5],
  [16, 4.0],
  [19, 6.8],
  [22, 10.0],
  [26, 12.0],
]

function metForSpeed(bands: [number, number][], speedKmh: number): number {
  let met = bands[0][1]
  for (const [minSpeed, bandMet] of bands) {
    if (speedKmh >= minSpeed) met = bandMet
  }
  return met
}

/** Rough grade adjustment: incline raises walking/running effort. */
function inclineMetAdjustment(type: CardioType, inclinePercent: number): number {
  if (!Number.isFinite(inclinePercent) || inclinePercent <= 0) return 0
  switch (type) {
    case 'walk':
      return Math.min(inclinePercent * 0.4, 8)
    case 'jog':
    case 'run':
      return Math.min(inclinePercent * 0.2, 5)
    default:
      return 0
  }
}

function buildBasis(
  durationMinutes: number,
  weightKg: number,
  met: number,
  speedKmh: number | null,
  inclinePercent: number | null,
): string {
  const parts = [`${Math.round(durationMinutes)} min`, `${formatOne(weightKg)} kg`]
  if (speedKmh != null) parts.push(`${formatOne(speedKmh)} km/h`)
  if (inclinePercent != null && inclinePercent > 0) parts.push(`${formatOne(inclinePercent)}% incline`)
  parts.push(`${formatOne(met)} MET`)
  return parts.join(' · ')
}

function formatOne(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export interface EstimateInputs {
  activity: CardioType
  durationMinutes: number | null
  distanceKm?: number | null
  speedKmh?: number | null
  inclinePercent?: number | null
}

/**
 * Estimates calories for one activity record. Returns null when the
 * record does not carry enough information (missing duration or body
 * weight) — callers must then show nothing rather than a guess.
 */
export function estimateActivityCalories(
  inputs: EstimateInputs,
  weightKg: number | null | undefined,
): CardioCalorieEstimate | null {
  const duration = inputs.durationMinutes
  if (duration == null || !Number.isFinite(duration) || duration <= 0) return null
  if (weightKg == null || !Number.isFinite(weightKg) || weightKg <= 0) return null

  // Speed can be recorded directly or derived from distance ÷ time.
  let speedKmh: number | null = null
  if (inputs.speedKmh != null && Number.isFinite(inputs.speedKmh) && inputs.speedKmh > 0) {
    speedKmh = inputs.speedKmh
  } else if (
    inputs.distanceKm != null &&
    Number.isFinite(inputs.distanceKm) &&
    inputs.distanceKm > 0
  ) {
    speedKmh = inputs.distanceKm / (duration / 60)
  }

  const incline =
    inputs.inclinePercent != null && Number.isFinite(inputs.inclinePercent)
      ? Math.max(0, inputs.inclinePercent)
      : null

  let met = BASE_MET[inputs.activity]
  if (speedKmh != null) {
    if (inputs.activity === 'walk') met = metForSpeed(WALK_SPEED_MET, speedKmh)
    else if (inputs.activity === 'run') met = metForSpeed(RUN_SPEED_MET, speedKmh)
    else if (inputs.activity === 'cycling') met = metForSpeed(CYCLING_SPEED_MET, speedKmh)
  }
  if (incline != null) met += inclineMetAdjustment(inputs.activity, incline)

  const calories = Math.round((met * weightKg * (duration / 60)) / 5) * 5

  return {
    calories,
    met,
    weightKg,
    durationMinutes: duration,
    speedKmh,
    inclinePercent: incline,
    basis: buildBasis(duration, weightKg, met, speedKmh, incline),
  }
}

/** Convenience wrapper over a stored cardio session. */
export function estimateSessionCalories(
  session: CardioSession,
  weightKg: number | null | undefined,
): CardioCalorieEstimate | null {
  return estimateActivityCalories(
    {
      activity: session.type,
      durationMinutes: session.durationMinutes,
      distanceKm: session.distanceKm,
      speedKmh: session.speedKmh,
      inclinePercent: session.inclinePercent,
    },
    weightKg,
  )
}

export interface ActivityCaloriesTotals {
  /** Sum of estimable sessions, or null when nothing could be estimated. */
  totalCalories: number | null
  /** How many sessions produced an estimate. */
  estimatedCount: number
  totalCount: number
}

/**
 * Sums estimates across sessions. The total is null unless at least
 * one session could be estimated; unestimable sessions are simply
 * left out rather than guessed at.
 */
export function sumEstimatedCalories(
  sessions: CardioSession[],
  weightKg: number | null | undefined,
): ActivityCaloriesTotals {
  let total = 0
  let estimatedCount = 0
  for (const session of sessions) {
    const estimate = estimateSessionCalories(session, weightKg)
    if (estimate) {
      total += estimate.calories
      estimatedCount += 1
    }
  }
  return {
    totalCalories: estimatedCount > 0 ? total : null,
    estimatedCount,
    totalCount: sessions.length,
  }
}

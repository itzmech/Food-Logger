import type { ID, ISODate, ISODateTime, Timestamped } from './common'

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

/** Settings is a singleton record stored under `SETTINGS_ID`. */
export interface UserSettings extends Timestamped {
  id: 'user'
  /** Display name used in greetings. Empty string = no name configured. */
  name: string
  units: 'metric' | 'imperial'
  theme: 'dark'
  /** 0 = Sunday, 1 = Monday. Drives week boundaries in summaries. */
  weekStartsOn: 0 | 1
  /** Goal the dashboard summarises. Null = fall back to the active goal. */
  activeGoalId: ID | null
  onboardedAt: ISODateTime | null
}

/* ------------------------------------------------------------------ */
/* Goals                                                               */
/* ------------------------------------------------------------------ */

export type GoalStatus = 'active' | 'archived'

/**
 * A 12-week (configurable) journey goal. Every target is optional —
 * the UI shows "not set" states instead of inventing numbers.
 */
export interface Goals extends Timestamped {
  id: ID
  status: GoalStatus
  label: string
  startDate: ISODate
  /** Length of the journey in weeks. */
  weeks: number

  /* Body targets */
  startWeightKg: number | null
  targetWeightKg: number | null
  targetWaistCm: number | null

  /* Daily nutrition targets */
  dailyCalories: number | null
  dailyProteinG: number | null

  /* Weekly activity targets */
  weeklyWorkouts: number | null
  weeklyCardioMinutes: number | null

  notes: string
}

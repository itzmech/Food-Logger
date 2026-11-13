import type { ISODate } from '@/types'
import { todayISO, addDays, diffInDays } from '@/utils/date'

export type StreakCategory = 'habit' | 'gym' | 'cardio'

export interface DayStatus {
  date: ISODate
  status: 'active' | 'skipped' | 'missed'
}

export interface StreakResult {
  category: StreakCategory
  current: number
  best: number
  historyStartDate: ISODate
  historyCompleteness: 'unknown'
  lastActiveDate: ISODate | null
  /** Calendar days since the most recent completed day. */
  daysSinceActive: number
  history: DayStatus[]
}

/** Whether activity was completed in a category on a local calendar date. */
export type DayGoodFn = (date: ISODate) => boolean

/**
 * Calculate streak totals from chronologically ordered category-day statuses.
 * Skips pause the run, but only completed days increase its count.
 */
export function calculateStreak(
  category: StreakCategory,
  history: DayStatus[],
  referenceDate: ISODate,
): StreakResult {
  let best = 0
  let run = 0
  let lastActiveDate: ISODate | null = null

  for (const item of history) {
    if (item.status === 'active') {
      run += 1
      best = Math.max(best, run)
      lastActiveDate = item.date
    } else if (item.status === 'missed') {
      run = 0
    }
  }

  let current = 0
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i]
    if (item.status === 'active') {
      current += 1
    } else if (item.status === 'missed') {
      break
    }
  }

  const daysSinceActive =
    lastActiveDate === null
      ? history.length
      : Math.max(0, diffInDays(lastActiveDate, referenceDate))

  return {
    category,
    current,
    best,
    historyStartDate: history[0]?.date ?? referenceDate,
    historyCompleteness: 'unknown',
    lastActiveDate,
    daysSinceActive,
    history,
  }
}

/**
 * Compute a streak across the explicit local-date range. Its default range is
 * the reference date alone; callers that need a longer history must supply the
 * beginning of the history they have available.
 */
export function computeStreak(
  category: StreakCategory,
  hasActivity: DayGoodFn,
  referenceDate: ISODate = todayISO(),
  historyStartDate: ISODate = referenceDate,
  hasSkip: DayGoodFn = () => false,
): StreakResult {
  const history: DayStatus[] = []

  for (let date = historyStartDate; date <= referenceDate; date = addDays(date, 1)) {
    const status = hasActivity(date) ? 'active' : hasSkip(date) ? 'skipped' : 'missed'
    history.push({ date, status })
  }

  return calculateStreak(category, history, referenceDate)
}

/** Build a predicate that is true for activity or an explicit skip. */
export function dayGoodFn(
  hasActivity: (date: ISODate) => boolean,
  hasSkip: (date: ISODate) => boolean,
): DayGoodFn {
  return (date) => hasActivity(date) || hasSkip(date)
}

/** Format a streak for display. */
export function streakLabel(result: StreakResult): string {
  if (result.current <= 0) return 'Start today'
  return `${result.current} day${result.current === 1 ? '' : 's'}`
}

/** Aura tier for visual styling only; it never affects streak calculations. */
export type StreakTier = 'silver' | 'electric-blue' | 'royal-purple' | 'molten-gold'

export function streakTier(days: number): StreakTier {
  if (days < 7) return 'silver'
  if (days < 14) return 'electric-blue'
  if (days < 30) return 'royal-purple'
  return 'molten-gold'
}

export const STREAK_TIER_LABELS: Record<StreakTier, string> = {
  silver: 'Silver',
  'electric-blue': 'Electric blue',
  'royal-purple': 'Royal purple',
  'molten-gold': 'Molten gold',
}

export const STREAK_TIER_COLORS: Record<StreakTier, string> = {
  silver: '#B7C2CC',
  'electric-blue': '#8FB9FF',
  'royal-purple': '#C4B5FD',
  'molten-gold': '#F5C979',
}
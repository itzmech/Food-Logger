/**
 * Pure, UI-independent logic for deciding whether a Habits day is complete.
 *
 * The Habits category streak is category-level (one streak for all active
 * habits), and a day counts toward that streak only when **every active
 * habit scheduled for that date** is completed. Habits that are not due on a
 * given date are ignored — a twice-a-week habit does not make a day "bad"
 * simply because it was not done on its off day.
 *
 * This module is intentionally free of any storage or React imports so the
 * rule can be unit-tested in isolation.
 */

import type { ISODate } from '@/utils/date'
import { weekdayOf } from '@/utils/date'

export interface HabitLike {
  id: string
  active: boolean
  schedule: HabitSchedule
  customDays: number[]
}

export type HabitSchedule = 'daily' | 'weekdays' | 'weekends' | 'custom'

export interface HabitLogLike {
  habitId: string
  date: ISODate
  status: 'completed' | 'skipped'
}

/**
 * Whether a habit with the given schedule is due on `date`.
 *
 * - `daily`    -> always due
 * - `weekdays` -> Mon-Fri (1-5)
 * - `weekends` -> Sat-Sun (0, 6)
 * - `custom`   -> due when the date's weekday is in `customDays`
 *
 * An empty `customDays` is treated as "never due" rather than "always due",
 * so a misconfigured custom habit cannot silently count every day.
 */
export function isHabitScheduledForDate(
  schedule: HabitSchedule,
  customDays: number[],
  date: ISODate,
): boolean {
  switch (schedule) {
    case 'daily':
      return true
    case 'weekdays': {
      const wd = weekdayOf(date)
      return wd >= 1 && wd <= 5
    }
    case 'weekends': {
      const wd = weekdayOf(date)
      return wd === 0 || wd === 6
    }
    case 'custom':
      return customDays.length > 0 && customDays.includes(weekdayOf(date))
    default:
      return false
  }
}

/** Active habits scheduled for `date`, in stable (id-sorted) order. */
export function scheduledHabitsForDate(
  habits: HabitLike[],
  date: ISODate,
): HabitLike[] {
  return habits
    .filter((h) => h.active)
    .filter((h) => isHabitScheduledForDate(h.schedule, h.customDays, date))
    .sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * Whether the Habits category day is complete.
 *
 * - If no active habit is scheduled for `date`, the day is **not** complete
 *   (there is nothing to complete). This keeps the streak honest: an empty
 *   habit list does not produce an infinite streak.
 * - Otherwise the day is complete only when every scheduled habit has a
 *   `completed` log for that date. A `skipped` log does **not** count as
 *   completion — habit skips are handled separately at the category level
 *   via the streak-skip mechanism.
 */
export function isHabitsDayComplete(
  habits: HabitLike[],
  logs: HabitLogLike[],
  date: ISODate,
): boolean {
  const scheduled = scheduledHabitsForDate(habits, date)
  if (scheduled.length === 0) return false

  const completedIds = new Set<string>()
  for (const log of logs) {
    if (log.date === date && log.status === 'completed') completedIds.add(log.habitId)
  }

  return scheduled.every((h) => completedIds.has(h.id))
}

/** Per-habit completion detail for a date, for diagnostics/display. */
export interface HabitDayDetail {
  habitId: string
  scheduled: boolean
  completed: boolean
  skipped: boolean
}

export function habitDayDetails(
  habits: HabitLike[],
  logs: HabitLogLike[],
  date: ISODate,
): HabitDayDetail[] {
  const scheduled = scheduledHabitsForDate(habits, date)
  const byHabit = new Map<string, HabitLogLike>()
  for (const log of logs) {
    if (log.date === date) byHabit.set(log.habitId, log)
  }

  const details: HabitDayDetail[] = []
  for (const habit of habits) {
    if (!habit.active) continue
    const log = byHabit.get(habit.id)
    details.push({
      habitId: habit.id,
      scheduled: scheduled.some((h) => h.id === habit.id),
      completed: log?.status === 'completed',
      skipped: log?.status === 'skipped',
    })
  }
  return details
}
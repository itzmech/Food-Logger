import { describe, it, expect } from 'vitest'
import {
  isHabitScheduledForDate,
  scheduledHabitsForDate,
  isHabitsDayComplete,
} from '@/lib/habitCompletion'

const H = {
  daily: { id: 'h1', active: true, schedule: 'daily' as const, customDays: [] },
  weekdays: { id: 'h2', active: true, schedule: 'weekdays' as const, customDays: [] },
  weekends: { id: 'h3', active: true, schedule: 'weekends' as const, customDays: [] },
  // Monday=1, Wednesday=3, Thursday=4, Friday=5, Saturday=6
  custom: { id: 'h4', active: true, schedule: 'custom' as const, customDays: [1, 3, 4, 5, 6] },
  inactive: { id: 'h5', active: false, schedule: 'daily' as const, customDays: [] },
}

describe('isHabitScheduledForDate', () => {
  it('daily always due', () => {
    expect(isHabitScheduledForDate('daily', [], '2026-11-05')).toBe(true)
  })
  it('weekdays due Mon-Fri', () => {
    expect(isHabitScheduledForDate('weekdays', [], '2026-11-05')).toBe(true) // Thu
    expect(isHabitScheduledForDate('weekdays', [], '2026-11-07')).toBe(false) // Sat
  })
  it('weekends due Sat-Sun', () => {
    expect(isHabitScheduledForDate('weekends', [], '2026-11-07')).toBe(true) // Sat
    expect(isHabitScheduledForDate('weekends', [], '2026-11-06')).toBe(false) // Fri
  })
  it('custom respects customDays', () => {
    expect(isHabitScheduledForDate('custom', [1, 3, 5], '2026-11-05')).toBe(false) // Thu is 4, not in [1,3,5]
    expect(isHabitScheduledForDate('custom', [1, 3, 5, 4], '2026-11-05')).toBe(true) // with 4
    expect(isHabitScheduledForDate('custom', [1, 3, 5], '2026-11-07')).toBe(false) // Sat
  })
  it('empty customDays never due', () => {
    expect(isHabitScheduledForDate('custom', [], '2026-11-05')).toBe(false)
  })
})

describe('scheduledHabitsForDate', () => {
  it('includes only active + scheduled habits on Thursday', () => {
    // Thursday: daily + weekdays + custom(with 4)
    const result = scheduledHabitsForDate(
      [H.daily, H.weekdays, H.weekends, H.custom, H.inactive],
      '2026-11-05',
    )
    expect(result.map((h) => h.id)).toEqual(['h1', 'h2', 'h4'])
  })
  it('returns correct scheduled on Saturday', () => {
    // Saturday: daily + weekends + custom(with 6)
    const result = scheduledHabitsForDate(
      [H.daily, H.weekdays, H.weekends, H.custom, H.inactive],
      '2026-11-07',
    )
    expect(result.map((h) => h.id)).toEqual(['h1', 'h3', 'h4'])
  })
})

describe('isHabitsDayComplete', () => {
  const date = '2026-11-05' // Thursday
  // scheduled: daily, weekdays, custom (all have Thu in their schedule)
  const scheduled = [H.daily, H.weekdays, H.custom]

  it('false when no habits scheduled', () => {
    expect(isHabitsDayComplete([], [], '2026-11-05')).toBe(false)
  })
  it('true when all scheduled habits completed', () => {
    const logs = [
      { habitId: 'h1', date, status: 'completed' as const },
      { habitId: 'h2', date, status: 'completed' as const },
      { habitId: 'h4', date, status: 'completed' as const },
    ]
    expect(isHabitsDayComplete(scheduled, logs, date)).toBe(true)
  })
  it('false when one scheduled habit missing', () => {
    const logs = [
      { habitId: 'h1', date, status: 'completed' as const },
      { habitId: 'h2', date, status: 'completed' as const },
    ]
    expect(isHabitsDayComplete(scheduled, logs, date)).toBe(false)
  })
  it('false when a habit is skipped (not completed)', () => {
    const logs = [
      { habitId: 'h1', date, status: 'completed' as const },
      { habitId: 'h2', date, status: 'completed' as const },
      { habitId: 'h4', date, status: 'skipped' as const },
    ]
    expect(isHabitsDayComplete(scheduled, logs, date)).toBe(false)
  })
  it('ignores logs for unscheduled habits', () => {
    const logs = [
      { habitId: 'h1', date, status: 'completed' as const },
      { habitId: 'h2', date, status: 'completed' as const },
      { habitId: 'h4', date, status: 'completed' as const },
      { habitId: 'h3', date, status: 'completed' as const }, // weekend habit, not due Thu
    ]
    expect(isHabitsDayComplete(scheduled, logs, date)).toBe(true)
  })
})

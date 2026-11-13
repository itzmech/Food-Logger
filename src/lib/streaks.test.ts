import { describe, it, expect } from 'vitest'
import { calculateStreak, computeStreak, dayGoodFn } from '@/lib/streaks'
import type { DayStatus, StreakCategory } from '@/lib/streaks'
import type { ISODate } from '@/types'
import { addDays, diffInDays, toISODate } from '@/utils/date'
import { DB_VERSION, STORE_SCHEMAS } from '@/db/schema'

const REFERENCE_DATE: ISODate = '2026-11-13'
const CATEGORIES: StreakCategory[] = ['habit', 'gym', 'cardio']

function dateAt(offset: number): ISODate {
  return addDays(REFERENCE_DATE, offset)
}

function calculate(
  category: StreakCategory,
  statuses: Partial<Record<ISODate, DayStatus['status']>>,
  lookbackDays = 10,
) {
  const historyStartDate = addDays(REFERENCE_DATE, -lookbackDays + 1)
  return computeStreak(
    category,
    (date) => statuses[date] === 'active',
    REFERENCE_DATE,
    historyStartDate,
    (date) => statuses[date] === 'skipped',
  )
}

describe.each(CATEGORIES)('computeStreak for %s', (category) => {
  it('counts first, consecutive and multiple completed days', () => {
    expect(calculate(category, { [dateAt(0)]: 'active' }).current).toBe(1)
    expect(
      calculate(category, {
        [dateAt(-1)]: 'active',
        [dateAt(0)]: 'active',
      }).current,
    ).toBe(2)
    const several = calculate(
      category,
      Object.fromEntries(
        Array.from({ length: 5 }, (_, i) => [dateAt(i - 4), 'active']),
      ),
    )
    expect(several.current).toBe(5)
    expect(several.best).toBe(5)
  })

  it('pauses across one or multiple skips without counting skipped days', () => {
    const oneSkip = calculate(category, {
      [dateAt(-2)]: 'active',
      [dateAt(-1)]: 'skipped',
      [dateAt(0)]: 'active',
    })
    expect(oneSkip.current).toBe(2)
    expect(oneSkip.best).toBe(2)
    expect(oneSkip.history.find((item) => item.date === dateAt(-1))?.status).toBe('skipped')

    const multipleSkips = calculate(category, {
      [dateAt(-4)]: 'active',
      [dateAt(-3)]: 'skipped',
      [dateAt(-2)]: 'skipped',
      [dateAt(-1)]: 'active',
      [dateAt(0)]: 'active',
    })
    expect(multipleSkips.current).toBe(3)
    expect(multipleSkips.best).toBe(3)
  })

  it('resets on a missed day and retains the longest streak', () => {
    const result = calculate(category, {
      [dateAt(-5)]: 'active',
      [dateAt(-4)]: 'active',
      [dateAt(-3)]: 'active',
      [dateAt(-2)]: 'missed',
      [dateAt(-1)]: 'missed',
      [dateAt(0)]: 'active',
    })
    expect(result.current).toBe(1)
    expect(result.best).toBe(3)
  })

  it('recalculates after historical completion edits and deletions', () => {
    const records: Partial<Record<ISODate, DayStatus['status']>> = {
      [dateAt(-2)]: 'active',
      [dateAt(-1)]: 'active',
      [dateAt(0)]: 'missed',
    }
    expect(calculate(category, records).current).toBe(0)

    records[dateAt(0)] = 'active'
    expect(calculate(category, records).current).toBe(3)

    delete records[dateAt(-1)]
    expect(calculate(category, records).current).toBe(1)
  })

  it('recalculates after historical skip edits and deletions', () => {
    const records: Partial<Record<ISODate, DayStatus['status']>> = {
      [dateAt(-2)]: 'active',
      [dateAt(-1)]: 'missed',
      [dateAt(0)]: 'active',
    }
    expect(calculate(category, records).current).toBe(1)

    records[dateAt(-1)] = 'skipped'
    expect(calculate(category, records).current).toBe(2)

    delete records[dateAt(-1)]
    expect(calculate(category, records).current).toBe(1)
  })
})

describe('streak calculation dates and category separation', () => {
  it('keeps category histories independent', () => {
    const habit = calculate('habit', { [dateAt(-1)]: 'active', [dateAt(0)]: 'active' })
    const gym = calculate('gym', { [dateAt(0)]: 'active' })
    const cardio = calculate('cardio', { [dateAt(-2)]: 'active', [dateAt(0)]: 'active' })

    expect([habit.current, gym.current, cardio.current]).toEqual([2, 1, 1])
    expect(habit.category).toBe('habit')
    expect(gym.category).toBe('gym')
    expect(cardio.category).toBe('cardio')
  })

  it('does not count skips as completed days, including when today is skipped', () => {
    const result = calculate('cardio', {
      [dateAt(-2)]: 'active',
      [dateAt(-1)]: 'skipped',
      [dateAt(0)]: 'skipped',
    })
    expect(result.current).toBe(1)
    expect(result.best).toBe(1)
    expect(result.lastActiveDate).toBe(dateAt(-2))
    expect(result.daysSinceActive).toBe(2)
  })

  it('uses the supplied historical reference date for its exact local-date window', () => {
    const result = computeStreak('habit', () => true, REFERENCE_DATE, dateAt(-2))
    expect(result.history.map((item) => item.date)).toEqual([
      dateAt(-2),
      dateAt(-1),
      dateAt(0),
    ])
    expect(result.current).toBe(3)
  })

  it('uses local calendar arithmetic across UTC and DST boundaries', () => {
    const originalTimeZone = process.env.TZ
    process.env.TZ = 'America/Los_Angeles'
    try {
      const localLateEvening = new Date(2026, 10, 1, 23, 30)
      expect(toISODate(localLateEvening)).toBe('2026-11-01')
      expect(localLateEvening.toISOString().slice(0, 10)).toBe('2026-11-02')
      expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
      expect(diffInDays('2026-11-01', '2026-11-02')).toBe(1)
    } finally {
      if (originalTimeZone === undefined) delete process.env.TZ
      else process.env.TZ = originalTimeZone
    }
  })

  it('enforces a unique skip per category and date without mixing categories', () => {
    const index = STORE_SCHEMAS.find((store) => store.name === 'streakSkips')
      ?.indexes.find((candidate) => candidate.name === 'category+date')
    expect(index).toMatchObject({
      keyPath: ['category', 'date'],
      unique: true,
    })
    expect(DB_VERSION).toBeGreaterThan(12)
  })

  it('calculates totals from an explicitly supplied history', () => {
    const result = calculateStreak(
      'gym',
      [
        { date: dateAt(-2), status: 'active' },
        { date: dateAt(-1), status: 'skipped' },
        { date: dateAt(0), status: 'active' },
      ],
      REFERENCE_DATE,
    )
    expect(result.current).toBe(2)
    expect(result.best).toBe(2)
  })

  it('calculates best across more than 365 days and discloses history completeness', () => {
    const start = addDays(REFERENCE_DATE, -500)
    const result = computeStreak('cardio', () => true, REFERENCE_DATE, start)
    expect(result.history).toHaveLength(501)
    expect(result.best).toBe(501)
    expect(result.current).toBe(501)
    expect(result.historyStartDate).toBe(start)
    expect(result.historyCompleteness).toBe('unknown')
  })

  it('dayGoodFn remains a simple activity-or-skip predicate', () => {
    const predicate = dayGoodFn(
      (date) => date === dateAt(0),
      (date) => date === dateAt(-1),
    )
    expect(predicate(dateAt(0))).toBe(true)
    expect(predicate(dateAt(-1))).toBe(true)
    expect(predicate(dateAt(-2))).toBe(false)
  })
})

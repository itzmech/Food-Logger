import { useMemo } from 'react'
import { formatShortDate, formatLongDate } from '@/utils/date'
import { WEEKDAY_MIN } from '@/lib/constants'
import type { MessMenu } from '@/types'
import { MEAL_TYPES } from '@/types'

export interface MenuCalendarProps {
  monthKey: string
  menu: MessMenu | undefined
  /** True while data is being re-read (e.g. after a save). */
  loading?: boolean
  /** Callback when a day is tapped: (dateIso) => void */
  onDayTap?: (dateIso: string) => void
  /** Extra caption shown under the month label. */
  caption?: string
}

/** Mobile-friendly month calendar. Each day shows how many meals are published that day; tapping a day opens its menu. */
export function MenuCalendar({
  monthKey,
  menu,
  loading = false,
  onDayTap,
  caption,
}: MenuCalendarProps) {
  const days = useMemo(() => {
    const total = new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 0).getDate()
    return Array.from({ length: total }, (_, i) =>
      `${monthKey.slice(0, 4)}-${String(monthKey.slice(5, 7)).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
    )
  }, [monthKey])

  // Pad the calendar grid so day 1 lands on the right weekday column.
  const leadingBlanks = useMemo(() => Array.from({ length: weekdayOf(days[0]) }), [days])

  const cells = useMemo(() => {
    if (!menu) return days.map((date) => ({ date, hasMenu: false, meals: 0 }))
    const byDate = new Map<string, number>()
    for (const day of menu.days) {
      let count = 0
      for (const meal of MEAL_TYPES) {
        if (day.meals[meal]?.length) count++
      }
      byDate.set(day.date, count)
    }
    return days.map((date) => ({
      date,
      hasMenu: byDate.has(date),
      meals: byDate.get(date) ?? 0,
    }))
  }, [menu, days])

  const totalMeals = cells.filter((c) => c.hasMenu).length

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">{monthKey}</h2>
          <p className="text-sm text-ink-3">{formatLongDate(monthKey + '-01')}</p>
        </div>
        {caption ? <p className="text-sm text-ink-3">{caption}</p> : null}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-3">
        {loading ? (
          <div className="flex aspect-square min-h-28 items-center justify-center">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-accent/60 border-t-accent" />
          </div>
        ) : cells.length === 0 ? (
          <div className="flex aspect-square min-h-28 flex-col items-center justify-center text-center">
            <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-2 text-ink-3">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <p className="text-sm font-medium text-ink-2">No menu published</p>
            <p className="mt-1 text-[13px] text-ink-3">
              {totalMeals === 0 ? 'No meals scheduled' : 'All days empty'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-7 sm:gap-2">
            {WEEKDAY_MIN.map((letter, index) => (
              <span
                key={index}
                className="py-1 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3"
              >
                {letter}
              </span>
            ))}
            {leadingBlanks.map((_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {cells.map((cell) => (
              <button
                key={cell.date}
                type="button"
                onClick={() => onDayTap?.(cell.date)}
                aria-label={`${formatShortDate(cell.date)}${cell.hasMenu ? ' — ' + cell.meals + ' meals' : ''}${(!cell.hasMenu && cell.meals === 0) ? ' — no menu' : ''}`}
                className={cn(
                  'relative flex aspect-square flex-col items-center justify-center rounded-xl border text-center transition-colors touch-target',
                  cell.hasMenu
                    ? 'border-accent/30 bg-accent-dim text-accent-strong'
                    : 'border-transparent bg-surface-2 text-ink-3 hover:bg-surface-3 hover:text-ink',
                )}
              >
                <span
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    cell.hasMenu ? 'text-accent-strong' : 'text-ink-2',
                  )}
                >
                  {formatShortDate(cell.date)}
                </span>
                <span
                  className={cn(
                    'mt-0.5 flex h-1.5 w-1.5 rounded-full',
                    cell.hasMenu ? 'bg-accent-strong' : 'bg-ink-3',
                  )}
                />
                {cell.hasMenu ? (
                  <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-3">
                    {cell.meals} {cell.meals === 1 ? 'meal' : 'meals'}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** 0 (Sunday) … 6 (Saturday) */
function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getDay()
}

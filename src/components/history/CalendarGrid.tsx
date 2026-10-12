import { useMemo } from 'react'
import { Icon, type IconName } from '@/components/icons'
import { WEEKDAY_MIN } from '@/lib/constants'
import { weekdayOf } from '@/utils/date'
import type { DaySignal } from '@/lib/history'

export interface CalendarGridProps {
  monthKey: string
  signalsByDay: Record<string, DaySignal[]>
  activeDays: string[]
  selectedDay: string | null
  onDaySelect: (date: string) => void
  /** Show the indicator legend. */
  legend?: boolean
}

const LABELS: Record<DaySignal, string> = {
  food: 'Food',
  workout: 'Workout',
  cardio: 'Cardio',
  weight: 'Weight',
  'other-measurement': 'Measurement',
  planned: 'Planned',
}

const ICON: Record<DaySignal, IconName> = {
  food: 'food',
  workout: 'workout',
  cardio: 'cardio',
  weight: 'scale',
  'other-measurement': 'ruler',
  planned: 'calendar',
}

export function CalendarGrid({
  monthKey,
  signalsByDay,
  activeDays,
  selectedDay,
  onDaySelect,
  legend = false,
}: CalendarGridProps) {
  // `activeDays` is kept in the API for future highlight use; current impl
  // derives activity from signalsByDay directly.
  void activeDays
  const { cells, weekdayHeaders } = useMemo(() => buildCells(monthKey, signalsByDay, selectedDay), [
    monthKey,
    signalsByDay,
    selectedDay,
  ])

  return (
    <div>
      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1">
        {weekdayHeaders.map((wd, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-medium uppercase tracking-wide text-ink-3"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => (
          <button
            key={cell._key ?? cell.date}
            type="button"
            onClick={() => onDaySelect(cell.date)}
            className={`
              aspect-square flex flex-col items-center justify-center rounded-xl
              border transition-colors duration-150 p-0.5
              ${cell.isEmpty ? 'border-transparent' : 'border-line'}
              ${cell.isSelected
                ? 'bg-accent-dim border-accent-strong'
                : cell.isToday
                  ? 'border-dashed border-line-strong'
                  : 'bg-surface-2/60'
              }
              ${cell.isFuture ? 'opacity-40' : 'cursor-pointer'}
            `}
            aria-label={
              cell.date +
              (cell.signals.length > 0
                ? ' — ' + cell.signals.map((s) => LABELS[s]).join(', ')
                : '')
            }
          >
            <span
              className={`
                text-[12px] font-medium
                ${cell.isSelected ? 'text-accent-strong' : cell.isToday ? 'text-ink' : 'text-ink-2'}
              `}
            >
              {cell.dayNumber}
            </span>
            <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
              {cell.signals.map((sig) => (
                <span
                  key={sig}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-surface text-[9px]"
                  aria-label={LABELS[sig]}
                  title={LABELS[sig]}
                >
                  <Icon name={ICON[sig]} size={10} strokeWidth={2} />
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {legend ? (
        <div className="mt-3 flex flex-wrap gap-3 rounded-xl bg-surface-2/60 px-4 py-2.5">
          {(['food', 'workout', 'cardio', 'weight', 'other-measurement', 'planned'] as DaySignal[]).map(
            (sig) => (
              <div key={sig} className="flex items-center gap-1.5 text-[11px] text-ink-3">
                <Icon name={ICON[sig]} size={12} strokeWidth={2} />
                <span>{LABELS[sig]}</span>
              </div>
            ),
          )}
        </div>
      ) : null}
    </div>
  )
}

interface Cell {
  date: string
  dayNumber: number
  signals: DaySignal[]
  isEmpty: boolean
  isSelected: boolean
  isToday: boolean
  isFuture: boolean
  _key?: string
}

function buildCells(
  monthKey: string,
  signalsByDay: Record<string, DaySignal[]>,
  selectedDay: string | null,
): { cells: Cell[]; weekdayHeaders: string[] } {
  const [year, month] = monthKey.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = todayISO()

  // Pad so day 1 lands on the correct weekday column.
  const firstWeekday = weekdayOf(`${monthKey}-01`)
  const leadingBlanks = firstWeekday // Sunday=0 .. Saturday=6

  const cells: Cell[] = []
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ date: '', dayNumber: 0, signals: [], isEmpty: true, isSelected: false, isToday: false, isFuture: false, _key: `blank-${i}` })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${monthKey}-${String(day).padStart(2, '0')}`
    const signals = signalsByDay[date] ?? []
    cells.push({
      date,
      dayNumber: day,
      signals,
      isEmpty: signals.length === 0,
      isSelected: date === selectedDay,
      isToday: date === today,
      isFuture: date > today,
    })
  }

  // Weekday short labels.
  const weekdayHeaders = WEEKDAY_MIN.map((wd) => wd)

  return { cells, weekdayHeaders }
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

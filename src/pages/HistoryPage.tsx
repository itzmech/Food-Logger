import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Icon } from '@/components/icons'
import { CalendarGrid } from '@/components/history/CalendarGrid'
import { DayDetail } from '@/components/history/DayDetail'
import { WeekSummary } from '@/components/history/WeekSummary'
import { useHistory } from '@/hooks/useHistory'
import { todayISO, parseISODate, toISODate } from '@/utils/date'
import { formatLongDate } from '@/utils/date'

export default function HistoryPage() {
  const { month, selectDay, selectedDay, selectMonth } = useHistory()

  const today = todayISO()

  const showCurrentMonth = () => selectMonth(today.slice(0, 7))

  return (
    <div className="space-y-5">
      <PageHeader
        title="History"
        subtitle="What happened on each day"
        action={
          <button
            type="button"
            onClick={showCurrentMonth}
            className="text-[12px] text-ink-2 underline underline-offset-2"
          >
            This month
          </button>
        }
      />

      {/* Month navigation */}
      <Card className="stagger">
        <div className="flex items-center justify-between rounded-2xl border border-line bg-surface-2/60 px-4 py-3">
          <button
            type="button"
            onClick={() => selectMonth(month.monthKey)}
            className="
              flex h-9 w-9 items-center justify-center rounded-lg text-ink-2
              hover:bg-surface hover:text-ink transition-colors
            "
            aria-label="Previous month"
          >
            <Icon name="chevron-left" size={20} />
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold text-ink">{month.label}</p>
            <p className="text-[11px] text-ink-3">
              {selectedDay != null
                ? formatLongDate(selectedDay)
                : 'Tap a day for details'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => selectMonth(month.monthKey)}
            className="
              flex h-9 w-9 items-center justify-center rounded-lg text-ink-2
              hover:bg-surface hover:text-ink transition-colors
            "
            aria-label="Next month"
          >
            <Icon name="chevron-right" size={20} />
          </button>
        </div>

        <div className="mt-3">
          <CalendarGrid
            monthKey={month.monthKey}
            signalsByDay={month.signalsByDay}
            activeDays={month.activeDays}
            selectedDay={selectedDay}
            onDaySelect={(date) => selectDay(date)}
            legend
          />
        </div>
      </Card>

      {/* Selected day detail + week summary */}
      {selectedDay != null ? (
        <div className="space-y-4">
          <DayDetail
            date={selectedDay}
            day={month.days.find((d) => d.date === selectedDay) ?? null}
          />
          <WeekSummary
            weekStart={weekStartContaining(selectedDay)}
            days={month.days}
          />
        </div>
      ) : (
        <Card className="stagger">
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface-2/60 px-4 py-8 text-center">
            <Icon name="calendar" size={28} strokeWidth={1.5} className="text-ink-3" />
            <p className="text-sm font-medium text-ink-2">Select a day</p>
            <p className="text-[12px] text-ink-3 max-w-xs">
              Tap any day on the calendar to see what was logged — food, workout,
              cardio, weight and other measurements.
            </p>
          </div>
        </Card>
      )}

      {/* Access to underlying lists */}
      <Card className="stagger">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-line bg-surface-2/60 px-4 py-3">
          <Link
            to="/food"
            className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-surface-2"
          >
            <Icon name="food" size={14} />
            Food logs
          </Link>
          <Link
            to="/workout"
            className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-surface-2"
          >
            <Icon name="workout" size={14} />
            Workout history
          </Link>
        </div>
      </Card>
    </div>
  )
}

/** Navigate to the 7-day window (Mon-start) that contains `day`. */
function weekStartContaining(day: string): string {
  const d = parseISODate(day)
  const weekStart = new Date(d)
  weekStart.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return toISODate(weekStart)
}

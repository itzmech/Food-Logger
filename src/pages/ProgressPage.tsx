import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Icon } from '@/components/icons'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { TrendChart } from '@/components/charts/TrendChart'
import { WeightLogger } from '@/components/progress/WeightLogger'
import { useGoal } from '@/hooks/useGoal'
import { useSettings } from '@/hooks/useSettings'
import { useStreaks } from '@/hooks/useStreaks'
import { workoutFrequencyFromSummaries, weightSeries, weightStats } from '@/lib/analytics'
import { getHistoryRange, type DailyHistorySummary } from '@/lib/history'
import { STREAK_TIER_COLORS, streakTier } from '@/lib/streaks'
import type { StreakCategory } from '@/lib/streaks'
import { addDays, eachDay, formatLongDate, formatShortDate, startOfWeek, todayISO } from '@/utils/date'

const CATEGORY_META: Record<StreakCategory, { label: string; color: string }> = {
  habit: { label: 'Habits', color: '#8855F6' },
  gym: { label: 'Gym', color: '#3882F6' },
  cardio: { label: 'Cardio', color: '#06B6D4' },
}

type DayStatus = 'active' | 'skipped' | 'missed' | 'unknown'

export default function ProgressPage() {
  const { streaks, loading: streaksLoading, error: streaksError } = useStreaks()
  const { data: goal } = useGoal()
  const { settings } = useSettings()
  const [category, setCategory] = useState<StreakCategory>('habit')
  const [history, setHistory] = useState<DailyHistorySummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const today = todayISO()
  const weekStartsOn = settings?.weekStartsOn ?? 1
  const rangeStart = addDays(startOfWeek(today, weekStartsOn), -77)
  const rangeEnd = today

  useEffect(() => {
    let cancelled = false
    setHistoryLoading(true)
    setHistoryError(null)
    void getHistoryRange(rangeStart, rangeEnd, { loadAllMeasurements: true })
      .then((days) => {
        if (!cancelled) setHistory(days)
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setHistoryError(cause instanceof Error ? cause.message : 'Could not load progress history.')
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => { cancelled = true }
  }, [rangeEnd, rangeStart])

  const selectedStreak = streaks.find((item) => item.category === category)
  const dayStatuses = useMemo(() => {
    const from = addDays(today, -29)
    const byDate = new Map(selectedStreak?.history.map((item) => [item.date, item.status]) ?? [])
    return eachDay(from, today).map((date) => ({
      date,
      status: byDate.get(date) ?? 'unknown' as DayStatus,
    }))
  }, [selectedStreak, today])

  const counts = useMemo(() => dayStatuses.reduce(
    (result, day) => {
      result[day.status] += 1
      return result
    },
    { active: 0, skipped: 0, missed: 0, unknown: 0 },
  ), [dayStatuses])

  const weightPoints = useMemo(() => weightSeries(history), [history])
  const weightSummary = useMemo(() => weightStats(history), [history])
  const workoutBuckets = useMemo(
    () => workoutFrequencyFromSummaries(history, '90d', weekStartsOn),
    [history, weekStartsOn],
  )

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Progress"
        subtitle="Your recorded consistency and trends"
        compact
      />

      {streaksError ? <ErrorNotice message={`Streak data could not be loaded: ${streaksError.message}`} /> : null}
      {historyError ? <ErrorNotice message={`Progress history could not be loaded: ${historyError}`} /> : null}

      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Choose streak category">
        {(['habit', 'gym', 'cardio'] as const).map((item) => {
          const selected = category === item
          return (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={selected}
              className={`min-h-11 rounded-xl border px-2 text-xs font-semibold transition-colors ${selected ? 'bg-surface text-ink' : 'border-line bg-base-raised text-ink-3 hover:text-ink-2'}`}
              style={selected ? { borderColor: `${CATEGORY_META[item].color}80`, color: CATEGORY_META[item].color } : undefined}
            >
              {CATEGORY_META[item].label}
            </button>
          )
        })}
      </div>

      <section
        className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-surface p-4"
        style={{ backgroundImage: `radial-gradient(120% 140% at 4% -14%, ${selectedStreak ? `${STREAK_TIER_COLORS[streakTier(selectedStreak.best)]}22` : 'rgba(255,255,255,0.06)'}, transparent 62%)` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">Current streak</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[40px] font-extrabold leading-none tabular-nums" style={{ color: selectedStreak ? STREAK_TIER_COLORS[streakTier(selectedStreak.current)] : '#B7C2CC' }}>
                {selectedStreak?.current ?? 0}
              </span>
              <span className="text-xs font-medium text-ink-2">days</span>
            </p>
            <p className="mt-2 text-[11px] font-medium" style={{ color: CATEGORY_META[category].color }}>{CATEGORY_META[category].label}</p>
          </div>
          <div className="rounded-full border border-white/[0.08] bg-base-raised/60 px-2.5 py-1 text-[10px] font-semibold text-ink-2">
            {streaksLoading ? 'Loading…' : `${selectedStreak?.best ?? 0} best recorded`}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-3 text-[11px]">
          <span className="text-ink-3">Best recorded streak</span>
          <span className="font-semibold tabular-nums text-ink">
            {selectedStreak?.best ?? 0} {selectedStreak?.best === 1 ? 'day' : 'days'}
          </span>
        </div>
        {selectedStreak ? (
          <p className="mt-2 text-[10px] leading-relaxed text-ink-3">
            Stored {CATEGORY_META[category].label.toLowerCase()} history is available from {formatLongDate(selectedStreak.historyStartDate)}. Lifetime coverage is unknown.
          </p>
        ) : null}
      </section>

      <SectionCard
        title="Consistency"
        description={`Last 30 local calendar days · ${CATEGORY_META[category].label}`}
        action={<span className="text-[10px] text-ink-3">{formatShortDate(addDays(today, -29))} – {formatShortDate(today)}</span>}
      >
        <div className="grid grid-cols-6 gap-y-2 sm:grid-cols-10">
          {dayStatuses.map(({ date, status }) => (
            <CalendarDay key={date} date={date} status={status} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.06] pt-3 text-[10px] text-ink-3">
          <LegendItem status="active" label={`Completed ${counts.active}`} />
          <LegendItem status="skipped" label={`Skipped ${counts.skipped}`} />
          <LegendItem status="missed" label={`Missed ${counts.missed}`} />
          {counts.unknown ? <LegendItem status="unknown" label={`No stored history ${counts.unknown}`} /> : null}
        </div>
        {selectedStreak?.historyStartDate && counts.unknown ? (
          <p className="mt-2 text-[10px] leading-relaxed text-ink-3">
            Days before stored history begins are shown as unknown, not as missed days.
          </p>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Weight"
        description={`Recorded measurements · ${formatShortDate(rangeStart)} – ${formatShortDate(today)}`}
        action={
          <div className="text-right">
            <p className="text-[16px] font-semibold leading-none tabular-nums text-ink">{weightSummary.latestLabel}</p>
            {weightSummary.change != null ? (
              <p className="mt-1 text-[10px] tabular-nums text-ink-3">
                {weightSummary.change > 0 ? '+' : ''}{weightSummary.change.toFixed(1)} kg in this range
              </p>
            ) : null}
          </div>
        }
      >
        {historyLoading ? (
          <p className="py-8 text-center text-xs text-ink-3">Loading recorded measurements…</p>
        ) : (
          <TrendChart
            data={weightPoints.map(({ label, value }) => ({ label, value }))}
            unit="kg"
            height={160}
            color="#A78BF7"
            emptyIcon="scale"
            emptyTitle="No weight records in this range"
            emptyMessage="Log a measurement to build a real trend line."
          />
        )}
      </SectionCard>

      <SectionCard
        title="Training days per week"
        description={`Recorded workout days · ${formatShortDate(rangeStart)} – ${formatShortDate(today)}`}
        action={goal?.weeklyWorkouts ? <span className="text-[10px] text-ink-3">Goal {goal.weeklyWorkouts}</span> : undefined}
      >
        {historyLoading ? (
          <p className="py-8 text-center text-xs text-ink-3">Loading workout history…</p>
        ) : workoutBuckets.length === 0 ? (
          <EmptyState compact icon="dumbbell" title="No completed training days recorded" message="Completed workouts will appear here by week." />
        ) : (
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workoutBuckets} margin={{ top: 8, right: 6, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#1e2230" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#6e7688', fontSize: 10 }} minTickGap={20} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={34} tick={{ fill: '#6e7688', fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(56,130,246,0.08)' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="rounded-xl border border-line bg-overlay px-3 py-2 shadow-xl">
                        <p className="text-[11px] text-ink-3">{label}</p>
                        <p className="text-sm font-semibold text-ink">{payload[0]?.value} days</p>
                      </div>
                    )
                  }}
                />
                {goal?.weeklyWorkouts ? <ReferenceLine y={goal.weeklyWorkouts} stroke="#9AAAB2" strokeDasharray="4 4" /> : null}
                <Bar dataKey="value" name="Training days" fill="#3882F6" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Log a measurement" description="New weight records update the chart from your actual history.">
        <WeightLogger />
      </SectionCard>
    </div>
  )
}

function CalendarDay({ date, status }: { date: string; status: DayStatus }) {
  const styles: Record<DayStatus, string> = {
    active: 'bg-success text-base',
    skipped: 'border border-dashed border-line-strong bg-base-raised text-ink-3',
    missed: 'bg-surface-2 text-ink-3',
    unknown: 'border border-line bg-base-raised text-ink-3',
  }
  return (
    <div className="flex min-h-10 flex-col items-center justify-center gap-1" title={`${formatLongDate(date)}: ${status}`}>
      <span className="text-[9px] leading-none text-ink-3">{Number(date.slice(-2))}</span>
      <span
        aria-label={`${date}: ${status}`}
        className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ${styles[status]}`}
      >
        {status === 'active' ? <Icon name="check" size={11} strokeWidth={2.5} /> : null}
        {status === 'skipped' ? <span aria-hidden="true" className="text-[11px] leading-none">·</span> : null}
      </span>
    </div>
  )
}

function LegendItem({ status, label }: { status: DayStatus; label: string }) {
  const style: Record<DayStatus, string> = {
    active: 'bg-success',
    skipped: 'border border-dashed border-line-strong',
    missed: 'bg-surface-2',
    unknown: 'border border-line',
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-full ${style[status]}`} />
      {label}
    </span>
  )
}

function ErrorNotice({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl border border-danger/30 bg-danger-dim px-3 py-2 text-sm text-danger">{message}</p>
}

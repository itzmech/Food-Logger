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
import { useGoal } from '@/hooks/useGoal'
import { useSettings } from '@/hooks/useSettings'
import { useStreaks } from '@/hooks/useStreaks'
import { cardioFromSummaries, workoutFrequencyFromSummaries } from '@/lib/analytics'
import { getHistoryRange, type DailyHistorySummary } from '@/lib/history'
import type { StreakCategory } from '@/lib/streaks'
import { addDays, eachDay, formatLongDate, formatShortDate, todayISO } from '@/utils/date'

const CATEGORY_META: Record<StreakCategory, { label: string; color: string }> = {
  habit: { label: 'Habits', color: '#22C55E' },
  gym: { label: 'Workout', color: '#3B82F6' },
  cardio: { label: 'Cardio', color: '#22D3EE' },
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
  const rangeStart = addDays(today, -89)
  const rangeEnd = today

  useEffect(() => {
    let cancelled = false
    setHistoryLoading(true)
    setHistoryError(null)
    void getHistoryRange(rangeStart, rangeEnd, {
      includeFood: false,
      includeMeasurements: false,
      includeActivityCalories: false,
    })
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

  const workoutBuckets = useMemo(
    () => workoutFrequencyFromSummaries(history, '90d', weekStartsOn),
    [history, weekStartsOn],
  )
  const cardioBuckets = useMemo(
    () => cardioFromSummaries(history, '90d', weekStartsOn),
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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="Choose streak category">
        {(['habit', 'gym', 'cardio'] as const).map((item) => {
          const selected = category === item
          const itemStreak = streaks.find((streak) => streak.category === item)
          return (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={selected}
              className={`flex min-h-[76px] items-center justify-between gap-2 rounded-xl border px-3 text-left transition-colors ${selected ? 'bg-surface' : 'bg-base-raised hover:bg-surface-2'}`}
              style={{
                borderColor: `${CATEGORY_META[item].color}${selected ? '80' : '35'}`,
                backgroundImage: selected
                  ? `linear-gradient(120deg, ${CATEGORY_META[item].color}14, transparent 75%)`
                  : undefined,
              }}
            >
              <span>
                <span className="block text-xs font-semibold" style={{ color: CATEGORY_META[item].color }}>
                  {CATEGORY_META[item].label}
                </span>
                <span className="mt-1 block text-[11px] text-ink-2">{itemStreak?.current ?? 0} current</span>
              </span>
              <span className="text-right">
                <span className="block text-xl font-bold tabular-nums" style={{ color: CATEGORY_META[item].color }}>
                  {itemStreak?.best ?? 0}
                </span>
                <span className="block text-[10px] text-ink-2">best recorded</span>
              </span>
            </button>
          )
        })}
      </div>

      <section
        className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4"
        style={{ borderColor: `${CATEGORY_META[category].color}55`, backgroundImage: `radial-gradient(120% 140% at 4% -14%, ${CATEGORY_META[category].color}20, transparent 62%)` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">Current streak</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[40px] font-extrabold leading-none tabular-nums" style={{ color: CATEGORY_META[category].color }}>
                {selectedStreak?.current ?? 0}
              </span>
              <span className="text-xs font-medium text-ink-2">days</span>
            </p>
            <p className="mt-2 text-[11px] font-medium" style={{ color: CATEGORY_META[category].color }}>{CATEGORY_META[category].label}</p>
          </div>
          <div className="rounded-full border border-line bg-base-raised px-2.5 py-1 text-[10px] font-semibold text-ink-2">
            {streaksLoading ? 'Loading…' : 'Recorded history'}
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
            <CalendarDay key={date} date={date} status={status} color={CATEGORY_META[category].color} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.06] pt-3 text-[10px] text-ink-3">
          <LegendItem status="active" label={`Completed ${counts.active}`} color={CATEGORY_META[category].color} />
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
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} minTickGap={20} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={34} tick={{ fill: '#94A3B8', fontSize: 10 }} />
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
                <Bar dataKey="value" name="Training days" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Cardio minutes per week"
        description={`Recorded cardio duration · ${formatShortDate(rangeStart)} – ${formatShortDate(today)}`}
        action={goal?.weeklyCardioMinutes ? <span className="text-[10px] text-ink-2">Goal {goal.weeklyCardioMinutes} min</span> : undefined}
      >
        {historyLoading ? (
          <p className="py-8 text-center text-xs text-ink-2">Loading cardio history…</p>
        ) : cardioBuckets.length === 0 ? (
          <EmptyState compact icon="cardio" title="No cardio sessions recorded" message="Recorded sessions will appear here by week." />
        ) : (
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cardioBuckets} margin={{ top: 8, right: 6, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} minTickGap={20} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={34} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(34,211,238,0.1)' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="rounded-xl border border-line bg-overlay px-3 py-2 shadow-xl">
                        <p className="text-[11px] text-ink-2">{label}</p>
                        <p className="text-sm font-semibold text-cardio">{payload[0]?.value} min</p>
                      </div>
                    )
                  }}
                />
                {goal?.weeklyCardioMinutes ? <ReferenceLine y={goal.weeklyCardioMinutes} stroke="#22D3EE" strokeDasharray="4 4" /> : null}
                <Bar dataKey="minutes" name="Cardio minutes" fill="#22D3EE" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function CalendarDay({ date, status, color }: { date: string; status: DayStatus; color: string }) {
  const styles: Record<DayStatus, string> = {
    active: 'text-base',
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
        style={status === 'active' ? { backgroundColor: color } : undefined}
      >
        {status === 'active' ? <Icon name="check" size={11} strokeWidth={2.5} /> : null}
        {status === 'skipped' ? <span aria-hidden="true" className="text-[11px] leading-none">·</span> : null}
      </span>
    </div>
  )
}

function LegendItem({ status, label, color }: { status: DayStatus; label: string; color?: string }) {
  const style: Record<DayStatus, string> = {
    active: '',
    skipped: 'border border-dashed border-line-strong',
    missed: 'bg-surface-2',
    unknown: 'border border-line',
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`h-3 w-3 rounded-full ${style[status]}`}
        style={status === 'active' && color ? { backgroundColor: color } : undefined}
      />
      {label}
    </span>
  )
}

function ErrorNotice({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl border border-danger/30 bg-danger-dim px-3 py-2 text-sm text-danger">{message}</p>
}

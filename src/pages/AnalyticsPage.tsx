/**
 * Analytics page — derived charts on top of `src/lib/history.ts`.
 *
 * One history-range load drives every chart. Missing days are never plotted
 * as zero; averages are computed over days that actually have the data.
 * Everything here is read-only and derived from the existing history layer.
 */

import { useMemo, useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { MetricTile } from '@/components/ui/MetricTile'
import { StatTile } from '@/components/ui/StatTile'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/icons'
import {
  ANALYTICS_RANGES,
  ALL_TIME_FROM,
  actualDataWindow,
  cardioFromSummaries,
  cardioStatsFromSummaries,
  measurementSeries,
  nutritionStats,
  proteinSeries,
  type AnalyticsRange,
  type CardioBucket,
  type CardioStats,
  type MeasurementSeries as AnalyticsMeasurementSeries,
  type NutritionStats,
  type WorkoutBucket,
  weightSeries,
  weightStats,
  workoutFrequencyFromSummaries,
  calorieSeries,
} from '@/lib/analytics'
import { getHistoryRange, type DailyHistorySummary } from '@/lib/history'
import { todayISO, type ISODate } from '@/utils/date'
import { useGoal } from '@/hooks/useGoal'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/utils/cn'
import type { MeasurementType } from '@/types'

export default function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('30d')
  const [days, setDays] = useState<DailyHistorySummary[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'empty'>('loading')

  const goal = useGoal()
  const settings = useSettings()

  useEffect(() => {
    let cancelled = false
    let ignores = 0

    const load = async () => {
      ignores += 1
      const thisLoad = ignores
      setLoadState('loading')

      const today = todayISO()
      const from =
        range === 'all' ? ALL_TIME_FROM : ANALYTICS_RANGES[range].from(today)
      const resolved = await getHistoryRange(from, today, {
        loadAllMeasurements: true,
      })
      if (cancelled || thisLoad !== ignores) return

      setDays(resolved)
      setLoadState(resolved.length === 0 ? 'empty' : 'ready')
    }

    load()
    return () => {
      cancelled = true
    }
  }, [range])

  const body = useMemo(
    () => makeBody(days, goal.data, settings.settings, range),
    [days, goal.data, settings.settings, range],
  )

  if (loadState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Icon name="refresh" size={24} className="text-ink-3" />
        <p className="mt-3 text-sm font-medium text-ink">Loading analytics…</p>
        <p className="mt-1 text-[13px] text-ink-3">Reading history from this device.</p>
      </div>
    )
  }

  if (loadState === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Icon name="bar-chart" size={24} className="text-ink-3" />
        <p className="mt-3 text-sm font-medium text-ink">No data for this range yet</p>
        <p className="mt-1 text-[13px] text-ink-3">
          Start logging food, workouts, cardio, weight or measurements and they'll appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <AnalyticsHeader
        range={range}
        onRangeChange={setRange}
        windowLabel={windowLabelFor(days, range)}
      />

      <SummaryMetrics body={body} />

      <ChartSection icon="scale" title="Weight">
        <WeightChart data={body.weightData} unit={body.weightUnit} />
        <WeightStatsRow stats={body.weightStats} />
      </ChartSection>

      <ChartSection icon="flame" title="Nutrition">
        <div className="flex flex-col gap-4">
          <NutritionChart
            data={body.calorieData}
            unit="kcal"
            color="#a78bfa"
            target={body.goalCalories}
            valueFormatter={(v) => `${Math.round(v).toLocaleString()}`}
          />
          <NutritionChart
            data={body.proteinData}
            unit="g"
            color="#6ee7b7"
            target={body.goalProtein}
            valueFormatter={(v) => `${Math.round(v)}`}
          />
          <NutritionStatsRow calorieStats={body.calorieStats} proteinStats={body.proteinStats} />
        </div>
      </ChartSection>

      <ChartSection icon="dumbbell" title="Training">
        <WorkoutChart data={body.workoutBuckets} />
      </ChartSection>

      <ChartSection icon="cardio" title="Cardio">
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Cardio minutes
          </p>
          <CardioChart data={body.cardioData} />
          <CardioStatsRow stats={body.cardioStats} />
        </div>
      </ChartSection>

      <ChartSection icon="ruler" title="Body measurements">
        <MeasurementChart series={body.measurementSeries} />
      </ChartSection>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chart wrappers — small, focused, reuse a common tooltip.
// ---------------------------------------------------------------------------

function ChartTooltip(
  props: TooltipContentProps<number, string> & {
    unit?: string
    valueFormatter?: (v: number) => string
  },
) {
  const { active, payload, label } = props
  if (!active || !payload || payload.length === 0) return null
  const raw = payload[0]?.value
  const value = Number.isFinite(raw) ? (raw as number) : 0
  return (
    <div className="rounded-xl border border-line bg-overlay px-3 py-2 shadow-xl shadow-black/40">
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-3">
        {typeof label === 'string' ? label : ''}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-ink tabular-nums">
        {props.valueFormatter
          ? props.valueFormatter(value)
          : value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        {props.unit ? (
          <span className="ml-1 text-[12px] font-normal text-ink-3">{props.unit}</span>
        ) : null}
      </p>
    </div>
  )
}

function weightValueFormatter(v: number) {
  return `${v.toFixed(1)}`
}

function WeightChart({
  data,
  unit,
}: {
  data: Array<{ label: string; value: number }>
  unit?: string
}) {
  if (data.length < 2) {
    return (
      <EmptyState
        compact
        icon="scale"
        title={data.length > 0 ? `${data[data.length - 1].value.toFixed(1)} kg` : 'No weight data'}
        message={
          data.length === 0
            ? 'Log your weight to see your trend.'
            : 'Add another weight reading to see the trend line.'
        }
      />
    )
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="#1e2230" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#6e7688', fontSize: 11 }}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={42}
            tick={{ fill: '#6e7688', fontSize: 11 }}
            domain={['auto', 'auto']}
            tickFormatter={(v) => `${v.toFixed(0)}`}
          />
          <Tooltip
            cursor={{ stroke: '#2c3244', strokeDasharray: '3 3' }}
            content={(props) => (
              <ChartTooltip
                {...props as unknown as TooltipContentProps<number, string>}
                unit={unit}
                valueFormatter={weightValueFormatter}
              />
            )}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#a78bfa"
            strokeWidth={2}
            dot={{ r: 2.5, fill: '#a78bfa', strokeWidth: 0 }}
            activeDot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function NutritionChart({
  data,
  unit,
  color,
  target,
  valueFormatter,
}: {
  data: Array<{ label: string; value: number }>
  unit?: string
  color: string
  target: number | null
  valueFormatter: (v: number) => string
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        compact
        icon="flame"
        title="No nutrition history yet"
        message="Log food to see calorie and protein trends."
      />
    )
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="#1e2230" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#6e7688', fontSize: 11 }}
            minTickGap={20}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={42}
            tick={{ fill: '#6e7688', fontSize: 11 }}
            domain={['auto', 'auto']}
          />
          {target != null ? (
            <>
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                content={(props) => (
                  <ChartTooltip
                    {...props as unknown as TooltipContentProps<number, string>}
                    unit={unit}
                    valueFormatter={valueFormatter}
                  />
                )}
              />
              <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Line
                type="step"
                data={data.map((d) => ({ ...d, target }))}
                dataKey="target"
                stroke="#fbbf24"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
              />
            </>
          ) : (
            <>
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                content={(props) => (
                  <ChartTooltip
                    {...props as unknown as TooltipContentProps<number, string>}
                    unit={unit}
                    valueFormatter={valueFormatter}
                  />
                )}
              />
              <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={28} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function WorkoutChart({ data }: { data: WorkoutBucket[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        compact
        icon="dumbbell"
        title="No workouts yet"
        message="Finish a workout to see your frequency here."
      />
    )
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="#1e2230" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#6e7688', fontSize: 11 }}
            minTickGap={18}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={34}
            tick={{ fill: '#6e7688', fontSize: 11 }}
            domain={[0, 'auto']}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            content={(props) => (
              <ChartTooltip
                {...props as unknown as TooltipContentProps<number, string>}
                valueFormatter={(v) => `${v} workout${v === 1 ? '' : 's'}`}
              />
            )}
          />
          <Bar dataKey="value" fill="#6ee7b7" radius={[3, 3, 0, 0]} maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function CardioChart({ data }: { data: CardioBucket[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        compact
        icon="cardio"
        title="No cardio yet"
        message="Log a cardio session to see your minutes here."
      />
    )
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="#1e2230" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#6e7688', fontSize: 11 }}
            minTickGap={18}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={38}
            tick={{ fill: '#6e7688', fontSize: 11 }}
            domain={[0, 'auto']}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            content={(props) => (
              <ChartTooltip
                {...props as unknown as TooltipContentProps<number, string>}
                valueFormatter={(v) => `${Math.round(v)} min`}
              />
            )}
          />
          <Bar dataKey="minutes" fill="#60a5fa" radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function MeasurementChart({ series }: { series: AnalyticsMeasurementSeries[] }) {
  if (series.length === 0) {
    return (
      <EmptyState
        compact
        icon="ruler"
        title="Not enough measurements yet"
        message="Add another measurement to see a trend."
      />
    )
  }

  return (
    <div className="space-y-5">
      {series.map((s) => {
        if (s.data.length < 2) {
          return (
            <div key={s.type} className="flex flex-col gap-1.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                {s.label}
              </p>
              <EmptyState
                compact
                icon="ruler"
                title="Only one reading"
                message={`Logged ${s.data.length} time${s.data.length === 1 ? '' : 's'}. Add another to see the trend.`}
              />
            </div>
          )
        }

        return (
          <div key={s.type} className="flex flex-col gap-1.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
              {s.label}
            </p>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={s.data} margin={{ top: 6, right: 6, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke="#1e2230" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#6e7688', fontSize: 11 }}
                    minTickGap={24}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tick={{ fill: '#6e7688', fontSize: 11 }}
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => `${v.toFixed(0)}`}
                  />
                  <Tooltip
                    cursor={{ stroke: '#2c3244', strokeDasharray: '3 3' }}
                    content={(props) => (
                      <ChartTooltip
                        {...props as unknown as TooltipContentProps<number, string>}
                        unit={s.unit}
                        valueFormatter={(v) => `${v.toFixed(1)}`}
                      />
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#94a3b8', strokeWidth: 0 }}
                    activeDot={{ r: 4, fill: '#94a3b8', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section chrome
// ---------------------------------------------------------------------------

function AnalyticsHeader({
  range,
  onRangeChange,
  windowLabel,
}: {
  range: AnalyticsRange
  onRangeChange: (range: AnalyticsRange) => void
  windowLabel: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="bar-chart" size={18} className="text-ink-2" />
          <h1 className="text-[15px] font-semibold text-ink">Analytics</h1>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
          {(['7d', '30d', '90d', 'all'] as AnalyticsRange[]).map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 touch-target',
                range === r
                  ? 'bg-accent-dim text-accent-strong'
                  : 'text-ink-3 hover:text-ink-2',
              )}
            >
              {ANALYTICS_RANGES[r].label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[13px] text-ink-3">{windowLabel}</p>
    </div>
  )
}

function ChartSection({
  icon,
  title,
  children,
}: {
  icon: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Icon name={icon as 'bar-chart' | 'scale' | 'flame' | 'dumbbell' | 'cardio' | 'ruler'} size={16} className="text-ink-3" />
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Summary / stats rows
// ---------------------------------------------------------------------------

function SummaryMetrics({ body }: { body: Body }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricTile
        icon="scale"
        label="Current weight"
        value={
          body.weightStats.latest != null
            ? `${body.weightStats.latest.toFixed(1)} kg`
            : 'No weight data'
        }
        hint={
          body.weightStats.change != null
            ? `From ${body.weightStats.starting?.toFixed(1) ?? '—'} kg · ${formatWeightChange(body.weightStats.change)}`
            : body.weightStats.latest == null
              ? 'No weight data yet'
              : 'Add another reading to see change'
        }
      />
      <MetricTile
        icon="flame"
        label="Avg calories"
        value={
          body.calorieStats.average != null
            ? `${body.calorieStats.average.toLocaleString()}`
            : 'No data'
        }
        target={
          body.calorieStats.average != null && body.goalCalories != null
            ? `/ ${body.goalCalories.toLocaleString()} kcal`
            : null
        }
        hint={
          body.calorieStats.loggedDays > 0
            ? `${body.calorieStats.loggedDays} logged day${body.calorieStats.loggedDays === 1 ? '' : 's'}`
            : 'No food logged in range'
        }
        tone={body.calorieStats.average != null ? ('accent' as const) : undefined}
      />
      <MetricTile
        icon="target"
        label="Avg protein"
        value={body.proteinStats.average != null ? `${body.proteinStats.average}` : 'No data'}
        target={
          body.proteinStats.average != null && body.goalProtein != null
            ? `/ ${body.goalProtein} g`
            : null
        }
        hint={
          body.proteinStats.loggedDays > 0
            ? `${body.proteinStats.loggedDays} logged day${body.proteinStats.loggedDays === 1 ? '' : 's'}`
            : 'No food logged in range'
        }
        tone={body.proteinStats.average != null ? ('accent' as const) : undefined}
      />
      <MetricTile
        icon="dumbbell"
        label="Workouts"
        value={String(body.workoutTotal)}
        hint={
          body.workoutTotal > 0
            ? `${body.workoutTotal} completed workout${body.workoutTotal === 1 ? '' : 's'}`
            : 'No completed workouts in range'
        }
        tone={undefined}
      />
      <MetricTile
        icon="cardio"
        label="Cardio minutes"
        value={String(body.cardioStats.totalMinutes)}
        hint={
          body.cardioStats.sessionCount > 0
            ? `${body.cardioStats.sessionCount} session${body.cardioStats.sessionCount === 1 ? '' : 's'}`
            : 'No cardio logged in range'
        }
        tone={undefined}
      />
    </div>
  )
}

function WeightStatsRow({ stats }: { stats: ReturnType<typeof weightStats> }) {
  const rows = [
    {
      label: 'Latest',
      value: stats.latest != null ? `${stats.latest.toFixed(1)} kg` : '—',
      tone: stats.latest != null ? ('accent' as const) : undefined,
    },
    {
      label: 'In range',
      value: stats.starting != null ? `${stats.starting.toFixed(1)} kg` : '—',
      tone: ('default' as const),
    },
    {
      label: 'Change',
      value: formatWeightChange(stats.change),
      tone:
        stats.change != null && stats.change < 0
          ? ('success' as const)
          : stats.change != null
            ? ('warning' as const)
            : undefined,
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {rows.map((r) => (
        <StatTile key={r.label} label={r.label} value={r.value} tone={r.tone ?? undefined} />
      ))}
    </div>
  )
}

function NutritionStatsRow({
  calorieStats,
  proteinStats,
}: {
  calorieStats: NutritionStats
  proteinStats: NutritionStats
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatTile
        label="Avg calories"
        value={calorieStats.average != null ? `${calorieStats.average.toLocaleString()}` : '—'}
        suffix={calorieStats.loggedDays > 0 ? `over ${calorieStats.loggedDays}d` : null}
        tone={calorieStats.average != null ? ('accent' as const) : undefined}
      />
      <StatTile
        label="Avg protein"
        value={proteinStats.average != null ? `${proteinStats.average}` : '—'}
        suffix={proteinStats.loggedDays > 0 ? `over ${proteinStats.loggedDays}d` : null}
        tone={proteinStats.average != null ? ('accent' as const) : undefined}
      />
    </div>
  )
}

function CardioStatsRow({ stats }: { stats: CardioStats }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatTile
        label="Total cardio"
        value={`${stats.totalMinutes} min`}
        suffix={stats.sessionCount > 0 ? `${stats.sessionCount} session${stats.sessionCount === 1 ? '' : 's'}` : null}
      />
      <StatTile
        label="Est. activity calories"
        value={
          stats.estimatedActivityCalories != null
            ? `~${Math.round(stats.estimatedActivityCalories / 5) * 5}`
            : 'None available'
        }
        suffix="derived"
        tone={'default' as const}
        className="italic"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Date labels
// ---------------------------------------------------------------------------

function windowLabelFor(days: DailyHistorySummary[], range: AnalyticsRange): string {
  if (days.length === 0) return 'No data in range'
  if (range === 'all') {
    const win = actualDataWindow(days)
    if (win == null) return 'No data in range'
    return `${shortDate(win.from)} – ${shortDate(win.to)}`
  }
  const first = days[0].date
  const last = days[days.length - 1].date
  return `${shortDate(first)} – ${shortDate(last)}`
}

function shortDate(iso: ISODate): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function formatWeightChange(delta: number | null): string {
  if (delta == null) return '—'
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)} kg`
}

// ---------------------------------------------------------------------------
// Body computation — pure, derived from daily summaries only.
// ---------------------------------------------------------------------------

interface Body {
  weightData: Array<{ label: string; value: number }>
  weightStats: ReturnType<typeof weightStats>
  weightUnit: string
  calorieData: Array<{ label: string; value: number }>
  calorieStats: NutritionStats
  goalCalories: number | null
  proteinData: Array<{ label: string; value: number }>
  proteinStats: NutritionStats
  goalProtein: number | null
  workoutBuckets: WorkoutBucket[]
  workoutTotal: number
  cardioData: CardioBucket[]
  cardioStats: CardioStats
  measurementSeries: AnalyticsMeasurementSeries[]
}

const NON_WEIGHT_MEASUREMENT_TYPES: MeasurementType[] = [
  'waist',
  'chest',
  'hips',
  'arm',
  'thigh',
  'bodyFat',
  'other',
] as const

const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  weight: 'Weight',
  waist: 'Waist',
  chest: 'Chest',
  hips: 'Hips',
  arm: 'Arm',
  thigh: 'Thigh',
  bodyFat: 'Body fat',
  other: 'Other',
}

function makeBody(
  days: DailyHistorySummary[],
  goal: { dailyCalories: number | null; dailyProteinG: number | null } | null,
  settings: { weekStartsOn: 0 | 1 } | null,
  range: AnalyticsRange,
): Body {
  const goalCalories = goal?.dailyCalories ?? null
  const goalProtein = goal?.dailyProteinG ?? null
  const weekStartsOn = settings?.weekStartsOn ?? 1

  const allMeasurements = days.flatMap((d) => d.measurements)
  const nonWeightMeasurements = allMeasurements.filter(
    (m) => m.type !== 'weight',
  )

  return {
    weightData: weightSeries(days).map((p) => ({ label: p.label, value: p.value })),
    weightStats: weightStats(days),
    weightUnit: 'kg',
    calorieData: calorieSeries(days).map((p) => ({ label: p.label, value: p.value })),
    calorieStats: nutritionStats(calorieSeries(days), goalCalories),
    goalCalories,
    proteinData: proteinSeries(days).map((p) => ({ label: p.label, value: p.value })),
    proteinStats: nutritionStats(proteinSeries(days), goalProtein),
    goalProtein,
    workoutBuckets: workoutFrequencyFromSummaries(days, range, weekStartsOn),
    workoutTotal: workoutFrequencyFromSummaries(days, range, weekStartsOn).reduce(
      (acc, b) => acc + b.value,
      0,
    ),
    cardioData: cardioFromSummaries(days, range, weekStartsOn),
    cardioStats: cardioStatsFromSummaries(days),
    measurementSeries: measurementSeries(
      nonWeightMeasurements,
      NON_WEIGHT_MEASUREMENT_TYPES,
      MEASUREMENT_LABELS,
    ),
  }
}

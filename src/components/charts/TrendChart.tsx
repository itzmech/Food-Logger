import type { ReactNode } from 'react'
import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState } from '@/components/ui/EmptyState'
import type { IconName } from '@/components/icons'

/**
 * Chart wrapper used by the Progress page.
 *
 * Recharts is wired up now so later phases only have to supply data.
 * With no data the component renders a descriptive empty state instead of
 * an empty axis frame.
 */

export interface TrendPoint {
  /** X-axis label, already formatted (e.g. "Oct 2"). */
  label: string
  value: number
}

export interface TrendChartProps {
  data: TrendPoint[]
  /** Unit appended in the tooltip, e.g. "kg". */
  unit?: string
  height?: number
  color?: string
  emptyIcon?: IconName
  emptyTitle: string
  emptyMessage?: string
  emptyAction?: ReactNode
}

interface TooltipContentProps {
  active?: boolean
  payload?: Array<{ value?: number | string }>
  label?: string | number
  unit?: string
}

function ChartTooltip({ active, payload, label, unit }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  const raw = payload[0]?.value
  const value = typeof raw === 'number' ? raw : Number(raw)

  return (
    <div className="rounded-xl border border-line bg-overlay px-3 py-2 shadow-xl shadow-black/40">
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-3">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink tabular-nums">
        {Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
        {unit ? <span className="ml-1 text-[12px] font-normal text-ink-3">{unit}</span> : null}
      </p>
    </div>
  )
}

export function TrendChart({
  data,
  unit,
  height = 200,
  color = '#a78bfa',
  emptyIcon = 'bar-chart',
  emptyTitle,
  emptyMessage,
  emptyAction,
}: TrendChartProps) {
  const gradientId = `trend-${useId().replace(/[:]/g, '')}`

  if (data.length === 0) {
    return (
      <EmptyState
        compact
        icon={emptyIcon}
        title={emptyTitle}
        message={emptyMessage}
        action={emptyAction}
      />
    )
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -14 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1e2230" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#6e7688', fontSize: 11 }}
            minTickGap={28}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ fill: '#6e7688', fontSize: 11 }}
            domain={['auto', 'auto']}
          />
          <Tooltip
            cursor={{ stroke: '#2c3244', strokeDasharray: '3 3' }}
            content={(props: unknown) => {
              // Recharts passes loosely typed props to custom tooltip content.
              const typed = props as TooltipContentProps
              return (
                <ChartTooltip
                  active={typed.active}
                  payload={typed.payload}
                  label={typed.label}
                  unit={unit}
                />
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

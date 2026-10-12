import { cn } from '@/utils/cn'

export type StatTone = 'default' | 'accent' | 'success' | 'warning' | 'danger'

const VALUE_TONES: Record<StatTone, string> = {
  default: 'text-ink',
  accent: 'text-accent-strong',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

export interface StatTileProps {
  label: string
  value: string
  /** Optional muted suffix, e.g. "/ 4". */
  suffix?: string | null
  tone?: StatTone
  className?: string
}

export function StatTile({ label, value, suffix, tone = 'default', className }: StatTileProps) {
  return (
    <div className={cn('min-w-0 px-3 first:pl-0 last:pr-0', className)}>
      <p className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
        {label}
      </p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span
          className={cn('text-[19px] font-semibold leading-none tabular-nums', VALUE_TONES[tone])}
        >
          {value}
        </span>
        {suffix ? <span className="text-[12px] text-ink-3 tabular-nums">{suffix}</span> : null}
      </p>
    </div>
  )
}

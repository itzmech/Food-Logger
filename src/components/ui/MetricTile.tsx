import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { ProgressTone } from '@/components/ui/ProgressBar'
import { cn } from '@/utils/cn'

export type MetricTone = 'muted' | ProgressTone

const ICON_TONES: Record<MetricTone, string> = {
  muted: 'bg-surface-2 text-ink-3',
  accent: 'bg-accent-dim text-accent-strong',
  success: 'bg-success-dim text-success',
  warning: 'bg-warning-dim text-warning',
  danger: 'bg-danger-dim text-danger',
}

export interface MetricTileProps {
  icon: IconName
  label: string
  /** Primary readout, e.g. "1 240" or "Not logged". */
  value: string
  /** Secondary readout next to the value, e.g. "/ 2 000 kcal". */
  target?: string | null
  /** Explanatory line, used heavily for empty states. */
  hint?: string | null
  /** 0–1 ratio; `null`/undefined hides the bar. */
  progress?: number | null
  tone?: MetricTone
  /** Makes the whole tile navigate somewhere. */
  to?: string
}

export function MetricTile({
  icon,
  label,
  value,
  target,
  hint,
  progress,
  tone = 'muted',
  to,
}: MetricTileProps) {
  const content = (
    <>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            ICON_TONES[tone],
          )}
        >
          <Icon name={icon} size={17} />
        </span>
        <span className="truncate text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">
          {label}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[22px] font-semibold leading-none tracking-tight text-ink tabular-nums">
          {value}
        </span>
        {target ? <span className="text-[13px] text-ink-3 tabular-nums">{target}</span> : null}
      </div>

      {progress !== undefined ? (
        <ProgressBar
          value={progress}
          tone={tone === 'muted' ? 'accent' : tone}
          className="mt-3"
          label={label}
        />
      ) : null}

      {hint ? <p className="mt-3 text-[12px] leading-snug text-ink-3">{hint}</p> : null}
    </>
  )

  const classes = cn(
    'flex flex-col rounded-2xl border border-line bg-surface p-3.5',
    'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]',
    to && 'transition-colors duration-150 hover:border-line-strong active:scale-[0.99]',
  )

  if (to) {
    return (
      <Link to={to} className={classes} aria-label={`${label}: ${value}`}>
        {content}
      </Link>
    )
  }

  return <div className={classes}>{content}</div>
}

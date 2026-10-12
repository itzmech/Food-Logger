import { cn } from '@/utils/cn'

export type ProgressTone = 'accent' | 'success' | 'warning' | 'danger'

const TONES: Record<ProgressTone, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export interface ProgressBarProps {
  /** 0–1 ratio. `null` renders an empty track (no data yet). */
  value: number | null
  tone?: ProgressTone
  className?: string
  label?: string
}

export function ProgressBar({ value, tone = 'accent', className, label }: ProgressBarProps) {
  const ratio = value == null || !Number.isFinite(value) ? 0 : Math.min(Math.max(value, 0), 1)
  const percent = Math.round(ratio * 100)

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value == null ? undefined : percent}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-out',
          TONES[tone],
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

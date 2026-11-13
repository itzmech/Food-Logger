import { cn } from '@/utils/cn'

const STROKE = 10
const RADIUS = (100 - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Progress ring used on the Today dashboard for calories and protein. */
export function ProgressRing({
  value,
  size = 84,
  className,
  title,
  subtitle,
}: {
  value: number // 0 to 1
  size?: number
  className?: string
  title?: string
  subtitle?: string
}) {
  const clamped = Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0
  const percent = Math.round(clamped * 100)

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          role="img"
          aria-label={title ? `${title}: ${percent}%` : `${percent}%`}
          className="-rotate-90"
        >
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="var(--color-progress-dim)"
            strokeWidth={STROKE}
          />
          {clamped > 0 ? (
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="var(--color-progress)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
              className="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
            />
          ) : null}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold tabular-nums text-ink">
          {percent}%
        </span>
      </div>
      {title ? <p className="text-[13px] font-medium text-ink">{title}</p> : null}
      {subtitle ? <p className="text-[11px] tabular-nums text-ink-3">{subtitle}</p> : null}
    </div>
  )
}

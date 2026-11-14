import { useCallback, useState } from 'react'
import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'
import { cn } from '@/utils/cn'
import { streakTier, STREAK_TIER_LABELS, type StreakTier } from '@/lib/streaks'
import type { StreakCategory, StreakResult } from '@/lib/streaks'
import { todayISO } from '@/utils/date'

const TIER_GLOW: Record<StreakTier, string> = {
  silver: 'shadow-[0_0_18px_-4px_rgba(183,194,204,0.3)]',
  'electric-blue': 'shadow-[0_0_22px_-4px_rgba(143,185,255,0.35)]',
  'royal-purple': 'shadow-[0_0_26px_-4px_rgba(196,181,253,0.4)]',
  'molten-gold': 'shadow-[0_0_30px_-4px_rgba(245,201,121,0.45)]',
}

const CATEGORY_ICON: Record<StreakCategory, IconName> = {
  habit: 'repeat',
  gym: 'dumbbell',
  cardio: 'cardio',
}

const CATEGORY_LABEL: Record<StreakCategory, string> = {
  habit: 'Habits',
  gym: 'Workout',
  cardio: 'Cardio',
}

const CATEGORY_COLOR: Record<StreakCategory, string> = {
  habit: '#22C55E',
  gym: '#3B82F6',
  cardio: '#22D3EE',
}

export interface StreakCardProps {
  streak: StreakResult
  onSkip?: (category: StreakCategory, date: string) => void
  onUnskip?: (category: StreakCategory, date: string) => void
  isSkipped?: boolean
  className?: string
}

/** Individual streak counter card with a ring and skip button. */
export function StreakCard({ streak, onSkip, onUnskip, isSkipped = false, className }: StreakCardProps) {
  const [expanded, setExpanded] = useState(false)
  const tier = streakTier(streak.current)
  const color = CATEGORY_COLOR[streak.category]
  const icon = CATEGORY_ICON[streak.category] ?? 'target-arrow'
  const label = CATEGORY_LABEL[streak.category] ?? streak.category

  const today = todayISO()
  const todayStatus = streak.history.find((h) => h.date === today)?.status

  const handleSkip = useCallback(() => {
    if (onSkip) onSkip(streak.category, today)
  }, [onSkip, streak.category, today])

  const handleUnskip = useCallback(() => {
    if (onUnskip) onUnskip(streak.category, today)
  }, [onUnskip, streak.category, today])

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-line bg-surface p-4 transition-all duration-300',
        TIER_GLOW[tier],
        'hover:border-line-strong',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: color + '22' }}
        >
          <Icon name={icon} size={22} style={{ color }} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            {label}
          </p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span
              className="font-extrabold tabular-nums leading-none"
              style={{ fontSize: 'clamp(28px, 8vw, 40px)', color }}
            >
              {streak.current}
            </span>
            <span className="text-[12px] text-ink-3">
              day{streak.current === 1 ? '' : 's'}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-ink-3">
            {streak.current > 0 ? STREAK_TIER_LABELS[tier] : 'Start today'}
            {streak.best > streak.current ? ` · best ${streak.best}` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-ink-3 hover:text-ink"
          aria-label={expanded ? 'Hide details' : 'Show details'}
        >
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} />
        </button>
      </div>

      {/* Skip button */}
      <div className="mt-3">
        {isSkipped ? (
          <button
            type="button"
            onClick={handleUnskip}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-overlay"
          >
            <Icon name="play" size={14} />
            Undo skip
          </button>
        ) : todayStatus === 'active' ? (
          <span className="flex w-full items-center justify-center gap-2 rounded-xl border border-success/30 bg-success-dim px-3 py-2 text-[13px] font-medium text-success">
            <Icon name="check-circle" size={14} />
            Done today
          </span>
        ) : (
          <button
            type="button"
            onClick={handleSkip}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-warning/30 bg-warning-dim px-3 py-2 text-[13px] font-medium text-warning transition-colors hover:bg-warning/25"
          >
            <Icon name="skip-forward" size={14} />
            Skip today
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
            Last 14 days
          </p>
          <div className="flex items-center gap-1.5">
            {streak.history.slice(-14).map((h) => (
              <div
                key={h.date}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full',
                  h.status === 'active'
                    ? 'bg-success'
                    : h.status === 'skipped'
                      ? 'bg-surface-2 border border-dashed border-line-strong'
                      : 'bg-surface-2',
                )}
                title={`${h.date}: ${h.status}`}
              >
                {h.status === 'active' ? (
                  <Icon name="check" size={11} strokeWidth={3} className="text-white" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
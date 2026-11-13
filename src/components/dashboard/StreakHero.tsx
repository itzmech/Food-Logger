import { Icon } from '@/components/icons'
import { cn } from '@/utils/cn'
import { streakTier, STREAK_TIER_COLORS, STREAK_TIER_LABELS, type StreakTier } from '@/lib/streaks'

const TIER_GLOW: Record<StreakTier, string> = {
  silver: 'shadow-[0_0_18px_-4px_rgba(183,194,204,0.3)]',
  'electric-blue': 'shadow-[0_0_24px_-4px_rgba(143,185,255,0.4)]',
  'royal-purple': 'shadow-[0_0_30px_-4px_rgba(196,181,253,0.45)]',
  'molten-gold': 'shadow-[0_0_36px_-4px_rgba(245,201,121,0.5)]',
}

const TIER_BG: Record<StreakTier, string> = {
  silver: 'bg-[radial-gradient(circle_at_50%_40%,rgba(183,194,204,0.18),transparent_70%)]',
  'electric-blue': 'bg-[radial-gradient(circle_at_50%_40%,rgba(143,185,255,0.2),transparent_70%)]',
  'royal-purple': 'bg-[radial-gradient(circle_at_50%_40%,rgba(196,181,253,0.24),transparent_70%)]',
  'molten-gold': 'bg-[radial-gradient(circle_at_50%_40%,rgba(245,201,121,0.24),transparent_70%)]',
}

export interface StreakHeroProps {
  /** The single "overall" streak number shown big in the hero. */
  days: number
  /** Optional label under the number. */
  label?: string
  categories?: Array<{ label: string; days: number; color: string }>
  className?: string
}

/** Big animated streak counter for the dashboard hero. */
export function StreakHero({
  days,
  label = 'day streak',
  categories = [],
  className,
}: StreakHeroProps) {
  const tier = streakTier(days)
  const color = STREAK_TIER_COLORS[tier]

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-line p-6',
        TIER_BG[tier],
        TIER_GLOW[tier],
        'transition-all duration-500',
        className,
      )}
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-2 text-ink-3">
          <Icon name={tier === 'molten-gold' ? 'fire-flame' : 'target-arrow'} size={18} style={{ color }} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
            {STREAK_TIER_LABELS[tier]}
          </span>
        </div>

        <div
          className="mt-3 font-extrabold tabular-nums leading-none"
          style={{ fontSize: 'clamp(56px, 22vw, 96px)', color }}
        >
          {days}
        </div>

        <p className="mt-1 text-sm font-medium text-ink-2">{label}</p>

        {days > 0 ? (
          <p className="mt-2 text-[12px] text-ink-3">Keep it going — one more day tomorrow.</p>
        ) : (
          <p className="mt-2 text-[12px] text-ink-3">Log something today to start a streak.</p>
        )}
        {categories.length > 0 ? (
          <div className="mt-4 grid w-full grid-cols-3 gap-2 border-t border-white/[0.07] pt-3">
            {categories.map((category) => (
              <div key={category.label} className="flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                <span className="text-[11px] text-ink-3">{category.label}</span>
                <span className="text-[12px] font-semibold tabular-nums text-ink">{category.days}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
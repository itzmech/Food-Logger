import { Card } from '@/components/ui/Card'
import { formatCalories } from '@/utils/format'
import type { NutritionTotals } from '@/lib/nutrition'

export interface FoodSummaryCardProps {
  totals: NutritionTotals
  targetCalories: number | null
  targetProtein: number | null
}

/**
 * Today's calorie picture: a progress ring, remaining/over readout and the
 * macro readout. Honest when there is no data — 0 consumed, "—" when no target.
 */
export function FoodSummaryCard({ totals, targetCalories }: FoodSummaryCardProps) {
  const consumed = totals.calories
  const hasTarget = targetCalories != null && targetCalories > 0
  const ratio = hasTarget ? Math.min(consumed / (targetCalories as number), 1) : 0
  const over = hasTarget && consumed > (targetCalories as number)
  const remaining = hasTarget ? Math.max((targetCalories as number) - consumed, 0) : null

  // Ring geometry
  const size = 112
  const stroke = 9
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = circumference * ratio
  const overRatio = over
    ? Math.min((consumed - (targetCalories as number)) / (targetCalories as number), 1)
    : 0

  return (
    <Card className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#171a24"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={over ? '#fb7185' : '#8b5cf6'}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
          {over ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#fb7185"
              strokeOpacity={0.35}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${circumference * overRatio} ${circumference}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[20px] font-bold leading-none text-ink tabular-nums">
            {formatCalories(consumed)}
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-3">
            kcal
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-1">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Calories
          </p>
          <p className="text-[14px] font-semibold text-ink tabular-nums">
            {formatCalories(consumed)}
            <span className="text-ink-3"> / </span>
            {hasTarget ? (
              <span className="tabular-nums">{formatCalories(targetCalories as number)}</span>
            ) : (
              <span>no target</span>
            )}
            <span className="text-ink-3"> kcal</span>
          </p>
          <p className="text-[11px] text-ink-3">
            {over
              ? `${formatCalories(consumed - (targetCalories as number))} kcal over`
              : remaining != null
                ? `${formatCalories(remaining)} kcal left`
                : totals.itemCount === 0
                  ? 'Nothing logged yet today.'
                  : 'Set a calorie target in Settings → Goals.'}
          </p>
        </div>          <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">Protein</p>
            <p className="text-[13px] font-semibold text-ink tabular-nums">{formatGrams(totals.protein)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">Carbs</p>
            <p className="text-[13px] font-semibold text-ink tabular-nums">{totals.carbs != null ? formatGrams(totals.carbs) : '—'}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">Fat</p>
            <p className="text-[13px] font-semibold text-ink tabular-nums">{totals.fat != null ? formatGrams(totals.fat) : '—'}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function formatGrams(value: number | null): string {
  return value == null ? '—' : `${Math.round(value)}g`
}

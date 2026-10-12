import { useState } from 'react'
import { Icon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { FoodLogRow } from '@/components/food/FoodLogRow'
import { formatCalories, formatGrams } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { FoodLog, MealType } from '@/types'
import type { NutritionTotals } from '@/lib/nutrition'

export interface MealSectionProps {
  meal: MealType
  label: string
  logs: FoodLog[]
  totals: NutritionTotals
  defaultExpanded?: boolean
  onAdd: (meal: MealType) => void
  onEditLog: (log: FoodLog) => void
  onRemoveLog: (log: FoodLog) => void
}

/** One meal block: header with subtotal, collapsible item list, add button. */
export function MealSection({
  meal,
  label,
  logs,
  totals,
  defaultExpanded = false,
  onAdd,
  onEditLog,
  onRemoveLog,
}: MealSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const hasItems = logs.length > 0

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/50"
      >
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            hasItems ? 'bg-accent-dim text-accent-strong' : 'bg-surface-2 text-ink-3',
          )}
        >
          <Icon name="food" size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{label}</span>
          <span className="block text-[12px] text-ink-3">
            {hasItems
              ? `${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'}`
              : 'Nothing logged'}
          </span>
        </span>
        {hasItems ? (
          <Badge tone="accent" className="shrink-0 tabular-nums">
            {formatCalories(totals.calories)} kcal
            {totals.protein > 0 ? <span className="text-accent-strong/70"> · {formatGrams(totals.protein)} P</span> : null}
          </Badge>
        ) : null}
        <Icon
          name="chevron-down"
          size={16}
          className={cn('shrink-0 text-ink-3 transition-transform duration-200', expanded && 'rotate-180')}
        />
      </button>

      {expanded ? (
        <div className="border-t border-line px-3 pb-3 pt-2.5">
          {hasItems ? (
            <div className="space-y-1.5">
              {logs.map((log) => (
                <FoodLogRow key={log.id} log={log} onEdit={onEditLog} onRemove={onRemoveLog} />
              ))}
              <div className="flex items-center justify-between px-1 pt-1.5">
                <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">
                  Meal total
                </span>
                <span className="text-[13px] font-semibold text-ink tabular-nums">
                  {formatCalories(totals.calories)} kcal
                  {totals.protein > 0 ? ` · ${formatGrams(totals.protein)} P` : ''}
                </span>
              </div>
            </div>
          ) : (
            <p className="px-1 py-2 text-[12px] text-ink-3">
              No food logged for {label.toLowerCase()} yet.
            </p>
          )}
          <button
            type="button"
            onClick={() => onAdd(meal)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong px-3 py-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:border-accent/50 hover:text-accent-strong"
          >
            <Icon name="plus" size={15} />
            Add food
          </button>
        </div>
      ) : null}
    </div>
  )
}

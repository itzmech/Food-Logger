import { IconButton } from '@/components/ui/IconButton'
import { MacroPill } from '@/components/food/MacroPill'
import { formatQuantity } from '@/lib/nutrition'
import { formatCalories } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { FoodLog } from '@/types'

export interface FoodLogRowProps {
  log: FoodLog
  onEdit?: (log: FoodLog) => void
  onRemove?: (log: FoodLog) => void
  className?: string
}

/** One logged item inside a meal section. */
export function FoodLogRow({ log, onEdit, onRemove, className }: FoodLogRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-ink">{log.foodNameSnapshot}</p>
          {log.source === 'manual' ? (
            <span
              className="shrink-0 rounded-md border border-line bg-surface px-1.5 text-[10px] text-ink-3"
              title="Logged without saving to the food database"
            >
              manual
            </span>
          ) : null}
          {log.source === 'menu' ? (
            <span
              className="shrink-0 rounded-md border border-line bg-surface px-1.5 text-[10px] text-ink-3"
              title="Logged from the mess menu"
            >
              menu
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[12px] text-ink-3 tabular-nums">
            {formatQuantity(log.quantity, log.unit)} {log.unit}
          </span>
          <MacroPill label="P" value={log.protein} />
          <MacroPill label="C" value={log.carbs} />
          <MacroPill label="F" value={log.fat} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <div className="text-right">
          <p className="text-sm font-semibold text-ink tabular-nums">
            {formatCalories(log.calories)}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-ink-3">kcal</p>
        </div>
        {onEdit ? (
          <IconButton icon="edit" label={`Edit ${log.foodNameSnapshot}`} size="sm" onClick={() => onEdit(log)} />
        ) : null}
        {onRemove ? (
          <IconButton
            icon="trash"
            label={`Remove ${log.foodNameSnapshot}`}
            size="sm"
            tone="danger"
            onClick={() => onRemove(log)}
          />
        ) : null}
      </div>
    </div>
  )
}

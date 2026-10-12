import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatGrams } from '@/utils/format'

export interface MacroBarsProps {
  protein: number
  carbs: number | null
  fat: number | null
  targetProtein?: number | null
}

export function MacroBars({ protein, carbs, fat, targetProtein }: MacroBarsProps) {
  return (
    <div className="space-y-2.5">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Protein
          </span>
          <span className="text-[12px] text-ink-2 tabular-nums">
            {formatGrams(protein)}
            {targetProtein ? (
              <span className="text-ink-3"> / {formatGrams(targetProtein)}</span>
            ) : null}
          </span>
        </div>
        <ProgressBar
          value={targetProtein ? Math.min(protein / targetProtein, 1) : null}
          tone="accent"
          className="mt-1"
          label="Protein"
        />
      </div>

      {carbs != null ? (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
              Carbs
            </span>
            <span className="text-[12px] text-ink-2 tabular-nums">{formatGrams(carbs)}</span>
          </div>
          <ProgressBar value={null} tone="success" className="mt-1" label="Carbs" />
        </div>
      ) : null}

      {fat != null ? (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
              Fat
            </span>
            <span className="text-[12px] text-ink-2 tabular-nums">{formatGrams(fat)}</span>
          </div>
          <ProgressBar value={null} tone="warning" className="mt-1" label="Fat" />
        </div>
      ) : null}
    </div>
  )
}

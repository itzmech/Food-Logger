import { Icon } from '@/components/icons'
import type { ServingUnit } from '@/types'
import { SERVING_UNITS, SERVING_UNIT_LABELS } from '@/types'
import { cn } from '@/utils/cn'

export interface QuantityStepperProps {
  quantity: number
  unit: ServingUnit
  /** Units offered for this food (its base unit plus compatible ones). */
  availableUnits: ServingUnit[]
  onQuantityChange: (value: number) => void
  onUnitChange: (value: ServingUnit) => void
  /** Quick-multiply chips, e.g. [50, 100, 200] for gram-based foods. */
  quickValues?: number[]
  /** Turned off while a unit conversion needs fixing. */
  error?: string | null
  compact?: boolean
}

const INPUT_CLASS =
  'w-full bg-transparent text-center text-lg font-semibold text-ink tabular-nums focus:outline-none'

/**
 * Quantity + unit control.
 *
 * The stepper buttons add/subtract one "step" — a natural unit amount
 * (10 g, 1 piece…) — and the chips jump straight to common quantities.
 */
export function QuantityStepper({
  quantity,
  unit,
  availableUnits,
  onQuantityChange,
  onUnitChange,
  quickValues = [],
  error = null,
  compact = false,
}: QuantityStepperProps) {
  const stepFor = (value: ServingUnit): number => {
    if (value === 'g' || value === 'ml') return 10
    return 1
  }
  const clampQuantity = (value: number): number => {
    if (!Number.isFinite(value) || value < 0) return 0
    return Math.min(value, 100_000)
  }

  const step = stepFor(unit)
  const parsed = Number.isFinite(quantity) ? quantity : 0

  return (
    <div className="space-y-2.5">
      <div
        className={cn(
          'flex items-stretch overflow-hidden rounded-xl border bg-surface-2 transition-colors',
          error ? 'border-danger/50' : 'border-line focus-within:border-accent/70',
        )}
      >
        <button
          type="button"
          aria-label="Decrease quantity"
          className="flex w-12 items-center justify-center text-ink-2 transition-colors hover:bg-surface hover:text-ink active:bg-surface"
          onClick={() => onQuantityChange(clampQuantity(parsed - step))}
        >
          <Icon name="close" size={14} className="rotate-45" />
        </button>

        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={Number.isFinite(parsed) ? String(parsed) : ''}
          onChange={(event) => {
            const next = event.target.value === '' ? 0 : Number(event.target.value)
            onQuantityChange(Number.isFinite(next) ? next : 0)
          }}
          aria-label="Quantity"
          className={cn(INPUT_CLASS, compact ? 'h-11' : 'h-12')}
        />

        <button
          type="button"
          aria-label="Increase quantity"
          className="flex w-12 items-center justify-center text-ink-2 transition-colors hover:bg-surface hover:text-ink active:bg-surface"
          onClick={() => onQuantityChange(clampQuantity(parsed + step))}
        >
          <Icon name="plus" size={16} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {availableUnits.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onUnitChange(value)}
            aria-pressed={value === unit}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors',
              value === unit
                ? 'border-accent/50 bg-accent-dim text-accent-strong'
                : 'border-line bg-surface-2 text-ink-3 hover:text-ink-2',
            )}
          >
            {SERVING_UNIT_LABELS[value]}
          </button>
        ))}
      </div>

      {quickValues.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {quickValues.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onQuantityChange(value)}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-[12px] tabular-nums transition-colors',
                parsed === value
                  ? 'border-accent/50 bg-accent-dim text-accent-strong'
                  : 'border-line bg-transparent text-ink-3 hover:text-ink-2',
              )}
            >
              {value}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-[12px] text-danger">{error}</p> : null}
    </div>
  )
}

/** Units a food can be logged in: its base unit plus g/ml where sensible. */
export function unitsForFood(baseUnit: ServingUnit): ServingUnit[] {
  if (baseUnit === 'g' || baseUnit === 'ml') {
    // g and ml are treated as 1:1 (density ~1) so both are always offered.
    return baseUnit === 'g' ? ['g', 'ml'] : ['ml', 'g']
  }
  return SERVING_UNITS.filter((unit) => unit === baseUnit)
}

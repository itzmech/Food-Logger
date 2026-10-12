import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { SelectField, TextField } from '@/components/ui/Field'
import type { FoodLog, MealType } from '@/types'
import { MEAL_LABELS, MEAL_TYPES } from '@/types'
import type { ServingUnit } from '@/types'
import { formatCalories, formatGrams } from '@/utils/format'

export interface EditLogSheetProps {
  log: FoodLog | null
  onClose: () => void
  /** Notifies the owner that the log was changed or removed. */
  onChanged: () => void
  /** Re-scale helper: recomputes macros from the current food, if linked. */
  recompute: (
    log: FoodLog,
    quantity: number,
    unit: ServingUnit,
  ) => Promise<{
    calories: number
    protein: number
    carbs: number | null
    fat: number | null
  } | null>
  removeLog: (id: string) => Promise<unknown>
  updateLog: (
    id: string,
    patch: {
      meal?: MealType
      quantity?: number
      unit?: ServingUnit
      foodNameSnapshot?: string
      calories?: number
      protein?: number
      carbs?: number | null
      fat?: number | null
    },
  ) => Promise<unknown>
}

/**
 * Edit an existing log entry.
 *
 * The row keeps snapshot semantics: the sheet recomputes macros from the
 * linked food when possible, otherwise the user edits the numbers directly —
 * the stored row is always an explicit, self-contained snapshot.
 */
export function EditLogSheet({ log, onClose, onChanged, recompute, removeLog, updateLog }: EditLogSheetProps) {
  const open = log != null
  const [meal, setMeal] = useState<MealType>('breakfast')
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [unit, setUnit] = useState<ServingUnit>('g')
  const [macros, setMacros] = useState({ calories: '', protein: '', carbs: '', fat: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

  useEffect(() => {
    if (!log) return
    setMeal(log.meal)
    setName(log.foodNameSnapshot)
    setQuantity(log.quantity)
    setUnit(log.unit)
    setMacros({
      calories: String(log.calories),
      protein: String(log.protein),
      carbs: log.carbs == null ? '' : String(log.carbs),
      fat: log.fat == null ? '' : String(log.fat),
    })
    setError(null)
    setConfirmRemove(false)
  }, [log])

  // Offer a recompute whenever quantity/unit changes and the food still exists.
  const [recomputing, setRecomputing] = useState(false)
  const [canRecompute, setCanRecompute] = useState(false)
  useEffect(() => {
    if (!log) return
    if (quantity === log.quantity && unit === log.unit) {
      setCanRecompute(true)
      return
    }
    let cancelled = false
    setRecomputing(true)
    recompute(log, quantity, unit).then((result) => {
      if (cancelled) return
      setRecomputing(false)
      if (result) {
        setCanRecompute(true)
        setMacros({
          calories: String(result.calories),
          protein: String(result.protein),
          carbs: result.carbs == null ? '' : String(result.carbs),
          fat: result.fat == null ? '' : String(result.fat),
        })
      } else {
        setCanRecompute(false)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log, quantity, unit])

  const parsedMacros = useMemo(() => {
    const calories = Number(macros.calories)
    const protein = Number(macros.protein)
    const carbs = macros.carbs === '' ? null : Number(macros.carbs)
    const fat = macros.fat === '' ? null : Number(macros.fat)
    if (!Number.isFinite(calories) || calories < 0) return null
    if (!Number.isFinite(protein) || protein < 0) return null
    if (!Number.isFinite(quantity) || quantity <= 0) return null
    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: carbs == null ? null : Math.round(carbs * 10) / 10,
      fat: fat == null ? null : Math.round(fat * 10) / 10,
    }
  }, [macros, quantity])

  const handleSave = async () => {
    if (!log || !parsedMacros) return
    setBusy(true)
    setError(null)
    try {
      await updateLog(log.id, {
        meal,
        quantity,
        unit,
        foodNameSnapshot: name.trim() || log.foodNameSnapshot,
        ...parsedMacros,
      })
      onChanged()
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this entry.')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    if (!log) return
    setBusy(true)
    try {
      await removeLog(log.id)
      setConfirmRemove(false)
      onChanged()
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove this entry.')
      setConfirmRemove(false)
    } finally {
      setBusy(false)
    }
  }

  if (!log) return null

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Edit entry" description={log.foodNameSnapshot}>
        <div className="space-y-5">
          <TextField
            label="Food"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <SelectField
            label="Meal"
            value={meal}
            onChange={(event) => setMeal(event.target.value as MealType)}
          >
            {MEAL_TYPES.map((value) => (
              <option key={value} value={value}>
                {MEAL_LABELS[value]}
              </option>
            ))}
          </SelectField>

          <div>
            <p className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">
              Quantity & unit
            </p>
            <QuantityStepper
              quantity={quantity}
              unit={unit}
              availableUnits={[unit]}
              onQuantityChange={setQuantity}
              onUnitChange={setUnit}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="block text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">
                Calories
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={macros.calories}
                onChange={(event) => setMacros((m) => ({ ...m, calories: event.target.value }))}
                className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink tabular-nums focus:border-accent/70 focus:outline-none"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">
                Protein (g)
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={macros.protein}
                onChange={(event) => setMacros((m) => ({ ...m, protein: event.target.value }))}
                className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink tabular-nums focus:border-accent/70 focus:outline-none"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">
                Carbs (g)
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={macros.carbs}
                onChange={(event) => setMacros((m) => ({ ...m, carbs: event.target.value }))}
                className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink tabular-nums focus:border-accent/70 focus:outline-none"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">
                Fat (g)
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={macros.fat}
                onChange={(event) => setMacros((m) => ({ ...m, fat: event.target.value }))}
                className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink tabular-nums focus:border-accent/70 focus:outline-none"
              />
            </label>
          </div>

          {!canRecompute ? (
            <p className="text-[12px] text-ink-3">
              The original food was edited or removed, so numbers are kept as entered.
            </p>
          ) : null}
          {recomputing ? (
            <p className="text-[12px] text-ink-3">Updating estimates…</p>
          ) : null}
          {parsedMacros ? (
            <p className="text-[12px] text-ink-2">
              Saving as {formatCalories(parsedMacros.calories)} kcal · {formatGrams(parsedMacros.protein)}{' '}
              protein.
            </p>
          ) : (
            <p className="text-[12px] text-danger">
              Enter valid calories and a quantity greater than zero.
            </p>
          )}
          {error ? <p className="text-[13px] text-danger">{error}</p> : null}

          <div className="flex gap-2 pt-1">
            <Button
              variant="danger"
              size="md"
              className="shrink-0 px-3"
              onClick={() => setConfirmRemove(true)}
              disabled={busy}
            >
              Delete
            </Button>
            <Button className="flex-1" onClick={() => void handleSave()} disabled={busy || !parsedMacros}>
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmRemove}
        tone="danger"
        title="Remove this entry?"
        description={`${log.foodNameSnapshot} will be removed from ${MEAL_LABELS[log.meal]} on ${log.date}. Your food database is not affected.`}
        confirmLabel="Remove"
        cancelLabel="Keep"
        busy={busy}
        onConfirm={() => void handleRemove()}
        onCancel={() => setConfirmRemove(false)}
      />
    </>
  )
}

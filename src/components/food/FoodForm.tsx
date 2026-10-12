import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField, NumberField, SelectField } from '@/components/ui/Field'
import type { Food, FoodCategory, ServingUnit } from '@/types'
import { FOOD_CATEGORIES, FOOD_CATEGORY_LABELS, SERVING_UNITS, SERVING_UNIT_LABELS } from '@/types'
import type { FoodDraft } from '@/db/defaults'
import { formatNumber } from '@/utils/format'

export interface FoodFormProps {
  /** When set the form edits this food; otherwise it creates a new one. */
  food?: Food | null
  prefillName?: string
  busy?: boolean
  error?: string | null
  submitLabel?: string
  onSubmit: (draft: FoodDraft) => void
  onBack?: () => void
  backLabel?: string
}

interface FieldErrors {
  name?: string
  calories?: string
  baseQuantity?: string
}

/** Form for creating or editing a reusable food. Values are user estimates. */
export function FoodForm({
  food,
  prefillName = '',
  busy = false,
  error = null,
  submitLabel = 'Save to database',
  onSubmit,
  onBack,
  backLabel = 'Back',
}: FoodFormProps) {
  const [name, setName] = useState(food?.name ?? prefillName)
  const [category, setCategory] = useState<FoodCategory>(food?.category ?? 'other')
  const [calories, setCalories] = useState(food != null ? String(food.calories) : '')
  const [protein, setProtein] = useState(food != null ? String(food.protein) : '')
  const [carbs, setCarbs] = useState(food?.carbs != null ? String(food.carbs) : '')
  const [fat, setFat] = useState(food?.fat != null ? String(food.fat) : '')
  const [baseQuantity, setBaseQuantity] = useState(food != null ? String(food.baseQuantity) : '100')
  const [baseUnit, setBaseUnit] = useState<ServingUnit>(food?.baseUnit ?? 'g')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const preview = (() => {
    const parsed = {
      name: name.trim(),
      category,
      baseQuantity: Number(baseQuantity),
      baseUnit,
      calories: Number(calories),
      protein: Number(protein) || 0,
      carbs: carbs === '' ? null : Number(carbs),
      fat: fat === '' ? null : Number(fat),
    }
    if (
      !parsed.name ||
      !Number.isFinite(parsed.calories) ||
      !Number.isFinite(parsed.baseQuantity) ||
      parsed.baseQuantity <= 0
    ) {
      return null
    }
    return {
      ...parsed,
      protein: Math.max(0, parsed.protein),
    }
  })()

  const handleSubmit = () => {
    const errors: FieldErrors = {}
    if (!name.trim()) errors.name = 'Give this food a name.'
    if (calories.trim() === '' || !Number.isFinite(Number(calories)) || Number(calories) < 0) {
      errors.calories = 'Enter estimated calories (0 or more).'
    }
    if (
      baseQuantity.trim() === '' ||
      !Number.isFinite(Number(baseQuantity)) ||
      Number(baseQuantity) <= 0
    ) {
      errors.baseQuantity = 'Base quantity must be greater than zero.'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    if (!preview) return

    onSubmit({
      ...preview,
      calories: Math.max(0, Math.round(preview.calories)),
    })
  }

  return (
    <div className="space-y-4">
      <TextField
        label="Food name"
        placeholder="e.g. Hostel paneer curry"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={fieldErrors.name}
      />

      <SelectField
        label="Category"
        value={category}
        onChange={(event) => setCategory(event.target.value as FoodCategory)}
      >
        {FOOD_CATEGORIES.map((value) => (
          <option key={value} value={value}>
            {FOOD_CATEGORY_LABELS[value]}
          </option>
        ))}
      </SelectField>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Calories"
          suffix="kcal"
          min={0}
          step={1}
          placeholder="required"
          value={calories}
          onChange={(event) => setCalories(event.target.value)}
          error={fieldErrors.calories}
        />
        <NumberField
          label="Protein"
          suffix="g"
          min={0}
          step={0.1}
          placeholder="0"
          value={protein}
          onChange={(event) => setProtein(event.target.value)}
        />
        <NumberField
          label="Carbs"
          suffix="g"
          min={0}
          step={0.1}
          placeholder="optional"
          value={carbs}
          onChange={(event) => setCarbs(event.target.value)}
        />
        <NumberField
          label="Fat"
          suffix="g"
          min={0}
          step={0.1}
          placeholder="optional"
          value={fat}
          onChange={(event) => setFat(event.target.value)}
        />
      </div>

      <div>
        <p className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">
          These values are per
        </p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Base quantity"
            min={0}
            step={1}
            value={baseQuantity}
            onChange={(event) => setBaseQuantity(event.target.value)}
            error={fieldErrors.baseQuantity}
          />
          <SelectField
            label="Base unit"
            value={baseUnit}
            onChange={(event) => setBaseUnit(event.target.value as ServingUnit)}
          >
            {SERVING_UNITS.map((value) => (
              <option key={value} value={value}>
                {SERVING_UNIT_LABELS[value]}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <p className="text-[12px] leading-snug text-ink-3">
        {preview
          ? `Saved as ${formatNumber(Math.round(preview.calories))} kcal · ${formatNumber(preview.protein)}g protein per ${formatNumber(preview.baseQuantity)} ${preview.baseUnit}.`
          : 'Enter the nutrition for one natural serving — e.g. per 100 g or per piece.'}
        {' '}All values are estimates you control.
      </p>

      {error ? <p className="text-[13px] text-danger">{error}</p> : null}

      <div className="flex gap-2 pt-1">
        {onBack ? (
          <Button variant="secondary" className="flex-1" onClick={onBack} disabled={busy}>
            {backLabel}
          </Button>
        ) : null}
        <Button className={onBack ? 'flex-[2]' : 'flex-1'} onClick={handleSubmit} disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </Button>
      </div>

      {food ? (
        <p className="text-center text-[11px] text-ink-3">
          Editing affects future logs only — meals already logged keep their original values.
        </p>
      ) : null}
    </div>
  )
}

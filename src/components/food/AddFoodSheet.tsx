import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { QuantityStepper, unitsForFood } from '@/components/ui/QuantityStepper'
import { TextField, NumberField, SelectField } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { perBaseLabel, rankQuickAddFoods, scaleFood, searchFoods } from '@/lib/nutrition'
import type { Food } from '@/types'
import {
  MEAL_LABELS,
  MEAL_TYPES,
} from '@/types'
import type { MealType } from '@/types'
import { formatCalories, formatGrams } from '@/utils/format'
import { useFoodActions } from '@/components/food/foodActionsContext'
import { useFoods } from '@/hooks/useFoods'
import { FoodForm } from '@/components/food/FoodForm'

export interface AddFoodSheetProps {
  open: boolean
  date: string
  initialMeal: MealType
  onClose: () => void
  onLogged: () => void
  prefillName: string
}

type Stage =
  | { name: 'search' }
  | { name: 'log'; food: Food }
  | { name: 'create'; prefillName: string }
  | { name: 'quick'; prefillName: string }

const QUICK_VALUES_BY_UNIT: Record<string, number[]> = {
  g: [30, 50, 100, 150, 200],
  ml: [100, 200, 250, 500],
  piece: [1, 2, 3, 4],
  bowl: [1, 1.5, 2],
  scoop: [1, 2],
  serving: [1, 2],
}

/**
 * The Add Food flow, shared by the Food page and the dashboard.
 *
 * Stages: search (with Quick Add chips) → log (meal, quantity, live nutrition
 * preview) → save. "New food" and "Quick add" branch off the search stage.
 */
export function AddFoodSheet({ open, date, initialMeal, onClose, onLogged }: AddFoodSheetProps) {
  const actions = useFoodActions()
  const { foods } = useFoods()

  const [stage, setStage] = useState<Stage>({ name: 'search' })
  const [query, setQuery] = useState('')
  const [meal, setMeal] = useState<MealType>(initialMeal)
  const [quantity, setQuantity] = useState(100)
  const [unit, setUnit] = useState<'g' | 'ml' | 'piece' | 'bowl' | 'scoop' | 'serving'>('g')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justLogged, setJustLogged] = useState<string | null>(null)
  const [calForm, setCalForm] = useState({ calories: '', protein: '', carbs: '', fat: '' })

  useEffect(() => {
    if (open) {
      setStage({ name: 'search' })
      setQuery('')
      setMeal(initialMeal)
      setQuantity(100)
      setUnit('g')
      setError(null)
      setJustLogged(null)
      setCalForm({ calories: '', protein: '', carbs: '', fat: '' })
      // Set prefilled name in query if provided - shows as selected meal
      if (prefillName) {
        setQuery(prefillName)
      }
    }
  }, [open, initialMeal, prefillName])

  const results = useMemo(() => searchFoods(foods, query, 30), [foods, query])
  const recents = useMemo(() => rankQuickAddFoods(foods, 8), [foods])

  /* ---------------------------- log stage ---------------------------- */

  const logStage = stage.name === 'log' ? stage.food : null

  const scaled = useMemo(() => {
    if (!logStage) return null
    try {
      return { ok: true as const, value: scaleFood(logStage, quantity, unit) }
    } catch (cause) {
      return {
        ok: false as const,
        error: cause instanceof Error ? cause.message : 'Check the quantity and unit.',
      }
    }
  }, [logStage, quantity, unit])

  /* ---------------------------- handlers ----------------------------- */

  const handlePickFood = (food: Food) => {
    setStage({ name: 'log', food })
    setQuantity(food.baseQuantity)
    setUnit(food.baseUnit)
    setError(null)
    setJustLogged(null)
  }

  const handleLogFood = async () => {
    if (!logStage || !scaled?.ok) return
    setBusy(true)
    setError(null)
    try {
      await actions.addFromFood({ food: logStage, date, meal, quantity, unit })
      setJustLogged(`${logStage.name} · ${formatCalories(scaled.value.calories)} kcal`)
      onLogged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not log this food.')
    } finally {
      setBusy(false)
    }
  }

  /* ---------------------------- create stage ------------------------- */

  const handleCreate = async (draft: Parameters<typeof actions.createFood>[0]) => {
    setBusy(true)
    setError(null)
    try {
      const food = await actions.createFood(draft)
      handlePickFood(food)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this food.')
    } finally {
      setBusy(false)
    }
  }

  /* ---------------------------- quick stage -------------------------- */

  const quickDraft = useMemo(() => {
    if (stage.name !== 'quick') return null
    const name = stage.prefillName.trim()
    const fieldCal = calForm.calories.trim()
    const fieldProtein = calForm.protein.trim()
    const fieldCarbs = calForm.carbs.trim()
    const fieldFat = calForm.fat.trim()
    const caloriesRaw = fieldCal === '' ? NaN : Number(calForm.calories)
    const proteinRaw = fieldProtein === '' ? NaN : Number(calForm.protein)
    const carbsRaw = fieldCarbs === '' ? NaN : Number(calForm.carbs)
    const fatRaw = fieldFat === '' ? NaN : Number(calForm.fat)

    if (!name) return null
    if (fieldCal === '' || !Number.isFinite(caloriesRaw) || caloriesRaw <= 0 || caloriesRaw > 99999) return null
    if (fieldProtein !== '' && (!Number.isFinite(proteinRaw) || proteinRaw < 0 || proteinRaw > 99999)) return null
    if (fieldCarbs !== '' && (!Number.isFinite(carbsRaw) || carbsRaw < 0 || carbsRaw > 99999)) return null
    if (fieldFat !== '' && (!Number.isFinite(fatRaw) || fatRaw < 0 || fatRaw > 99999)) return null
    if (!Number.isFinite(quantity) || quantity <= 0) return null

    return {
      name,
      calories: Math.round(caloriesRaw),
      protein: fieldProtein === '' ? 0 : Math.round(proteinRaw * 10) / 10,
      carbs: fieldCarbs === '' ? null : Math.round(carbsRaw * 10) / 10,
      fat: fieldFat === '' ? null : Math.round(fatRaw * 10) / 10,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, calForm, quantity])

  const handleQuickLog = async () => {
    if (!quickDraft) return
    setBusy(true)
    setError(null)
    try {
      await actions.addManual({
        date,
        meal,
        name: quickDraft.name,
        quantity,
        unit,
        calories: quickDraft.calories,
        protein: quickDraft.protein,
        carbs: quickDraft.carbs,
        fat: quickDraft.fat,
        source: 'quick-add',
      })
      setJustLogged(`${quickDraft.name} · ${formatCalories(quickDraft.calories)} kcal`)
      onLogged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not log this food.')
    } finally {
      setBusy(false)
    }
  }

  /* ---------------------------- render ------------------------------- */

  const title =
    stage.name === 'log'
      ? 'Log food'
      : stage.name === 'create'
        ? 'New food'
        : stage.name === 'quick'
          ? 'Quick add'
          : 'Add food'

  return (
    <BottomSheet open={open} onClose={onClose} title={title} description={MEAL_LABELS[meal]}>
      {stage.name === 'search' ? (
        <SearchStage
          query={query}
          onQueryChange={setQuery}
          meal={meal}
          onMealChange={setMeal}
          results={results}
          recents={recents}
          onPickFood={handlePickFood}
          onQuickAdd={() => setStage({ name: 'quick', prefillName: query })}
          onCreateFood={() => setStage({ name: 'create', prefillName: query })}
        />
      ) : null}

      {stage.name === 'log' && logStage ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-dim text-accent-strong">
              <Icon name="food" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{logStage.name}</p>
              <p className="text-[12px] text-ink-3">{perBaseLabel(logStage)}</p>
            </div>
            {logStage.source === 'seed' ? <Badge tone="neutral">sample</Badge> : null}
          </div>

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
              availableUnits={unitsForFood(logStage.baseUnit)}
              onQuantityChange={setQuantity}
              onUnitChange={setUnit}
              quickValues={QUICK_VALUES_BY_UNIT[unit]}
              error={scaled && !scaled.ok ? scaled.error : null}
            />
          </div>

          <div className="rounded-2xl border border-line bg-surface-2/60 p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
              Estimated nutrition
            </p>
            {scaled?.ok ? (
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'kcal', value: formatCalories(scaled.value.calories) },
                  { label: 'protein', value: formatGrams(scaled.value.protein) },
                  {
                    label: 'carbs',
                    value: scaled.value.carbs == null ? '—' : formatGrams(scaled.value.carbs),
                  },
                  {
                    label: 'fat',
                    value: scaled.value.fat == null ? '—' : formatGrams(scaled.value.fat),
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[15px] font-semibold text-ink tabular-nums">{item.value}</p>
                    <p className="text-[10px] uppercase tracking-wide text-ink-3">{item.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-danger">
                {scaled && !scaled.ok ? scaled.error : 'Fix the quantity to see nutrition.'}
              </p>
            )}
          </div>

          {justLogged ? (
            <p className="flex items-center gap-1.5 text-[13px] text-success">
              <Icon name="check" size={15} /> Logged {justLogged}
            </p>
          ) : null}
          {error ? <p className="text-[13px] text-danger">{error}</p> : null}

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setStage({ name: 'search' })}
              disabled={busy}
            >
              Back
            </Button>
            <Button
              className="flex-[2]"
              onClick={() => void handleLogFood()}
              disabled={busy || !scaled?.ok}
            >
              {busy ? 'Saving…' : justLogged ? 'Log again' : 'Log food'}
            </Button>
          </div>
        </div>
      ) : null}

      {stage.name === 'create' ? (
        <FoodForm
          prefillName={stage.prefillName}
          busy={busy}
          error={error}
          submitLabel="Save to database"
          onSubmit={(draft) => void handleCreate(draft)}
          onBack={() => setStage({ name: 'search' })}
        />
      ) : null}

      {stage.name === 'quick' ? (
        <div className="space-y-5">
          <TextField
            label="What did you eat?"
            placeholder="e.g. Canteen sandwich"
            value={stage.prefillName}
            onChange={(event) => setStage({ name: 'quick', prefillName: event.target.value })}
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

          {error ? (
            <p className="mb-2 text-[12px] text-danger">{error}</p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Calories"
              suffix="kcal"
              min={0}
              max={99999}
              placeholder="required"
              value={calForm.calories}
              onChange={(event) => setCalForm((f) => ({ ...f, calories: event.target.value }))}
            />
            <NumberField
              label="Protein"
              suffix="g"
              min={0}
              max={99999}
              placeholder="0"
              value={calForm.protein}
              onChange={(event) => setCalForm((f) => ({ ...f, protein: event.target.value }))}
            />
            <NumberField
              label="Carbs"
              suffix="g"
              min={0}
              max={99999}
              placeholder="optional"
              value={calForm.carbs}
              onChange={(event) => setCalForm((f) => ({ ...f, carbs: event.target.value }))}
            />
            <NumberField
              label="Fat"
              suffix="g"
              min={0}
              max={99999}
              placeholder="optional"
              value={calForm.fat}
              onChange={(event) => setCalForm((f) => ({ ...f, fat: event.target.value }))}
            />
          </div>

          <p className="text-[12px] leading-snug text-ink-3">
            These numbers are for the quantity below. Nothing is saved to your food database —
            this is a one-off entry.
          </p>

          {error ? (
            <p className="text-[13px] text-danger">{error}</p>
          ) : null}

          <QuantityStepper
            quantity={quantity}
            unit={unit}
            availableUnits={['g', 'ml', 'piece', 'bowl', 'serving']}
            onQuantityChange={setQuantity}
            onUnitChange={setUnit}
            quickValues={QUICK_VALUES_BY_UNIT[unit]}
          />

          {!quickDraft && !busy ? (
            <p className="text-[13px] text-danger">
              {error ?? 'Enter a valid food name and calories from 0 to 99,999 kcal.'
             }
           </p>
          ) : null}

          {quickDraft ? (
            <div className="rounded-2xl border border-line bg-surface-2/60 p-3.5 text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                Estimated nutrition for this entry
              </p>
              <p className="mt-1 text-lg font-bold text-ink tabular-nums">
                {formatCalories(quickDraft.calories)} kcal · {formatGrams(quickDraft.protein)}{' '}
                protein
              </p>
            </div>
          ) : null}

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setStage({ name: 'search' })}
              disabled={busy}
            >
              Back
            </Button>
            <Button
              className="flex-[2]"
              onClick={() => void handleQuickLog()}
              disabled={busy || !quickDraft}
            >
              {busy ? 'Saving…' : 'Log it'}
            </Button>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/* Search stage                                                       */
/* ------------------------------------------------------------------ */

interface SearchStageProps {
  query: string
  onQueryChange: (value: string) => void
  meal: MealType
  onMealChange: (value: MealType) => void
  results: Food[]
  recents: Food[]
  onPickFood: (food: Food) => void
  onQuickAdd: () => void
  onCreateFood: () => void
}

function SearchStage({
  query,
  onQueryChange,
  meal,
  onMealChange,
  results,
  recents,
  onPickFood,
  onQuickAdd,
  onCreateFood,
}: SearchStageProps) {
  return (
    <div className="space-y-4">
      <SelectField
        label="Meal"
        value={meal}
        onChange={(event) => onMealChange(event.target.value as MealType)}
      >
        {MEAL_TYPES.map((value) => (
          <option key={value} value={value}>
            {MEAL_LABELS[value]}
          </option>
        ))}
      </SelectField>

      <TextField
        label="Search your foods"
        placeholder="Rice, eggs, paneer…"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        autoFocus
      />

      {query.trim() === '' && recents.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Recent & frequent
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recents.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => onPickFood(food)}
                className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-dim px-3 py-1.5 text-[13px] font-medium text-accent-strong transition-transform active:scale-95"
              >
                <Icon name="clock" size={13} />
                {food.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {query.trim() === '' ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onQuickAdd}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong px-3 py-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:border-accent/50 hover:text-accent-strong"
          >
            <Icon name="zap" size={15} />
            Quick add
          </button>
          <button
            type="button"
            onClick={onCreateFood}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong px-3 py-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:border-accent/50 hover:text-accent-strong"
          >
            <Icon name="plus" size={15} />
            New food
          </button>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          {query.trim() === '' ? 'All foods' : 'Results'}
        </p>
        {results.length === 0 ? (
          <EmptyState
            compact
            icon={query.trim() === '' ? 'database' : 'search'}
            title={
              query.trim() === ''
                ? 'No saved foods yet.'
                : `Nothing matches “${query.trim()}”.`
            }
            message={
              query.trim() === ''
                ? 'Create a food you eat regularly for faster logging.'
                : 'Log it as a one-off with Quick add, or save it with New food.'
            }
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={onQuickAdd}>
                  Quick add
                </Button>
                <Button size="sm" onClick={onCreateFood}>
                  New food
                </Button>
              </div>
            }
          />
        ) : (
          <div className="space-y-1.5">
            {results.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => onPickFood(food)}
                className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5 text-left transition-colors hover:border-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium text-ink">{food.name}</p>
                    {food.isFavorite ? (
                      <Icon name="star" size={12} className="shrink-0 text-warning" />
                    ) : null}
                    {food.source === 'seed' ? (
                      <Badge tone="neutral" className="shrink-0">
                        sample
                      </Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-[12px] text-ink-3">{perBaseLabel(food)}</p>
                </div>
                <Icon name="chevron-right" size={16} className="shrink-0 text-ink-3" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

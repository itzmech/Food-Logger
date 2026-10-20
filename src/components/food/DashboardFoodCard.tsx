import { useMemo, useState } from 'react'
import { Icon } from '@/components/icons'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { FoodActionsBridge } from '@/components/food/FoodActionsBridge'
import { AddFoodSheet } from '@/components/food/AddFoodSheet'
import { EditLogSheet } from '@/components/food/EditLogSheet'
import { computeUpdatedLogMacros, deleteFoodLog, updateFoodLog } from '@/db/foodQueries'
import { useFoodDay } from '@/hooks/useFoodDay'
import { defaultMealForNow, groupLogsByMeal } from '@/lib/nutrition'
import type { FoodLog, MealType } from '@/types'
import { MEAL_LABELS } from '@/types'
import { formatCalories, formatGrams } from '@/utils/format'
import { todayISO } from '@/utils/date'

/**
 * Dashboard "Today's Food": compact per-meal summary with a one-tap add.
 * Full editing/logging still lives on the Food page; this is the shortcut.
 */
export function DashboardFoodCard() {
  const date = todayISO()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [meal, setMeal] = useState<MealType>(defaultMealForNow())
  const [editing, setEditing] = useState<FoodLog | null>(null)

  return (
    <FoodActionsBridge date={date}>
      <DashboardFoodCardInner
        date={date}
        sheetOpen={sheetOpen}
        setSheetOpen={setSheetOpen}
        meal={meal}
        setMeal={setMeal}
        editing={editing}
        setEditing={setEditing}
      />
    </FoodActionsBridge>
  )
}

interface InnerProps {
  date: string
  sheetOpen: boolean
  setSheetOpen: (open: boolean) => void
  meal: MealType
  setMeal: (meal: MealType) => void
  editing: FoodLog | null
  setEditing: (log: FoodLog | null) => void
}

function DashboardFoodCardInner({
  date,
  sheetOpen,
  setSheetOpen,
  meal,
  setMeal,
  editing,
  setEditing,
}: InnerProps) {
  const { logs } = useFoodDay(date)
  const meals = useMemo(() => groupLogsByMeal(logs), [logs])
  const totalCalories = meals.reduce((sum, meal) => sum + meal.totals.calories, 0)

  const openAdd = (next: MealType) => {
    setMeal(next)
    setSheetOpen(true)
  }

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Today's food"
        action={
          <span className="text-[12px] text-ink-3 tabular-nums">
            {formatCalories(totalCalories)} kcal logged
          </span>
        }
      />
      <Card className="space-y-1">
        {meals.map((group) => {
          const hasItems = group.logs.length > 0
          return (
            <div key={group.meal} className="flex items-center gap-2 py-1.5">
              <button
                type="button"
                onClick={() => openAdd(group.meal)}
                aria-label={`Add food to ${MEAL_LABELS[group.meal]}`}
                className={cn(
                  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-dashed border-line-strong text-ink-3 transition-colors hover:border-accent/50 hover:text-accent-strong',
                )}
              >
                <Icon name="plus" size={13} />
              </button>
              <span className="w-20 shrink-0 text-[13px] font-medium text-ink-2">
                {MEAL_LABELS[group.meal]}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">
                {hasItems
                  ? group.logs.map((log) => log.foodNameSnapshot).join(', ')
                  : 'Nothing logged'}
              </span>
              <span className="shrink-0 text-[12px] text-ink-3 tabular-nums">
                {hasItems
                  ? `${formatCalories(group.totals.calories)}${group.totals.protein > 0 ? ` · ${formatGrams(group.totals.protein)}P` : ''}`
                  : '—'}
              </span>
            </div>
          )
        })}

        <div className="mt-1 flex items-center justify-between border-t border-line pt-2.5">
          <p className="text-[12px] text-ink-3">Full day view with editing on the Food tab.</p>
          <button
            type="button"
            onClick={() => openAdd(meal)}
            className="text-[13px] font-semibold text-accent-strong"
          >
            + Add food
          </button>
        </div>
      </Card>

      <AddFoodSheet
        open={sheetOpen}
        date={date}
        initialMeal={meal}
        onClose={() => setSheetOpen(false)}
        onLogged={() => setSheetOpen(false)}
      />
      <EditLogSheet
        log={editing}
        onClose={() => setEditing(null)}
        onChanged={() => setEditing(null)}
        recompute={computeUpdatedLogMacros}
        removeLog={deleteFoodLog}
        updateLog={updateFoodLog}
      />
    </section>
  )
}

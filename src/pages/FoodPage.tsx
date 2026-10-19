import { useMemo, useState } from 'react'
import { Icon } from '@/components/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FoodSummaryCard } from '@/components/food/FoodSummaryCard'
import { MealSection } from '@/components/food/MealSection'
import { MenuImportSheet } from '@/components/menu/MenuImportSheet'
import { EditLogSheet } from '@/components/food/EditLogSheet'
import { FoodDatabaseSheet } from '@/components/food/FoodDatabaseSheet'
import { FoodActionsBridge } from '@/components/food/FoodActionsBridge'
import { useGoals } from '@/hooks/useGoals'
import { useFoodDay } from '@/hooks/useFoodDay'
import { useFoods } from '@/hooks/useFoods'
import { computeUpdatedLogMacros, deleteFoodLog, updateFoodLog } from '@/db/foodQueries'
import { rankQuickAddFoods, groupLogsByMeal, sumNutrition } from '@/lib/nutrition'
import type { FoodLog, MealType } from '@/types'
import { MEAL_LABELS } from '@/types'
import { formatLongDate, todayISO } from '@/utils/date'

/** Food — the daily logging hub. MESS MENU ≠ FOOD LOG. */
export default function FoodPage() {
  const today = todayISO()

  return (
    <FoodActionsBridge date={today}>
      <FoodPageBody date={today} />
    </FoodActionsBridge>
  )
}

function FoodPageBody({ date }: { date: string }) {
  const { goal } = useGoals()
  const { logs, loading, remove } = useFoodDay(date)
  const { foods } = useFoods()

  const [editing, setEditing] = useState<FoodLog | null>(null)
  const [databaseOpen, setDatabaseOpen] = useState(false)
  const [menuImportOpen, setMenuImportOpen] = useState(false)

  const handleRemoveLog = (log: FoodLog) => {
    void remove(log.id)
  }

  const meals = useMemo(() => groupLogsByMeal(logs), [logs])
  const recents = useMemo(() => rankQuickAddFoods(foods, 6), [foods])

  const hasAnyFood = foods.length > 0

  return (
    <div className="flex flex-col space-y-6">
      <PageHeader
        title="Food"
        subtitle={formatLongDate(date)}
        compact
        action={
          <button
            type="button"
            onClick={() => setDatabaseOpen(true)}
            aria-label="Manage food database"
            className="touch-target inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-2 transition-colors hover:text-ink"
          >
            <Icon name="database" size={18} />
          </button>
        }
      />

      {loading && logs.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : (
        <FoodSummaryCard
          totals={sumNutrition(logs)}
          targetCalories={goal?.dailyCalories ?? null}
          targetProtein={goal?.dailyProteinG ?? null}
        />
      )}

      {/* Meals -------------------------------------------------------- */}
      <section className="space-y-3">
        <SectionHeader
          title="Today's meals"
          action={
            <button
              type="button"
              onClick={() => openAdd('snacks')}
              className="text-[13px] font-medium text-accent-strong"
            >
              + Add
            </button>
          }
        />
        <div className="space-y-2.5">
          {meals.map((meal) => (
            <MealSection
              key={meal.meal}
              meal={meal.meal}
              label={MEAL_LABELS[meal.meal]}
              logs={meal.logs}
              totals={meal.totals}
              defaultExpanded={meal.logs.length > 0}
              onAdd={openAdd}
              onEditLog={setEditing}
              onRemoveLog={handleRemoveLog}
            />
          ))}
        </div>
      </section>

      {/* Quick add ---------------------------------------------------- */}
      <section className="space-y-3">
        <SectionHeader title="Quick add" description="Tap a recent food to log it in seconds." />
        {!hasAnyFood ? (
          <Card>
            <EmptyState
              compact
              icon="zap"
              title="No saved foods yet."
              message="Create a food you eat regularly for faster logging."
              action={
                <Button size="sm" onClick={() => openAdd('breakfast')}>
                  Add first food
                </Button>
              }
            />
          </Card>
        ) : recents.length === 0 ? (
          <Card>
            <EmptyState
              compact
              icon="clock"
              title="No recent foods yet."
              message="Foods you log will appear here for one-tap repeats."
            />
          </Card>
        ) : (
          <Card className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {recents.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => openAdd('breakfast')}
                  className="rounded-full border border-accent/30 bg-accent-dim px-3 py-1.5 text-[13px] font-medium text-accent-strong transition-transform active:scale-95"
                >
                  {food.name}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-ink-3">
              Choose a meal and quantity next — most repeats take two taps.
            </p>
          </Card>
        )}
      </section>

      {/* Primary CTA --------------------------------------------------- */}
      <button
        type="button"
        onClick={() => openAdd('breakfast')}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong py-4 text-sm font-semibold text-ink-2 transition-colors hover:border-accent/50 hover:text-accent-strong"
      >
        <Icon name="plus" size={17} />Add food
      </button>

      {/* Add menu button */}
      <button
        type="button"
        onClick={() => setMenuImportOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong py-4 text-sm font-semibold text-ink-2 transition-colors hover:border-accent/50 hover:text-accent-strong"
      >
        <Icon name="upload" size={17} />Add menu
      </button>

      <p className="px-1 text-center text-[11px] text-ink-3">
        Estimated nutrition — values come from your own food database and portion estimates.
      </p>

      {/* Sheets -------------------------------------------------------- */}
      <MenuImportSheet
        onClose={() => setMenuImportOpen(false)}
      />
      <EditLogSheet
        log={editing}
        onClose={() => setEditing(null)}
        onChanged={() => setEditing(null)}
        recompute={computeUpdatedLogMacros}
        removeLog={deleteFoodLog}
        updateLog={updateFoodLog}
      />
      <FoodDatabaseSheet open={databaseOpen} onClose={() => setDatabaseOpen(false)} onChanged={() => undefined} />
    </div>
  )
}

function openAdd(meal: MealType) {
  setAddOpen(true)
}
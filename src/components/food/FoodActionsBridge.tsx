import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { FoodActionsProvider } from '@/components/food/foodActionsContext'
import type { FoodActions } from '@/components/food/foodActionsContext'
import { useFoodDay } from '@/hooks/useFoodDay'
import { useFoods } from '@/hooks/useFoods'
import type { ISODate } from '@/utils/date'

export interface FoodActionsBridgeProps {
  date: ISODate
  children: ReactNode
}

/**
 * Wires the food hooks into the shared sheet context.
 *
 * Pages render their own copies of the read hooks for display; this bridge
 * owns the write path the sheets call. Both refresh through food-change
 * events, so every view stays consistent.
 */
export function FoodActionsBridge({ date, children }: FoodActionsBridgeProps) {
  const day = useFoodDay(date)
  const foods = useFoods()

  const actions = useMemo<FoodActions>(
    () => ({
      addFromFood: day.addFromFood,
      addManual: day.addManual,
      createFood: foods.create,
      updateFood: foods.edit,
      deleteFood: foods.remove,
      deleteSeedFoods: foods.removeSeeds,
    }),
    [day.addFromFood, day.addManual, foods.create, foods.edit, foods.remove, foods.removeSeeds],
  )

  return <FoodActionsProvider actions={actions}>{children}</FoodActionsProvider>
}

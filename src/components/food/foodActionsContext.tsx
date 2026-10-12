import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Food } from '@/types'
import type { FoodDraft } from '@/db/defaults'
import type { LogFoodInput, ManualLogInput } from '@/db/foodQueries'

/**
 * Write path for the shared food sheets.
 *
 * The Food page and the dashboard both render the AddFoodSheet but own their
 * own data hooks; the sheet stays stateless about storage and receives the
 * write functions through context.
 */
export interface FoodActions {
  addFromFood: (input: LogFoodInput) => Promise<void>
  addManual: (input: ManualLogInput) => Promise<void>
  createFood: (draft: FoodDraft) => Promise<Food>
  updateFood: (id: string, patch: Partial<Food>) => Promise<Food>
  deleteFood: (id: string) => Promise<void>
  deleteSeedFoods: () => Promise<number>
}

export const FoodActionsContext = createContext<FoodActions | null>(null)

export function useFoodActions(): FoodActions {
  const actions = useContext(FoodActionsContext)
  if (!actions) {
    throw new Error('FoodActionsContext is missing — wrap the view in FoodActionsProvider.')
  }
  return actions
}

export interface FoodActionsProviderProps {
  actions: FoodActions
  children: ReactNode
}

export function FoodActionsProvider({ actions, children }: FoodActionsProviderProps) {
  return <FoodActionsContext.Provider value={actions}>{children}</FoodActionsContext.Provider>
}

import { useCallback, useEffect, useState } from 'react'
import {
  deleteFood,
  deleteSeedFoods,
  listFoods,
  logFood,
  saveFood,
  updateFood,
} from '@/db/foodQueries'
import type { LogFoodInput } from '@/db/foodQueries'
import type { FoodDraft } from '@/db/defaults'
import type { Food } from '@/types'
import { useDatabase } from './useDatabase'
import { useAsyncData } from './useAsyncData'
import { onFoodChanged } from '@/lib/foodEvents'

export interface UseFoodsResult {
  foods: Food[]
  loading: boolean
  error: Error | null
  create: (draft: FoodDraft) => Promise<Food>
  edit: (id: string, patch: Partial<Food>) => Promise<Food>
  remove: (id: string) => Promise<void>
  removeSeeds: () => Promise<number>
  log: (input: LogFoodInput) => Promise<void>
  reload: () => void
}

/** The user's food database: read once, refreshed on any food/log change. */
export function useFoods(): UseFoodsResult {
  const { status } = useDatabase()
  const enabled = status === 'ready'

  const { data, loading, error, reload } = useAsyncData(() => listFoods(), [enabled], {
    enabled,
  })

  useEffect(() => onFoodChanged(reload), [reload])

  const create = useCallback(
    async (draft: FoodDraft) => {
      const food = await saveFood(draft)
      reload()
      return food
    },
    [reload],
  )

  const edit = useCallback(
    async (id: string, patch: Partial<Food>) => {
      const food = await updateFood(id, patch)
      reload()
      return food
    },
    [reload],
  )

  const remove = useCallback(
    async (id: string) => {
      await deleteFood(id)
      reload()
    },
    [reload],
  )

  const removeSeeds = useCallback(async () => {
    const removed = await deleteSeedFoods()
    reload()
    return removed
  }, [reload])

  const log = useCallback(async (input: LogFoodInput) => {
    await logFood(input)
  }, [])

  return {
    foods: data ?? [],
    loading,
    error,
    create,
    edit,
    remove,
    removeSeeds,
    log,
    reload,
  }
}

/** Forces any mounted food-aware view to re-read its queries. */
export function useFoodRefresh(): () => void {
  const [, setNonce] = useState(0)
  useEffect(() => onFoodChanged(() => setNonce((value) => value + 1)), [])
  return useCallback(() => setNonce((value) => value + 1), [])
}

let refreshTick = 0

/** Monotonic counter that changes on every food event — a cheap sync key. */
export function getFoodRefreshTick(): number {
  return refreshTick
}

export function useFoodRefreshTick(): number {
  const [tick, setTick] = useState(refreshTick)
  useEffect(
    () =>
      onFoodChanged(() => {
        refreshTick += 1
        setTick(refreshTick)
      }),
    [],
  )
  return tick
}

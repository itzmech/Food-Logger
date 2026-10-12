import { useCallback, useEffect } from 'react'
import type { FoodLog } from '@/types'
import type { ISODate } from '@/utils/date'
import { getFoodLogsForDate } from '@/db'
import {
  deleteFoodLog,
  getFoodLogById,
  logFood,
  logManualFood,
  updateFoodLog,
} from '@/db/foodQueries'
import type { LogFoodInput, ManualLogInput, FoodLogPatch } from '@/db/foodQueries'
import { useDatabase } from './useDatabase'
import { useAsyncData } from './useAsyncData'
import { onFoodChanged } from '@/lib/foodEvents'

export interface UseFoodDayResult {
  logs: FoodLog[]
  loading: boolean
  error: Error | null
  reload: () => void
  addFromFood: (input: LogFoodInput) => Promise<void>
  addManual: (input: ManualLogInput) => Promise<void>
  update: (id: string, patch: FoodLogPatch) => Promise<void>
  remove: (id: string) => Promise<void>
  refresh: (id: string) => Promise<FoodLog | undefined>
}

/** One day's food log, kept live against any add/edit/remove. */
export function useFoodDay(date: ISODate): UseFoodDayResult {
  const { status } = useDatabase()
  const enabled = status === 'ready'

  const { data, loading, error, reload } = useAsyncData(
    () => getFoodLogsForDate(date),
    [date, enabled],
    { enabled },
  )

  // Writers emit change events; day views refresh whenever anything changes.
  useEffect(() => onFoodChanged(reload), [reload])

  const addFromFood = useCallback(async (input: LogFoodInput) => {
    await logFood(input)
  }, [])

  const addManual = useCallback(async (input: ManualLogInput) => {
    await logManualFood(input)
  }, [])

  const update = useCallback(async (id: string, patch: FoodLogPatch) => {
    await updateFoodLog(id, patch)
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteFoodLog(id)
  }, [])

  const refresh = useCallback(
    async (id: string) => {
      const fresh = await getFoodLogById(id)
      reload()
      return fresh
    },
    [reload],
  )

  return { logs: data ?? [], loading, error, reload, addFromFood, addManual, update, remove, refresh }
}

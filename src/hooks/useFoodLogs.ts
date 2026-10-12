import { useCallback } from 'react'
import { getFoodLogsBetween } from '@/db'
import type { FoodLog } from '@/types'
import { addDays, todayISO } from '@/utils/date'
import { useAsyncData } from './useAsyncData'
import { useDatabase } from './useDatabase'

export interface UseFoodLogsResult {
  data: FoodLog[] | null
  loading: boolean
  error: Error | null
  reload: () => void
}

export function useFoodLogs(): UseFoodLogsResult {
  const { status } = useDatabase()
  const enabled = status === 'ready'

  const { data, loading, error, reload, mutate } = useAsyncData(
    () => getFoodLogsBetween(addDays(todayISO(), -89), todayISO()),
    [enabled],
    { enabled },
  )

  const reloadFn = useCallback(() => {
    mutate(null)
    void reload()
  }, [reload, mutate])

  return { data: data ?? null, loading, error, reload: reloadFn }
}

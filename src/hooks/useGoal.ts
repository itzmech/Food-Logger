import { useCallback } from 'react'
import { getActiveGoal } from '@/db'
import type { Goals } from '@/types'
import { useAsyncData } from './useAsyncData'
import { useDatabase } from './useDatabase'

export interface UseGoalResult {
  data: Goals | null
  loading: boolean
  error: Error | null
  reload: () => void
}

export function useGoal(): UseGoalResult {
  const { status } = useDatabase()
  const enabled = status === 'ready'

  const { data, loading, error, reload, mutate } = useAsyncData(
    () => getActiveGoal(),
    [enabled],
    { enabled },
  )

  const reloadFn = useCallback(() => {
    mutate(null)
    void reload()
  }, [reload, mutate])

  return { data: data ?? null, loading, error, reload: reloadFn }
}

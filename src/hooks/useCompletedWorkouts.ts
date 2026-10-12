import { useCallback } from 'react'
import { listCompletedWorkoutsBetween } from '@/db'
import type { CompletedWorkout } from '@/types'
import { addDays, todayISO } from '@/utils/date'
import { useAsyncData } from './useAsyncData'
import { useDatabase } from './useDatabase'

export interface UseCompletedWorkoutsResult {
  data: CompletedWorkout[] | null
  loading: boolean
  error: Error | null
  reload: () => void
}

export function useCompletedWorkouts(): UseCompletedWorkoutsResult {
  const { status } = useDatabase()
  const enabled = status === 'ready'

  const { data, loading, error, reload, mutate } = useAsyncData(
    () => listCompletedWorkoutsBetween(addDays(todayISO(), -89), todayISO()),
    [enabled],
    { enabled },
  )

  const reloadFn = useCallback(() => {
    mutate(null)
    void reload()
  }, [reload, mutate])

  return { data: data ?? null, loading, error, reload: reloadFn }
}

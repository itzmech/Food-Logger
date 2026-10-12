import { useCallback } from 'react'
import { getActiveGoal, saveActiveGoal } from '@/db'
import type { Goals } from '@/types'
import { useDatabase } from './useDatabase'
import { useAsyncData } from './useAsyncData'

export interface UseGoalsResult {
  goal: Goals | null
  loading: boolean
  error: Error | null
  save: (patch: Partial<Goals>) => Promise<Goals>
  reload: () => void
}

/** Reads the active goal (undefined until the user creates one). */
export function useGoals(): UseGoalsResult {
  const { status } = useDatabase()
  const enabled = status === 'ready'

  const { data, loading, error, reload, mutate } = useAsyncData(
    () => getActiveGoal(),
    [enabled],
    { enabled },
  )

  const save = useCallback(
    async (patch: Partial<Goals>) => {
      const next = await saveActiveGoal(patch)
      mutate(next)
      return next
    },
    [mutate],
  )

  return { goal: data ?? null, loading, error, save, reload }
}

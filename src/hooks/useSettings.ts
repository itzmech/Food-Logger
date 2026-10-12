import { useCallback } from 'react'
import { getSettings, updateSettings } from '@/db'
import type { UserSettings } from '@/types'
import { useDatabase } from './useDatabase'
import { useAsyncData } from './useAsyncData'

export interface UseSettingsResult {
  settings: UserSettings | null
  loading: boolean
  error: Error | null
  update: (patch: Partial<UserSettings>) => Promise<UserSettings>
  reload: () => void
}

/** Reads the singleton settings record and persists patches. */
export function useSettings(): UseSettingsResult {
  const { status } = useDatabase()
  const enabled = status === 'ready'

  const { data, loading, error, reload, mutate } = useAsyncData(
    () => getSettings(),
    [enabled],
    { enabled },
  )

  const update = useCallback(
    async (patch: Partial<UserSettings>) => {
      const next = await updateSettings(patch)
      mutate(next)
      return next
    },
    [mutate],
  )

  return { settings: data, loading, error, update, reload }
}

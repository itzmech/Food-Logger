import { useCallback, useEffect, useState } from 'react'
import { computeAllStreaks, setStreakSkip, clearStreakSkip, isStreakSkipped } from '@/lib/streakService'
import { onActivityChanged } from '@/lib/activityEvents'
import type { StreakCategory, StreakResult } from '@/lib/streaks'
import { todayISO } from '@/utils/date'

export interface UseStreaksReturn {
  streaks: StreakResult[]
  loading: boolean
  error: Error | null
  reload: () => Promise<void>
  getStreak: (category: StreakCategory) => StreakResult | undefined
  skipDay: (category: StreakCategory, date?: string) => Promise<void>
  unskipDay: (category: StreakCategory, date?: string) => Promise<void>
  isSkipped: (category: StreakCategory, date?: string) => Promise<boolean>
}

export function useStreaks(): UseStreaksReturn {
  const [streaks, setStreaks] = useState<StreakResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    try {
      setError(null)
      const results = await computeAllStreaks()
      setStreaks(results)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => onActivityChanged(() => void reload()), [reload])

  const getStreak = useCallback(
    (category: StreakCategory) => streaks.find((s) => s.category === category),
    [streaks],
  )

  const skipDay = useCallback(
    async (category: StreakCategory, date = todayISO()) => {
      await setStreakSkip(category, date)
      await reload()
    },
    [reload],
  )

  const unskipDay = useCallback(
    async (category: StreakCategory, date = todayISO()) => {
      await clearStreakSkip(category, date)
      await reload()
    },
    [reload],
  )

  const isSkipped = useCallback(
    async (category: StreakCategory, date = todayISO()) => isStreakSkipped(category, date),
    [],
  )

  return { streaks, loading, error, reload, getStreak, skipDay, unskipDay, isSkipped }
}
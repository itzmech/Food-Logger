import { useCallback, useEffect, useState } from 'react'
import { getLatestMeasurement } from '@/db'
import type { BodyMeasurement } from '@/types'
import { onActivityChanged } from '@/lib/activityEvents'

export interface UseLatestWeightResult {
  /** Most recent weight record, or undefined when none exists. */
  weight: BodyMeasurement | undefined
  loading: boolean
  reload: () => void
}

/**
 * The latest body-weight reading. Activity calorie estimates
 * depend on it; a missing weight simply yields no estimate —
 * it never blocks cardio logging.
 */
export function useLatestWeight(): UseLatestWeightResult {
  const [weight, setWeight] = useState<BodyMeasurement | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setWeight(await getLatestMeasurement('weight'))
    } catch {
      setWeight(undefined)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // Weight changes (and cardio edits) can both change estimates.
  useEffect(() => onActivityChanged(reload), [reload])

  return { weight, loading, reload }
}

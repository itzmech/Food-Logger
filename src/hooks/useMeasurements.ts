import { useCallback, useEffect, useState } from 'react'
import {
  deleteBodyMeasurement,
  getMeasurementsBetween,
  saveBodyMeasurement,
} from '@/db'
import type { BodyMeasurement, MeasurementType } from '@/types'
import type { MeasurementDraft } from '@/db'
import { addDays, todayISO } from '@/utils/date'
import { emitActivityChanged, onActivityChanged } from '@/lib/activityEvents'

export interface UseMeasurementsResult {
  /** Newest first. */
  measurements: BodyMeasurement[]
  loading: boolean
  error: Error | null
  reload: () => void
  add: (draft: MeasurementDraft) => Promise<BodyMeasurement>
  remove: (id: string) => Promise<boolean>
}

/**
 * Recent measurements of one type (last 60 days, newest first).
 * Weight records feed activity calorie estimates, so writes emit
 * the same activity-changed event as cardio logging.
 */
export function useMeasurements(type: MeasurementType): UseMeasurementsResult {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = addDays(todayISO(), -59)
      const rows = await getMeasurementsBetween(type, from, todayISO())
      setMeasurements(rows.sort((a, b) => b.date.localeCompare(a.date)))
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [type])

  const add = useCallback(
    async (draft: MeasurementDraft) => {
      const created = await saveBodyMeasurement(draft)
      emitActivityChanged('weight-added')
      return created
    },
    [],
  )

  const remove = useCallback(async (id: string) => {
    const ok = await deleteBodyMeasurement(id)
    if (ok) emitActivityChanged('measurement-removed')
    return ok
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => onActivityChanged(reload), [reload])

  return { measurements, loading, error, reload, add, remove }
}

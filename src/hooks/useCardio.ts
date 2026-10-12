import { useCallback, useEffect, useState } from 'react'
import {
  deleteCardioSession,
  getCardioBetween,
  saveCardioSession,
} from '@/db'
import type { CardioDraft } from '@/db'
import type { CardioSession } from '@/types'
import { addDays, todayISO } from '@/utils/date'
import { emitActivityChanged, onActivityChanged } from '@/lib/activityEvents'

export interface UseCardioResult {
  sessions: CardioSession[]
  loading: boolean
  error: Error | null
  reload: () => void
  add: (draft: CardioDraft) => Promise<CardioSession>
  remove: (id: string) => Promise<boolean>
}

/**
 * Recent cardio sessions (last 14 days, today first).
 * Re-reads whenever cardio or measurement data changes so
 * estimates (which depend on body weight) stay current.
 */
export function useCardio(): UseCardioResult {
  const [sessions, setSessions] = useState<CardioSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = addDays(todayISO(), -13)
      const rows = await getCardioBetween(from, todayISO())
      setSessions(rows.sort((a, b) => b.date.localeCompare(a.date)))
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [])

  const add = useCallback(async (draft: CardioDraft) => {
    const created = await saveCardioSession(draft)
    emitActivityChanged('cardio-added')
    return created
  }, [])

  const remove = useCallback(async (id: string) => {
    const ok = await deleteCardioSession(id)
    if (ok) emitActivityChanged('cardio-removed')
    return ok
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => onActivityChanged(reload), [reload])

  return { sessions, loading, error, reload, add, remove }
}

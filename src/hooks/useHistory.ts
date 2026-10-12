import { useCallback, useEffect, useState } from 'react'
import {
  getMonthHistory,
  type DaySignal,
  type DailyHistorySummary,
} from '@/lib/history'
import { monthLabel } from '@/utils/date'
import { onFoodChanged } from '@/lib/foodEvents'
import { onActivityChanged } from '@/lib/activityEvents'

export interface UseHistoryResult {
  /** The currently viewed month. */
  month: {
    monthKey: string
    label: string
    days: DailyHistorySummary[]
    activeDays: string[]
    signalsByDay: Record<string, DaySignal[]>
  }
  selectedDay: string | null
  loading: boolean
  error: Error | null
  selectDay: (date: string) => void
  selectMonth: (monthKey: string) => void
  reload: () => void
}

const DEFAULT_MONTH = monthKeyOfToday()

function monthKeyOfToday(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function useHistory(): UseHistoryResult {
  const [monthKey, setMonthKey] = useState(DEFAULT_MONTH)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [month, setMonth] = useState<UseHistoryResult['month']>({
    monthKey: DEFAULT_MONTH,
    label: monthLabel(DEFAULT_MONTH),
    days: [],
    activeDays: [],
    signalsByDay: {},
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadMonth = useCallback(
    async (key: string) => {
      setLoading(true)
      setError(null)
      try {
        const [year, month] = key.split('-').map(Number)
        const data = await getMonthHistory(year, month)
        setMonth({
          monthKey: data.monthKey,
          label: data.label,
          days: data.days,
          activeDays: data.activeDays,
          signalsByDay: data.signalsByDay,
        })
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setMonth((prev) => ({
          ...prev,
          days: prev.days.map((d) => d),
        }))
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const selectMonth = useCallback(
    (key: string) => {
      setMonthKey(key)
      setSelectedDay(null)
      void loadMonth(key)
    },
    [loadMonth],
  )

  const selectDay = useCallback((date: string) => {
    setSelectedDay(date)
  }, [])

  // Initial load.
  useEffect(() => {
    void loadMonth(monthKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when the month changes.
  useEffect(() => {
    void loadMonth(monthKey)
  }, [monthKey, loadMonth])

  // Live refresh: food or activity writes should recompute indicators.
  // onFoodChanged / onActivityChanged call the handler with no args, so we
  // close over the current monthKey.
  useEffect(() => {
    const unsubFood = onFoodChanged(() => void loadMonth(monthKey))
    const unsubActivity = onActivityChanged(() => void loadMonth(monthKey))
    return () => {
      unsubFood()
      unsubActivity()
    }
  }, [monthKey, loadMonth])

  // Cleanups handled by the effects above; no extra subscription here.

  return {
    month,
    selectedDay,
    loading,
    error,
    selectDay,
    selectMonth,
    reload: () => void loadMonth(monthKey),
  }
}

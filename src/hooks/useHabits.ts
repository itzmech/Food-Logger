import { useCallback, useEffect, useState } from 'react'
import {
  createHabit,
  deleteHabit,
  listHabits,
  listHabitLogsForDate,
  markHabitCompleted,
  markHabitNotDone,
  markHabitSkipped,
  toggleHabitActive,
  updateHabit,
} from '@/db/habitQueries'
import type { Habit, HabitLog } from '@/types/habit'
import { todayISO } from '@/utils/date'

export interface UseHabits {
  habits: Habit[]
  loading: boolean
  error: Error | null
  reload: () => Promise<void>
  addHabit: (input: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'active'>) => Promise<Habit>
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<Habit>
  deleteHabit: (id: string) => Promise<void>
  toggleActive: (id: string) => Promise<Habit>
  markDone: (habitId: string, date?: string, value?: number | null, note?: string) => Promise<void>
  markSkip: (habitId: string, date?: string) => Promise<void>
  markNotDone: (habitId: string, date?: string) => Promise<void>
  todayLogs: HabitLog[]
  getLogForDate: (habitId: string, date: string) => HabitLog | undefined
}

export interface UseHabitsOptions {
  date?: string
  includeArchived?: boolean
}

export function useHabits(options: UseHabitsOptions = {}): UseHabits {
  const date = options.date ?? todayISO()
  const activeOnly = !options.includeArchived
  const [habits, setHabits] = useState<Habit[]>([])
  const [todayLogs, setTodayLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [h, logs] = await Promise.all([
        listHabits(activeOnly),
        listHabitLogsForDate(date),
      ])
      setHabits(h)
      setTodayLogs(logs)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Could not load habits.'))
    } finally {
      setLoading(false)
    }
  }, [activeOnly, date])

  useEffect(() => {
    void reload()
  }, [reload])

  const addHabit = async (input: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'active'>): Promise<Habit> => {
    const created = await createHabit(input)
    await reload()
    return created
  }

  const updateHabitFn = async (id: string, patch: Partial<Habit>): Promise<Habit> => {
    const updated = await updateHabit(id, patch)
    if (!updated) throw new Error('Habit not found')
    await reload()
    return updated
  }

  const deleteHabitFn = async (id: string): Promise<void> => {
    await deleteHabit(id)
    await reload()
  }

  const toggleActiveFn = async (id: string): Promise<Habit> => {
    const updated = await toggleHabitActive(id)
    if (!updated) throw new Error('Habit not found')
    await reload()
    return updated
  }

  const markDoneFn = async (habitId: string, date?: string, value?: number | null, note?: string): Promise<void> => {
    await markHabitCompleted(habitId, date ?? todayISO(), value, note)
    await reload()
  }

  const markSkipFn = async (habitId: string, date?: string): Promise<void> => {
    await markHabitSkipped(habitId, date ?? todayISO())
    await reload()
  }

  const markNotDoneFn = async (habitId: string, date?: string): Promise<void> => {
    await markHabitNotDone(habitId, date ?? todayISO())
    await reload()
  }

  const getLogForDateFn = (habitId: string, date: string): HabitLog | undefined =>
    todayLogs.find((log) => log.habitId === habitId && log.date === date)

  return {
    habits,
    loading,
    error,
    reload,
    addHabit,
    updateHabit: updateHabitFn,
    deleteHabit: deleteHabitFn,
    toggleActive: toggleActiveFn,
    markDone: markDoneFn,
    markSkip: markSkipFn,
    markNotDone: markNotDoneFn,
    todayLogs,
    getLogForDate: getLogForDateFn,
  }
}

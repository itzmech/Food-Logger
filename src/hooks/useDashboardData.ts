import { useEffect } from 'react'
import {
  getCardioBetween,
  getCardioForDate,
  getSettings,
  getStrengthLogsForDate,
  getStrengthLogsForRange,
  getWorkoutsBetween,
  getWorkoutsForDate,
  listCompletedWorkouts,
} from '@/db'
import type { CardioSession, CompletedWorkout, WorkoutStatus } from '@/types'
import { isCountedWorkoutDay } from '@/types'
import { onActivityChanged } from '@/lib/activityEvents'
import { startOfWeek, todayISO } from '@/utils/date'
import { useDatabase } from './useDatabase'
import { useAsyncData } from './useAsyncData'

export interface DashboardSummary {
  date: string
  today: {
    workout: {
      status: WorkoutStatus | null
      name: string | null
      durationMinutes: number | null
    }
    cardioMinutes: number
    activity: {
      cardioSessions: number
      workoutsCompleted: number
    }
  }
  week: {
    from: string
    to: string
    workouts: number
    cardioMinutes: number
  }
}

export interface UseDashboardDataResult {
  summary: DashboardSummary | null
  loading: boolean
  error: Error | null
  reload: () => void
}

/** Loads real workout and cardio records for the dashboard's daily summaries. */
export function useDashboardData(): UseDashboardDataResult {
  const { status } = useDatabase()
  const enabled = status === 'ready'

  const { data, loading, error, reload } = useAsyncData(
    async () => {
      const today = todayISO()
      const settings = await getSettings()
      const weekStart = startOfWeek(today, settings.weekStartsOn)
      const [
        todayWorkouts,
        weekWorkouts,
        todayCardioRaw,
        weekCardioRaw,
        completedWorkoutsRaw,
        todayStrengthLogs,
        weekStrengthLogs,
      ] = await Promise.all([
        getWorkoutsForDate(today),
        getWorkoutsBetween(weekStart, today),
        getCardioForDate(today),
        getCardioBetween(weekStart, today),
        listCompletedWorkouts(),
        getStrengthLogsForDate(today),
        getStrengthLogsForRange(weekStart, today),
      ])

      const todayCardio: CardioSession[] = todayCardioRaw
      const weekCardio: CardioSession[] = weekCardioRaw
      const completedToday: CompletedWorkout[] = completedWorkoutsRaw
        .filter((workout) => workout.completedAtLocal === today)
        .sort((first, second) => first.startedAt.localeCompare(second.startedAt))
      const completedStrengthToday = todayStrengthLogs.some(isCountedWorkoutDay)
      const workout = todayWorkouts.find((item) => item.status === 'completed') ?? todayWorkouts[0]
      const latestCompleted = completedToday[completedToday.length - 1]
      const workoutStatus: WorkoutStatus | null =
        workout?.status === 'completed' || latestCompleted || completedStrengthToday
          ? 'completed'
          : workout?.status ?? null
      const workoutDays = new Set<string>()
      for (const item of weekWorkouts) {
        if (item.status === 'completed') workoutDays.add(item.date)
      }
      for (const item of completedWorkoutsRaw) {
        if (item.completedAtLocal >= weekStart && item.completedAtLocal <= today) {
          workoutDays.add(item.completedAtLocal)
        }
      }
      for (const item of weekStrengthLogs) {
        if (isCountedWorkoutDay(item)) workoutDays.add(item.date)
      }

      return {
        date: today,
        today: {
          workout: {
            status: workoutStatus,
            name: latestCompleted?.name ?? workout?.name ?? todayStrengthLogs.find(isCountedWorkoutDay)?.exerciseNameSnapshot ?? null,
            durationMinutes:
              workout?.durationMinutes ??
              (latestCompleted?.durationSeconds != null ? Math.round(latestCompleted.durationSeconds / 60) : null),
          },
          cardioMinutes: todayCardio.reduce((total, session) => total + session.durationMinutes, 0),
          activity: {
            cardioSessions: todayCardio.length,
            workoutsCompleted: completedToday.length + (completedStrengthToday ? 1 : 0),
          },
        },
        week: {
          from: weekStart,
          to: today,
          workouts: workoutDays.size,
          cardioMinutes: weekCardio.reduce((total, session) => total + session.durationMinutes, 0),
        },
      }
    },
    [enabled],
    { enabled },
  )

  useEffect(() => onActivityChanged(reload), [reload])

  return { summary: data, loading, error, reload }
}

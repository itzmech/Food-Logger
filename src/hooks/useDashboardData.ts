import type { CardioSession, Workout } from '@/types'
import {
  getActiveGoal,
  getCardioBetween,
  getCardioForDate,
  getFoodLogsBetween,
  getFoodLogsForDate,
  getLatestMeasurement,
  getMeasurementsBetween,
  getSettings,
  getStrengthLogsForDate,
  getStrengthLogsForRange,
  getWorkoutsBetween,
  getWorkoutsForDate,
  groupTasksForDay,
  listCompletedWorkouts,
} from '@/db'
import { STREAK_WINDOW_DAYS, buildDashboardSummary } from '@/lib/summary'
import type { DashboardSummary } from '@/lib/summary'
import { addDays, startOfWeek, todayISO } from '@/utils/date'
import { useEffect } from 'react'
import { useDatabase } from './useDatabase'
import { useAsyncData } from './useAsyncData'
import { onFoodChanged } from '@/lib/foodEvents'
import { onActivityChanged } from '@/lib/activityEvents'

export interface UseDashboardDataResult {
  summary: DashboardSummary | null
  loading: boolean
  error: Error | null
  reload: () => void
}

/**
 * Loads everything the dashboard needs in one pass.
 * With an empty database this resolves to zeros and empty states.
 * Re-runs whenever food is logged so calories/protein update instantly.
 */
export function useDashboardData(): UseDashboardDataResult {
  const { status } = useDatabase()
  const enabled = status === 'ready'

  const { data, loading, error, reload } = useAsyncData(
    async () => {
      const today = todayISO()
      const settings = await getSettings()
      const weekStart = startOfWeek(today, settings.weekStartsOn)
      const streakStart = addDays(today, -(STREAK_WINDOW_DAYS - 1))

      const [
        goal,
        todayLogs,
        weekLogs,
        todayWorkouts,
        weekWorkouts,
        todayCardioRaw,
        weekCardioRaw,
        streakFoodLogs,
        streakWorkouts,
        streakCardioRaw,
        latestWeight,
        weekWeightMeasurements,
        completedWorkoutsRaw,
        todayStrengthLogs,
        weekStrengthLogs,
        streakStrengthLogs,
        todayTasks,
      ] = await Promise.all([
        getActiveGoal(),
        getFoodLogsForDate(today),
        getFoodLogsBetween(weekStart, today),
        getWorkoutsForDate(today),
        getWorkoutsBetween(weekStart, today),
        getCardioForDate(today),
        getCardioBetween(weekStart, today),
        getFoodLogsBetween(streakStart, today),
        getWorkoutsBetween(streakStart, today),
        getCardioBetween(streakStart, today),
        getLatestMeasurement('weight'),
        getMeasurementsBetween('weight', weekStart, today),
        listCompletedWorkouts(),
        getStrengthLogsForDate(today),
        getStrengthLogsForRange(weekStart, today),
        getStrengthLogsForRange(streakStart, today),
        groupTasksForDay(today),
      ])

      const todayCardio: CardioSession[] = todayCardioRaw
      const weekCardio: CardioSession[] = weekCardioRaw
      const streakCardio: CardioSession[] = streakCardioRaw
      const completedWorkoutsAll = completedWorkoutsRaw

      return buildDashboardSummary({
        today,
        weekStart,
        todayTasks,
        todayLogs,
        weekLogs,
        todayWorkouts: todayWorkouts as Workout[],
        weekWorkouts: weekWorkouts as Workout[],
        todayCardio,
        weekCardio,
        streakFoodLogs,
        streakWorkouts: streakWorkouts as Workout[],
        streakCardio,
        latestWeight,
        weekWeightMeasurements,
        todayCompletedWorkouts: completedWorkoutsAll.filter(
          (workout) => workout.completedAtLocal === today,
        ),
        todayStrengthLogs,
        weekStrengthLogs,
        streakStrengthLogs,
        goal,
      })
    },
    [enabled],
    { enabled },
  )

  // Live updates: any food or activity write re-runs the query.
  useEffect(() => onFoodChanged(reload), [reload])
  useEffect(() => onActivityChanged(reload), [reload])

  return { summary: data, loading, error, reload }
}

import {
  getStreakSkip,
  listHabitsByCategory,
  listHabitLogsForHabit,
  listStreakSkipsForCategory,
  setStreakSkip as persistStreakSkip,
  deleteStreakSkip,
} from '@/db/habitQueries'
import { cardioRepo, completedWorkoutsRepo, dailyStrengthLogsRepo } from '@/db/repositories'
import {
  isHabitsDayComplete,
  scheduledHabitsForDate,
  type HabitLike,
  type HabitLogLike,
} from '@/lib/habitCompletion'
import {
  calculateStreak,
  type DayStatus,
  type StreakCategory,
  type StreakResult,
} from '@/lib/streaks'
import { todayISO, eachDay, toISODate } from '@/utils/date'

/** Exposed for diagnostics/tests — the active habits scheduled for a date. */
export async function scheduledHabitsForDateService(date: string): Promise<HabitLike[]> {
  const habits = await listHabitsByCategory('habit')
  return scheduledHabitsForDate(habits, date)
}

function earliestDate(dates: string[], referenceDate: string): string {
  const inRange = dates.filter((date) => date <= referenceDate).sort()
  return inRange[0] ?? referenceDate
}

export async function computeStreakForCategory(
  category: StreakCategory,
  referenceDate = todayISO(),
): Promise<StreakResult> {
  const skips = await listStreakSkipsForCategory(category)
  const skipDates = new Set(skips.map((skip) => skip.date))
  const activityDates = new Set<string>()
  const historyStartCandidates = skips.map((skip) => skip.date)

  if (category === 'habit') {
    const habits = await listHabitsByCategory('habit')
    const logs: HabitLogLike[] = []
    for (const habit of habits) {
      historyStartCandidates.push(toISODate(new Date(habit.createdAt)))
      const habitLogs = await listHabitLogsForHabit(habit.id)
      logs.push(
        ...habitLogs.map((log) => ({
          habitId: log.habitId,
          date: log.date,
          status: log.status,
        })),
      )
      historyStartCandidates.push(...habitLogs.map((log) => log.date))
    }

    const from = earliestDate(historyStartCandidates, referenceDate)
    for (const date of eachDay(from, referenceDate)) {
      if (isHabitsDayComplete(habits, logs, date)) activityDates.add(date)
    }
  } else if (category === 'gym') {
    const [strengthLogs, completedWorkouts] = await Promise.all([
      dailyStrengthLogsRepo.getAll(),
      completedWorkoutsRepo.getAll(),
    ])
    for (const log of strengthLogs) {
      historyStartCandidates.push(log.date)
      if (!log.skipped && log.sets.some((set) => set.weight != null && set.reps != null)) {
        activityDates.add(log.date)
      }
    }
    for (const workout of completedWorkouts) {
      historyStartCandidates.push(workout.completedAtLocal)
      activityDates.add(workout.completedAtLocal)
    }
  } else {
    const sessions = await cardioRepo.getAll()
    for (const session of sessions) {
      historyStartCandidates.push(session.date)
      if (Number.isFinite(session.durationMinutes) && session.durationMinutes > 0) {
        activityDates.add(session.date)
      }
    }
  }

  const historyStartDate = earliestDate(historyStartCandidates, referenceDate)
  const history: DayStatus[] = eachDay(historyStartDate, referenceDate).map((date) => ({
    date,
    status: activityDates.has(date)
      ? 'active'
      : skipDates.has(date)
        ? 'skipped'
        : 'missed',
  }))

  return calculateStreak(category, history, referenceDate)
}

export async function computeAllStreaks(
  referenceDate = todayISO(),
): Promise<StreakResult[]> {
  const [habit, gym, cardio] = await Promise.all([
    computeStreakForCategory('habit', referenceDate),
    computeStreakForCategory('gym', referenceDate),
    computeStreakForCategory('cardio', referenceDate),
  ])
  return [habit, gym, cardio]
}

export async function setStreakSkip(category: StreakCategory, date: string): Promise<void> {
  await persistStreakSkip(category, date)
}

export async function clearStreakSkip(category: StreakCategory, date: string): Promise<void> {
  await deleteStreakSkip(category, date)
}

export async function isStreakSkipped(category: StreakCategory, date: string): Promise<boolean> {
  return (await getStreakSkip(category, date)) != null
}

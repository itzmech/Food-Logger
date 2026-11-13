import { newId, nowIso } from '@/utils/id'
import { emitActivityChanged } from '@/lib/activityEvents'
import { habitsRepo, habitLogsRepo, streakSkipsRepo } from './repositories'
import type { Habit, HabitLog, HabitCategory, HabitSchedule } from '@/types/habit'
import type { ISODate } from '@/utils/date'
import type { ISODateTime } from '@/types/common'

/* ------------------------------------------------------------------ */
/* Habits                                                              */
/* ------------------------------------------------------------------ */

export async function listHabits(activeOnly = true): Promise<Habit[]> {
  const all = await habitsRepo.getAll()
  if (!activeOnly) return all
  return all.filter((h) => h.active)
}

export async function listHabitsByCategory(category: HabitCategory): Promise<Habit[]> {
  const all = await habitsRepo.getAll()
  return all.filter((h) => h.category === category && h.active)
}

export async function getHabit(id: string): Promise<Habit | undefined> {
  return habitsRepo.get(id)
}

export async function createHabit(input: {
  title: string
  description?: string | null
  category: HabitCategory
  schedule: HabitSchedule
  customDays?: number[]
  goalValue?: number | null
  color?: string
}): Promise<Habit> {
  const now = nowIso()
  const habit: Habit = {
    id: newId(),
    title: input.title.trim(),
    description: input.description?.trim() || null,
    category: input.category,
    schedule: input.schedule,
    customDays: input.customDays ?? [],
    goalValue: input.goalValue ?? null,
    color: input.color ?? '#8B5CF6',
    active: true,
    createdAt: now,
    updatedAt: now,
  }
  await habitsRepo.put(habit)
  emitActivityChanged('habits-changed')
  return habit
}

export async function updateHabit(id: string, patch: Partial<Habit>): Promise<Habit | undefined> {
  const current = await habitsRepo.get(id)
  if (!current) return undefined
  const next: Habit = {
    ...current,
    ...patch,
    id,
    updatedAt: nowIso(),
  }
  await habitsRepo.put(next)
  emitActivityChanged('habits-changed')
  return next
}

export async function deleteHabit(id: string): Promise<void> {
  await habitsRepo.remove(id)
  // Also remove logs for this habit.
  const logs = await habitLogsRepo.getAll()
  for (const log of logs) {
    if (log.habitId === id) await habitLogsRepo.remove(log.id)
  }
  emitActivityChanged('habits-changed')
}

export async function toggleHabitActive(id: string): Promise<Habit | undefined> {
  const current = await habitsRepo.get(id)
  if (!current) return undefined
  return updateHabit(id, { active: !current.active })
}

/* ------------------------------------------------------------------ */
/* Habit logs                                                          */
/* ------------------------------------------------------------------ */

export async function getHabitLog(
  habitId: string,
  date: ISODate,
): Promise<HabitLog | undefined> {
  const logs = await habitLogsRepo.getAllByIndex('habitId', habitId)
  return logs.find((l) => l.date === date)
}

export async function listHabitLogsForHabit(
  habitId: string,
  since?: ISODate,
): Promise<HabitLog[]> {
  const all = await habitLogsRepo.getAll()
  return all
    .filter((l) => l.habitId === habitId)
    .filter((l) => !since || l.date >= since)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function listHabitLogsForDate(date: ISODate): Promise<HabitLog[]> {
  const all = await habitLogsRepo.getAll()
  return all.filter((l) => l.date === date)
}

export async function upsertHabitLog(input: {
  habitId: string
  date: ISODate
  status: 'completed' | 'skipped'
  value?: number | null
  note?: string | null
}): Promise<HabitLog> {
  const existing = await getHabitLog(input.habitId, input.date)
  const now = nowIso()
  const log: HabitLog = {
    id: existing?.id ?? newId(),
    habitId: input.habitId,
    date: input.date,
    status: input.status,
    value: input.value ?? null,
    note: input.note?.trim() || null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await habitLogsRepo.put(log)
  emitActivityChanged('habits-changed')
  return log
}

export async function deleteHabitLog(habitId: string, date: ISODate): Promise<void> {
  const existing = await getHabitLog(habitId, date)
  if (existing) {
    await habitLogsRepo.remove(existing.id)
    emitActivityChanged('habits-changed')
  }
}

export async function markHabitSkipped(habitId: string, date: ISODate): Promise<HabitLog> {
  return upsertHabitLog({ habitId, date, status: 'skipped' })
}

export async function markHabitCompleted(
  habitId: string,
  date: ISODate,
  value?: number | null,
  note?: string | null,
): Promise<HabitLog> {
  return upsertHabitLog({ habitId, date, status: 'completed', value, note })
}

export async function markHabitNotDone(habitId: string, date: ISODate): Promise<void> {
  await deleteHabitLog(habitId, date)
}

/* ------------------------------------------------------------------ */
/* Streak skips (category-level skip button)                           */
/* ------------------------------------------------------------------ */

export interface StreakSkipRecord {
  id: string
  category: string
  date: ISODate
  createdAt: ISODateTime
}

export async function getStreakSkip(category: string, date: ISODate): Promise<StreakSkipRecord | undefined> {
  const skips = await streakSkipsRepo.getAllByIndex('category+date', [category, date])
  return skips[0]
}

export async function setStreakSkip(category: string, date: ISODate): Promise<StreakSkipRecord> {
  const existing = await getStreakSkip(category, date)
  const record: StreakSkipRecord = {
    id: existing?.id ?? newId(),
    category,
    date,
    createdAt: existing?.createdAt ?? nowIso(),
  }
  await streakSkipsRepo.put(record)
  return record
}

export async function deleteStreakSkip(category: string, date: ISODate): Promise<void> {
  const existing = await getStreakSkip(category, date)
  if (existing) await streakSkipsRepo.remove(existing.id)
}

export async function listStreakSkipsForCategory(
  category: string,
  since?: ISODate,
): Promise<StreakSkipRecord[]> {
  const all = await streakSkipsRepo.getAllByIndex('category', category)
  return all
    .filter((s) => !since || s.date >= since)
    .sort((a, b) => a.date.localeCompare(b.date))
}
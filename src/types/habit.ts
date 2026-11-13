import type { ID, ISODate, Timestamped } from './common'

export type HabitCategory = 'habit' | 'gym' | 'cardio'

export type HabitSchedule = 'daily' | 'weekdays' | 'weekends' | 'custom'

export interface Habit extends Timestamped {
  id: ID
  title: string
  description: string | null
  category: HabitCategory
  schedule: HabitSchedule
  /** ISO weekday numbers (0=Sun..6=Sat) for custom schedule. */
  customDays: number[]
  /** Optional numeric goal, e.g. minutes for cardio, sets for gym. */
  goalValue: number | null
  /** Display color key. */
  color: string
  active: boolean
}

export interface HabitLog extends Timestamped {
  id: ID
  habitId: ID
  date: ISODate
  status: 'completed' | 'skipped'
  /** Actual value logged, if any. */
  value: number | null
  note: string | null
}

export const HABIT_CATEGORIES: HabitCategory[] = ['habit', 'gym', 'cardio']

export const HABIT_CATEGORY_LABELS: Record<HabitCategory, string> = {
  habit: 'Habit',
  gym: 'Gym',
  cardio: 'Cardio',
}

export const HABIT_SCHEDULES: HabitSchedule[] = ['daily', 'weekdays', 'weekends', 'custom']

export const HABIT_SCHEDULE_LABELS: Record<HabitSchedule, string> = {
  daily: 'Every day',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  custom: 'Custom days',
}

export const HABIT_COLORS = [
  '#FF6A30',
  '#3882F6',
  '#8B5CF6',
  '#22C55E',
  '#F59E0B',
  '#EC4899',
  '#06B6D4',
  '#F97316',
] as const
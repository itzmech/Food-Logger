import type { ID, ISODate, Timestamped } from './common'

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'pending' | 'completed'

export type TaskCategory =
  | 'personal'
  | 'health'
  | 'work'
  | 'chores'
  | 'errands'
  | 'other'

export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const TASK_PRIORITIES_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export const TASK_CATEGORIES: TaskCategory[] = [
  'personal',
  'health',
  'work',
  'chores',
  'errands',
  'other',
]

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  personal: 'Personal',
  health: 'Health',
  work: 'Work',
  chores: 'Chores',
  errands: 'Errands',
  other: 'Other',
}

export interface Task extends Timestamped {
  id: ID
  title: string
  /** Local `YYYY-MM-DD` day key, or empty when no due date set. */
  dueDate: ISODate
  priority: TaskPriority
  status: TaskStatus
  /** Optional free-text category. Stored lowercase for consistency. */
  category: TaskCategory
  note: string | null
}

export type TaskDraft = Pick<
  Task,
  'title' | 'dueDate' | 'priority' | 'category' | 'note'
>

import type { ID, ISODate, Task, TaskDraft } from '@/types'
import { tasksRepo } from './repositories'
import { newId, nowIso } from '@/utils/id'
import { emitTasksChanged } from '@/lib/taskEvents'
import { todayISO } from '@/utils/date'
import { TASK_PRIORITIES_ORDER } from '@/types/tasks'

/** All tasks, ordered by created date descending. */
export async function listTasks(): Promise<Task[]> {
  const all = await tasksRepo.getAll()
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Returns one task, if any. */
export async function getTask(id: ID): Promise<Task | undefined> {
  return tasksRepo.get(id)
}

/** Creates a new task. */
export async function createTask(draft: TaskDraft): Promise<Task> {
  const now = nowIso()
  const task: Task = {
    id: newId(),
    title: draft.title.trim(),
    dueDate: draft.dueDate ?? '',
    priority: draft.priority ?? 'medium',
    status: 'pending',
    category: draft.category ?? 'other',
    note: draft.note ?? null,
    createdAt: now,
    updatedAt: now,
  }
  await tasksRepo.put(task)
  emitTasksChanged('task-created')
  return task
}

/** Updates a task wholesale. */
export async function saveTask(task: Task): Promise<Task> {
  const updated: Task = {
    ...task,
    updatedAt: nowIso(),
  }
  await tasksRepo.put(updated)
  emitTasksChanged('task-updated')
  return updated
}

/** Toggles a task's completion status. */
export async function toggleTaskStatus(id: ID): Promise<Task> {
  const existing = await tasksRepo.get(id)
  if (!existing) throw new Error('Task not found')
  const next: Task = {
    ...existing,
    status: existing.status === 'completed' ? 'pending' : 'completed',
    updatedAt: nowIso(),
  }
  await tasksRepo.put(next)
  emitTasksChanged('task-toggled')
  return next
}

/** Deletes a task. */
export async function deleteTask(id: ID): Promise<void> {
  await tasksRepo.remove(id)
  emitTasksChanged('task-deleted')
}

/** Returns tasks grouped by their relationship to a given day key.
 *
 * - dueToday: due on `day` and not completed
 * - overdue: due before `day`, not completed, and (no due date) never
 *   (items with no due date are never "overdue")
 * - upcoming: due after `day` and not completed, within the next 14 days
 * - completedToday: completed on `day` (kept for the day's history)
 */
export async function groupTasksForDay(
  day: ISODate,
): Promise<{
  dueToday: Task[]
  overdue: Task[]
  upcoming: Task[]
  completedToday: Task[]
  allPending: Task[]
}> {
  const all = await listTasks()
  const dueToday: Task[] = []
  const overdue: Task[] = []
  const upcoming: Task[] = []
  const completedToday: Task[] = []
  const allPending: Task[] = []

  for (const task of all) {
    if (task.status === 'completed') {
      if (task.dueDate === day) completedToday.push(task)
      continue
    }

    allPending.push(task)

    if (task.dueDate === '') {
      // No due date — never overdue, not "due today".
      continue
    }

    if (task.dueDate === day) {
      dueToday.push(task)
      continue
    }

    if (task.dueDate < day) {
      overdue.push(task)
      continue
    }

    // Upcoming: due after today, within 14 days.
    const diff = dateDiff(task.dueDate, day)
    if (diff > 0 && diff <= 14) {
      upcoming.push(task)
    }
  }

  // Sort: priority high→low, then by due date.
  dueToday.sort(byPriorityThenDate)
  overdue.sort(byPriorityThenDate)
  upcoming.sort(byPriorityThenDate)
  completedToday.sort(byCreatedAtDesc)
  allPending.sort(byPriorityThenDate)

  return { dueToday, overdue, upcoming, completedToday, allPending }
}

function byPriorityThenDate(a: Task, b: Task): number {
  const pa = TASK_PRIORITIES_ORDER[a.priority] ?? 99
  const pb = TASK_PRIORITIES_ORDER[b.priority] ?? 99
  if (pa !== pb) return pa - pb
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
  if (a.dueDate) return -1
  if (b.dueDate) return 1
  return b.createdAt.localeCompare(a.createdAt)
}

function byCreatedAtDesc(a: Task, b: Task): number {
  return b.createdAt.localeCompare(a.createdAt)
}

function dateDiff(a: ISODate, b: ISODate): number {
  const ms = new Date(a).getTime() - new Date(b).getTime()
  return Math.round(ms / 86_400_000)
}

/** Returns tasks that are due today and not completed (quick access from Dashboard). */
export async function dueTodayTasks(): Promise<Task[]> {
  const today = todayISO()
  const grouped = await groupTasksForDay(today)
  return grouped.dueToday
}

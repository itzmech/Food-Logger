import { useCallback, useEffect, useState } from 'react'
import {
  listTasks,
  createTask,
  saveTask,
  toggleTaskStatus,
  deleteTask,
} from '@/db/taskQueries'
import type { Task, TaskDraft } from '@/types'
import { onTasksChanged } from '@/lib/taskEvents'
import type { ISODate } from '@/types'
import { TASK_PRIORITIES_ORDER } from '@/types/tasks'

export interface UseTasksResult {
  tasks: Task[]
  loading: boolean
  error: Error | null
  today: {
    dueToday: Task[]
    overdue: Task[]
    upcoming: Task[]
    completedToday: Task[]
    allPending: Task[]
  } | null
  reload: () => void
  createTask: (draft: TaskDraft) => Promise<Task>
  saveTask: (task: Task) => Promise<Task>
  toggleTask: (id: string) => Promise<Task>
  deleteTask: (id: string) => Promise<void>
  onChanged: () => void
}

export function useTasks(): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const reload = useCallback(async () => {
    try {
      const all = await listTasks()
      setTasks(all)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('Could not load tasks.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const unsub = onTasksChanged(() => void reload())
    return unsub
  }, [reload])

  const todayGroup = tasks.length > 0 ? groupTasksForDaySync(tasks, todayKey) : null

  return {
    tasks,
    loading,
    error,
    today: todayGroup,
    reload,
    createTask: (draft) => createTask(draft),
    saveTask,
    toggleTask: (id) => toggleTaskStatus(id),
    deleteTask,
    onChanged: () => {
      void reload()
    },
  }
}

function groupTasksForDaySync(tasks: Task[], day: ISODate) {
  const dueToday: Task[] = []
  const overdue: Task[] = []
  const upcoming: Task[] = []
  const completedToday: Task[] = []
  const allPending: Task[] = []

  for (const task of tasks) {
    if (task.status === 'completed') {
      if (task.dueDate === day) completedToday.push(task)
      continue
    }
    allPending.push(task)
    if (task.dueDate === '') continue
    if (task.dueDate === day) {
      dueToday.push(task)
      continue
    }
    if (task.dueDate < day) {
      overdue.push(task)
      continue
    }
    const diff = dateDiff(task.dueDate, day)
    if (diff > 0 && diff <= 14) upcoming.push(task)
  }

  dueToday.sort(byPriorityThenDateSync)
  overdue.sort(byPriorityThenDateSync)
  upcoming.sort(byPriorityThenDateSync)
  completedToday.sort(byCreatedAtDescSync)
  allPending.sort(byPriorityThenDateSync)

  return { dueToday, overdue, upcoming, completedToday, allPending }
}

function byPriorityThenDateSync(a: Task, b: Task): number {
  const pa = TASK_PRIORITIES_ORDER[a.priority] ?? 99
  const pb = TASK_PRIORITIES_ORDER[b.priority] ?? 99
  if (pa !== pb) return pa - pb
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
  if (a.dueDate) return -1
  if (b.dueDate) return 1
  return b.createdAt.localeCompare(a.createdAt)
}

function byCreatedAtDescSync(a: Task, b: Task): number {
  return b.createdAt.localeCompare(a.createdAt)
}

function dateDiff(a: ISODate, b: ISODate): number {
  const ms = new Date(a).getTime() - new Date(b).getTime()
  return Math.round(ms / 86_400_000)
}

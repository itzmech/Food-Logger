import { useCallback, useEffect, useState } from 'react'
import {
  listTasks,
  createTask,
  saveTask,
  toggleTaskStatus,
  deleteTask,
  groupTasksByDate,
} from '@/db/taskQueries'
import type { Task, TaskDraft } from '@/types'
import { onTasksChanged } from '@/lib/taskEvents'
import { todayISO } from '@/utils/date'

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

  const todayKey = todayISO()

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

  const todayGroup = tasks.length > 0 ? groupTasksByDate(tasks, todayKey) : null

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

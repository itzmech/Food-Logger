import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { Task, TaskDraft } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/icons'
import { TaskForm } from '@/components/tasks/TaskForm'
import { useTasks } from '@/hooks/useTasks'
import type { DashboardTasks } from '@/lib/summary'
import { formatRelativeDay } from '@/utils/date'
import { TASK_PRIORITY_LABELS } from '@/types/tasks'

interface DashboardTasksCardProps {
  tasks: DashboardTasks
  loading: boolean
}

export function DashboardTasksCard({ tasks, loading }: DashboardTasksCardProps) {
  const { createTask, reload } = useTasks()
  const [addOpen, setAddOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleSave = useCallback(
    async (draft: TaskDraft) => {
      setBusy(true)
      try {
        await createTask(draft)
        await reload()
      } finally {
        setBusy(false)
        setAddOpen(false)
      }
    },
    [createTask, reload],
  )

  const pending = tasks.dueToday.length + tasks.overdue.length
  const completed = tasks.completedToday.length

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Today's tasks"
        description={loading ? undefined : `${pending} pending · ${completed} done`}
        action={
          <Button size="sm" onClick={() => setAddOpen(true)} disabled={loading || busy} className="touch-target">
            <Icon name="plus" size={14} />
            Add task
          </Button>
        }
      />

      <Card className="space-y-3">
        {/* Pending: due today + overdue */}
        {pending > 0 ? (
          <div className="space-y-1.5">
            {tasks.overdue.length > 0 ? (
              <TaskList label="Overdue" tone="danger" tasks={tasks.overdue} />
            ) : null}
            {tasks.dueToday.length > 0 ? (
              <TaskList label="Due today" tone="accent" tasks={tasks.dueToday} />
            ) : null}
          </div>
        ) : loading ? (
          <div className="space-y-2">
            <div className="h-12 w-full rounded-lg border border-line bg-surface animate-pulse" />
            <div className="h-12 w-full rounded-lg border border-line bg-surface animate-pulse" />
          </div>
        ) : (
          <EmptyState
            icon="check"
            title="Nothing due today"
            message="No tasks are due today. Add one or leave the due date blank for something that isn't time-sensitive."
            compact
          />
        )}

        {/* Completed today — compact */}
        {tasks.completedToday.length > 0 ? (
          <div className="border-t border-line pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                Done today
              </span>
              <span className="text-[11px] text-ink-3">{tasks.completedToday.length}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tasks.completedToday.slice(0, 6).map((task) => (
                <span
                  key={task.id}
                  className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[12px] text-ink-3 line-through"
                >
                  {task.title}
                </span>
              ))}
              {tasks.completedToday.length > 6 ? (
                <span className="text-[12px] text-ink-3">
                  +{tasks.completedToday.length - 6} more
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>

      <TaskForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSave}
        busy={busy}
      />

      {/* View all link */}
      <Link
        to="/tasks"
        className="flex items-center gap-1.5 text-[13px] font-medium text-accent-strong transition-colors hover:text-accent-strong/80 touch-target"
      >
        <Icon name="chevron-right" size={13} />
        View all tasks
      </Link>
    </section>
  )
}

function TaskList({
  label,
  tone,
  tasks,
}: {
  label: string
  tone: 'danger' | 'accent'
  tasks: Array<Task>
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
          {label}
        </span>
        <Badge tone={tone}>{tasks.length}</Badge>
      </div>
      <div className="mt-1.5 space-y-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between gap-2 rounded-xl bg-surface-2/40 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink truncate">{task.title}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-ink-3">
                  {TASK_PRIORITY_LABELS[task.priority]}
                </span>
                {task.dueDate ? (
                  <span className="text-[11px] text-ink-3">{formatRelativeDay(task.dueDate)}</span>
                ) : null}
                {task.category ? (
                  <span className="text-[11px] text-ink-3">{task.category}</span>
                ) : null}
              </div>
            </div>
            <Link
              to="/tasks"
              className="shrink-0 text-[11px] text-ink-3 hover:text-ink transition-colors"
            >
              Edit
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}


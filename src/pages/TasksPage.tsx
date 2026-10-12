import { useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TaskForm } from '@/components/tasks/TaskForm'
import { useTasks } from '@/hooks/useTasks'
import { Icon } from '@/components/icons'
import { formatRelativeDay, todayISO } from '@/utils/date'
import type { Task, TaskDraft, TaskPriority, TaskCategory } from '@/types'
import { TASK_PRIORITY_LABELS } from '@/types/tasks'
import { TASK_CATEGORY_LABELS } from '@/types/tasks'

export default function TasksPage() {
  const { tasks, loading, today, reload, createTask, saveTask, toggleTask, deleteTask } = useTasks()

  const [addOpen, setAddOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const openAdd = useCallback(() => {
    setEditTask(null)
    setAddOpen(true)
  }, [])

  const openEdit = useCallback((task: Task) => {
    setEditTask(task)
    setEditOpen(true)
  }, [])

  const closeEdit = useCallback(() => {
    setEditTask(null)
    setEditOpen(false)
  }, [])

  const handleSaveNew = useCallback(
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

  const handleSaveEdit = useCallback(
    async (draft: TaskDraft) => {
      if (!editTask) return
      setBusy(true)
      try {
        await saveTask({ ...editTask, ...draft })
        await reload()
      } finally {
        setBusy(false)
        closeEdit()
      }
    },
    [editTask, saveTask, reload, closeEdit],
  )

  const handleToggle = useCallback(
    async (id: string) => {
      setBusy(true)
      try {
        await toggleTask(id)
      } finally {
        setBusy(false)
      }
    },
    [toggleTask],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setBusy(true)
      try {
        await deleteTask(id)
        await reload()
      } finally {
        setBusy(false)
        setDeleting(null)
      }
    },
    [deleteTask, reload],
  )

  const dueToday = today?.dueToday ?? []
  const overdue = today?.overdue ?? []
  const upcoming = today?.upcoming ?? []
  const completedToday = today?.completedToday ?? []
  const allPending = today?.allPending ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tasks"
        subtitle="Your daily to-dos"
        action={
          <Button size="sm" onClick={openAdd}>
            <Icon name="plus" size={15} />
            Add task
          </Button>
        }
      />

      {/* Today's tasks */}
      <section className="space-y-3">
        <SectionHeader
          title="Today"
          description={todayISO()}
          action={dueToday.length > 0 ? <Badge tone="accent">{dueToday.length} due</Badge> : null}
        />
        {loading && dueToday.length === 0 ? (
          <Card>
            <div className="space-y-2">
              <div className="h-10 w-full rounded-lg border border-line bg-surface animate-pulse" />
              <div className="h-10 w-full rounded-lg border border-line bg-surface animate-pulse" />
            </div>
          </Card>
        ) : dueToday.length === 0 ? (
          <Card>
            <EmptyState
              icon="check"
              title="Nothing due today"
              message="Add a task with today's date, or leave the due date blank for something that isn't time-sensitive."
              compact
            />
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-line">
              {dueToday.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggle(task.id)}
                  onEdit={() => openEdit(task)}
                  onDelete={() => setDeleting(task.id)}
                  busy={busy || deleting !== null}
                />
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* Overdue */}
      {overdue.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title="Overdue" action={<Badge tone="danger">{overdue.length} overdue</Badge>} />
          <Card>
            <div className="divide-y divide-line">
              {overdue.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggle(task.id)}
                  onEdit={() => openEdit(task)}
                  onDelete={() => setDeleting(task.id)}
                  busy={busy || deleting !== null}
                />
              ))}
            </div>
          </Card>
        </section>
      ) : null}

      {/* Upcoming */}
      {upcoming.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title="Upcoming" description="Next 14 days" action={<Badge tone="neutral">{upcoming.length}</Badge>} />
          <Card>
            <div className="divide-y divide-line">
              {upcoming.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggle(task.id)}
                  onEdit={() => openEdit(task)}
                  onDelete={() => setDeleting(task.id)}
                  busy={busy || deleting !== null}
                />
              ))}
            </div>
          </Card>
        </section>
      ) : null}

      {/* Completed today */}
      {completedToday.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title="Done today" />
          <Card>
            <div className="divide-y divide-line">
              {completedToday.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-surface-2/40 px-3 py-3"
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(task.id)}
                    className="shrink-0"
                    aria-label="Mark incomplete"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-6 w-6 flex items-center justify-center rounded-full bg-success text-white"
                      aria-hidden="true"
                    >
                      <path
                        d="M19 6 9 17l-5-5"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink/60 line-through">
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <PriorityBadge priority={task.priority} />
                      {task.dueDate ? <span className="text-[12px] text-ink-3">{formatRelativeDay(task.dueDate)}</span> : null}
                      {task.category ? <CategoryBadge category={task.category} /> : null}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-0.5">
                    <IconButton icon="edit" label="Edit task" size="sm" onClick={() => openEdit(task)} disabled={busy || deleting !== null} className="-ml-1" />
                    <IconButton icon="trash" label="Delete task" size="sm" tone="danger" onClick={() => setDeleting(task.id)} disabled={busy || deleting !== null} className="-ml-1" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      ) : null}

      {/* No due date */}
      {allPending.some((t) => t.dueDate === '') ? (
        <section className="space-y-3">
          <SectionHeader
            title="No due date"
            description="Indefinite tasks"
            action={<Badge tone="neutral">{allPending.filter((t) => t.dueDate === '').length}</Badge>}
          />
          <Card>
            <div className="divide-y divide-line">
              {allPending
                .filter((t) => t.dueDate === '')
                .map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => handleToggle(task.id)}
                    onEdit={() => openEdit(task)}
                    onDelete={() => setDeleting(task.id)}
                    busy={busy || deleting !== null}
                  />
                ))}
            </div>
          </Card>
        </section>
      ) : null}

      {/* Empty state when there are no tasks at all */}
      {!loading && tasks.length === 0 ? (
        <div className="pt-2">
          <EmptyState
            icon="check"
            title="No tasks yet"
            message="Add a task to start tracking what you need to do today and ahead."
            action={
              <Button onClick={openAdd}>
                <Icon name="plus" size={15} />
                Add your first task
              </Button>
            }
          />
        </div>
      ) : null}

      {/* Add task sheet */}
      <TaskForm open={addOpen} onClose={() => setAddOpen(false)} onSave={handleSaveNew} busy={busy} />

      {/* Edit task sheet */}
      <TaskForm open={editOpen} onClose={closeEdit} onSave={handleSaveEdit} task={editTask} busy={busy} />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleting}
        title="Delete task"
        description="This will remove the task permanently. You can add it again later."
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={() => { if (deleting) handleDelete(deleting) }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
  busy,
}: {
  task: Task
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  busy: boolean
}) {
  const done = task.status === 'completed'

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl bg-surface-2/40 px-3 py-3 ${done ? 'opacity-60' : ''}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0"
        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-6 w-6 flex items-center justify-center rounded-full transition-colors ${
            done ? 'bg-success text-white' : 'border border-line-strong text-ink-3 hover:border-accent/50'
          }`}
          aria-hidden="true"
        >
          <path
            d="M19 6 9 17l-5-5"
            className={done ? 'opacity-100' : 'opacity-0 scale-50'}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <span className={`block text-sm font-medium ${done ? 'text-ink/60 line-through' : 'text-ink'}`}>
          {task.title}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          <PriorityBadge priority={task.priority} />
          {task.dueDate ? <span className="text-[12px] text-ink-3">{formatRelativeDay(task.dueDate)}</span> : null}
          {task.category ? <CategoryBadge category={task.category} /> : null}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-0.5">
        <IconButton icon="edit" label="Edit task" size="sm" onClick={onEdit} disabled={busy} className="-ml-1" />
        <IconButton icon="trash" label="Delete task" size="sm" tone="danger" onClick={onDelete} disabled={busy} className="-ml-1" />
      </div>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const tone: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' =
    priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'neutral'
  return <Badge tone={tone}>{TASK_PRIORITY_LABELS[priority]}</Badge>
}

function CategoryBadge({ category }: { category: TaskCategory }) {
  return <Badge tone="neutral">{TASK_CATEGORY_LABELS[category]}</Badge>
}

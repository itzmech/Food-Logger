import { useCallback, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/icons'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { TaskForm } from '@/components/tasks/TaskForm'
import { useTasks } from '@/hooks/useTasks'
import { cn } from '@/utils/cn'
import { formatLongDate, formatRelativeDay, todayISO } from '@/utils/date'
import type { Task, TaskCategory, TaskDraft, TaskPriority } from '@/types'
import { TASK_CATEGORIES, TASK_CATEGORY_LABELS, TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_PRIORITIES_ORDER } from '@/types'

type TaskFilter = 'all' | TaskPriority | 'completed'
type TaskSort = 'deadline' | 'priority' | 'recent'
const TASK_FILTERS: TaskFilter[] = ['all', ...TASK_PRIORITIES, 'completed']

export default function TasksPage() {
  const { tasks, loading, today, reload, createTask, saveTask, toggleTask, deleteTask, error } = useTasks()

  const [filter, setFilter] = useState<TaskFilter>('all')
  const [sort, setSort] = useState<TaskSort>('deadline')
  const [category, setCategory] = useState<TaskCategory | 'all'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const openAdd = useCallback(() => {
    setEditTask(null)
    setAddOpen(true)
  }, [])

  const openEdit = useCallback((task: Task) => setEditTask(task), [])

  const handleSaveNew = useCallback(async (draft: TaskDraft) => {
    setBusy(true)
    try {
      await createTask(draft)
      await reload()
      setAddOpen(false)
    } finally {
      setBusy(false)
    }
  }, [createTask, reload])

  const handleSaveEdit = useCallback(async (draft: TaskDraft) => {
    if (!editTask) return
    setBusy(true)
    try {
      await saveTask({ ...editTask, ...draft })
      await reload()
      setEditTask(null)
    } finally {
      setBusy(false)
    }
  }, [editTask, reload, saveTask])

  const handleToggle = useCallback(async (id: string) => {
    setActionError(null)
    setBusy(true)
    try {
      await toggleTask(id)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not update this task.')
    } finally {
      setBusy(false)
    }
  }, [toggleTask])

  const handleDelete = useCallback(async (id: string) => {
    setActionError(null)
    setBusy(true)
    try {
      await deleteTask(id)
      await reload()
      setDeleting(null)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not delete this task.')
    } finally {
      setBusy(false)
    }
  }, [deleteTask, reload])

  const matches = (task: Task) =>
    (category === 'all' || task.category === category) &&
    (filter === 'all' || filter === 'completed' || task.priority === filter)

  const sortTasks = useCallback((items: Task[]) => [...items].sort((a, b) => {
    if (sort === 'recent') return b.createdAt.localeCompare(a.createdAt)
    if (sort !== 'priority') {
      const dateA = a.endDate || a.dueDate || a.startDate
      const dateB = b.endDate || b.dueDate || b.startDate
      if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB)
      if (dateA) return -1
      if (dateB) return 1
    }
    const priorityDifference = TASK_PRIORITIES_ORDER[a.priority] - TASK_PRIORITIES_ORDER[b.priority]
    if (priorityDifference !== 0) return priorityDifference
    return b.createdAt.localeCompare(a.createdAt)
  }), [sort])

  const deadlineGroups = useMemo(() => ({
    overdue: sortTasks((today?.overdue ?? []).filter(matches)),
    today: sortTasks((today?.dueToday ?? []).filter(matches)),
    upcoming: sortTasks((today?.upcoming ?? []).filter(matches)),
  }), [sortTasks, today, filter, category])
  const flexibleTasks = useMemo(
    () => sortTasks((today?.allPending ?? []).filter((task) =>
      !task.dueDate && !task.startDate && !task.endDate && matches(task),
    )),
    [sortTasks, today, filter, category],
  )
  const completedTasks = useMemo(
    () => sortTasks(tasks.filter((task) => task.status === 'completed' && matches(task))),
    [sortTasks, tasks, filter, category],
  )

  const filterCounts: Record<TaskFilter, number> = {
    all: tasks.length,
    high: tasks.filter((task) => task.priority === 'high').length,
    medium: tasks.filter((task) => task.priority === 'medium').length,
    low: tasks.filter((task) => task.priority === 'low').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  }
  const hasVisibleTasks =
    deadlineGroups.overdue.length + deadlineGroups.today.length + deadlineGroups.upcoming.length +
      flexibleTasks.length + completedTasks.length > 0

  return (
    <div className="space-y-5 pb-4" data-section="tasks">
      <PageHeader
        title="Tasks"
        subtitle={formatLongDate(todayISO())}
        compact
        action={
          <Button size="sm" onClick={openAdd} className="min-h-11">
            <Icon name="plus" size={15} /> Add task
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter tasks">
        {TASK_FILTERS.map((value) => {
          const label = value === 'all' ? 'All' : value === 'completed' ? 'Done' : TASK_PRIORITY_LABELS[value]
          const selected = filter === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={selected}
              className={cn(
                'min-h-11 rounded-full border px-3 text-xs font-semibold transition-colors',
                selected ? 'border-accent/50 bg-accent-dim text-accent-strong' : 'border-line bg-surface text-ink-3 hover:text-ink-2',
              )}
            >
              {label} <span className="ml-1 tabular-nums opacity-70">{filterCounts[value]}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Icon name="calendar" size={16} className="shrink-0 text-ink-3" />
          <label htmlFor="task-category-filter" className="sr-only">Task category</label>
          <select
            id="task-category-filter"
            value={category}
            onChange={(event) => {
              const next = event.target.value
              setCategory(TASK_CATEGORIES.find((item) => item === next) ?? 'all')
            }}
            className="min-h-11 min-w-0 rounded-xl border border-line bg-surface px-3 text-base text-ink"
          >
            <option value="all">All categories</option>
            {TASK_CATEGORIES.map((item) => <option key={item} value={item}>{TASK_CATEGORY_LABELS[item]}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="task-sort" className="text-xs text-ink-3">Sort</label>
          <select
            id="task-sort"
            value={sort}
            onChange={(event) => {
              const next = event.target.value
              if (next === 'deadline' || next === 'priority' || next === 'recent') setSort(next)
            }}
            className="min-h-11 rounded-xl border border-line bg-surface px-3 text-base text-ink"
          >
            <option value="deadline">Deadline</option>
            <option value="priority">Priority</option>
            <option value="recent">Recently added</option>
          </select>
        </div>
      </div>

      {error ? <ErrorNotice message={`Tasks could not be loaded: ${error.message}`} /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}

      {loading && tasks.length === 0 ? (
        <Card><p className="text-sm text-ink-3">Loading tasks…</p></Card>
      ) : hasVisibleTasks ? (
        <>
          {(filter === 'all' || filter !== 'completed') ? (
            <>
              {deadlineGroups.overdue.length ? (
                <TaskSection
                  title="Overdue"
                  count={deadlineGroups.overdue.length}
                  tone="danger"
                  tasks={deadlineGroups.overdue}
                  busy={busy}
                  onToggle={handleToggle}
                  onEdit={openEdit}
                  onDelete={setDeleting}
                />
              ) : null}
              {deadlineGroups.today.length ? (
                <TaskSection
                  title="Due today"
                  count={deadlineGroups.today.length}
                  tasks={deadlineGroups.today}
                  busy={busy}
                  onToggle={handleToggle}
                  onEdit={openEdit}
                  onDelete={setDeleting}
                />
              ) : null}
              {deadlineGroups.upcoming.length ? (
                <TaskSection
                  title="Upcoming deadlines"
                  count={deadlineGroups.upcoming.length}
                  description="Scheduled after today"
                  tasks={deadlineGroups.upcoming}
                  busy={busy}
                  onToggle={handleToggle}
                  onEdit={openEdit}
                  onDelete={setDeleting}
                />
              ) : null}
              {flexibleTasks.length ? (
                <TaskSection
                  title="Daily & flexible"
                  count={flexibleTasks.length}
                  description="Tasks without a due date"
                  tasks={flexibleTasks}
                  busy={busy}
                  onToggle={handleToggle}
                  onEdit={openEdit}
                  onDelete={setDeleting}
                />
              ) : null}
            </>
          ) : null}

          {(filter === 'all' || filter === 'completed') && completedTasks.length ? (
            <TaskSection
              title="Completed"
              count={completedTasks.length}
              tasks={completedTasks}
              busy={busy}
              onToggle={handleToggle}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          ) : null}
        </>
      ) : (
        <EmptyState
          icon="check"
          title={tasks.length === 0 ? 'No tasks yet' : 'No tasks match these filters'}
          message={tasks.length === 0 ? 'Add a task to start organizing your day and upcoming deadlines.' : 'Try another filter or category.'}
          action={tasks.length === 0 ? <Button onClick={openAdd}><Icon name="plus" size={15} /> Add your first task</Button> : undefined}
        />
      )}

      <TaskForm open={addOpen} onClose={() => setAddOpen(false)} onSave={handleSaveNew} busy={busy} />
      <TaskForm
        open={editTask !== null}
        onClose={() => setEditTask(null)}
        onSave={handleSaveEdit}
        task={editTask}
        busy={busy}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete task"
        description="This will remove the task permanently. You can add it again later."
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={() => { if (deleting) void handleDelete(deleting) }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

function TaskSection({
  title,
  count,
  description,
  tone,
  tasks,
  busy,
  onToggle,
  onEdit,
  onDelete,
}: {
  title: string
  count: number
  description?: string
  tone?: 'danger'
  tasks: Task[]
  busy: boolean
  onToggle: (id: string) => Promise<void>
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="font-heading text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{title}</h2>
          {description ? <p className="mt-0.5 text-[11px] text-ink-3">{description}</p> : null}
        </div>
        <Badge tone={tone ?? 'neutral'}>{count}</Badge>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="divide-y divide-white/[0.06]">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              busy={busy}
              onToggle={() => void onToggle(task.id)}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </div>
      </Card>
    </section>
  )
}

function TaskRow({
  task,
  busy,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task
  busy: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const done = task.status === 'completed'
  const date = task.endDate || task.dueDate || task.startDate
  return (
    <div className={cn('flex items-center gap-2 px-2 py-2 sm:px-3', done && 'opacity-70')}>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        aria-label={`${done ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors',
          done ? 'border-success/50 bg-success-dim text-success' : 'border-line-strong text-transparent hover:border-success/50',
        )}
      >
        {done ? <Icon name="check" size={16} strokeWidth={2.5} /> : <Icon name="check" size={15} />}
      </button>
      <div className="min-w-0 flex-1 py-1">
        <p className={cn('break-words text-[13px] font-medium leading-snug', done && 'text-ink-3 line-through')}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={task.priority} />
          {date ? <span className="text-[10px] text-ink-3">{formatRelativeDay(date)}</span> : null}
          <CategoryBadge category={task.category} />
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <IconButton icon="edit" label={`Edit ${task.title}`} size="sm" onClick={onEdit} disabled={busy} />
        <IconButton icon="trash" label={`Delete ${task.title}`} size="sm" tone="danger" onClick={onDelete} disabled={busy} />
      </div>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const colorClass = priority === 'high'
    ? 'border-high/25 bg-high-dim text-high'
    : priority === 'medium'
      ? 'border-medium/25 bg-medium-dim text-medium'
      : 'border-low/25 bg-low-dim text-low'
  return <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', colorClass)}>{TASK_PRIORITY_LABELS[priority]}</span>
}

function CategoryBadge({ category }: { category: TaskCategory }) {
  return <Badge tone="neutral">{TASK_CATEGORY_LABELS[category]}</Badge>
}

function ErrorNotice({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl border border-danger/30 bg-danger-dim px-3 py-2 text-sm text-danger">{message}</p>
}

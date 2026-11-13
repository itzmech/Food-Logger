import { useState, useEffect } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { TextField } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useId } from 'react'
import type { Task, TaskDraft, TaskPriority, TaskCategory } from '@/types'
import {
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
} from '@/types'
import { todayISO } from '@/utils/date'

export interface TaskFormProps {
  open: boolean
  onClose: () => void
  onSave: (draft: TaskDraft) => Promise<void>
  task?: Task | null
  busy?: boolean
}

export function TaskForm({ open, onClose, onSave, task, busy = false }: TaskFormProps) {
  const id = useId()
  const titleId = `${id}-title`
  const dueId = `${id}-due`
  const startId = `${id}-start`
  const endId = `${id}-end`
  const priorityId = `${id}-priority`
  const categoryId = `${id}-category`
  const noteId = `${id}-note`

  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [category, setCategory] = useState<TaskCategory>('other')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (task && task.id) {
      setTitle(task.title)
      setDueDate(task.dueDate || '')
      setStartDate(task.startDate || '')
      setEndDate(task.endDate || '')
      setPriority(task.priority)
      setCategory(task.category)
      setNote(task.note ?? '')
      setError(null)
    } else {
      setTitle('')
      setDueDate('')
      setStartDate('')
      setEndDate('')
      setPriority('medium')
      setCategory('other')
      setNote('')
      setError(null)
    }
  }, [open, task, id])

  const isEditing = !!(task && task.id)

  const handleSave = async () => {
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Enter a task title')
      return
    }
    // Validate end date is not before start date
    if (endDate && startDate && endDate < startDate) {
      setError('End date cannot be before start date')
      return
    }
    setError(null)
    try {
      await onSave({
        title: trimmed,
        dueDate: dueDate || '',
        startDate: startDate || '',
        endDate: endDate || '',
        priority,
        category,
        note: note.trim() || null,
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this task.')
    }
  }

  const priorityOptions = [
    { value: 'high' as TaskPriority, label: 'High' },
    { value: 'medium' as TaskPriority, label: 'Medium' },
    { value: 'low' as TaskPriority, label: 'Low' },
  ]

  const priorityChipClass = (p: TaskPriority) => {
    switch (p) {
      case 'high':
        return 'priority-chip high';
      case 'medium':
        return 'priority-chip medium';
      case 'low':
        return 'priority-chip low';
    }
  }


  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit task' : 'Add task'}
      description={isEditing ? 'Change the task details.' : 'A quick task with an optional due date.'}
      className="max-h-[86dvh]"
    >
      <div className="space-y-4.5">
        <TextField
          label="Task"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (error) setError(null)
          }}
          placeholder="What needs to be done?"
          error={error ?? undefined}
          id={titleId}
          autoFocus
          maxLength={200}
        />

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Due date (optional)"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            id={dueId}
            min={todayISO()}
            hint={dueDate ? undefined : 'Leave blank for no due date'}
          />

          <TextField
            label="Start date (optional)"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            id={startId}
            min={todayISO()}
            hint={startDate ? undefined : 'Leave blank for no start date'}
          />

          <TextField
            label="End date (optional)"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            id={endId}
            min={todayISO()}
            hint={endDate ? undefined : 'Leave blank for no end date'}
          />
        </div>

        <fieldset id={priorityId} className="space-y-2">
          <legend className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">Priority</legend>
          <div className="grid grid-cols-3 gap-2">
            {priorityOptions.map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                className={`${priorityChipClass(option.value)} min-h-11 ${priority === option.value ? 'ring-1 ring-accent/60' : ''}`}
                type="button"
                onClick={() => setPriority(option.value)}
                aria-pressed={priority === option.value}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as TaskCategory)}
            id={categoryId}
            error={error ?? undefined}
          >
            {TASK_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {TASK_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any details"
            id={noteId}
          />
        </div>

        {error && (
          <div className="mt-2 text-[12px] text-danger">{error}</div>
        )}
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" type="button" onClick={onClose} disabled={busy} className="touch-target">
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={busy} className="touch-target">
          {busy ? 'Saving...' : isEditing ? 'Save changes' : 'Add task'}
        </Button>
      </div>
    </BottomSheet>
  )
}

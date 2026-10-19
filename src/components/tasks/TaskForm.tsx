import { useState, useEffect } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { TextField } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useId } from 'react'
import type { Task, TaskDraft, TaskPriority, TaskCategory } from '@/types'
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITIES,
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
  const priorityId = `${id}-priority`
  const categoryId = `${id}-category`
  const noteId = `${id}-note`

  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [category, setCategory] = useState<TaskCategory>('other')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (task && task.id) {
      setTitle(task.title)
      setDueDate(task.dueDate || '')
      setPriority(task.priority)
      setCategory(task.category)
      setNote(task.note ?? '')
      setError(null)
    } else {
      setTitle('')
      setDueDate('')
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
    setError(null)
    await onSave({
      title: trimmed,
      dueDate: dueDate || '',
      priority,
      category,
      note: note.trim() || null,
    })
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit task' : 'Add task'}
      description={isEditing ? 'Change the task details.' : 'A quick task with an optional due date.'}
      className="max-h-[86dvh]"
    >
      <div className="space-y-3.5">
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

          <SelectField
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            id={priorityId}
            error={error ?? undefined}
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABELS[p]}
              </option>
            ))}
          </SelectField>
        </div>

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

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { Icon } from '@/components/icons'
import { cn } from '@/utils/cn'

export interface SetRowProps {
  set: {
    id: string
    setNumber: number
    weight: number | null
    weightUnit: string
    reps: number | null
    completed: boolean
    rpe: number | null
    restSeconds: number | null
    notes: string | null
  }
  disabled?: boolean
  onSave: (patch: {
    id: string
    setNumber: number
    weight: number | null
    weightUnit: string
    reps: number | null
    completed: boolean
    rpe: number | null
    restSeconds: number | null
    notes: string | null
  }) => void
  onDelete: (id: string) => void
}

export function SetRow({ set: row, disabled, onSave, onDelete }: SetRowProps) {
  const [weight, setWeight] = useState(row.weight?.toString() ?? '')
  const [reps, setReps] = useState(row.reps?.toString() ?? '')
  const [completed, setCompleted] = useState(row.completed)
  const [rpe, setRpe] = useState(row.rpe?.toString() ?? '')
  const [restSeconds, setRestSeconds] = useState(row.restSeconds?.toString() ?? '')
  const [notes, setNotes] = useState(row.notes ?? '')

  const submit = useCallback(() => {
    onSave({
      id: row.id,
      setNumber: row.setNumber,
      weight: weight === '' ? null : Number(weight),
      weightUnit: row.weightUnit,
      reps: reps === '' ? null : Number(reps),
      completed,
      rpe: rpe === '' ? null : Number(rpe),
      restSeconds: restSeconds === '' ? null : Number(restSeconds),
      notes: notes.trim() || null,
    })
  }, [row.id, row.setNumber, weight, row.weightUnit, reps, completed, rpe, restSeconds, notes, onSave])

  return (
    <div
      className={cn(
        'rounded-2xl border bg-surface-2 p-3 transition-colors',
        row.completed ? 'border-line-strong bg-surface-3' : 'border-line',
        disabled && 'opacity-60',
      )}
    >
      <div className="flex gap-2">
        <div className="flex-1 space-y-1.5">
          <div className="flex gap-1.5">
            <TextField
              label="Weight"
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="kg"
              disabled={disabled}
            />
            <span className="w-10 text-center text-sm text-ink-3">{row.weightUnit}</span>
            <TextField
              label="Reps"
              type="number"
              inputMode="decimal"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="10"
              disabled={disabled}
            />
          </div>

          <Button
            variant={completed ? 'primary' : 'secondary'}
            size="sm"
            className="w-full"
            onClick={() => setCompleted((v) => !v)}
            disabled={disabled}
          >
            <Icon name={row.completed ? 'check' : 'info'} size={16} />
            {row.completed ? 'Completed' : 'Mark complete'}
          </Button>

          <div className="flex gap-2">
            <TextField
              label="RPE"
              type="number"
              inputMode="decimal"
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              placeholder="optional"
              disabled={disabled}
              className="flex-[2]"
            />
            <TextField
              label="Rest"
              type="number"
              inputMode="decimal"
              value={restSeconds}
              onChange={(e) => setRestSeconds(e.target.value)}
              placeholder="90s"
              disabled={disabled}
              className="flex-[1.5]"
            />
            <TextField
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="optional"
              disabled={disabled}
              className="flex-1"
            />
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={submit}
            disabled={disabled}
            className="h-9 w-9 p-0"
          >
            <Icon name="check" size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(row.id)}
            disabled={disabled}
            className="h-9 w-9 p-0 text-danger hover:bg-danger-dim"
          >
            <Icon name="trash" size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}

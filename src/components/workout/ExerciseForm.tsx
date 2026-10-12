import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/Field'
import { EXERCISE_CATEGORY_LABELS } from '@/types'
import { cn } from '@/utils/cn'

export interface ExerciseFormValues {
  name: string
  category: string
  equipment: string
  equipmentOptions: string[]
  defaultEquipment: string
  notes: string
}

interface ExerciseFormErrors {
  name?: string
  category?: string
  equipment?: string
}

interface ExerciseFormProps {
  initial?: Partial<ExerciseFormValues>
  onSave: (values: ExerciseFormValues) => void
  onCancel: () => void
  busy?: boolean
  submitLabel?: string
  className?: string
}

export function ExerciseForm({ initial, onSave, onCancel, busy, submitLabel = 'Save', className }: ExerciseFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<string>(initial?.category ?? EXERCISE_CATEGORY_LABELS.chest)
  const [equipment, setEquipment] = useState(initial?.equipment ?? '')
  const [equipmentOptionsInput, setEquipmentOptionsInput] = useState(initial?.equipmentOptions?.join(', ') ?? '')
  const [includeMultipleEquipment, setIncludeMultipleEquipment] = useState(!!initial?.equipmentOptions?.length)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [errors, setErrors] = useState<ExerciseFormErrors>({})

  const derivedOptions = equipmentOptionsInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const resolvedEquipment = equipment || (derivedOptions[0] ?? '')
  const resolvedDefaultEquipment = resolvedEquipment
  const resolvedEquipmentOptions = includeMultipleEquipment && derivedOptions.length > 1
    ? derivedOptions
    : derivedOptions.length > 0
      ? [derivedOptions[0]]
      : [resolvedEquipment]

  const validate = (): ExerciseFormErrors => {
    const next: ExerciseFormErrors = {}
    if (!name.trim()) next.name = 'Exercise name is required.'
    if (!category) next.category = 'Category is required.'
    if (!resolvedEquipment) next.equipment = 'Equipment is required.'
    return next
  }

  const submit = () => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onSave({
      name: name.trim(),
      category,
      equipment: resolvedEquipment,
      equipmentOptions: resolvedEquipmentOptions,
      defaultEquipment: resolvedDefaultEquipment,
      notes: notes.trim() || '',
    })
  }

  return (
    <div className={cn('space-y-4', className)}>
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        autoFocus={!initial}
        placeholder="e.g. Bench Press"
      />

      <SelectField
        label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        error={errors.category}
      >
        {Object.entries(EXERCISE_CATEGORY_LABELS).map(([value, label]) => (
          <option key={value} value={label}>
            {label}
          </option>
        ))}
      </SelectField>

      <TextField
        label="Default equipment"
        value={equipment}
        onChange={(e) => setEquipment(e.target.value)}
        error={errors.equipment}
        placeholder="e.g. Barbell"
      />

      <label className="flex items-center gap-2 text-[13px] text-ink-3 cursor-pointer">
        <input
          type="checkbox"
          checked={includeMultipleEquipment}
          onChange={(e) => setIncludeMultipleEquipment(e.target.checked)}
          className="h-4 w-4 rounded border-line text-accent-strong focus:ring-accent/40"
        />
        <span>Support multiple equipment options</span>
      </label>

      {includeMultipleEquipment && (
        <TextField
          label="Equipment options (comma separated)"
          value={equipmentOptionsInput}
          onChange={(e) => setEquipmentOptionsInput(e.target.value)}
          placeholder="Barbell, Dumbbell, Smith Machine"
        />
      )}

      <TextField
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes, cues, or setup details."
        className="h-24 resize-none"
      />

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={submit} disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </div>
  )
}

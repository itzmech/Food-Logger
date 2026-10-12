import { useState, useCallback, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/Field'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/icons'
import { useWorkoutTemplates } from '@/hooks/useWorkoutTemplates'
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises'

export interface TemplateExerciseRow {
  id: string
  order: number
  exerciseName: string
}

interface TemplateEditorProps {
  templateId: string | null
  existingName: string
  existingNotes: string | null
  onClose: () => void
}

export function TemplateEditor({ templateId, existingName, existingNotes, onClose }: TemplateEditorProps) {
  const { exercisesForTemplate, addExercise, updateExercise, removeExercise } = useWorkoutTemplates()

  const [name, setName] = useState(existingName)
  const [notes, setNotes] = useState(existingNotes ?? '')
  const [exercises, setExercises] = useState<TemplateExerciseRow[]>([])
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [draftExerciseId, setDraftExerciseId] = useState('')
  const [draftTargetSets, setDraftTargetSets] = useState('3')
  const [draftTargetReps, setDraftTargetReps] = useState('8-12')
  const [draftDefaultRest, setDraftDefaultRest] = useState('90')

  const reloadExercises = useCallback(async () => {
    if (templateId) {
      const rows = await exercisesForTemplate(templateId)
      setExercises(rows)
    }
  }, [templateId, exercisesForTemplate])

  const { exercises: libraryExercises, reload: reloadLibrary } = useWorkoutExercises()
  useEffect(() => {
    void reloadLibrary()
  }, [reloadLibrary])

  const exerciseOptions = useMemo(() => {
    return libraryExercises.map((ex) => ({
      value: ex.id,
      label: ex.name,
    }))
  }, [libraryExercises])

  const save = useCallback(async () => {
    if (!templateId) return
    setSaving(true)
    try {
      await updateExercise(templateId, { notes: notes.trim() || null })
      onClose()
    } finally {
      setSaving(false)
    }
  }, [templateId, notes, onClose, updateExercise])

  const parsedTargetSets = useMemo(() => {
    const parsed = Number(draftTargetSets)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  }, [draftTargetSets])

  const persist = useCallback(async (reorder: boolean) => {
    if (!templateId || !draftExerciseId) return
    setSaving(true)
    try {
      if (reorder) {
        const ordered = exercises.map((row, index) => ({ id: row.id, order: index + 1 }))
        for (const item of ordered) {
          await updateExercise(item.id, { order: item.order })
        }
      } else {
        const targetSets = parsedTargetSets
        const targetReps = draftTargetReps
        const defaultRest = Number.isFinite(Number(draftDefaultRest)) ? Number(draftDefaultRest) : 90
        const notes: string | null = null
        const row = await addExercise(templateId, draftExerciseId, exercises.length, targetSets, targetReps, null, defaultRest, notes)
        setExercises((prev) => [...prev, { id: row.id, order: row.order, exerciseName: row.exerciseId }])
      }
      setDraftExerciseId('')
      await reloadExercises()
    } finally {
      setSaving(false)
    }
  }, [templateId, draftExerciseId, exercises.length, parsedTargetSets, draftTargetReps, draftDefaultRest, exercises, addExercise, updateExercise, reloadExercises])

  const ordered = exercises.slice().sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-5">
      <SectionHeader
        title={templateId ? 'Edit template' : 'New template'}
        description={templateId ? 'Update the program template.' : 'Create a reusable workout program template.'}
      />

      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Push Day"
        className="min-w-0 flex-1"
      />

      <TextField
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. Rest 90 seconds between sets."
        className="h-24 resize-none"
      />

      <div className="space-y-2">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">Template exercises</p>
        <div className="flex gap-2">
          <SelectField
            label="Exercise"
            value={draftExerciseId}
            onChange={(e) => setDraftExerciseId(e.target.value)}
            className="flex-1"
          >
            <option value="">Select an exercise</option>
            {exerciseOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectField>
          <Button
            variant="secondary"
            disabled={!draftExerciseId}
            onClick={() => persist(false)}
            className="whitespace-nowrap"
          >
            Add
          </Button>
        </div>          <div className="grid grid-cols-2 gap-2">
            <TextField
              label="Target sets"
              type="number"
              inputMode="numeric"
              value={draftTargetSets}
              onChange={(e) => setDraftTargetSets(e.target.value)}
              className="flex-1"
            />
            <TextField
              label="Target reps"
              value={draftTargetReps}
              onChange={(e) => setDraftTargetReps(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2">
            <TextField
              label="Default rest"
              type="number"
              inputMode="numeric"
              value={draftDefaultRest}
              onChange={(e) => setDraftDefaultRest(e.target.value)}
              className="flex-1"
            />
            <Button variant="secondary" onClick={() => persist(false)} className="shrink-0">
              Add
            </Button>
          </div>

        {ordered.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface-2 p-4 text-[13px] text-ink-3">
            No exercises yet. Add exercises from your library to start the template.
          </div>
        ) : (
          <div className="space-y-2">
            {ordered.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-3 transition-colors hover:border-line-strong"
              >
                <span className="text-[12px] font-mono text-ink-3">{row.order + 1}</span>
                <span className="min-w-0 flex-1 text-[14px] font-medium text-ink">{row.exerciseName}</span>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const idx = ordered.findIndex((r) => r.id === row.id)
                      if (idx > 0) {
                        const next = [...ordered]
                        const [item] = next.splice(idx, 1)
                        next.splice(idx - 1, 0, item)
                        void persist(true)
                      }
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Icon name="chevron-left" size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const idx = ordered.findIndex((r) => r.id === row.id)
                      if (idx < ordered.length - 1) {
                        const next = [...ordered]
                        const [item] = next.splice(idx, 1)
                        next.splice(idx + 1, 0, item)
                        void persist(true)
                      }
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Icon name="chevron-right" size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    tone="danger"
                    onClick={() => {
                      setDeleteId(row.id)
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Icon name="trash" size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={() => void save()} disabled={saving || !templateId || !name.trim()}>
          {saving ? 'Saving…' : templateId ? 'Save changes' : 'Create'}
        </Button>
      </div>

      <ConfirmDialog
        open={deleteId != null}
        title="Remove exercise from template?"
        description="This only removes the exercise from the template. Saved workouts and history keep their snapshot."
        confirmLabel="Remove"
        tone="danger"
        onConfirm={() => {
          if (deleteId) {
            void removeExercise(deleteId)
            setDeleteId(null)
          }
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

import { useState, useCallback, useEffect } from 'react'
import { Icon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { WorkoutEmpty } from '@/components/ui/WorkoutEmpty'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises'
import { ExerciseForm } from './ExerciseForm'
import { EXERCISE_CATEGORY_LABELS } from '@/types'
import { cn } from '@/utils/cn'

export function ExerciseLibrary() {
  const { exercises, loading, reload, create, update, remove } = useWorkoutExercises()

  useEffect(() => { void reload() }, [reload])

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<{ id: string; values: { name: string; category: string; equipment: string; equipmentOptions: string[]; defaultEquipment: string; notes: string } } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const categoryToKey = (label: string): string => {
    const entries = Object.entries(EXERCISE_CATEGORY_LABELS as Record<string, string>)
    const key = entries.find(([, value]) => value === label)?.[0]
    return key ?? 'other'
  }

  const categories = ['All', ...Object.values(EXERCISE_CATEGORY_LABELS)]

  const filtered = exercises.filter((exercise) => {
    if (category !== 'All' && exercise.category !== categoryToKey(category)) {
      return false
    }
    if (query.trim()) {
      const needle = query.trim().toLowerCase()
      if (
        !exercise.name.toLowerCase().includes(needle) &&
        !exercise.equipment.toLowerCase().includes(needle) &&
        !exercise.equipmentOptions.some((opt) => opt.toLowerCase().includes(needle))
      ) {
        return false
      }
    }
    return true
  })

  const handleSave = useCallback(async (values: { name: string; category: string; equipment: string; equipmentOptions: string[]; defaultEquipment: string; notes: string | null }) => {
    if (editing) {
      const catKey = Object.entries(EXERCISE_CATEGORY_LABELS).find(([key]) => key === values.category)?.[0] ?? 'other'
      await update(editing.id, {
        name: values.name,
        category: catKey,
        equipment: values.equipment,
        equipmentOptions: values.equipmentOptions,
        defaultEquipment: values.defaultEquipment,
        notes: values.notes,
      })
      setEditing(null)
    } else {
      await create({ name: values.name, category: values.category, equipment: values.equipment, equipmentOptions: values.equipmentOptions, defaultEquipment: values.defaultEquipment, notes: values.notes })
    }
  }, [editing, create, update])

  const openEdit = useCallback((exercise: { id: string; name: string; category: string; equipment: string; equipmentOptions?: string[]; defaultEquipment?: string; notes: string | null }) => {
    const catLabel = Object.entries(EXERCISE_CATEGORY_LABELS as Record<string, string>).find(([key]) => key === exercise.category)?.[1]
    setEditing({
      id: exercise.id,
      values: {
        name: exercise.name,
        category: catLabel ?? EXERCISE_CATEGORY_LABELS.other,
        equipment: exercise.equipment,
        equipmentOptions: exercise.equipmentOptions ?? [],
        defaultEquipment: exercise.defaultEquipment ?? exercise.equipment,
        notes: exercise.notes ?? '',
      },
    })
  }, [])

  const confirmDelete = useCallback((id: string) => {
    setDeleting(id)
  }, [])

  const handleDelete = useCallback(async () => {
    if (!deleting) return
    const ex = exercises.find((e) => e.id === deleting)
    if (ex && ex.builtIn) {
      // Built-in catalog exercises cannot be deleted.
      setDeleting(null)
      return
    }
    await remove(deleting)
    setDeleting(null)
  }, [deleting, exercises, remove])

  const filteredCount = filtered.length

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Exercise library"
        description="Your personalized exercise database. Add exercises you actually use."
      />

      <div className="flex gap-2">
        <TextField
          label="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or equipment"
          className="flex-1"
        />
        <Button variant="secondary" className="shrink-0" onClick={() => setShowAdd(true)}>
          <Icon name="plus" size={18} />
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={cn(
              'rounded-xl border px-3 py-1.5 text-[13px] font-medium transition-colors',
              category === cat
                ? 'border-accent/40 bg-accent-dim text-accent-strong'
                : 'border-line bg-surface-2 text-ink-3 hover:border-line-strong hover:text-ink-2'
            )}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && exercises.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-1 w-28 rounded-full bg-surface-2 animate-pulse" />
        </div>
      ) : filtered.length === 0 ? (          <WorkoutEmpty
            icon="dumbbell"
            title="No exercises yet"
          message={query || category !== 'All' ? 'Try a different search or filter.' : 'Create your first exercise to start building workouts.'}
          action={
            !query && category === 'All' ? (
              <Button variant="primary" size="sm" onClick={() => setShowAdd(true)} className="mt-1">
                Create exercise
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((exercise) => (
            <div
              key={exercise.id}
              className="group flex items-start gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-line-strong hover:bg-surface-2"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-dim text-accent-strong">
                <Icon name="dumbbell" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">{exercise.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
                  <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5">{exercise.category}</span>
                  <span className="truncate">
                    {exercise.equipmentOptions.length ? exercise.equipmentOptions.join(', ') : exercise.equipment}
                  </span>
                </div>
                {exercise.builtIn ? (
                  <span className="mt-1 inline-flex h-5 items-center rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] text-ink-3">
                    Built-in
                  </span>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(exercise)}
                  className="h-8 w-8 p-0"
                  aria-label={`Edit ${exercise.name}`}
                >
                  <Icon name="edit" size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => confirmDelete(exercise.id)}
                  className="h-8 w-8 p-0 text-danger hover:bg-danger-dim"
                  aria-label={`Delete ${exercise.name}`}
                >
                  <Icon name="trash" size={16} />
                </Button>
              </div>
            </div>
          ))}
          {filteredCount !== exercises.length && (
            <p className="text-[12px] text-ink-3">
              Showing {filteredCount} of {exercises.length} exercises.
            </p>
          )}
        </div>
      )}

      <BottomSheet
        open={showAdd || !!editing}
        onClose={() => {
          setShowAdd(false)
          setEditing(null)
        }}
        title={editing ? 'Edit exercise' : 'New exercise'}
        description={editing ? 'Update the exercise details.' : 'Add an exercise to your library.'}
      >
        <ExerciseForm
          initial={editing?.values}
          onSave={handleSave}
          onCancel={() => {
            setShowAdd(false)
            setEditing(null)
          }}
        />
      </BottomSheet>

      <ConfirmDialog
        open={deleting != null}
        title="Delete exercise?"
        description="This removes the exercise from your library. Historical workouts that already used it keep their snapshot and will still display correctly."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

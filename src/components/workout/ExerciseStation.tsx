import { useCallback, useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/icons'
import { SetRow } from './SetRow'
import { useActiveWorkout } from '@/hooks/useActiveWorkout'
import { usePreviousPerformance, useExerciseHistory } from '@/hooks/useWorkoutHistory'
import { upsertSessionSet } from '@/db/workoutQueries'
import { formatReps } from '@/types'
import { cn } from '@/utils/cn'

interface ExerciseStationProps {
  exercise: {
    id: string
    exerciseId: string
    order: number
    exerciseNameSnapshot: string
    notes: string | null
  }
  targetSets: number
  targetReps: string
  defaultWeight: number | null
  restSeconds: number
  disabled?: boolean
}

export function ExerciseStation({ exercise, targetSets, targetReps, restSeconds, disabled }: ExerciseStationProps) {
  const { sessionExercises, upsertSet, removeSet, refreshExerciseSets } = useActiveWorkout()

  const { previous } = usePreviousPerformance(exercise.exerciseId)
  useExerciseHistory(exercise.exerciseId)

  const [sets, setSets] = useState<{
    id: string
    setNumber: number
    weight: number | null
    weightUnit: string
    reps: number | null
    completed: boolean
    rpe: number | null
    restSeconds: number | null
    notes: string | null
  }[]>([])
  const [copyConfirm, setCopyConfirm] = useState(false)

  const workoutExerciseId = sessionExercises.find((row) => row.exerciseId === exercise.exerciseId)?.id ?? null

  const loadSets = useCallback(async () => {
    if (!workoutExerciseId) return
    const rows = await refreshExerciseSets(workoutExerciseId)
    const mapped = rows.map((row) => ({
      id: row.id,
      setNumber: row.setNumber,
      weight: row.weight,
      weightUnit: row.weightUnit,
      reps: row.reps,
      completed: row.completed,
      rpe: row.rpe,
      restSeconds: row.restSeconds,
      notes: row.notes,
    }))
    setSets(mapped)
  }, [workoutExerciseId, refreshExerciseSets])

  useEffect(() => {
    void loadSets()
  }, [workoutExerciseId, loadSets])

  const handleSave = useCallback(async (patch: { id: string; setNumber: number; weight: number | null; weightUnit: string; reps: number | null; completed: boolean; rpe: number | null; restSeconds: number | null; notes: string | null }) => {
    if (!workoutExerciseId) return
    await upsertSet(workoutExerciseId, patch)
    await loadSets()
  }, [workoutExerciseId, loadSets])

  const handleDelete = useCallback(async (setId: string) => {
    if (!workoutExerciseId) return
    await removeSet(setId)
    await loadSets()
  }, [workoutExerciseId, removeSet, loadSets])

  const copyPrevious = useCallback(async () => {
    if (!workoutExerciseId || !previous?.sets || previous.sets.length === 0) return
    for (let i = 0; i < previous.sets.length; i += 1) {
      const p = previous.sets[i]
      await upsertSessionSet(workoutExerciseId, {
        setNumber: i + 1,
        weight: p.weight,
        weightUnit: 'kg',
        reps: p.reps ?? 0,
        completed: true,
        rpe: null,
        restSeconds: restSeconds,
        notes: null,
      })
    }
    await loadSets()
  }, [workoutExerciseId, previous, restSeconds, upsertSessionSet, loadSets])

  const volume = sets
    .filter((s) => s.completed && s.weight != null && s.reps != null)
    .reduce((total, s) => total + s.weight! * s.reps!, 0)

  const target = `${targetSets} × ${targetReps}`

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-dim text-accent-strong">
          <Icon name="workout" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-ink">{exercise.exerciseNameSnapshot}</h3>
            <span className="text-[12px] font-medium uppercase tracking-wide text-ink-3">Target {target}</span>
          </div>
          <p className="mt-1 text-[13px] text-ink-3">{exercise.notes ?? ''}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-medium uppercase tracking-wide text-ink-3">Set entry</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSets((prev) => [...prev, { id: `new-${Date.now()}`, setNumber: prev.length + 1, weight: null, weightUnit: 'kg', reps: null, completed: false, rpe: null, restSeconds: null, notes: null }])}
            className="hh-9"
            disabled={disabled}
          >
            <Icon name="plus" size={16} />
            Add set
          </Button>
        </div>

        <div className="mt-2 space-y-2">
          {sets.map((s) => (
            <SetRow
              key={s.id}
              set={s}
              disabled={disabled}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      {previous?.sets && previous.sets.length > 0 ? (
        <div
          className={cn(
            'rounded-2xl border border-line bg-surface-2 p-3 text-left',
            copyConfirm ? 'border-accent/40 bg-accent-dim' : 'border-line',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">Last time</p>
              <p className="mt-1 truncate text-sm font-medium text-ink">
                {formatReps(previous.sets[0].weight)} × {formatReps(previous.sets[0].reps)}
              </p>
            </div>
            <Button
              variant={copyConfirm ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setCopyConfirm((v) => !v)}
              disabled={disabled}
            >
              <Icon name="refresh" size={14} />
              {copyConfirm ? 'Copy again' : 'Copy previous sets'}
            </Button>
          </div>
          <div className="mt-2 space-y-0.5 text-[13px]">
            {previous.sets.map((p) => {
              const reps = p.reps ?? 0
              return (
                <div key={p.weight + reps + p.repsDisplay} className="flex items-center gap-2 text-ink-3">
                  <Icon name="check" size={13} />
                  <span className="tabular-nums">{formatReps(p.weight)} × {formatReps(reps)}</span>
                </div>
              )
            })}
          </div>
          {copyConfirm ? (
            <Button
              variant="primary"
              size="sm"
              className="mt-2"
              onClick={() => {
                void copyPrevious()
                setCopyConfirm(false)
              }}
            >
              Apply
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface-2 p-3 text-center text-[12px] text-ink-3">
          First time doing this exercise today
        </div>
      )}

      <div className="flex items-center justify-between text-[12px] text-ink-3">
        <div className="flex items-center gap-2">
          {volume > 0 ? (
            <span className="tabular-nums text-accent-strong">{volume} kg</span>
          ) : (
            <span className="text-ink-3">Volume: —</span>
          )}
        </div>
      </div>
    </div>
  )
}

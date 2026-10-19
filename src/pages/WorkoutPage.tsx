import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getStrengthLogsForDate,
  saveStrengthSet,
  saveDailyLogExercise,
  deleteDailyLogExercise,
  setDailyLogSkipped,
  getDayPlanForDate,
  saveDayPlan,
  deleteDayPlan,
  recentExerciseIds,
  listExercises,
  createExercise,
  dayPlansRepo,
} from '@/db'
import { newId, nowIso } from '@/utils/id'
import type { DailyStrengthLog, DayPlan, DayPlanExercise, Exercise } from '@/types'
import { bestTodayForLog, formatReps } from '@/types'
import { formatShortDate, todayISO, startOfWeek, addDays, weekdayOf } from '@/utils/date'
import { Icon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ExerciseLibrary } from '@/components/workout/ExerciseLibrary'
import { CardioLogForm } from '@/components/workout/CardioLogForm'
import { CardioHistoryList } from '@/components/workout/CardioHistoryList'
import { cn } from '@/utils/cn'
import { useSettings } from '@/hooks/useSettings'
import { EXERCISE_CATEGORY_LABELS } from '@/types'

type ViewId = 'log' | 'plan' | 'library' | 'cardio'

export default function WorkoutPage() {
  const [view, setView] = useState<ViewId>('log')
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [editingPlanDate, setEditingPlanDate] = useState<string | null>(null)
  const [editPlan, setEditPlan] = useState<DayPlan | null>(null)
  const [planReloadKey, setPlanReloadKey] = useState(0)
  const { settings } = useSettings()

  useEffect(() => {
    if (!editingPlanDate) {
      setEditPlan(null)
      return
    }
    let cancelled = false
    getDayPlanForDate(editingPlanDate).then((p) => {
      if (!cancelled) setEditPlan(p ?? null)
    })
    return () => { cancelled = true }
  }, [editingPlanDate])

  return (
    <div className="space-y-6 pb-nav">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-ink">
            {view === 'log' ? 'Workout' : view === 'plan' ? 'Weekly plan' : view === 'library' ? 'Exercises' : 'Cardio'}
          </h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {view === 'log'
              ? `Date — ${formatShortDate(selectedDate)}`
              : view === 'plan'
                ? 'Plan your week'
                : view === 'library'
                  ? 'Your exercise database'
                  : 'Log walks, runs, rides'}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant={view === 'log' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setView('log')}
          >
            <Icon name="workout" size={15} />
            Today
          </Button>
          <Button
            variant={view === 'library' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setView('library')}
          >
            <Icon name="dumbbell" size={15} />
            Exercises
          </Button>
          <Button
            variant={view === 'cardio' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setView('cardio')}
          >
            <Icon name="cardio" size={15} />
            Cardio
          </Button>
          <Button
            variant={view === 'plan' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setView('plan')}
          >
            <Icon name="calendar" size={15} />
            Plan
          </Button>
        </div>
      </header>

      {view === 'log' && (
        <DailyLogView date={selectedDate} onDateChange={setSelectedDate} />
      )}
      {view === 'plan' && (
        <WeeklyPlanView
          key={planReloadKey}
          weekStart={startOfWeek(selectedDate, settings?.weekStartsOn ?? 1)}
          onEditDay={(date) => setEditingPlanDate(date)}
          onChange={() => setPlanReloadKey((k) => k + 1)}
        />
      )}
      {view === 'library' && (
        <Card className="p-5">
          <ExerciseLibrary />
        </Card>
      )}
      {view === 'cardio' && (
        <div className="space-y-5">
          <SectionHeader
            title="Cardio"
            description="Log walks, runs, rides and more. Activity + duration only — calories are estimated, never required."
          />
          <CardioLogForm />
          <CardioHistoryList />
        </div>
      )}

      {editingPlanDate && editPlan !== null && (
        <PlanEditor
          date={editingPlanDate}
          plan={editPlan}
          onSave={(plan) => {
            void saveDayPlan(plan).then(() => {
              setEditingPlanDate(null)
              setEditPlan(null)
              setPlanReloadKey((k) => k + 1)
              // Refresh the weekly plan and the log view for this date.
              setView('plan')
            })
          }}
          onDelete={() => {
            void deleteDayPlan(editPlan.id).then(() => {
              setEditingPlanDate(null)
              setEditPlan(null)
            })
          }}
          onCancel={() => {
            setEditingPlanDate(null)
            setEditPlan(null)
          }}
        />
      )}
      {editingPlanDate && editPlan === null && (
        <PlanEditor
          date={editingPlanDate}
          plan={null}
          onSave={(plan) => {
            void saveDayPlan(plan).then(() => {
              setEditingPlanDate(null)
              setEditPlan(null)
              setPlanReloadKey((k) => k + 1)
              setView('plan')
            })
          }}
          onDelete={() => {}}
          onCancel={() => {
            setEditingPlanDate(null)
            setEditPlan(null)
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Daily strength log                                                 */
/* ------------------------------------------------------------------ */

function DailyLogView({ date, onDateChange }: { date: string; onDateChange: (d: string) => void }) {
  const [logs, setLogs] = useState<DailyStrengthLog[]>([])
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [planLoading, setPlanLoading] = useState(true)

  const [adding, setAdding] = useState(false)
  const [pickingExercise, setPickingExercise] = useState<Exercise | null>(null)
  const [pickEquipment, setPickEquipment] = useState<string>('')
  const [pickCustomEquipment, setPickCustomEquipment] = useState('')
  const [pickConfirming, setPickConfirming] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [skipTarget, setSkipTarget] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rows, planRows] = await Promise.all([
        getStrengthLogsForDate(date),
        getDayPlanForDate(date),
      ])
      setLogs(rows.sort((a, b) => a.order - b.order))
      setPlan(planRows ?? null)
    } finally {
      setLoading(false)
      setPlanLoading(false)
    }
  }, [date])

  useEffect(() => {
    setPlanLoading(true)
    void load()
  }, [load])

  useEffect(() => {
    void load()
  }, [load])

  const handleAddExercise = useCallback(
    async (
      exerciseId: string,
      exerciseNameSnapshot: string,
      exerciseEquipmentSnapshot: string | null,
      exerciseEquipmentOptionsSnapshot: string[],
      builtInSnapshot: boolean,
      notes: string | null,
    ) => {
      try {
        await saveDailyLogExercise(
          date,
          exerciseId,
          exerciseNameSnapshot,
          exerciseEquipmentSnapshot,
          exerciseEquipmentOptionsSnapshot,
          builtInSnapshot,
          notes,
        )
        await load()
      } catch {
        // ignore; UI will reflect persisted state on next load
      }
    },
    [date, load],
  )

  const handleRemoveExercise = useCallback(
    async (exerciseId: string) => {
      try {
        await deleteDailyLogExercise(date, exerciseId)
        await load()
      } catch {
        // ignore
      }
      setDeleteTarget(null)
    },
    [date, load],
  )

  const handleToggleSkip = useCallback(
    async (skipped: boolean, exerciseId: string) => {
      try {
        await setDailyLogSkipped(date, exerciseId, skipped)
        await load()
      } catch {
        // ignore
      }
      setSkipTarget(null)
    },
    [date, load],
  )

  const startSkipConfirm = useCallback(
    (exerciseId: string, hasValidSets: boolean) => {
      // If the exercise already has valid logged sets, ask before marking skipped.
      // Skipping preserves the sets but marks the exercise as not performed, so
      // it must not count toward workout activity.
      if (hasValidSets) {
        setSkipTarget(exerciseId)
      } else {
        void handleToggleSkip(true, exerciseId)
      }
    },
    [handleToggleSkip],
  )

  return (
    <div className="space-y-5 pb-nav">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-ink-3">Date</label>
          <input
            type="date"
            className="rounded-xl border border-line bg-surface-2 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 dark:placeholder:text-ink-3"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          className="shrink-0"
          onClick={() => {
            setAdding(true)
            setPickingExercise(null)
            setPickEquipment('')
            setPickCustomEquipment('')
          }}
        >
          <Icon name="plus" size={15} />
          Add exercise
        </Button>
      </div>
      <p className="text-[13px] text-ink-3">
        Log strength sets for {date === todayISO() ? 'today' : formatShortDate(date)}. Each set is saved immediately.
      </p>
      {plan && !planLoading && (
        <div className="rounded-xl border border-accent/30 bg-accent-dim/20 px-3.5 py-2.5">
          <p className="text-[12px] font-medium text-accent-strong">
            {plan.name}
            {plan.notes ? ` · ${plan.notes}` : ''}
          </p>
          {plan.exercises.length > 0 && (
            <p className="text-[12px] text-ink-3 mt-0.5">
              {plan.exercises.length} planned exercise{plan.exercises.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
      )}
      {!plan && !planLoading && date !== todayISO() && (
        <p className="text-[13px] text-ink-3">
          No plan assigned for this date. Tap “Add exercise” to log anyway.
        </p>
      )}

      {logs.length === 0 && !loading ? (
        <Card className="p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-3">
            <Icon name="workout" size={24} />
          </div>
          <p className="mt-3 text-sm font-medium text-ink">No exercises logged yet today</p>
          <p className="mt-1 text-[13px] text-ink-3">
            Tap “Add exercise” to log your first set.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            onClick={() => {
              setAdding(true)
              setPickingExercise(null)
              setPickEquipment('')
              setPickCustomEquipment('')
            }}
          >
            <Icon name="plus" size={15} />
            Add exercise
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const persistedSets = log.sets.filter((s) => s.setNumber > 0).sort((a, b) => a.setNumber - b.setNumber)
            const hasValidSets = persistedSets.some((s) => s.weight != null && s.reps != null && Number.isFinite(s.weight) && Number.isFinite(s.reps))
            return (
              <DailyExerciseCard
                key={log.id}
                log={log}
                onDelete={() => setDeleteTarget(log.exerciseId)}
              onSaveSet={(setNumber, patch) => {
                void saveStrengthSet(
                  date,
                  log.exerciseId,
                    log.exerciseNameSnapshot,
                    log.exerciseEquipmentSnapshot,
                    log.exerciseEquipmentOptionsSnapshot,
                    log.builtInSnapshot,
                    setNumber,
                    patch,
                  ).then(() => void load())
                }}
                onToggleSkip={(skipped, exerciseId) => startSkipConfirm(exerciseId, hasValidSets && skipped)}
              />
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Remove exercise?"
        description="This removes today's logged sets for this exercise only. Past logs stay intact."
        confirmLabel="Remove"
        tone="danger"
        onConfirm={() => {
          if (deleteTarget) void handleRemoveExercise(deleteTarget)
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={skipTarget != null}
        title="Skip this exercise?"
        description="This marks the exercise as skipped for today. Its logged sets are preserved but won't count as completed activity. You can mark it as performed again later."
        confirmLabel="Skip exercise"
        tone="default"
        onConfirm={() => {
          if (skipTarget) void handleToggleSkip(true, skipTarget)
        }}
        onCancel={() => setSkipTarget(null)}
      />

      <BottomSheet
        open={adding}
        onClose={() => {
          if (adding) {
            setAdding(false)
            setPickingExercise(null)
            setPickEquipment('')
            setPickCustomEquipment('')
            setPickConfirming(false)
          }
        }}
        title="Add exercise"
        description="Search, pick recent, or create a custom exercise."
      >
        {pickingExercise ? (
          <EquipmentPicker
            exercise={pickingExercise}
            selected={pickEquipment}
            custom={pickCustomEquipment}
            onSelectEquipment={(eq) => {
              setPickEquipment(eq)
              setPickCustomEquipment('')
            }}
            onCustomChange={(v) => setPickCustomEquipment(v)}
            onConfirm={() => setPickConfirming(true)}
            onBack={() => {
              setPickingExercise(null)
              setPickEquipment('')
              setPickCustomEquipment('')
            }}
          />
        ) : (
          <ExercisePicker
            onPick={(exercise) => {
              setPickingExercise(exercise)
              setPickEquipment(exercise.defaultEquipment ?? exercise.equipment ?? '')
              setPickCustomEquipment('')
              setPickConfirming(false)
            }}
            onBack={() => {
              setAdding(false)
              setPickingExercise(null)
              setPickEquipment('')
              setPickCustomEquipment('')
              setPickConfirming(false)
            }}
            onCreateCustom={(values) => {
              void createExercise(values).then((exercise) => {
                setPickingExercise(exercise)
                setPickEquipment(exercise.defaultEquipment ?? exercise.equipment ?? '')
                setPickCustomEquipment('')
                setPickConfirming(false)
              })
            }}
          />
        )}
      </BottomSheet>

      {pickConfirming && pickingExercise && (
        <ConfirmDialog
          open
          title="Add exercise?"
          description={`${pickingExercise.name} · ${pickCustomEquipment.trim() || pickEquipment}`}
          confirmLabel="Add"
          tone="default"
          onConfirm={() => {
            const equipment = pickCustomEquipment.trim() || pickEquipment
            if (!equipment) return
            const options =
              pickCustomEquipment.trim()
                ? Array.from(new Set([pickCustomEquipment.trim(), ...pickingExercise.equipmentOptions]))
                : pickingExercise.equipmentOptions
            void handleAddExercise(
              pickingExercise.id,
              pickingExercise.name,
              equipment,
              options,
              pickingExercise.builtIn ?? true,
              null,
            )
            setAdding(false)
            setPickingExercise(null)
            setPickEquipment('')
            setPickCustomEquipment('')
            setPickConfirming(false)
          }}
          onCancel={() => setPickConfirming(false)}
        />
      )}
    </div>
  )
}

interface DailyExerciseCardProps {
  log: DailyStrengthLog
  onDelete: () => void
  onSaveSet: (setNumber: number, patch: { weight?: number | null; reps?: number | null; rpe?: number | null; notes?: string | null }) => void
  onToggleSkip: (skipped: boolean, exerciseId: string) => void
}

function DailyExerciseCard({ log, onDelete, onSaveSet, onToggleSkip }: DailyExerciseCardProps) {
  const todayBest = bestTodayForLog(log)
  const [drafts, setDrafts] = useState<number[]>([])
  const [expanded, setExpanded] = useState(false)

  const existingNumbers = log.sets.filter((s) => s.setNumber > 0).map((s) => s.setNumber)
  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
  const draftNumbers = drafts.filter((n) => n > maxNumber || !existingNumbers.includes(n))
  const nextNumber = Math.max(maxNumber, ...draftNumbers, 0) + 1

  const handleSave = useCallback(
    async (setNumber: number, patch: { weight?: number | null; reps?: number | null; rpe?: number | null; notes?: string | null }) => {
      await onSaveSet(setNumber, patch)
      setDrafts((prev) => prev.filter((n) => n !== setNumber))
    },
    [onSaveSet],
  )

  const addSet = useCallback(() => {
    setDrafts((prev) => [...prev, nextNumber])
    setExpanded(true)
  }, [nextNumber])

  const persistedSets = log.sets.filter((s) => s.setNumber > 0).sort((a, b) => a.setNumber - b.setNumber)
  const anySetFilled = persistedSets.some((s) => s.weight != null || s.reps != null)
  const setCount = persistedSets.length + draftNumbers.length

  const draftRows = draftNumbers.map((n) => ({
    id: 'draft-' + n,
    setNumber: n,
    weight: null as null,
    reps: null as null,
    rpe: null as null,
    notes: null as null | string,
    createdAt: '' as string,
    isNew: true as true,
  }))

  const summaryLine = log.skipped
    ? 'Skipped — tap "Mark as performed" to resume'
    : todayBest
      ? `Best: ${formatReps(todayBest.bestWeight)} kg × ${formatReps(todayBest.bestRepsAtWeight ?? 0)}`
      : setCount > 0
        ? `Sets logged: ${setCount}`
        : 'No sets logged yet'

  return (
    <Card className="p-4">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${log.exerciseNameSnapshot}${log.skipped ? ', skipped' : ''}${setCount > 0 ? `, ${setCount} set${setCount === 1 ? '' : 's'}` : ', no sets logged yet'}`}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
        className={cn(
          'flex w-full items-start justify-between gap-3 text-left rounded-xl transition-colors duration-150',
          expanded ? 'bg-surface-2/80' : 'hover:bg-surface-2/60',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon
              name={expanded ? 'chevron-down' : 'chevron-right'}
              size={14}
              className={cn('shrink-0 text-ink-3 transition-transform duration-150', expanded ? 'rotate-180' : '')}
            />
            <h3 className="truncate text-[15px] font-semibold text-ink">{log.exerciseNameSnapshot}</h3>
            {log.builtInSnapshot ? (
              <span className="shrink-0 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] text-ink-3">Built-in</span>
            ) : null}
            {log.skipped ? (
              <span className="shrink-0 rounded-full border border-warning/40 bg-warning-dim/40 px-2 py-0.5 text-[11px] text-warning">Skipped</span>
            ) : null}
          </div>
          <p className="mt-1 text-[13px] text-ink-3">
            {log.exerciseEquipmentSnapshot ? `${log.exerciseEquipmentSnapshot}` : ''}
            {log.exerciseEquipmentOptionsSnapshot.length > 1 ? ` · ${log.exerciseEquipmentOptionsSnapshot.length} options` : ''}
          </p>
          <p className="mt-1.5 text-[13px] text-ink-2">{summaryLine}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-accent hover:bg-accent-dim"
            onClick={(e) => {
              e.stopPropagation()
              addSet()
            }}
            aria-label="Add set"
          >
            <Icon name="plus" size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-danger hover:bg-danger-dim"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            aria-label={`Remove ${log.exerciseNameSnapshot}`}
          >
            <Icon name="trash" size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation()
              onToggleSkip(log.skipped ? false : true, log.exerciseId)
            }}
            aria-label={log.skipped ? `Mark ${log.exerciseNameSnapshot} as performed` : `Skip ${log.exerciseNameSnapshot}`}
          >
            <Icon name={log.skipped ? 'play' : 'pause'} size={16} />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium uppercase tracking-wide text-ink-3">
              Sets ({setCount})
            </p>
            {todayBest && !log.skipped ? (
              <p className="text-[12px] text-ink-3">
                Best today: {formatReps(todayBest.bestWeight)} kg × {formatReps(todayBest.bestRepsAtWeight ?? 0)}
                {todayBest.bestVolume != null ? ` · ${todayBest.bestVolume} kg` : ''}
                {todayBest.estimated1RM != null ? ` · est. 1RM ${todayBest.estimated1RM.toFixed(1)} kg` : ''}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            {persistedSets.map((set) => (
              <SetRow
                key={set.id}
                setNumber={set.setNumber}
                weight={set.weight}
                reps={set.reps}
                rpe={set.rpe}
                notes={set.notes}
                createdAt={set.createdAt}
                onSave={(patch) => handleSave(set.setNumber, patch)}
              />
            ))}
            {draftRows.map((set) => (
              <SetRow
                key={set.id}
                setNumber={set.setNumber}
                weight={set.weight}
                reps={set.reps}
                rpe={set.rpe}
                notes={set.notes}
                createdAt={set.createdAt}
                isNew
                onSave={(patch) => handleSave(set.setNumber, patch)}
                onCancel={() => setDrafts((prev) => prev.filter((n) => n !== set.setNumber))}
              />
            ))}
            {!anySetFilled && persistedSets.length === 0 && draftRows.length === 0 && (
              <p className="text-[13px] text-ink-3 text-center py-3" data-testid="no-sets-yet">No sets logged yet.</p>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={addSet} aria-label="Add set">
              <Icon name="plus" size={14} />
              Add set
            </Button>
            {log.skipped ? (
              <Button variant="primary" size="sm" onClick={() => onToggleSkip(false, log.exerciseId)}>
                Mark as performed
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => onToggleSkip(true, log.exerciseId)}>
                Skip exercise
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

interface SetRowProps {
  setNumber: number
  weight: number | null
  reps: number | null
  rpe: number | null
  notes: string | null
  createdAt: string
  isNew?: boolean
  saving?: boolean
  onSave: (patch: { weight?: number | null; reps?: number | null; rpe?: number | null; notes?: string | null }) => void
  onCancel?: () => void
}

function SetRow({ setNumber, weight, reps, rpe, notes, isNew, saving, onSave, onCancel }: SetRowProps) {
  const [editing, setEditing] = useState((isNew ?? false) || saving)
  const [weightValue, setWeightValue] = useState(String(weight ?? ''))
  const [repsValue, setRepsValue] = useState(String(reps ?? ''))
  const [rpeValue, setRpeValue] = useState(String(rpe ?? ''))
  const [notesValue, setNotesValue] = useState(notes ?? '')
  const [pending, setPending] = useState(false)

  const startEdit = () => {
    setWeightValue(String(weight ?? ''))
    setRepsValue(String(reps ?? ''))
    setRpeValue(String(rpe ?? ''))
    setNotesValue(notes ?? '')
    setEditing(true)
  }

  const commit = useCallback(() => {
    setPending(true)
    const weightParsed = weightValue.trim() === '' ? null : Number(weightValue)
    const repsParsed = repsValue.trim() === '' ? null : Number(repsValue)
    const rpeParsed = rpeValue.trim() === '' ? null : Number(rpeValue)
    const valid =
      (weightParsed == null || Number.isFinite(weightParsed))
      && (repsParsed == null || Number.isFinite(repsParsed))
      && (rpeParsed == null || Number.isFinite(rpeParsed))
    if (!valid) {
      setPending(false)
      return
    }
    onSave({
      weight: weightParsed,
      reps: repsParsed,
      rpe: rpeParsed,
      notes: notesValue.trim() === '' ? null : notesValue.trim(),
    })
    setEditing(false)
    setPending(false)
  }, [weightValue, repsValue, rpeValue, notesValue, onSave])

  const cancel = () => {
    if (isNew) {
      onCancel?.()
      return
    }
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/60 px-3 py-2">
      <span className="text-[13px] text-ink-3 w-6 shrink-0 tabular-nums">{setNumber}</span>
      <TextField
        label=""
        type="number"
        inputMode="decimal"
        value={weightValue}
        onChange={(e) => setWeightValue(e.target.value)}
        placeholder="kg"
        className="w-20"
        disabled={pending}
      />
      <span className="text-[13px] text-ink-3">×</span>
      <TextField
        label=""
        type="number"
        inputMode="numeric"
        value={repsValue}
        onChange={(e) => setRepsValue(e.target.value)}
        placeholder="reps"
        className="w-16"
        disabled={pending}
      />
      <div className="flex-1" />
      {editing ? (
        <div className="flex items-center gap-2">
          <TextField
            label=""
            type="number"
            inputMode="decimal"
            value={rpeValue}
            onChange={(e) => setRpeValue(e.target.value)}
            placeholder="RPE"
            className="w-16"
            disabled={pending}
          />
          <TextField
            label="note"
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            placeholder="note"
            className="flex-1"
            disabled={pending}
          />
          <Button variant="ghost" size="sm" onClick={cancel} className="h-7 w-7 p-0">
            <Icon name="close" size={14} />
          </Button>
          <Button variant="primary" size="sm" onClick={commit} disabled={pending} className="h-7">
            {pending ? 'Saving' : 'Save'}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-ink">
            {weight != null && reps != null ? `${formatReps(weight)} × ${formatReps(reps)}` : weight != null ? formatReps(weight) : reps != null ? formatReps(reps) : '—'}
          </span>
          {rpe != null ? (
            <span className="text-[12px] text-ink-3">RPE {rpe}</span>
          ) : null}
          {notes ? (
            <span className="text-[12px] text-ink-3 truncate max-w-[120px]">{notes}</span>
          ) : null}
          <Button variant="ghost" size="sm" onClick={startEdit} className="h-7 w-7 p-0" aria-label="Edit set">
            <Icon name="edit" size={13} />
          </Button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Add-exercise picker                                                */
/* ------------------------------------------------------------------ */

interface ExercisePickerProps {
  onPick: (exercise: Exercise) => void
  onBack: () => void
  onCreateCustom: (values: { name: string; category: string; equipment: string; equipmentOptions: string[]; defaultEquipment: string; notes: string | null }) => void
}

function ExercisePicker({ onPick, onBack, onCreateCustom }: ExercisePickerProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createCategory, setCreateCategory] = useState<string>(EXERCISE_CATEGORY_LABELS.chest)
  const [createEquipment, setCreateEquipment] = useState('')
  const [createNotes, setCreateNotes] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [recent, setRecent] = useState<{ exerciseId: string; exerciseNameSnapshot: string; date: string }[]>([])
  const [all, setAll] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [recentRows, allRows] = await Promise.all([recentExerciseIds(12), listExercises()])
      if (!cancelled) {
        setRecent(recentRows)
        setAll(allRows)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setLoading(false)
  }, [loading])

  const categories = ['All', ...Object.values(EXERCISE_CATEGORY_LABELS)]

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const catKey =
      category === 'All' ? null : Object.entries(EXERCISE_CATEGORY_LABELS).find(([, v]) => v === category)?.[0] ?? 'other'
    return all.filter((ex) => {
      if (catKey && ex.category !== catKey) return false
      if (needle) {
        if (!ex.name.toLowerCase().includes(needle) && !ex.equipment.toLowerCase().includes(needle)) {
          return false
        }
      }
      return true
    })
  }, [all, query, category])

  const recentItems = useMemo(() => {
    const byId = new Map(all.map((ex) => [ex.id, ex]))
    return recent
      .filter((r) => byId.has(r.exerciseId))
      .map((r) => ({ ...r, exercise: byId.get(r.exerciseId)! }))
  }, [recent, all])

  return (
    <div className="space-y-4 max-h-[calc(100%-2rem)] overflow-y-auto overscroll-contain">
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => setShowCreate(true)} className="shrink-0">
          <Icon name="plus" size={14} />
          Create custom
        </Button>
        <TextField
          label="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or equipment"
          className="flex-1"
        />
        <Button variant="ghost" size="sm" onClick={onBack}>
          <Icon name="close" size={14} />
          Cancel
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-line bg-surface-2/60 p-4 space-y-3">
          <p className="text-[13px] font-medium text-ink">Create custom exercise</p>
          <TextField label="Name" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. Landmine Press" autoFocus />
          <div className="flex gap-2">
            <select
              value={createCategory}
              onChange={(e) => setCreateCategory(e.target.value)}
              className="rounded-xl border border-line bg-surface-2 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent/60"
            >
              {Object.values(EXERCISE_CATEGORY_LABELS).map((label) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
            <TextField label="Equipment" value={createEquipment} onChange={(e) => setCreateEquipment(e.target.value)} placeholder="e.g. Barbell" />
          </div>
          <TextField label="Notes" value={createNotes} onChange={(e) => setCreateNotes(e.target.value)} placeholder="Optional" />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={() => {
              if (!createName.trim() || !createEquipment.trim()) return
              const catKey = Object.entries(EXERCISE_CATEGORY_LABELS).find(([, v]) => v === createCategory)?.[0] ?? 'other'
              onCreateCustom({
                name: createName.trim(),
                category: catKey,
                equipment: createEquipment.trim(),
                equipmentOptions: [createEquipment.trim()],
                defaultEquipment: createEquipment.trim(),
                notes: createNotes.trim() || null,
              })
              setShowCreate(false)
              setCreateName('')
              setCreateEquipment('')
              setCreateNotes('')
            }}>Create</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={cn(
              'rounded-xl border px-3 py-1.5 text-[13px] font-medium transition-colors',
              category === cat
                ? 'border-accent/40 bg-accent-dim text-accent-strong'
                : 'border-line bg-surface-2 text-ink-3 hover:border-line-strong hover:text-ink-2',
            )}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {recentItems.length > 0 && query.trim() === '' && category === 'All' && (
        <div className="space-y-2">
          <p className="text-[12px] font-medium uppercase tracking-wide text-ink-3">Recent</p>
          <div className="space-y-1">
            {recentItems.map((item) => (
              <button
                key={item.exerciseId}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2/60 px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
                onClick={() => onPick(item.exercise)}
              >
                <Icon name="clock" size={15} className="text-ink-3" />
                <span className="flex-1 text-sm font-medium text-ink">{item.exercise.name}</span>
                <span className="text-[12px] text-ink-3">{item.exercise.category}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {query.trim() === '' && category === 'All' ? (
          <p className="text-[12px] font-medium uppercase tracking-wide text-ink-3">All exercises</p>
        ) : query.trim() === '' ? (
          <p className="text-[12px] font-medium uppercase tracking-wide text-ink-3">{category}</p>
        ) : (
          <p className="text-[12px] font-medium uppercase tracking-wide text-ink-3">Search results</p>
        )}
        {filtered.length === 0 ? (
          <div className="text-[13px] text-ink-3 text-center py-4">No exercises match.</div>
        ) : (
          <div className="space-y-1">
            {filtered.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2/60 px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
                onClick={() => onPick(exercise)}
              >
                <Icon name="dumbbell" size={16} />
                <span className="flex-1 text-sm font-medium text-ink">{exercise.name}</span>
                <span className="text-[12px] text-ink-3">{exercise.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Weekly plan                                                         */
/* ------------------------------------------------------------------ */

const DAY_LABELS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

interface WeeklyPlanViewProps {
  weekStart: string
  onEditDay: (date: string) => void
  onChange?: () => void
}

function WeeklyPlanView({ weekStart, onEditDay, onChange }: WeeklyPlanViewProps) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i)
      const dow = weekdayOf(d)
      return { date: d, dow, label: DAY_LABELS[dow], isToday: d === todayISO() }
    }),
    [weekStart],
  )
  console.log('[workout] WeeklyPlanView days:', days.map((d) => d.date))

  const [plans, setPlans] = useState<Map<string, DayPlan>>(new Map())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const map = new Map<string, DayPlan>()
    try {
      const all = await dayPlansRepo.getAll()
      for (const p of all) {
        if (p.date && days.some((d) => d.date === p.date)) map.set(p.date, p)
      }
    } catch (err) {
      console.error('[workout] failed to load weekly plan:', err)
    } finally {
      setPlans(map)
      // React state updates are queued asynchronously. If the load Promise
      // resolves before React has processed setLoading(false), the loading
      // branch can briefly remount the skeleton even after the data is ready.
      // Backstop with a microtask so the component commits the loaded shape.
      if (loading) {
        queueMicrotask(() => setLoading(false))
      } else {
        setLoading(false)
      }
      onChange?.()
    }
  }, [days, onChange])

  useEffect(() => {
    void load()
  }, [load])

  const removePlan = useCallback(async (date: string) => {
    await deleteDayPlan((plans.get(date)?.id) ?? '')
    setPlans((prev) => {
      const next = new Map(prev)
      next.delete(date)
      return next
    })
  }, [plans])

  const openEdit = useCallback((date: string) => {
    onEditDay(date)
  }, [onEditDay])

  const planForDay = (date: string) => plans.get(date) ?? null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-1 w-28 rounded-full bg-surface-2 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-ink-3">
        Assign a workout plan to each day. Plans are per-date; rest days have no plan.
        Logging exercises from a plan creates actual workout logs and never changes the plan.
      </p>

      <div className="space-y-2">
        {days.map((day) => {
          const plan = planForDay(day.date)
          return (
            <div
              key={day.date}
              className={cn(
                'rounded-xl border bg-surface-2/60 px-4 py-3 transition-colors',
                !plan && 'border-transparent',
                plan && 'border-line',
                day.isToday && 'ring-2 ring-accent/40',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-ink-3">{day.label}</span>
                  {day.isToday && (
                    <span className="rounded-full bg-accent-dim px-2 py-0.5 text-[11px] text-accent-strong">
                      Today
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {plan ? (
                    <span className="text-sm font-medium text-ink">{plan.name}</span>
                  ) : (
                    <span className="text-[13px] text-ink-3">Rest / no plan</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!day.isToday && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => removePlan(day.date)}
                      aria-label={`Remove plan for ${day.label}`}
                    >
                      <Icon name="trash" size={14} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => openEdit(day.date)}
                    aria-label={plan ? `Edit plan for ${day.label}` : `Add plan for ${day.label}`}
                  >
                    <Icon name={plan ? 'edit' : 'plus'} size={14} />
                      </Button>
                </div>
              </div>
              {plan && plan.exercises.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {plan.exercises.slice(0, 6).map((ex, i) => (
                    <span key={i} className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] text-ink-3">
                      {ex.exerciseNameSnapshot}
                    </span>
                  ))}
                  {plan.exercises.length > 6 && (
                    <span className="text-[11px] text-ink-3">+{plan.exercises.length - 6} more</span>
                  )}
                </div>
              ) : plan ? (
                <button
                  type="button"
                  className="mt-2 w-full rounded-xl border-2 border-dashed border-accent/40 bg-accent-dim/40 px-3 py-2 text-center text-sm font-medium text-accent-strong transition-colors hover:bg-accent-dim hover:border-accent/60"
                  onClick={() => openEdit(day.date)}
                >
                  <Icon name="plus" size={14} className="inline mr-1.5 -mt-0.5" />
                  Add exercise to plan
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border border-dashed border-line bg-surface-2/40 px-4 py-3">
        <p className="text-[12px] text-ink-3">
          To log a different date, use the date picker in the workout log. Planned exercises are logged as real sets the first time you save a set for them.
        </p>
      </div>
    </div>
  )
}

interface PlanEditorProps {
  date: string
  plan: DayPlan | null
  onSave: (plan: DayPlan) => void
  onDelete: () => void
  onCancel: () => void
}

function PlanEditor({ date, plan, onSave, onDelete, onCancel }: PlanEditorProps) {
  const [name, setName] = useState(plan?.name ?? '')
  const [notes, setNotes] = useState(plan?.notes ?? '')
  const [exerciseIds, setExerciseIds] = useState<string[]>(plan?.exercises.map((e) => e.exerciseId) ?? [])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const addExercise = useCallback((exercise: Exercise) => {
    setExerciseIds((prev) => (prev.includes(exercise.id) ? prev : [...prev, exercise.id]))
    setPickerOpen(false)
  }, [])

  const removeExercise = useCallback((id: string) => {
    setExerciseIds((prev) => prev.filter((e) => e !== id))
  }, [])

  const [exercisesMap, setExercisesMap] = useState<Map<string, Exercise>>(new Map())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const all = await listExercises()
      if (!cancelled) {
        const map = new Map<string, Exercise>()
        for (const ex of all) map.set(ex.id, ex)
        setExercisesMap(map)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const orderedExercises = useMemo(() => {
    return exerciseIds
      .map((id) => exercisesMap.get(id))
      .filter((ex): ex is Exercise => ex != null)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [exerciseIds, exercisesMap])

  const commit = useCallback(() => {
    if (!name.trim()) return
    const planExercises: DayPlanExercise[] = exerciseIds.map((id, i) => ({
      id: newId(),
      planId: plan?.id ?? '',
      exerciseId: id,
      exerciseNameSnapshot: '',
      exerciseEquipmentSnapshot: null,
      exerciseEquipmentOptionsSnapshot: [],
      builtInSnapshot: false,
      order: i,
      notes: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }))
    onSave({
      id: plan?.id ?? newId(),
      date,
      dayOfWeek: weekdayOf(date),
      name: name.trim(),
      notes: notes.trim() || null,
      exercises: planExercises,
      createdAt: plan?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    })
  }, [date, name, notes, exerciseIds, plan])

  return (
    <BottomSheet open={true} onClose={onCancel} title={plan ? 'Edit plan' : 'New plan'} description={`${DAY_LABELS[weekdayOf(date)]} · ${formatShortDate(date)}`}>
      <>
        <TextField label="Plan name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push" autoFocus />
        <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-ink">Planned exercises</p>
            <Button variant="ghost" size="sm" onClick={() => setPickerOpen(true)}>
              <Icon name="plus" size={14} />
              Add exercise
            </Button>
          </div>
          {orderedExercises.length === 0 ? (
            <div className="mt-2 rounded-xl border-2 border-dashed border-accent/40 bg-accent-dim/30 px-3 py-3 text-center">
              <p className="text-[13px] font-medium text-accent-strong">No exercises planned yet</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setPickerOpen(true)}>
                <Icon name="plus" size={14} />
                Add exercise
              </Button>
            </div>
          ) : (
            <div className="mt-2 space-y-1">
              {orderedExercises.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between rounded-xl border border-line bg-surface-2/60 px-3 py-2">
                  <span className="text-sm text-ink">{ex.name}</span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-danger hover:bg-danger-dim" onClick={() => removeExercise(ex.id)} aria-label={`Remove ${ex.name}`}>
                    <Icon name="trash" size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          {plan && (
            <Button variant="danger" className="flex-1" onClick={() => setConfirmDelete(true)}>
              Remove plan
            </Button>
          )}
          <Button className="flex-1" onClick={commit} disabled={!name.trim()}>
            {plan ? 'Save plan' : 'Create plan'}
          </Button>
        </div>
        {plan && (
          <ConfirmDialog open={confirmDelete} title="Remove this plan?" description="This only removes the plan, not any logged exercises or sets." confirmLabel="Remove" tone="danger" onConfirm={() => { onDelete(); setConfirmDelete(false) }} onCancel={() => setConfirmDelete(false)} />
        )}
      </>
      <BottomSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add exercise to plan"
        description="Search or pick an exercise to add to this day's plan.">
        <ExercisePicker
          key={pickerOpen ? 'open' : 'closed'}
          onPick={addExercise}
          onBack={() => setPickerOpen(false)}
          onCreateCustom={(values) => {
            void createExercise(values).then((exercise) => {
              addExercise(exercise)
              setPickerOpen(false)
            })
          }}
        />
      </BottomSheet>
    </BottomSheet>
  )
}



interface EquipmentPickerProps {
  exercise: Exercise
  selected: string
  custom: string
  onSelectEquipment: (equipment: string) => void
  onCustomChange: (value: string) => void
  onConfirm: () => void
  onBack: () => void
}

function EquipmentPicker({
  exercise,
  selected,
  custom,
  onSelectEquipment,
  onCustomChange,
  onConfirm,
  onBack,
}: EquipmentPickerProps) {
  const useOther = selected === 'Other'

  return (
    <div className="space-y-4 max-h-[calc(100%-2rem)] overflow-y-auto overscroll-contain">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="dumbbell" size={16} className="text-ink-3" />
          <span className="text-sm font-medium text-ink">{exercise.name}</span>
          <span className="text-[12px] text-ink-3">({exercise.category})</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <Icon name="close" size={14} />
        </Button>
      </div>

      <p className="text-[13px] font-medium text-ink-3">Equipment</p>
      <div className="flex flex-wrap gap-1.5">
        {exercise.equipmentOptions.length > 0 ? (
          exercise.equipmentOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              className={cn(
                'rounded-xl border px-3 py-1.5 text-[13px] font-medium transition-colors',
                selected === opt
                  ? 'border-accent/40 bg-accent-dim text-accent-strong'
                  : 'border-line bg-surface-2 text-ink-3 hover:border-line-strong',
              )}
              onClick={() => onSelectEquipment(opt)}
            >
              {opt}
            </button>
          ))
        ) : (
          <button
            key="other"
            type="button"
            className={cn(
              'rounded-xl border px-3 py-1.5 text-[13px] font-medium transition-colors',
              useOther
                ? 'border-accent/40 bg-accent-dim text-accent-strong'
                : 'border-line bg-surface-2 text-ink-3 hover:border-line-strong',
            )}
            onClick={() => onSelectEquipment('Other')}
          >
            Other
          </button>
        )}
      </div>

      {useOther && (
        <TextField
          label="Custom equipment"
          value={custom}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="Plate-loaded machine"
          autoFocus
        />
      )}

      <Button className="w-full" onClick={onConfirm} disabled={!selected && !custom.trim()}>
        Add exercise
      </Button>
    </div>
  )
}

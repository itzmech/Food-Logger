import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { TextField, SelectField } from '@/components/ui/Field'
import { useHabits } from '@/hooks/useHabits'
import type { Habit, HabitSchedule } from '@/types/habit'
import { HABIT_SCHEDULE_LABELS } from '@/types/habit'
import { isHabitScheduledForDate } from '@/lib/habitCompletion'
import { formatLongDate, todayISO } from '@/utils/date'

const WEEKDAYS = [
  { day: 1, label: 'M' },
  { day: 2, label: 'T' },
  { day: 3, label: 'W' },
  { day: 4, label: 'T' },
  { day: 5, label: 'F' },
  { day: 6, label: 'S' },
  { day: 0, label: 'S' },
]

export default function HabitsPage() {
  const [date, setDate] = useState(todayISO())
  const { habits, todayLogs, loading, error, addHabit, updateHabit, toggleActive, markDone, markSkip, markNotDone } =
    useHabits({ date, includeArchived: true })
  const [editing, setEditing] = useState<Habit | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [schedule, setSchedule] = useState<HabitSchedule>('daily')
  const [customDays, setCustomDays] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const activeHabits = useMemo(
    () => habits.filter((habit) => habit.active && habit.category === 'habit').sort(byTitle),
    [habits],
  )
  const archivedHabits = useMemo(
    () => habits.filter((habit) => !habit.active && habit.category === 'habit').sort(byTitle),
    [habits],
  )
  const scheduledToday = activeHabits.filter((habit) => isHabitScheduledForDate(habit.schedule, habit.customDays, date))
  const logByHabit = new Map(todayLogs.map((log) => [log.habitId, log]))
  const completedCount = scheduledToday.filter((habit) => logByHabit.get(habit.id)?.status === 'completed').length

  const openForm = (habit?: Habit) => {
    setEditing(habit ?? null)
    setTitle(habit?.title ?? '')
    setDescription(habit?.description ?? '')
    setSchedule(habit?.schedule ?? 'daily')
    setCustomDays(habit?.customDays ?? [])
    setActionError(null)
    setFormOpen(true)
  }

  const saveHabit = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle || (schedule === 'custom' && customDays.length === 0)) return

    setSaving(true)
    setActionError(null)
    try {
      const details = {
        title: trimmedTitle,
        description: description.trim() || null,
        category: 'habit' as const,
        schedule,
        customDays: schedule === 'custom' ? customDays : [],
        goalValue: editing?.goalValue ?? null,
        color: editing?.color ?? '#22C55E',
      }
      if (editing) await updateHabit(editing.id, details)
      else await addHabit(details)
      setFormOpen(false)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not save this habit.')
    } finally {
      setSaving(false)
    }
  }

  const toggleLog = async (habit: Habit) => {
    const log = logByHabit.get(habit.id)
    try {
      setActionError(null)
      if (log?.status === 'completed') await markNotDone(habit.id, date)
      else await markDone(habit.id, date)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not update this habit.')
    }
  }

  const toggleSkip = async (habit: Habit) => {
    const log = logByHabit.get(habit.id)
    try {
      setActionError(null)
      if (log?.status === 'skipped') await markNotDone(habit.id, date)
      else await markSkip(habit.id, date)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not update this habit.')
    }
  }

  const archiveHabit = async (habit: Habit) => {
    try {
      setActionError(null)
      await toggleActive(habit.id)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not update this habit.')
    }
  }

  return (
    <div className="space-y-5 pb-4" data-section="habits">
      <PageHeader
        title="Habits"
        subtitle="Build a routine that fits your week."
        action={
          <Button onClick={() => openForm()} className="bg-habits text-[#052E16] hover:bg-[#16A34A]">
            <Icon name="plus" size={16} /> New habit
          </Button>
        }
      />

      {error ? <Notice message={`Habits could not be loaded: ${error.message}`} /> : null}
      {actionError ? <Notice message={actionError} /> : null}

      <Card className="border-habits/30 bg-[linear-gradient(115deg,#113322,#151F30_62%)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-habits">Today’s rhythm</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
              {completedCount}<span className="text-base font-medium text-ink-2"> / {scheduledToday.length}</span>
            </p>
            <p className="mt-1 text-sm text-ink-2">scheduled habits complete</p>
          </div>
          <label className="grid gap-1 text-xs font-medium text-ink-2">
            Day
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(event) => setDate(event.target.value)}
              className="min-h-11 rounded-xl border border-line-strong bg-base-raised px-3 text-base text-ink"
            />
          </label>
        </div>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">Your habits</h2>
          <span className="text-xs tabular-nums text-ink-2">{activeHabits.length} active</span>
        </div>
        {loading && habits.length === 0 ? (
          <Card className="text-sm text-ink-2">Loading habits…</Card>
        ) : activeHabits.length === 0 ? (
          <Card className="py-8 text-center">
            <Icon name="repeat" size={28} className="mx-auto text-habits" />
            <p className="mt-3 font-semibold">Start with one small habit</p>
            <p className="mt-1 text-sm text-ink-2">Create a schedule that works for you.</p>
          </Card>
        ) : scheduledToday.length === 0 ? (
          <Card className="text-sm text-ink-2">Nothing is scheduled for {formatLongDate(date)}.</Card>
        ) : (
          <div className="space-y-2">
            {scheduledToday.map((habit) => {
              const log = logByHabit.get(habit.id)
              const done = log?.status === 'completed'
              const skipped = log?.status === 'skipped'
              return (
                <Card key={habit.id} className="border-habits/20 bg-base-raised p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void toggleLog(habit)}
                      disabled={loading}
                      aria-label={`${done ? 'Mark incomplete' : 'Mark complete'}: ${habit.title}`}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${done ? 'border-habits bg-habits text-[#052E16]' : 'border-line-strong bg-surface text-transparent hover:border-habits'}`}
                    >
                      {done ? <Icon name="check" size={20} strokeWidth={2.5} /> : <Icon name="check" size={20} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${done ? 'text-ink-2 line-through' : 'text-ink'}`}>{habit.title}</p>
                      <p className="mt-0.5 text-xs text-ink-2">
                        {HABIT_SCHEDULE_LABELS[habit.schedule]}
                        {skipped ? ' · Skipped' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openForm(habit)}
                      aria-label={`Edit ${habit.title}`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2 hover:text-ink"
                    >
                      <Icon name="edit" size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleSkip(habit)}
                      className="min-h-11 rounded-xl border border-line px-3 text-xs font-semibold text-ink-2 hover:border-habits/50 hover:text-ink"
                    >
                      {skipped ? 'Undo skip' : 'Skip'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void archiveHabit(habit)}
                      aria-label={`Archive ${habit.title}`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-2 hover:bg-danger-dim hover:text-danger"
                    >
                      <Icon name="archive" size={17} />
                    </button>
                  </div>
                  {habit.description ? <p className="ml-14 mt-2 text-sm text-ink-2">{habit.description}</p> : null}
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {archivedHabits.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-heading text-sm font-semibold text-ink-2">Archived</h2>
          {archivedHabits.map((habit) => (
            <Card key={habit.id} className="flex items-center gap-3 p-3">
              <span className="min-w-0 flex-1 truncate text-sm text-ink-2">{habit.title}</span>
              <button
                type="button"
                onClick={() => void archiveHabit(habit)}
                className="min-h-11 rounded-xl border border-habits/30 px-3 text-xs font-semibold text-habits hover:bg-habits-dim"
              >
                Restore
              </button>
            </Card>
          ))}
        </section>
      ) : null}

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
          <Card className="w-full max-w-lg space-y-4 border-habits/40 bg-base-raised p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold">{editing ? 'Edit habit' : 'Create a habit'}</h2>
                <p className="mt-1 text-sm text-ink-2">Choose the days this habit should count.</p>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2">
                <Icon name="close" size={18} />
              </button>
            </div>
            <TextField label="Habit name" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} autoFocus />
            <TextField label="Description (optional)" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={160} />
            <SelectField label="Schedule" value={schedule} onChange={(event) => setSchedule(event.target.value as HabitSchedule)}>
              {Object.entries(HABIT_SCHEDULE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </SelectField>
            {schedule === 'custom' ? (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-ink">Repeat on</legend>
                <div className="grid grid-cols-7 gap-2">
                  {WEEKDAYS.map(({ day, label }, index) => {
                    const selected = customDays.includes(day)
                    return (
                      <button
                        key={`${day}-${index}`}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setCustomDays((current) => selected ? current.filter((item) => item !== day) : [...current, day].sort())}
                        className={`min-h-11 rounded-xl border text-sm font-semibold ${selected ? 'border-habits bg-habits-dim text-habits' : 'border-line bg-surface text-ink-2'}`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                {customDays.length === 0 ? <p className="mt-2 text-xs text-danger">Choose at least one day.</p> : null}
              </fieldset>
            ) : null}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-habits text-[#052E16] hover:bg-[#16A34A]"
                disabled={saving || !title.trim() || (schedule === 'custom' && customDays.length === 0)}
                onClick={() => void saveHabit()}
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create habit'}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

function byTitle(first: Habit, second: Habit): number {
  return first.title.localeCompare(second.title)
}

function Notice({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl border border-danger/40 bg-danger-dim px-3 py-2 text-sm text-danger">{message}</p>
}

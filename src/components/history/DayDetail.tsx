import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { MetricTile } from '@/components/ui/MetricTile'
import { buttonClasses } from '@/components/ui/Button'
import { Icon } from '@/components/icons'
import type { DailyHistorySummary } from '@/lib/history'
import { formatCalories, formatGrams, formatMinutes, formatNumber } from '@/utils/format'
import { formatLongDate, formatRelativeDay } from '@/utils/date'
import { CARDIO_TYPE_LABELS, formatReps } from '@/types'
import { Link } from 'react-router-dom'

export interface DayDetailProps {
  date: string
  day: DailyHistorySummary | null
}

export function DayDetail({ date, day }: DayDetailProps) {
  if (day == null) {
    return (
      <Card className="stagger">
        <SectionHeader title={formatLongDate(date)} />
        <div className="rounded-2xl border border-line bg-surface-2/60 px-4 py-6 text-center">
          <Icon name="calendar" size={24} strokeWidth={1.5} className="mx-auto mb-2 text-ink-3" />
          <p className="text-sm text-ink-3">Loading…</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="stagger">
      <SectionHeader
        title={formatLongDate(date)}
        description={formatRelativeDay(date)}
      />

      {day.hasPlannedOnly ? (
        <div className="rounded-xl border border-warning/40 bg-warning-dim/30 px-4 py-3">
          <p className="text-[13px] text-warning">
            This day had a planned workout but no logged activity — no sets were recorded.
          </p>
        </div>
      ) : null}

      {day.strengthLogs.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Strength training ({day.strengthLogExerciseCount} exercise{day.strengthLogExerciseCount === 1 ? '' : 's'} · {day.strengthLogSetCount} set{day.strengthLogSetCount === 1 ? '' : 's'})
          </p>
          <div className="mt-2 space-y-2">
            {day.strengthLogs.map((log) => (
              <div key={log.exerciseId} className="rounded-xl border border-line bg-surface p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{log.exerciseNameSnapshot}</p>
                    <p className="text-[12px] text-ink-3">
                      {log.exerciseEquipmentSnapshot ? `${log.exerciseEquipmentSnapshot}` : ''}
                      {log.exerciseEquipmentOptionsSnapshot.length > 1 ? ` · ${log.exerciseEquipmentOptionsSnapshot.length} options` : ''}
                      {log.builtInSnapshot ? ' · Built-in' : ''}
                      {log.skipped ? ' · Skipped' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    {log.totalVolume > 0 ? (
                      <span className="text-sm font-medium text-ink">{formatNumber(log.totalVolume)} kg volume</span>
                    ) : (
                      <span className="text-[12px] text-ink-3">No completed sets</span>
                    )}
                  </div>
                </div>
                {log.sets.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {log.sets.map((set) => (
                      <span key={set.setNumber} className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[12px] text-ink-2">
                        {set.setNumber}:{set.weight != null ? `${formatReps(set.weight)} kg` : ''}{set.weight != null && set.reps != null ? ' × ' : ''}{set.repsDisplay}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}


      <div className="stagger grid gap-3 sm:grid-cols-2">
        {/* Calories */}
        <MetricTile
          icon="flame"
          label="Calories"
          tone={day.caloriesConsumed > 0 ? 'accent' : 'muted'}
          value={day.caloriesConsumed > 0 ? formatCalories(day.caloriesConsumed) : '—'}
          target="—"
          hint={day.hasFood ? undefined : 'No food logged'}
          to="/food"
        />

        {/* Protein */}
        <MetricTile
          icon="zap"
          label="Protein"
          tone={day.proteinConsumed > 0 ? 'accent' : 'muted'}
          value={day.proteinConsumed > 0 ? formatGrams(day.proteinConsumed) : '—'}
          target="—"
          hint={day.hasFood ? undefined : 'No food logged'}
          to="/food"
        />

        {/* Workout */}
        <MetricTile
          icon="workout"
          label="Workout"
          tone={day.hasWorkout ? 'accent' : 'muted'}
          value={
            day.hasWorkout
              ? day.workoutName ?? (day.strengthLogExerciseCount > 0 ? `${day.strengthLogExerciseCount} strength exercise${day.strengthLogExerciseCount === 1 ? '' : 's'}` : 'Completed')
              : 'No workout'
          }
          hint={
            day.hasWorkout && day.workoutDurationMinutes != null
              ? formatMinutes(day.workoutDurationMinutes)
              : day.strengthLogs.length > 0
                ? `${day.strengthLogSetCount} set${day.strengthLogSetCount === 1 ? '' : 's'} logged`
                : undefined
          }
          to="/workout"
        />

        {/* Cardio */}
        <MetricTile
          icon="cardio"
          label="Cardio"
          tone={day.cardioSessionCount > 0 ? 'accent' : 'muted'}
          value={
            day.cardioSessionCount > 0
              ? formatMinutes(day.cardioMinutes)
              : 'No cardio'
          }
          hint={
            day.cardioSessionCount > 0
              ? day.cardioActivities.length > 0
                ? day.cardioActivities.map((t) => CARDIO_TYPE_LABELS[t]).join(', ')
                : `${day.cardioSessionCount} session${day.cardioSessionCount === 1 ? '' : 's'}`
              : undefined
          }
          to="/workout"
        />

        {/* Weight */}
        <MetricTile
          icon="scale"
          label="Weight"
          tone={day.hasWeightRecord ? 'accent' : 'muted'}
          value={
            day.hasWeightRecord
              ? `${formatNumber(day.weight!)} kg`
              : 'No weight recorded'
          }
          hint={day.hasWeightRecord ? undefined : 'Not logged this day'}
          to="/progress"
        />

        {/* Estimated activity calories */}
        <MetricTile
          icon="flame"
          label="Estimated activity calories"
          value={
            day.estimatedActivityCalories != null
              ? `~${formatCalories(day.estimatedActivityCalories)} kcal`
              : '—'
          }
          hint={
            day.estimatedActivityCalories != null
              ? 'Derived — not a measurement'
              : 'Not enough data to estimate'
          }
        />
      </div>

      {/* Empty-state honesty: list what's missing */}
      <div className="mt-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          This day's gaps
        </p>
        <ul className="mt-1.5 space-y-1">
          {!day.hasFood ? (
            <li className="flex items-center gap-2 text-[13px] text-ink-2">
              <Icon name="close" size={13} strokeWidth={2} className="text-ink-3" />
              No food logged
            </li>
          ) : null}
          {!day.hasWorkout ? (
            <li className="flex items-center gap-2 text-[13px] text-ink-2">
              <Icon name="close" size={13} strokeWidth={2} className="text-ink-3" />
              No workout
            </li>
          ) : null}
          {day.cardioSessionCount === 0 ? (
            <li className="flex items-center gap-2 text-[13px] text-ink-2">
              <Icon name="close" size={13} strokeWidth={2} className="text-ink-3" />
              No cardio
            </li>
          ) : null}
          {!day.hasWeightRecord ? (
            <li className="flex items-center gap-2 text-[13px] text-ink-2">
              <Icon name="close" size={13} strokeWidth={2} className="text-ink-3" />
              No weight recorded
            </li>
          ) : null}
          {day.hasFood && day.hasWorkout && day.cardioSessionCount > 0 && day.hasWeightRecord ? (
            <li className="flex items-center gap-2 text-[13px] text-success">
              <Icon name="check" size={13} strokeWidth={2.5} />
              Everything logged
            </li>
          ) : null}
        </ul>
      </div>

      {/* Food detail if any */}
      {day.foodEntryCount > 0 ? (
        <div className="mt-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Food entries ({day.foodEntryCount})
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
            {day.mealsWithLogs.length > 0 ? (
              day.mealsWithLogs.map((m) => (
                <span key={m} className="capitalize">
                  {m}
                </span>
              ))
            ) : (
              <span className="italic text-ink-3">See Food tab for details</span>
            )}
          </div>
        </div>
      ) : null}

      {/* Cardio detail if any */}
      {day.cardioSessionCount > 0 ? (
        <div className="mt-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Cardio sessions ({day.cardioSessionCount})
          </p>
          <p className="mt-1 text-[13px] text-ink-2">
            {formatMinutes(day.cardioMinutes)} total ·{' '}
            {day.cardioActivities.length > 0
              ? day.cardioActivities.map((t) => CARDIO_TYPE_LABELS[t]).join(', ')
              : 'see Workout tab for details'}
          </p>
          {day.estimatedActivityCalories != null ? (
            <p className="mt-1 text-[11px] text-ink-3">
              Estimated activity calories: ~{formatCalories(day.estimatedActivityCalories)} kcal — derived, not measured.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Weight + other measurements */}
      {day.hasWeightRecord || day.measurements.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Body measurements
          </p>
          <div className="mt-1.5 space-y-1 text-[13px] text-ink-2">
            {day.hasWeightRecord ? (
              <div className="flex items-center gap-2">
                <Icon name="scale" size={14} className="text-ink-3" />
                <span>Weight: {formatNumber(day.weight!)} kg</span>
              </div>
            ) : null}
            {day.measurements.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <Icon name="ruler" size={14} className="text-ink-3" />
                <span>
                  {m.type}: {formatNumber(m.value)} {m.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Navigate-away actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {}}
          className={buttonClasses('ghost', 'sm')}
        >
          <Icon name="chevron-left" size={14} />
          Back to month
        </button>
        {day.hasFood ? (
          <Link
            to="/food"
            className={buttonClasses('ghost', 'sm')}
          >
            View food logs
          </Link>
        ) : null}
        {day.hasWorkout ? (
          <Link
            to="/workout"
            className={buttonClasses('ghost', 'sm')}
          >
            View workout history
          </Link>
        ) : null}
      </div>
    </Card>
  )
}

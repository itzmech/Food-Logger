import { Icon } from '@/components/icons'
import type { CompletedWorkout, ExercisePR } from '@/types'
import { formatReps, estimated1RM } from '@/types'
import { formatMinutes, formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'

interface WorkoutSummaryProps {
  workout: CompletedWorkout
  prs: ExercisePR | null
  className?: string
}

export function WorkoutSummary({ workout, prs, className }: WorkoutSummaryProps) {
  const completedSetCount = workout.exerciseIds.length > 0 ? 0 : 0
  const totalVolume = workout.exerciseIds.reduce((total) => total, 0)
  const duration = workout.durationSeconds != null ? formatMinutes(workout.durationSeconds / 60) : '—'

  return (
    <div className={cn('space-y-4 rounded-3xl border border-line bg-surface p-5 sm:p-6', className)}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-dim text-accent-strong">
          <Icon name="check" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-ink">{workout.name}</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            Completed {new Date(workout.completedAt ?? '').toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Duration" value={duration} />
        <SummaryCard label="Exercises" value={String(workout.exerciseIds.length)} />
        <SummaryCard label="Completed sets" value={String(completedSetCount)} />
        <SummaryCard label="Total volume" value={totalVolume > 0 ? `${totalVolume} kg` : '—'} />
      </div>

      {prs && (prs.bestWeight != null || prs.bestVolume != null || prs.estimated1RM != null) ? (
        <div className="rounded-2xl border border-accent/30 bg-accent-dim p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-accent-strong">Personal records achieved</p>
          <div className="mt-2 space-y-2 text-sm text-ink">
            {prs.bestWeight != null ? (
              <RecordLine label="Heaviest lift" value={`${formatNumber(prs.bestWeight)} kg × ${formatReps(prs.bestRepsAtWeight)}`} />
            ) : null}
            {prs.bestVolume != null ? (
              <RecordLine label="Best volume" value={`${formatNumber(prs.bestVolume)} kg`} />
            ) : null}
            {prs.estimated1RM != null ? (
              <RecordLine label="Estimated 1RM" value={`${formatNumber(estimated1RM(prs.estimated1RM ?? 0, 1))} kg`} note="Estimated from completed sets" />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface-2 p-4 text-center text-[12px] text-ink-3">
          No personal records yet for this workout.
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{value}</p>
    </div>
  )
}

function RecordLine({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note?: string
}) {
  return (
    <div>
      <p className="text-[11px] text-ink-3">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-ink">{value}</p>
      {note ? <p className="text-[11px] text-ink-3">{note}</p> : null}
    </div>
  )
}

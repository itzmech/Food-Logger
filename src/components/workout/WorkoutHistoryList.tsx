import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/icons'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { WorkoutEmpty } from '@/components/ui/WorkoutEmpty'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import { formatShortDate } from '@/utils/date'
import { formatMinutes } from '@/utils/format'
import { cn } from '@/utils/cn'

export function WorkoutHistoryList() {
  const { workouts, loading, error, reload, remove } = useWorkoutHistory()

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Workout history"
        description="Real recorded sessions. Historical workouts keep their full snapshot."
        action={
          <Button variant="ghost" size="sm" onClick={() => reload()}>
            <Icon name="refresh" size={15} />
          </Button>
        }
      />

      {loading && workouts.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-1 w-28 rounded-full bg-surface-2 animate-pulse" />
        </div>
      ) : workouts.length === 0 ? (
        <WorkoutEmpty
          icon="clock"
          title="No workout history yet"
          message="Complete your first workout to start tracking progress."
        />
      ) : (
        <div className="space-y-2">
          {workouts.map((workout) => (
            <button
              key={workout.id}
              type="button"
              onClick={() => void remove(workout.id)}
              className={cn(
                'block w-full rounded-2xl border border-line bg-surface-2 p-4 text-left transition-colors hover:border-line-strong',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
              disabled={false}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[15px] font-semibold text-ink">{workout.name}</h3>
                    <span className="text-[12px] text-ink-3">{formatShortDate(workout.completedAtLocal)}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-ink-3">
                    {formatMinutes(workout.durationSeconds ?? 0)} · {workout.exerciseIds.length} exercises
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void remove(workout.id)}
                  className="shrink-0 h-8 w-8 p-0 text-danger hover:bg-danger-dim"
                  aria-label={`Delete ${workout.name}`}
                >
                  <Icon name="trash" size={16} />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-ink-3">
                <span>Completed sets: {workout.exerciseIds.length}</span>
                <span>Volume: {workout.exerciseIds.length} kg</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-[12px] text-danger">{error.message}</p>}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { StreakHero } from '@/components/dashboard/StreakHero'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useHabits } from '@/hooks/useHabits'
import { useStreaks } from '@/hooks/useStreaks'
import { useTasks } from '@/hooks/useTasks'
import { isHabitScheduledForDate } from '@/lib/habitCompletion'
import { streakTier, STREAK_TIER_COLORS } from '@/lib/streaks'
import type { StreakCategory, StreakResult } from '@/lib/streaks'
import type { Task, TaskPriority } from '@/types'
import { TASK_PRIORITY_LABELS } from '@/types'
import { formatLongDate, greetingForDate, todayISO } from '@/utils/date'

const CATEGORY_META: Record<StreakCategory, { label: string; color: string; icon: 'repeat' | 'dumbbell' | 'cardio' }> = {
  habit: { label: 'Habits', color: '#22C55E', icon: 'repeat' },
  gym: { label: 'Workout', color: '#3B82F6', icon: 'dumbbell' },
  cardio: { label: 'Cardio', color: '#22D3EE', icon: 'cardio' },
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  high: 'bg-[#FF4D4F]',
  medium: 'bg-[#F59E0B]',
  low: 'bg-[#22C55E]',
}

export default function DashboardPage() {
  const date = todayISO()
  const { summary, loading: summaryLoading, error: summaryError } = useDashboardData()
  const { habits, todayLogs, markDone, markNotDone, loading: habitsLoading, error: habitsError } = useHabits()
  const { today, toggleTask, loading: tasksLoading, error: tasksError } = useTasks()
  const { streaks, loading: streaksLoading, error: streaksError, skipDay, unskipDay } = useStreaks()
  const [actionError, setActionError] = useState<string | null>(null)

  const todayHabits = useMemo(
    () => habits.filter((habit) => habit.active && isHabitScheduledForDate(habit.schedule, habit.customDays, date)),
    [date, habits],
  )
  const logByHabit = useMemo(() => new Map(todayLogs.map((log) => [log.habitId, log])), [todayLogs])
  const streakByCategory = useMemo(
    () => new Map(streaks.map((streak) => [streak.category, streak])),
    [streaks],
  )
  const leader = streaks.reduce<StreakResult | undefined>(
    (best, streak) => !best || streak.current > best.current ? streak : best,
    undefined,
  )
  const pendingToday = today?.dueToday ?? []
  const completedToday = today?.completedToday ?? []
  const visibleTasks = [...pendingToday, ...completedToday].slice(0, 4)
  const taskTotal = pendingToday.length + completedToday.length
  const completedCount = completedToday.length
  const completedWorkout = summary?.today.workout.status === 'completed' || (summary?.today.activity.workoutsCompleted ?? 0) > 0
  const consistentDaysThisWeek = useMemo(() => {
    const from = summary?.week.from ?? date
    return new Set(
      streaks.flatMap((streak) =>
        streak.history
          .filter((day) => day.status === 'active' && day.date >= from)
          .map((day) => day.date),
      ),
    ).size
  }, [date, streaks, summary?.week.from])

  const runAction = async (action: () => Promise<void>) => {
    setActionError(null)
    try {
      await action()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not save your change.')
    }
  }

  const toggleHabit = (habitId: string) => {
    const log = logByHabit.get(habitId)
    return runAction(() => log?.status === 'completed' ? markNotDone(habitId, date) : markDone(habitId, date))
  }

  const toggleStreakSkip = (category: StreakCategory, streak?: StreakResult) =>
    runAction(async () => {
      if (streak?.history.some((day) => day.date === date && day.status === 'skipped')) {
        await unskipDay(category, date)
      } else {
        await skipDay(category, date)
      }
    })

  return (
    <div className="space-y-4 pb-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-[22px] font-bold leading-tight tracking-tight text-ink">
            {greetingForDate()}
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">{formatLongDate(date)}</p>
        </div>
      </header>

      {actionError ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger-dim px-3 py-2 text-sm text-danger">{actionError}</p> : null}
      {summaryError ? <ErrorNotice message={`Dashboard data could not be loaded: ${summaryError.message}`} /> : null}
      {streaksError ? <ErrorNotice message={`Streak data could not be loaded: ${streaksError.message}`} /> : null}
      {habitsError ? <ErrorNotice message={`Habit data could not be loaded: ${habitsError.message}`} /> : null}
      {tasksError ? <ErrorNotice message={`Task data could not be loaded: ${tasksError.message}`} /> : null}

      <section aria-label="Current streaks">
        <StreakHero
          days={leader?.current ?? 0}
          label={leader ? `${CATEGORY_META[leader.category].label} current streak` : 'Current streak'}
          categories={(['habit', 'gym', 'cardio'] as const).map((category) => ({
            label: CATEGORY_META[category].label,
            days: streakByCategory.get(category)?.current ?? 0,
            color: CATEGORY_META[category].color,
          }))}
          className="rounded-2xl border-white/[0.12] bg-surface px-4 py-4"
        />
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-ink-3">
          <span>{streaksLoading ? 'Updating streaks…' : 'Three independent category streaks'}</span>
          <Link to="/progress" className="flex min-h-11 items-center gap-1 font-medium text-ink-2">
            Streak history <Icon name="chevron-right" size={14} />
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-tasks/30 bg-surface">
        <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-3">
          <div className="flex items-baseline gap-2">
            <h2 className="font-heading text-[13px] font-semibold tracking-tight">Today’s tasks</h2>
            <span className="text-[11px] tabular-nums text-ink-3">{completedCount} of {taskTotal} done</span>
          </div>
          <Link to="/tasks" className="flex min-h-11 items-center gap-1 text-[11px] font-medium text-ink-2">
            All tasks <Icon name="chevron-right" size={14} />
          </Link>
        </div>
        {visibleTasks.length > 0 ? (
          <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {visibleTasks.map((task) => (
              <DashboardTaskRow
                key={task.id}
                task={task}
                busy={tasksLoading}
                onToggle={() => void runAction(async () => { await toggleTask(task.id) })}
              />
            ))}
          </div>
        ) : (
          <p className="border-t border-white/[0.06] px-3 py-4 text-[13px] text-ink-3">
            {tasksLoading ? 'Loading today’s tasks…' : 'Nothing scheduled for today.'}
          </p>
        )}
        {taskTotal > visibleTasks.length ? (
          <Link to="/tasks" className="block border-t border-white/[0.06] px-3 py-2.5 text-center text-xs font-medium text-ink-2">
            View all {taskTotal} today
          </Link>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <section className="flex flex-col rounded-2xl border border-habits/25 bg-base-raised p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-heading text-[13px] font-semibold">Habits</h2>
              <p className="mt-0.5 text-[11px] text-ink-3">
                {streakByCategory.get('habit')?.current ?? 0} day streak
              </p>
            </div>
            <Link to="/habits" className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-habits hover:bg-habits-dim">
              Manage <Icon name="chevron-right" size={14} />
            </Link>
          </div>
          <div className="my-3 flex justify-center">
            <ProgressRing
              value={todayHabits.length ? todayHabits.filter((habit) => logByHabit.get(habit.id)?.status === 'completed').length / todayHabits.length : 0}
              size={80}
              title="Habits today"
              subtitle={`${todayHabits.filter((habit) => logByHabit.get(habit.id)?.status === 'completed').length}/${todayHabits.length}`}
              color="#22C55E"
            />
          </div>
          {todayHabits.length ? (
            <div className="space-y-1">
              {todayHabits.map((habit) => {
                const log = logByHabit.get(habit.id)
                const done = log?.status === 'completed'
                return (
                  <button
                    key={habit.id}
                    type="button"
                    onClick={() => void toggleHabit(habit.id)}
                    disabled={habitsLoading}
                    aria-label={`${done ? 'Mark incomplete' : 'Mark complete'}: ${habit.title}`}
                    className="flex min-h-11 w-full items-center gap-2 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-habits-dim disabled:opacity-60"
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${done ? 'border-habits bg-habits text-[#052E16]' : 'border-line-strong text-transparent'}`}>
                      {done ? <Icon name="check" size={13} strokeWidth={2.5} /> : null}
                    </span>
                    <span className={`min-w-0 flex-1 truncate text-[12px] font-medium ${done ? 'text-ink-3 line-through' : 'text-ink-2'}`}>{habit.title}</span>
                    {log?.status === 'skipped' ? <span className="text-[10px] text-ink-3">Skipped</span> : null}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="py-2 text-center text-xs text-ink-3">{habitsLoading ? 'Loading habits…' : 'No habits scheduled today.'}</p>
          )}
        </section>

        <ActivityCard
          category="gym"
          streak={streakByCategory.get('gym')}
          completed={completedWorkout}
          summary={summary?.today.workout.name ?? (completedWorkout ? 'Workout completed' : 'No workout logged today')}
          detail={summary?.today.workout.durationMinutes != null ? `${summary.today.workout.durationMinutes} min` : `${summary?.today.activity.workoutsCompleted ?? 0} sessions today`}
          link="/workout"
          onSkip={() => void toggleStreakSkip('gym', streakByCategory.get('gym'))}
        />

        <ActivityCard
          category="cardio"
          streak={streakByCategory.get('cardio')}
          completed={(summary?.today.activity.cardioSessions ?? 0) > 0}
          summary={(summary?.today.cardioMinutes ?? 0) > 0 ? `${summary?.today.cardioMinutes} min logged` : 'No cardio logged today'}
          detail={`${summary?.today.activity.cardioSessions ?? 0} sessions · ${summary?.week.cardioMinutes ?? 0} min this week`}
          link="/cardio"
          onSkip={() => void toggleStreakSkip('cardio', streakByCategory.get('cardio'))}
        />

        <section className="rounded-2xl border border-line bg-surface p-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-[13px] font-semibold">This week</h2>
              <p className="mt-0.5 text-[11px] text-ink-3">{summary?.week.from ?? '—'} to {summary?.week.to ?? date}</p>
            </div>
            <Link to="/workout" className="flex min-h-11 items-center gap-1 text-xs font-medium text-ink-2">
              Workout log <Icon name="chevron-right" size={14} />
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <WeeklyMetric label="Training days" value={summary?.week.workouts ?? 0} icon="dumbbell" color="#3B82F6" />
            <WeeklyMetric label="Cardio minutes" value={summary?.week.cardioMinutes ?? 0} icon="cardio" color="#22D3EE" />
            <WeeklyMetric label="Days consistent" value={consistentDaysThisWeek} icon="activity" color="#22C55E" />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/[0.06] bg-surface p-3">
        <h2 className="font-heading text-[12px] font-semibold">Streak aura</h2>
        <p className="mt-0.5 text-[11px] text-ink-3">A visual milestone only; it never changes your streak count.</p>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {([
            { name: 'Silver', range: '0–6', days: 0 },
            { name: 'Blue', range: '7–13', days: 7 },
            { name: 'Purple', range: '14–29', days: 14 },
            { name: 'Gold', range: '30+', days: 30 },
          ] as const).map((tier) => (
            <div
              key={tier.name}
              className="rounded-lg border border-white/[0.06] px-1.5 py-2 text-center"
              style={{ borderColor: streakTier(leader?.current ?? 0) === streakTier(tier.days) ? STREAK_TIER_COLORS[streakTier(tier.days)] : undefined }}
            >
              <p className="text-[10px] font-semibold" style={{ color: STREAK_TIER_COLORS[streakTier(tier.days)] }}>{tier.name}</p>
              <p className="mt-0.5 text-[9px] text-ink-3">{tier.range}</p>
            </div>
          ))}
        </div>
      </section>

      {summaryLoading ? <p className="text-center text-[11px] text-ink-3">Updating today’s summary…</p> : null}
    </div>
  )
}

function DashboardTaskRow({ task, busy, onToggle }: { task: Task; busy: boolean; onToggle: () => void }) {
  const done = task.status === 'completed'
  return (
    <div className="flex min-h-12 items-center gap-2.5 px-3 py-2">
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        aria-label={`${done ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${done ? 'border-success/50 bg-success-dim text-success' : 'border-line-strong text-transparent'}`}
      >
        {done ? <Icon name="check" size={15} strokeWidth={2.5} /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[12px] font-medium ${done ? 'text-ink-3 line-through' : 'text-ink'}`}>{task.title}</p>
        {task.dueDate ? <p className="mt-0.5 text-[10px] text-ink-3">Due {task.dueDate}</p> : null}
      </div>
      <span className="sr-only">{TASK_PRIORITY_LABELS[task.priority]} priority</span>
      <span aria-label={`${TASK_PRIORITY_LABELS[task.priority]} priority`} className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
    </div>
  )
}

function ActivityCard({
  category,
  streak,
  completed,
  summary,
  detail,
  link,
  onSkip,
}: {
  category: 'gym' | 'cardio'
  streak?: StreakResult
  completed: boolean
  summary: string
  detail: string
  link: string
  onSkip: () => void
}) {
  const meta = CATEGORY_META[category]
  const skipped = streak?.history.some((day) => day.date === todayISO() && day.status === 'skipped') ?? false
  return (
    <section
      className="flex flex-col rounded-2xl border bg-base-raised p-3"
      style={{ borderColor: `${meta.color}55` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-[13px] font-semibold">{meta.label}</h2>
          <p className="mt-0.5 text-[11px] text-ink-3">{streak?.current ?? 0} day streak</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${meta.color}22`, color: meta.color }}>
          <Icon name={meta.icon} size={16} />
        </span>
      </div>
      <div className="my-3 flex min-h-14 items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-[12px] font-bold tabular-nums" style={{ color: meta.color }}>
          {category === 'gym' ? (completed ? 1 : 0) : summary.match(/^\d+/)?.[0] ?? 0}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold">{summary}</p>
          <p className="mt-0.5 text-[10px] text-ink-3">{detail}</p>
        </div>
      </div>
      <Link to={link} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold hover:bg-surface-2" style={{ borderColor: `${meta.color}70`, color: meta.color }}>
        <Icon name="plus" size={14} /> {category === 'gym' ? 'Open workout' : 'Log cardio'}
      </Link>
      {!completed || skipped ? (
        <button type="button" onClick={onSkip} className="mt-1 flex min-h-11 items-center justify-center gap-1.5 text-[11px] font-medium text-ink-3 hover:text-ink-2">
          <Icon name={skipped ? 'repeat' : 'skip-forward'} size={13} /> {skipped ? 'Undo skip' : 'Skip today'}
        </button>
      ) : (
        <span className="mt-1 flex min-h-11 items-center justify-center gap-1.5 text-[11px] font-medium text-success">
          <Icon name="check-circle" size={14} /> Done today
        </span>
      )}
    </section>
  )
}

function WeeklyMetric({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number
  icon: 'dumbbell' | 'cardio' | 'activity'
  color: string
}) {
  return (
    <div className="rounded-xl bg-base-raised p-2.5">
      <span className="flex items-center gap-1.5 text-[10px] text-ink-3">
        <Icon name={icon} size={13} style={{ color }} /> {label}
      </span>
      <p className="mt-1 text-[16px] font-bold tabular-nums text-ink">{value}</p>
    </div>
  )
}

function ErrorNotice({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl border border-danger/30 bg-danger-dim px-3 py-2 text-sm text-danger">{message}</p>
}

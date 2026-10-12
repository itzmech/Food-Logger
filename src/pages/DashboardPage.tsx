import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { MetricTile } from '@/components/ui/MetricTile'
import { StatTile } from '@/components/ui/StatTile'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { buttonClasses } from '@/components/ui/Button'
import { ComingSoon } from '@/components/ui/ComingSoon'
import { DashboardFoodCard } from '@/components/food/DashboardFoodCard'
import { DashboardTasksCard } from '@/components/dashboard/DashboardTasksCard'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useSettings } from '@/hooks/useSettings'
import { useGoals } from '@/hooks/useGoals'
import { formatCalories, formatGrams, formatMinutes, formatNumber, formatWeightChange } from '@/utils/format'
import { formatShortDate, greetingForDate, parseISODate, todayISO } from '@/utils/date'
import { weightPreviousDateLabel } from '@/lib/summary'
import {
  DEFAULT_JOURNEY_WEEKS,
  WEEKDAY_MIN,
} from '@/lib/constants'

/**
 * Dashboard phase 1: real data shape, honest empty states.
 * Every number comes from IndexedDB via useDashboardData — nothing fake.
 */
export default function DashboardPage() {
  const { summary, loading } = useDashboardData()
  const { settings } = useSettings()
  const { goal } = useGoals()

  const displayName = settings?.name?.trim() || 'there'
  const journeyWeeks = goal?.weeks ?? DEFAULT_JOURNEY_WEEKS
  const subtitle = goal
    ? `${journeyWeeks}-week journey · Week ${Math.min(
        journeyWeeks,
        Math.max(
          1,
          Math.floor(
            (parseISODate(todayISO()).getTime() - parseISODate(goal.startDate).getTime()) /
              (7 * 86_400_000),
          ) + 1,
        ),
      )}`
    : `${journeyWeeks}-week journey · no goal set yet`

  if (loading && !summary) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    )
  }

  const s = summary

  return (
    <div className="space-y-6">
      {/* Greeting ---------------------------------------------------- */}
      <PageHeader
        title={`${greetingForDate()}, ${displayName}`}
        subtitle={subtitle}
        action={
          goal ? null : (
            <Link to="/settings" className={buttonClasses('primary', 'sm')}>
              Set goal
            </Link>
          )
        }
      />

      {/* Today's tasks — most actionable, first */}
      <DashboardTasksCard tasks={s?.tasks ?? { dueToday: [], overdue: [], upcoming: [], completedToday: [], allPending: [] }} loading={loading} />

      {/* Today's nutrition */}
      <DashboardFoodCard />

      {/* Today's activity */}
      <section className="space-y-3">
        <SectionHeader title="Today's activity" />
        <div className="stagger grid grid-cols-2 gap-3">
          <MetricTile
            icon="flame"
            label="Calories"
            tone="accent"
            value={s ? formatCalories(s.today.calories) : '0'}
            target={goal?.dailyCalories ? `/ ${formatCalories(goal.dailyCalories)}` : '/ no target'}
            progress={goal?.dailyCalories && s ? Math.min(s.today.calories / goal.dailyCalories, 1) : null}
            hint={goal?.dailyCalories ? undefined : 'Set a daily calorie target in Settings → Goals.'}
            to="/food"
          />
          <MetricTile
            icon="zap"
            label="Protein"
            tone="accent"
            value={s ? formatGrams(s.today.proteinG) : '0g'}
            target={goal?.dailyProteinG ? `/ ${formatGrams(goal.dailyProteinG)}` : '/ no target'}
            progress={goal?.dailyProteinG && s ? Math.min(s.today.proteinG / goal.dailyProteinG, 1) : null}
            hint={goal?.dailyProteinG ? undefined : 'Set a protein target in Settings → Goals.'}
            to="/food"
          />
          <MetricTile
            icon="workout"
            label="Workout"
            value={s?.today.workout.name ? s.today.workout.name : s?.today.workout.status === 'completed' ? 'Completed' : 'Not logged'}
            hint={s?.today.workout.name ? s.today.workout.durationMinutes ? `${formatMinutes(s.today.workout.durationMinutes)}` : undefined : 'No workout recorded yet. Start one from the Workout tab.'}
            to="/workout"
          />
          <MetricTile
            icon="cardio"
            label="Cardio"
            value={s ? formatMinutes(s.today.cardioMinutes) : '0 min'}
            hint={s && s.today.cardioMinutes > 0 ? undefined : 'No cardio logged today. Sessions will appear here.'}
            to="/workout"
          />
        </div>

        {s && (s.today.activity.loggedActivities > 0 || s.today.activity.estimatedCalories != null) ? (
          <Card className="stagger">
            <div className="flex divide-x divide-line">
              <StatTile label="Cardio" value={formatMinutes(s.today.activity.cardioMinutes)} suffix={`${s.today.activity.cardioSessions} ${s.today.activity.cardioSessions === 1 ? 'session' : 'sessions'}`} />
              <StatTile label="Workouts" value={formatNumber(s.today.activity.workoutsCompleted)} />
              <StatTile label="Activities logged" value={formatNumber(s.today.activity.loggedActivities)} />
              <StatTile label="Est. calories" value={s.today.activity.estimatedCalories != null ? `~${formatCalories(s.today.activity.estimatedCalories)} kcal` : '—'} />
            </div>
            {s.today.activity.estimatedCalories != null ? (
              <p className="mt-3 border-t border-line pt-3 text-[12px] text-ink-3">
                Estimated activity calories are derived from activity type, duration, your weight and any distance/speed/incline — rounded, never measured.
              </p>
            ) : (
              <p className="mt-3 border-t border-line pt-3 text-[12px] text-ink-3">
                Log your weight to enable calorie estimates for today's activity.
              </p>
            )}
          </Card>
        ) : null}
      </section>

      {/* Weight & progress */}
      <section className="space-y-3">
        <SectionHeader title="Weight & progress" />
        <Card>
          {s?.weight.latestKg != null ? (
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-dim">
                <Icon name="scale" size={24} className="text-accent-strong" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Latest weight</p>
                <p className="mt-1 text-[24px] font-semibold text-ink tabular-nums">{formatNumber(s.weight.latestKg)} kg</p>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  {s.weight.latestDate ? `Last recorded ${formatShortDate(s.weight.latestDate)}` : ''}
                </p>
                {s.weight.previousChangeKg != null ? (
                  <p className="mt-2 flex items-center gap-2">
                    <span className={s.weight.previousChangeKg <= 0 ? 'text-success' : 'text-warning'}>
                      {s.weight.previousChangeKg <= 0 ? '↓' : '↑'}
                      {formatWeightChange(Math.abs(s.weight.previousChangeKg))}
                    </span>
                    <span className="text-[12px] text-ink-3">
                      from {s.weight.previousDate ? weightPreviousDateLabel(s.weight.previousDate) : 'previous entry'}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <EmptyState
              icon="scale"
              title="No weight logged yet"
              message="Set your starting weight in Goals to begin tracking. Your latest weight will appear here with a trend."
              compact
            />
          )}
        </Card>
      </section>

      {/* Daily activity summary -------------------------------------- */}
      {s && (s.today.activity.loggedActivities > 0 || s.today.activity.estimatedCalories != null) ? (
        <section className="space-y-3">
          <SectionHeader title="Today's activity" />
          <Card className="stagger">
            <div className="flex divide-x divide-line">
              <StatTile
                label="Cardio"
                value={formatMinutes(s.today.activity.cardioMinutes)}
                suffix={`${s.today.activity.cardioSessions} ${s.today.activity.cardioSessions === 1 ? 'session' : 'sessions'}`}
              />
              <StatTile
                label="Workouts"
                value={formatNumber(s.today.activity.workoutsCompleted)}
              />
              <StatTile
                label="Activities logged"
                value={formatNumber(s.today.activity.loggedActivities)}
              />
              <StatTile
                label="Est. calories"
                value={
                  s.today.activity.estimatedCalories != null
                    ? `~${formatCalories(s.today.activity.estimatedCalories)} kcal`
                    : '—'
                }
              />
            </div>
            {s.today.activity.estimatedCalories != null ? (
              <p className="mt-3 border-t border-line pt-3 text-[12px] text-ink-3">
                Estimated activity calories are derived from activity type,
                duration, your weight and any distance/speed/incline —
                rounded, never measured.
              </p>
            ) : (
              <p className="mt-3 border-t border-line pt-3 text-[12px] text-ink-3">
                Log your weight to enable calorie estimates for today's
                activity.
              </p>
            )}
          </Card>
        </section>
      ) : null}

      {/* Today's food ------------------------------------------------- */}
      <DashboardFoodCard />

      {/* Weekly summary ---------------------------------------------- */}
      <section className="space-y-3">
        <SectionHeader title="Weekly summary" />
        <Card className="stagger">
          <div className="flex divide-x divide-line">
            <StatTile
              label="Workouts"
              value={s ? formatNumber(s.week.workouts) : '0'}
              suffix={goal?.weeklyWorkouts ? `/ ${goal.weeklyWorkouts}` : '/ goal'}
              tone={s && goal?.weeklyWorkouts && s.week.workouts >= goal.weeklyWorkouts ? 'success' : 'default'}
            />
            <StatTile
              label="Cardio"
              value={s ? formatMinutes(s.week.cardioMinutes) : '0 min'}
            />
            <StatTile
              label="Weight change"
              value={
                s?.week.weightChangeKg != null ? formatWeightChange(s.week.weightChangeKg) : '—'
              }
              tone={
                s?.week.weightChangeKg == null
                  ? 'default'
                  : s.week.weightChangeKg <= 0
                    ? 'success'
                    : 'warning'
              }
            />
          </div>
          {s ? (
            <p className="mt-3 border-t border-line pt-3 text-[12px] text-ink-3">
              {s.week.weightBaseline === 'journey' && s.week.weightChangeKg != null
                ? 'Compared with your starting weight.'
                : s.week.weightChangeKg != null
                  ? 'Compared with the start of this week.'
                  : 'Log your weight twice in a week to see change.'}
            </p>
          ) : null}
        </Card>
      </section>

      {/* Streak ------------------------------------------------------- */}
      <section className="space-y-3">
        <SectionHeader
          title="Consistency"
          action={
            s && s.streak.lastActiveDate ? (
              <span className="text-[12px] text-ink-3">
                Last active {formatShortDate(s.streak.lastActiveDate)}
              </span>
            ) : null
          }
        />
        <Card className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-dim">
            <span className="text-xl font-bold text-accent-strong tabular-nums">
              {s ? s.streak.days : 0}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              {s && s.streak.days > 0 ? 'day streak — keep it going' : 'No active streak yet'}
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-ink-3">
              A day counts when you log food, complete a workout or add cardio.
            </p>
          </div>
        </Card>

        {/* This week's day dots */}
        {s ? (
          <Card>
            <div className="flex items-center justify-between gap-1.5">
              {weekDays(s.week.from, s.date).map((iso, index) => {
                const active = s.week.activeDays.includes(iso)
                const isToday = iso === s.date
                return (
                  <div key={iso} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-ink-3">
                      {WEEKDAY_MIN[index]}
                    </span>
                    <span
                      className={
                        active
                          ? 'flex h-7 w-7 items-center justify-center rounded-full bg-accent-dim text-accent-strong'
                          : isToday
                            ? 'flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-3'
                            : 'flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-ink-3/50'
                      }
                    >
                      {active ? <Icon name="check" size={13} strokeWidth={2.5} /> : null}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-[12px] text-ink-3">
              {s.week.activeDays.length === 0
                ? 'No active days this week yet — log something to fill a dot.'
                : `${s.week.activeDays.length} active ${s.week.activeDays.length === 1 ? 'day' : 'days'} this week.`}
            </p>
          </Card>
        ) : null}
      </section>

      {/* Forward pointer --------------------------------------------- */}
      <ComingSoon
        icon="bar-chart"
        title="Charts & long-term trends"
        description="Weight, calorie and protein charts arrive in a later phase. The Progress tab already shows the right empty states."
      />
    </div>
  )
}

/** Ordered day keys from the week start up to today (inclusive). */
function weekDays(weekStart: string, today: string): string[] {
  const days: string[] = []
  const cursor = parseISODate(weekStart)
  const end = parseISODate(today)
  while (cursor <= end && days.length < 7) {
    days.push(
      [
        cursor.getFullYear(),
        String(cursor.getMonth() + 1).padStart(2, '0'),
        String(cursor.getDate()).padStart(2, '0'),
      ].join('-'),
    )
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

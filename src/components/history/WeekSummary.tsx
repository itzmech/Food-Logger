import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { StatTile } from '@/components/ui/StatTile'
import { formatCalories, formatGrams, formatMinutes, formatNumber } from '@/utils/format'
import { formatShortDate } from '@/utils/date'
import type { DailyHistorySummary } from '@/lib/history'

export interface WeekSummaryProps {
  weekStart: string
  days: DailyHistorySummary[]
}
export function WeekSummary({ weekStart, days }: WeekSummaryProps) {
  const week = computeWeekSummary(days, weekStart)

  return (
    <Card className="stagger">
      <SectionHeader title="This week" description={`${formatShortDate(week.from)} – ${formatShortDate(week.to)}`} />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <StatTile
          label="Food logged"
          value={`${week.foodDaysCount}/${week.totalDays}`}
          suffix="days with food"
          tone={week.foodDaysCount === week.totalDays ? 'success' : 'default'}
        />
        <StatTile
          label="Workouts"
          value={formatNumber(week.workoutCount)}
          suffix="completed"
        />
        <StatTile
          label="Cardio sessions"
          value={formatNumber(week.cardioSessionCount)}
        />
        <StatTile
          label="Cardio time"
          value={formatMinutes(week.cardioMinutes)}
        />
        <StatTile
          label="Weight records"
          value={formatNumber(week.weightRecordCount)}
          suffix="this week"
        />
        <StatTile
          label="Avg. calories"
          value={
            week.avgCaloriesOnLoggedDays != null
              ? formatCalories(week.avgCaloriesOnLoggedDays)
              : '—'
          }
          suffix="on logged days"
        />
        <StatTile
          label="Avg. protein"
          value={
            week.avgProteinOnLoggedDays != null
              ? formatGrams(week.avgProteinOnLoggedDays)
              : '—'
          }
          suffix="on logged days"
        />
      </div>

      {/* Consistency line (clearly defined: days with food / total days) */}
      <div className="mt-3 rounded-xl border border-line bg-surface-2/60 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Consistency
        </p>
        <p className="mt-1 text-[13px] text-ink-2">
          Food logging: {week.foodDaysCount} of {week.totalDays} days this week had
          food logged.
          {week.foodDaysCount === week.totalDays ? (
            <span className="ml-1 text-success">Every day covered.</span>
          ) : null}
        </p>
        <p className="mt-1 text-[13px] text-ink-2">
          Workouts: {week.workoutCount} completed session{week.workoutCount === 1 ? '' : 's'} this week.
        </p>
      </div>
    </Card>
  )
}

function computeWeekSummary(days: DailyHistorySummary[], weekStart: string): {
  from: string
  to: string
  foodDaysCount: number
  totalDays: number
  workoutCount: number
  cardioSessionCount: number
  cardioMinutes: number
  weightRecordCount: number
  avgCaloriesOnLoggedDays: number | null
  avgProteinOnLoggedDays: number | null
} {
  let foodDaysCount = 0
  let caloriesSum = 0
  let proteinSum = 0
  let workoutCount = 0
  let cardioSessionCount = 0
  let cardioMinutes = 0
  let weightRecordCount = 0

  const from = days[0]?.date ?? weekStart
  const to = days[days.length - 1]?.date ?? weekStart

  for (const d of days) {
    if (d.hasFood) {
      foodDaysCount++
      caloriesSum += d.caloriesConsumed
      proteinSum += d.proteinConsumed
    }
    workoutCount += d.hasWorkout ? 1 : 0
    cardioSessionCount += d.cardioSessionCount
    cardioMinutes += d.cardioMinutes
    if (d.hasWeightRecord) weightRecordCount++
  }

  return {
    from,
    to,
    foodDaysCount,
    totalDays: days.length,
    workoutCount,
    cardioSessionCount,
    cardioMinutes,
    weightRecordCount,
    avgCaloriesOnLoggedDays:
      foodDaysCount > 0 ? Math.round(caloriesSum / foodDaysCount) : null,
    avgProteinOnLoggedDays:
      foodDaysCount > 0 ? Math.round(proteinSum / foodDaysCount) : null,
  }
}

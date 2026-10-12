import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { ComingSoon } from '@/components/ui/ComingSoon'
import { TrendChart } from '@/components/charts/TrendChart'
import { WeightLogger } from '@/components/progress/WeightLogger'
import { useGoals } from '@/hooks/useGoals'
import { useSettings } from '@/hooks/useSettings'
import { startOfWeek, todayISO } from '@/utils/date'

/**
 * Progress phase 1.
 *
 * The Recharts pipeline is fully wired (see TrendChart) — later phases only
 * supply data. Until then each chart renders its empty state, because there
 * is genuinely nothing to plot yet.
 */
export default function ProgressPage() {
  const { goal } = useGoals()
  const { settings } = useSettings()
  const weekStart = startOfWeek(todayISO(), settings?.weekStartsOn ?? 1)

  const chartEmpty = goal
    ? 'Log your weight from Settings → Goals (or directly on this page once measurement logging arrives) and the trend will draw itself.'
    : 'Set a goal with your starting weight first — then every log builds the trend line.'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress"
        subtitle={
          goal
            ? `${goal.weeks}-week journey · started ${goal.startDate}`
            : 'Charts fill in as you log data'
        }
      />

      <SectionCard
        title="Weight chart"
        description="Daily weigh-ins across your journey."
      >
        <TrendChart
          data={[]}
          unit="kg"
          height={200}
          emptyIcon="scale"
          emptyTitle="No weight data yet."
          emptyMessage={chartEmpty}
        />
      </SectionCard>

      <SectionCard
        title="Calories chart"
        description="Daily intake vs your target."
      >
        <TrendChart
          data={[]}
          unit="kcal"
          height={180}
          color="#fbbf24"
          emptyIcon="flame"
          emptyTitle="No calorie data yet."
          emptyMessage="Once you log meals on the Food tab, daily totals appear here across the week and month."
        />
      </SectionCard>

      <SectionCard
        title="Protein chart"
        description="Daily protein vs your target."
      >
        <TrendChart
          data={[]}
          unit="g"
          height={180}
          color="#34d399"
          emptyIcon="zap"
          emptyTitle="No protein data yet."
          emptyMessage="Protein totals come from your food logs — nothing to chart until the first meal is logged."
        />
      </SectionCard>

      <SectionCard
        title="Weight"
        description="Readings feed the calorie estimates and the weight trend."
      >
        <WeightLogger />
      </SectionCard>

      <SectionCard
        title="Measurements"
        description="Waist, chest, arms and other body metrics."
      >
        <div className="space-y-3">
          <ComingSoon
            icon="ruler"
            title="Other body measurements"
            description="Waist and other metrics — one record per metric per day — will feed the charts automatically."
          />
          {goal?.targetWaistCm ? (
            <p className="rounded-xl border border-line bg-surface-2/60 px-3.5 py-3 text-[13px] text-ink-2">
              Target waist from your goal:{' '}
              <span className="font-semibold text-ink">{goal.targetWaistCm} cm</span>
            </p>
          ) : null}
          <p className="text-[12px] text-ink-3">
            This week started {weekStart}. Measurements logged during the week will show here.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Progress photos"
        description="Same pose, same lighting, every week."
      >
        <div className="space-y-3">
          <ComingSoon
            icon="camera"
            title="Photo timeline"
            description="Photos will be stored locally in IndexedDB — they never leave your device — and lined up by date and pose."
          />
          <p className="text-[12px] text-ink-3">
            Tip: pick a weekly slot (e.g. Sunday morning) and stick to the same three poses.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}

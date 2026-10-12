import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/icons'
import { useCardio } from '@/hooks/useCardio'
import { useLatestWeight } from '@/hooks/useLatestWeight'
import { CARDIO_TYPE_LABELS } from '@/types'
import type { CardioSession } from '@/types'
import { estimateSessionCalories } from '@/lib/activityEstimate'
import { formatShortDate, todayISO } from '@/utils/date'
import { formatCalories, formatMinutes, formatNumber } from '@/utils/format'

/**
 * Recent cardio sessions (today first).
 *
 * Every calorie figure here is a DERIVED estimate, always
 * labeled as such with its basis. Manually-entered calories
 * (when a device import supplies them) are shown separately
 * from estimates — the two never mix.
 */
export function CardioHistoryList() {
  const { sessions, loading, error, remove } = useCardio()
  const { weight } = useLatestWeight()
  const [deleting, setDeleting] = useState<CardioSession | null>(null)

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">
            Recent cardio
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-3">
            Last 14 days. Estimates update if your weight changes.
          </p>
        </div>
        {!weight ? (
          <span className="shrink-0 rounded-lg bg-surface-2 px-2 py-1 text-[11px] text-ink-3">
            No weight — no estimates yet
          </span>
        ) : null}
      </div>

      {loading && sessions.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-1 w-28 animate-pulse rounded-full bg-surface-2" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon="cardio"
          compact
          title="No cardio logged yet"
          message="Log your first session above — activity and duration are all you need."
        />
      ) : (
        <div className="mt-3 space-y-2">
          {sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              weightKg={weight?.value ?? null}
              onDelete={() => setDeleting(session)}
            />
          ))}
        </div>
      )}

      {error ? (
        <p className="mt-3 text-[12px] text-danger">{error.message}</p>
      ) : null}

      <ConfirmDialog
        open={deleting != null}
        title="Delete session?"
        description={
          deleting
            ? `${CARDIO_TYPE_LABELS[deleting.type]} · ${formatMinutes(
                deleting.durationMinutes,
              )} on ${formatShortDate(deleting.date)} will be removed.`
            : undefined
        }
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => {
          if (deleting) await remove(deleting.id)
          setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      />
    </Card>
  )
}

function SessionRow({
  session,
  weightKg,
  onDelete,
}: {
  session: CardioSession
  weightKg: number | null
  onDelete: () => void
}) {
  const estimate = estimateSessionCalories(session, weightKg)
  const details: string[] = []
  if (session.distanceKm != null) details.push(`${formatNumber(session.distanceKm)} km`)
  if (session.speedKmh != null) details.push(`${formatNumber(session.speedKmh)} km/h`)
  if (session.inclinePercent != null && session.inclinePercent > 0)
    details.push(`${formatNumber(session.inclinePercent)}% incline`)
  if (session.avgHeartRate != null)
    details.push(`${Math.round(session.avgHeartRate)} bpm`)

  const isToday = session.date === todayISO()

  return (
    <div className="rounded-xl border border-line bg-surface-2/60 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-ink">
              {CARDIO_TYPE_LABELS[session.type]}
            </p>
            <span className="text-[12px] text-ink-3">
              {isToday ? 'Today' : formatShortDate(session.date)}
            </span>
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-3">
              {session.source === 'imported' ? 'Imported' : 'Manual'}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-ink-2">
            {formatMinutes(session.durationMinutes)}
            {details.length > 0 ? ` · ${details.join(' · ')}` : ''}
          </p>
          {session.note ? (
            <p className="mt-0.5 text-[12px] text-ink-3">{session.note}</p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 shrink-0 p-0 text-danger hover:bg-danger-dim"
          aria-label={`Delete ${CARDIO_TYPE_LABELS[session.type]} session`}
        >
          <Icon name="trash" size={15} />
        </Button>
      </div>

      {/* Calorie provenance: estimate vs. user/device-entered value. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {estimate ? (
          <span className="text-[12px] text-ink-3">
            <span className="font-medium text-ink-2">Estimated calories</span>{' '}
            ~{formatCalories(estimate.calories)} kcal
            <span className="text-ink-3"> ({estimate.basis})</span>
          </span>
        ) : (
          <span className="text-[12px] italic text-ink-3">
            No calorie estimate — add duration/weight data
          </span>
        )}
        {session.caloriesBurned != null ? (
          <span className="rounded-md bg-accent-dim px-1.5 py-0.5 text-[11px] font-medium text-accent-strong">
            Entered: {formatCalories(session.caloriesBurned)} kcal
          </span>
        ) : null}
      </div>
    </div>
  )
}

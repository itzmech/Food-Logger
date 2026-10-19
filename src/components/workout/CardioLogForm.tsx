import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { NumberField, SelectField, TextField } from '@/components/ui/Field'
import { Icon } from '@/components/icons'
import { useCardio } from '@/hooks/useCardio'
import { useLatestWeight } from '@/hooks/useLatestWeight'
import { CARDIO_TYPE_LABELS } from '@/types'
import type { CardioType } from '@/types'
import { estimateActivityCalories } from '@/lib/activityEstimate'
import { todayISO } from '@/utils/date'
import { formatCalories } from '@/utils/format'

/**
 * Cardio logging.
 *
 * The ONLY required inputs are the activity and the duration —
 * everything else is optional context that refines the estimate.
 * Calories are NEVER entered here: an estimate (clearly labeled)
 * is derived on the fly from activity, duration, body weight and
 * the optional distance/speed/incline, and is never stored.
 */
export function CardioLogForm() {
  const { add } = useCardio()
  const { weight } = useLatestWeight()

  const [type, setType] = useState<CardioType>('walk')
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [speed, setSpeed] = useState('')
  const [incline, setIncline] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedEstimate, setSavedEstimate] = useState<number | null>(null)

  const durationMinutes = parsePositive(duration)
  const distanceKm = parsePositive(distance)
  const speedKmh = parsePositive(speed)
  const inclinePercent = parseNumber(incline)

  // Live preview — derived, never persisted. Hidden when there is
  // not enough information (no duration, or no body weight yet).
  const estimate = useMemo(
    () =>
      estimateActivityCalories(
        {
          activity: type,
          durationMinutes,
          distanceKm,
          speedKmh,
          inclinePercent,
        },
        weight?.value ?? null,
      ),
    [type, durationMinutes, distanceKm, speedKmh, inclinePercent, weight],
  )

  const canSave = durationMinutes != null && durationMinutes > 0

  const handleSubmit = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setError(null)
    try {
      await add({
        date: todayISO(),
        type,
        durationMinutes,
        distanceKm,
        speedKmh,
        inclinePercent,
        note,
      })
      setDuration('')
      setDistance('')
      setSpeed('')
      setIncline('')
      setNote('')
      setSavedEstimate(estimate ? estimate.calories : null)
      window.setTimeout(() => setSavedEstimate(null), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the session.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold text-ink">Log cardio</h3>
      <p className="mt-0.5 text-[13px] text-ink-3">
        Only activity and duration are required. Calories are estimated — never
        typed in.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Activity"
          value={type}
          onChange={(e) => setType(e.target.value as CardioType)}
        >
          {(Object.keys(CARDIO_TYPE_LABELS) as CardioType[]).map((key) => (
            <option key={key} value={key}>
              {CARDIO_TYPE_LABELS[key]}
            </option>
          ))}
        </SelectField>
        <NumberField
          label="Duration"
          suffix="min"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="e.g. 30"
          min={0}
          step={1}
          error={
            duration !== '' && durationMinutes == null
              ? 'Enter a number of minutes.'
              : undefined
          }
        />
        <NumberField
          label="Distance"
          suffix="km"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          placeholder="Optional"
          min={0}
          step={0.1}
        />
        <NumberField
          label="Speed"
          suffix="km/h"
          value={speed}
          onChange={(e) => setSpeed(e.target.value)}
          placeholder="Optional"
          min={0}
          step={0.1}
          hint="Auto-derived from distance ÷ time if you skip."
        />
        <NumberField
          label="Incline"
          suffix="%"
          value={incline}
          onChange={(e) => setIncline(e.target.value)}
          placeholder="Optional"
          min={0}
          step={0.5}
        />
        <TextField
          label="Notes"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional"
        />
      </div>

      {/* Derived estimate — clearly labeled, never stored. */}
      <div className="mt-4 rounded-xl border border-line bg-surface-2/60 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Estimated calories
        </p>
        {estimate ? (
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="text-[20px] font-semibold tabular-nums text-ink">
              ~{formatCalories(estimate.calories)} kcal
            </span>
            <span className="text-[12px] text-ink-3">{estimate.basis}</span>
          </div>
        ) : weight ? (
          <p className="mt-1 text-[13px] text-ink-3">
            Enter a duration to see the estimate.
          </p>
        ) : (
          <p className="mt-1 text-[13px] text-ink-3">
            Log your weight (Progress tab) to get calorie estimates — it never
            blocks cardio logging.
          </p>
        )}
        {estimate ? (
          <p className="mt-1 text-[11px] text-ink-3">
            Rough MET-based estimate, rounded to 5 kcal. Not a measurement.
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[12px] text-danger">
          {error}
        </p>
      ) : null}
      {savedEstimate != null ? (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-success">
          <Icon name="check" size={13} strokeWidth={2.5} />
          Session saved — estimated {formatCalories(savedEstimate)} kcal.
        </p>
      ) : null}

      <Button
        className="mt-4 w-full"
        onClick={() => void handleSubmit()}
        disabled={!canSave || saving}
      >
        {saving ? 'Saving…' : 'Save session'}
      </Button>
    </Card>
  )
}

function parsePositive(raw: string): number | null {
  const value = parseNumber(raw)
  return value != null && value > 0 ? value : null
}

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

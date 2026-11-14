import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { NumberField, SelectField, TextField } from '@/components/ui/Field'
import { useCardio } from '@/hooks/useCardio'
import { CARDIO_TYPE_LABELS } from '@/types'
import type { CardioType } from '@/types'
import { todayISO } from '@/utils/date'

/** Cardio logging with activity and duration as the required inputs. */
export function CardioLogForm() {
  const { add } = useCardio()

  const [type, setType] = useState<CardioType>('walk')
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [speed, setSpeed] = useState('')
  const [incline, setIncline] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const durationMinutes = parsePositive(duration)
  const distanceKm = parsePositive(distance)
  const speedKmh = parsePositive(speed)
  const inclinePercent = parseNumber(incline)

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the session.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-cardio/35 bg-base-raised p-5">
      <h3 className="text-[15px] font-semibold text-ink">Log cardio</h3>
      <p className="mt-0.5 text-[13px] text-ink-2">
        Record the activity and duration. Distance and notes are optional.
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

      {error ? (
        <p role="alert" className="mt-3 text-[12px] text-danger">
          {error}
        </p>
      ) : null}
      <Button
        className="mt-4 w-full bg-cardio text-[#083344] hover:bg-[#06B6D4]"
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

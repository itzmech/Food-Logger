import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/icons'
import { NumberField, TextField } from '@/components/ui/Field'
import { useMeasurements } from '@/hooks/useMeasurements'
import { todayISO } from '@/utils/date'
import { formatNumber } from '@/utils/format'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { BodyMeasurement } from '@/types'

/**
 * Weight logging — the one measurement that activity calorie
 * estimates depend on. Deliberately tiny: value + optional note.
 * A missing weight never blocks anything; it just disables
 * estimates until the first reading exists.
 */
export function WeightLogger() {
  const { measurements, loading, error, add, remove } = useMeasurements('weight')
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<BodyMeasurement | null>(null)

  const weightKg = parsePositiveNumber(value)

  const handleSave = async () => {
    if (weightKg == null || saving) return
    setSaving(true)
    setFormError(null)
    try {
      await add({ date: todayISO(), type: 'weight', value: weightKg, unit: 'kg', note })
      setValue('')
      setNote('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the reading.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <h3 className="text-[15px] font-semibold text-ink">Log weight</h3>
        <p className="mt-0.5 text-[13px] text-ink-3">
          Used for calorie estimates and the weight trend. One reading
          per day is plenty.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Weight"
            suffix="kg"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 72.5"
            min={0}
            step={0.1}
            error={
              value !== '' && weightKg == null ? 'Enter a number in kg.' : undefined
            }
          />
          <TextField
            label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional"
          />
        </div>
        {formError ? (
          <p role="alert" className="mt-3 text-[12px] text-danger">
            {formError}
          </p>
        ) : null}
        <Button
          className="mt-3 w-full"
          onClick={() => void handleSave()}
          disabled={weightKg == null || saving}
        >
          {saving ? 'Saving…' : 'Save reading'}
        </Button>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <h3 className="text-[15px] font-semibold text-ink">Recent readings</h3>
        {loading && measurements.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-1 w-28 animate-pulse rounded-full bg-surface-2" />
          </div>
        ) : measurements.length === 0 ? (
          <EmptyState
            icon="scale"
            compact
            title="No weight readings yet"
            message="Your first reading enables calorie estimates on the Dashboard and Workout tabs."
          />
        ) : (
          <div className="mt-2 space-y-1.5">
            {measurements.slice(0, 10).map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/60 px-3 py-2"
              >
                <Icon name="scale" size={14} />
                <span className="flex-1 text-sm font-medium tabular-nums text-ink">
                  {formatNumber(row.value)} kg
                </span>
                <span className="text-[12px] text-ink-3">{row.date}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleting(row)}
                  className="h-7 w-7 p-0 text-danger hover:bg-danger-dim"
                  aria-label={`Delete weight reading from ${row.date}`}
                >
                  <Icon name="trash" size={13} />
                </Button>
              </div>
            ))}
          </div>
        )}
        {error ? (
          <p className="mt-2 text-[12px] text-danger">{error.message}</p>
        ) : null}
      </div>

      <ConfirmDialog
        open={deleting != null}
        title="Delete reading?"
        description={
          deleting
            ? `${formatNumber(deleting.value)} kg on ${deleting.date} will be removed. Estimates will update.`
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
    </div>
  )
}

function parsePositiveNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) && value > 0 ? value : null
}

import { useState, useRef } from 'react'
import { Icon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { TextField } from '@/components/ui/Field'
import { MEAL_LABELS } from '@/types'
import type { MenuItem, MenuOverrideKind, MenuOverride } from '@/types'
import { cn } from '@/utils/cn'

export interface OverrideSheetProps {
  open: boolean
  onClose: () => void
  date: string
  mealType: string
  /** Existing override for this day+meal, if any. */
  existingOverride: MenuOverride | null
  /** Read-only base items for this day+meal (published menu). */
  baseItems: MenuItem[]
  onApply: (kind: MenuOverrideKind, items: MenuItem[], reason: string | null) => void
}

/** Sheet for applying a corrective override to a day + meal.

Three kinds:
 - replace: swap the whole bucket (used for cancel/replace)
 - add: append new items
 - remove: list item ids to drop
 */
export function OverrideSheet({
  open,
  onClose,
  date,
  mealType,
  existingOverride,
  baseItems,
  onApply,
}: OverrideSheetProps) {
  const [kind, setKind] = useState<MenuOverrideKind>(existingOverride?.kind ?? 'replace')
  const [items, setItems] = useState<MenuItem[]>(existingOverride?.items ?? baseItems)
  const [reason, setReason] = useState(existingOverride?.reason ?? '')
  const applyInFlight = useRef(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleApply = () => {
    if (applyInFlight.current) return
    if (kind === 'remove' && items.length === 0) {
      setError('Select at least one item to remove')
      return
    }
    applyInFlight.current = true
    setBusy(true)
    setError(null)
    onApply(kind, items, reason.trim() || null)
    onClose()
    applyInFlight.current = false
  }

  const handleAddItem = () => {
    const next = [...items, { id: 'temp', name: '', foodId: null, calories: null, proteinG: null, carbsG: null, fatG: null, isVeg: true, note: null, status: 'available' as const, at: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
    setItems(next)
  }

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id))
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Override · ${date} · ${MEAL_LABELS[mealType as keyof typeof MEAL_LABELS] ?? mealType}`}
      description={existingOverride ? 'Editing an existing correction' : 'Create a correction that does not disturb the published menu'}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {(['replace', 'add', 'remove'] as MenuOverrideKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                'rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors',
                kind === k
                  ? 'border-accent/50 bg-accent-dim text-accent-strong'
                  : 'border-line bg-surface-2 text-ink-3 hover:border-accent/30',
              )}
            >
              {k}
            </button>
          ))}
        </div>

        {kind === 'replace' || kind === 'add' ? (
          <div className="space-y-2">
            <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">Items</p>
            {items.length === 0 ? (
              <p className="text-[12px] text-ink-3">No items</p>
            ) : (
              <div className="space-y-1">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/50 px-3 py-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const next = items.map((i) => i.id === item.id ? { ...i, name: e.target.value } : i)
                        setItems(next)
                      }}
                      className="flex-1 bg-transparent text-sm text-ink"
                      placeholder="Item name"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-ink-3 hover:text-danger"
                      aria-label={`Remove ${item.name}`}
                    >
                      <span className="sr-only">Remove</span>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button size="sm" variant="secondary" onClick={handleAddItem}>
              <Icon name="plus" size={14} />
              Add item
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">Select items to remove</p>
            {baseItems.filter((i) => i.status !== 'cancelled').map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/50 px-3 py-2 cursor-pointer touch-target"
              >
                <input
                  type="checkbox"
                  checked={items.some((i) => i.id === item.id)}
                  onChange={() => {
                    const next = items.some((i) => i.id === item.id)
                      ? items.filter((i) => i.id !== item.id)
                      : [...items, item]
                    setItems(next)
                  }}
                  className="h-4 w-4 rounded border-line bg-surface-2 text-accent"
                />
                <span className="text-sm text-ink-2">{item.name}</span>
              </label>
            ))}
            {baseItems.filter((i) => i.status !== 'cancelled').length === 0 ? (
              <p className="text-[12px] text-ink-3">No items to remove</p>
            ) : null}
          </div>
        )}

        {kind !== 'remove' ? (
          <p className="text-[12px] text-ink-3">
            {kind === 'replace'
              ? `Replaces the ${baseItems.length > 0 ? 'published' : 'empty'} meal with ${items.length} item(s)`
              : `Adds ${items.length} additional item(s)`}
          </p>
        ) : null}
        {kind === 'remove' && items.length > 0 && items.every((i) => i.id) ? (
          <p className="text-[12px] text-ink-3">
            Removing {items.length} item(s) from the published meal.
          </p>
        ) : null}

        <TextField
          label="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Hostel changed the plan"
        />

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={busy}>
            {busy ? 'Saving…' : 'Apply override'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}

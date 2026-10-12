import { useMemo, useState } from 'react'
import { Icon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { TextField } from '@/components/ui/Field'
import { FoodForm } from '@/components/food/FoodForm'
import { perBaseLabel, searchFoods } from '@/lib/nutrition'
import { useFoodActions } from '@/components/food/foodActionsContext'
import { useFoods } from '@/hooks/useFoods'
import type { Food } from '@/types'
import { FOOD_CATEGORY_LABELS } from '@/types'

export interface FoodDatabaseSheetProps {
  open: boolean
  onClose: () => void
  /** Called after any database change so the owner can refresh. */
  onChanged: () => void
}

type Panel =
  | { name: 'list' }
  | { name: 'edit'; food: Food }
  | { name: 'create' }

/**
 * Manage the personal food database: search, edit, delete, favourite and
 * remove sample data. Editing or deleting a food never touches logged meals.
 */
export function FoodDatabaseSheet({ open, onClose, onChanged }: FoodDatabaseSheetProps) {
  const actions = useFoodActions()
  const { foods } = useFoods()
  const [panel, setPanel] = useState<Panel>({ name: 'list' })
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Food | null>(null)
  const [confirmSeeds, setConfirmSeeds] = useState(false)

  const results = useMemo(() => searchFoods(foods, query, 100), [foods, query])
  const seedCount = useMemo(() => foods.filter((food) => food.source === 'seed').length, [foods])

  const refresh = () => {
    onChanged()
  }

  const handleToggleFavorite = async (food: Food) => {
    setBusy(true)
    try {
      await actions.updateFood(food.id, { isFavorite: !food.isFavorite })
      refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (food: Food) => {
    setBusy(true)
    setError(null)
    try {
      await actions.deleteFood(food.id)
      setConfirmDelete(null)
      setPanel({ name: 'list' })
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this food.')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteSeeds = async () => {
    setBusy(true)
    setError(null)
    try {
      await actions.deleteSeedFoods()
      setConfirmSeeds(false)
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove sample foods.')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveEdit = async (draft: Parameters<typeof actions.updateFood>[1]) => {
    if (panel.name !== 'edit') return
    setBusy(true)
    setError(null)
    try {
      await actions.updateFood(panel.food.id, draft)
      setPanel({ name: 'list' })
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this food.')
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = async (draft: Parameters<typeof actions.createFood>[0]) => {
    setBusy(true)
    setError(null)
    try {
      await actions.createFood(draft)
      setPanel({ name: 'list' })
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this food.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <BottomSheet
        open={open}
        onClose={() => {
          setPanel({ name: 'list' })
          setQuery('')
          onClose()
        }}
        title={panel.name === 'edit' ? 'Edit food' : panel.name === 'create' ? 'New food' : 'Food database'}
        description={
          panel.name === 'list'
            ? `${foods.length} ${foods.length === 1 ? 'food' : 'foods'} saved on this device`
            : undefined
        }
      >
        {panel.name === 'list' ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <TextField
                  label="Search"
                  placeholder="Filter foods…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <Button size="sm" className="mb-[2px] mt-auto" onClick={() => setPanel({ name: 'create' })}>
                <Icon name="plus" size={15} />
                New
              </Button>
            </div>

            {seedCount > 0 ? (
              <button
                type="button"
                onClick={() => setConfirmSeeds(true)}
                className="flex w-full items-center justify-between rounded-xl border border-warning/25 bg-warning-dim px-3 py-2.5 text-left"
              >
                <span className="text-[13px] text-warning">
                  {seedCount} sample {seedCount === 1 ? 'food' : 'foods'} from the demo pack
                </span>
                <span className="text-[12px] font-medium text-warning">Remove</span>
              </button>
            ) : null}

            {results.length === 0 ? (
              <EmptyState
                compact
                icon="database"
                title={query.trim() === '' ? 'No saved foods yet.' : 'Nothing matches that search.'}
                message="Create a food you eat regularly for faster logging."
                action={
                  <Button size="sm" onClick={() => setPanel({ name: 'create' })}>
                    Create a food
                  </Button>
                }
              />
            ) : (
              <div className="space-y-1.5">
                {results.map((food) => (
                  <div
                    key={food.id}
                    className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => setPanel({ name: 'edit', food })}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-ink">{food.name}</p>
                        {food.isFavorite ? (
                          <Icon name="star" size={12} className="shrink-0 text-warning" />
                        ) : null}
                        {food.source === 'seed' ? (
                          <Badge tone="neutral" className="shrink-0">
                            sample
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-[12px] text-ink-3">
                        {perBaseLabel(food)} · {FOOD_CATEGORY_LABELS[food.category]}
                      </p>
                    </button>
                    <IconButton
                      icon="star"
                      size="sm"
                      label={food.isFavorite ? 'Unfavourite' : 'Favourite'}
                      className={food.isFavorite ? 'text-warning' : undefined}
                      onClick={() => void handleToggleFavorite(food)}
                      disabled={busy}
                    />
                    <IconButton
                      icon="trash"
                      size="sm"
                      tone="danger"
                      label={`Delete ${food.name}`}
                      onClick={() => setConfirmDelete(food)}
                      disabled={busy}
                    />
                  </div>
                ))}
              </div>
            )}

            {error ? <p className="text-[13px] text-danger">{error}</p> : null}
            <p className="text-[11px] leading-relaxed text-ink-3">
              Editing or deleting a food never changes meals you already logged — entries keep
              their own nutrition snapshot.
            </p>
          </div>
        ) : null}

        {panel.name === 'edit' ? (
          <FoodForm
            food={panel.food}
            busy={busy}
            error={error}
            submitLabel="Save changes"
            onSubmit={(draft) => void handleSaveEdit(draft)}
            onBack={() => setPanel({ name: 'list' })}
          />
        ) : null}

        {panel.name === 'create' ? (
          <FoodForm
            busy={busy}
            error={error}
            submitLabel="Save to database"
            onSubmit={(draft) => void handleCreate(draft)}
            onBack={() => setPanel({ name: 'list' })}
          />
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={confirmDelete != null}
        tone="danger"
        title={`Delete ${confirmDelete?.name ?? 'this food'}?`}
        description="It disappears from search and Quick Add. Meals already logged keep their recorded values."
        confirmLabel="Delete food"
        cancelLabel="Keep"
        busy={busy}
        onConfirm={() => confirmDelete && void handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={confirmSeeds}
        tone="danger"
        title="Remove sample foods?"
        description={`${seedCount} demo ${seedCount === 1 ? 'food' : 'foods'} will be deleted. Meals you logged with them are not affected.`}
        confirmLabel="Remove samples"
        cancelLabel="Keep"
        busy={busy}
        onConfirm={() => void handleDeleteSeeds()}
        onCancel={() => setConfirmSeeds(false)}
      />
    </>
  )
}

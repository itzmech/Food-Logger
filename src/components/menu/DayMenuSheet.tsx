import { useState } from 'react'
import { Icon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { MEAL_LABELS, MEAL_TYPES } from '@/types'
import type { MenuItem, MenuDay, MenuOverride, MealType } from '@/types'
import { formatCalories } from '@/utils/format'
import { cn } from '@/utils/cn'

export interface DayMenuSheetProps {
  day: MenuDay
  date: string
  open: boolean
  onAddItem: (mealType: MealType) => void
  onCancelItem: (item: MenuItem) => void
  onRestoreItem: (item: MenuItem) => void
  onRemoveItem: (item: MenuItem) => void
  onClose: () => void
  onOverrideApplied: (date: string, mealType: MealType, override: MenuOverride) => void
  onOverrideDeleted: (id: string, date: string, mealType: MealType) => void
  overrides: MenuOverride[]
}

export function DayMenuSheet({
  day,
  date,
  open,
  onClose,
  onAddItem,
  onCancelItem,
  onRestoreItem,
  onRemoveItem,
  onOverrideApplied,
  onOverrideDeleted,
  overrides,
}: DayMenuSheetProps) {
  const [applying, setApplying] = useState<{
    date: string
    mealType: MealType
    override: MenuOverride
  } | null>(null)
  const [removing, setRemoving] = useState<{ overrideId: string; mealType: MealType } | null>(null)

  const meals = day.meals ?? {}

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={'Menu ' + date}
        description={day.note ?? undefined}
      >
        {Object.keys(meals).length === 0 ? (
          <EmptyState
            compact
            icon='menu'
            title='No meals published'
            message='This day has no published menu. Tap a meal above to start adding items.'
            action={
              <Button size='sm' onClick={() => void onAddItem('breakfast')}>
                Add breakfast
              </Button>
            }
          />
        ) : (
          <div className='space-y-5'>
            {MEAL_TYPES.map((mealType) => {
              const items = meals[mealType] ?? []
              const mealItems = items.filter((i) => i.status !== 'cancelled')
              const cancelledItems = items.filter((i) => i.status === 'cancelled')

              return (
                <section key={mealType} className='overflow-hidden rounded-2xl border border-line bg-surface'>
                  <div className='flex items-center gap-2 px-4 py-3'>
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                        mealItems.length > 0 ? 'bg-accent-dim text-accent-strong' : 'bg-surface-2 text-ink-3',
                      )}
                    >
                      <Icon name='food' size={14} />
                    </span>
                    <span className='text-sm font-semibold text-ink'>{MEAL_LABELS[mealType]}</span>
                    <span className='text-[11px] text-ink-3'>
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </span>
                    {cancelledItems.length > 0 ? (
                      <Badge tone='danger' className='ml-auto'>
                        {cancelledItems.length} cancelled
                      </Badge>
                    ) : null}
                  </div>

                  {mealItems.length > 0 ? (
                    <ul className='divide-y divide-line px-3 py-2'>
                      {mealItems.map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          onCancel={onCancelItem}
                          onRestore={onRestoreItem}
                          onRemove={onRemoveItem}
                        />
                      ))}
                    </ul>
                  ) : null}

                  {cancelledItems.length > 0 ? (
                    <ul className='space-y-1 px-3 pb-3 pt-1'>
                      {cancelledItems.map((item) => (
                        <li
                          key={item.id}
                          className='flex items-center justify-between gap-2 rounded-xl bg-surface-2/60 px-3 py-2'
                        >
                          <div className='min-w-0 flex-1'>
                            <p className='truncate text-sm text-ink-3'>{item.name}</p>
                            {item.note ? <p className='truncate text-[12px] text-ink-3'>{item.note}</p> : null}
                            <p className='text-[11px] text-ink-3'>
                              {formatCalories(item.calories ?? 0)} kcal
                            </p>
                          </div>
                          <Badge tone='danger'>cancelled</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {mealItems.length === 0 && cancelledItems.length === 0 ? (
                    <p className='px-3 py-3 text-center text-[12px] text-ink-3'>No items yet</p>
                  ) : null}
                </section>
              )
            })}

            <div className='border-t border-line'>
              <div className='flex items-center justify-between px-4 py-3'>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold text-ink'>Overrides</p>
                  <p className='text-[12px] text-ink-3'>
                    Corrections that do not change published menu
                  </p>
                </div>
          <div className='flex gap-1'>
            {MEAL_TYPES.slice(0, 3).map((mt) => (
              <button
                key={mt}
                type='button'
                onClick={() => void onAddItem(mt)}
                className='flex-1 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-[11px] font-medium text-ink-3 transition-colors hover:border-accent/40 hover:text-accent-strong'
              >
                {MEAL_LABELS[mt]}
              </button>
            ))}
            <button
              type='button'
              onClick={() => void onAddItem('outside')}
              className='flex-1 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-[11px] font-medium text-ink-3 transition-colors hover:border-accent/40 hover:text-accent-strong'
            >
              Outside
            </button>
          </div>
              </div>
              <div className='space-y-2 px-4 pb-4'>
                {overrides.map((override) => (
                  <div
                    key={override.id}
                    className='flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/50 px-3 py-2'
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-medium text-ink-2'>{override.reason ?? 'Unnamed override'}</p>
                      <p className='text-[12px] text-ink-3'>
                        {override.kind} · {MEAL_LABELS[override.mealType]} · {formatCalories(override.items.reduce((sum, i) => sum + (i.calories ?? 0), 0))} kcal
                      </p>
                    </div>
                    <Button size='sm' variant='ghost' onClick={() => setRemoving({ overrideId: override.id, mealType: override.mealType })}>
                      Delete
                    </Button>
                  </div>
                ))}
                {overrides.length === 0 ? (
                  <p className='px-3 py-2 text-[12px] text-ink-3'>No overrides yet</p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {applying ? (
          <div className='flex items-center gap-2 pt-2'>
            <span className='h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent' />
            <span className='text-sm text-ink-3'>Saving...</span>
          </div>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={applying !== null}
        title='Save override?'
        description='This correction will modify the resolved menu for this day without changing the published menu.'
        confirmLabel='Save'
        cancelLabel='Cancel'
        onConfirm={() => {
          if (!applying) return
          void onOverrideApplied(applying.date, applying.mealType, applying.override)
          setApplying(null)
        }}
        onCancel={() => setApplying(null)}
      />

      <ConfirmDialog
        open={removing?.overrideId != null}
        title='Delete override?'
        description='This override will be removed. The original published menu is unaffected.'
        confirmLabel='Delete'
        cancelLabel='Cancel'
        onConfirm={() => {
          if (!removing) return
          void onOverrideDeleted(removing.overrideId, date, removing.mealType)
          setRemoving(null)
        }}
        onCancel={() => setRemoving(null)}
      />
    </>
  )
}

function ItemRow({
  item,
  onCancel,
  onRestore,
  onRemove,
}: {
  item: MenuItem
  onCancel: (item: MenuItem) => void
  onRestore: (item: MenuItem) => void
  onRemove: (item: MenuItem) => void
}) {
  return (
    <div className='flex items-center justify-between gap-2 py-2'>
      <div className='flex min-w-0 flex-1 items-center gap-2'>
        <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-lg', item.status === 'available' ? 'bg-accent-dim text-accent-strong' : 'bg-surface-2 text-ink-3')}>
          <Icon name='check' size={14} />
        </span>
        <div className='min-w-0 flex-1'>
          <p className={cn('truncate text-sm font-medium text-ink', item.status === 'cancelled' && 'text-ink-3 line-through')}>{item.name}</p>
          {item.foodId ? (
            <p className='text-[11px] text-ink-3'>Linked food: {item.foodId}</p>
          ) : null}
          {item.calories != null ? (
            <p className='text-[11px] text-ink-3 tabular-nums'>{formatCalories(item.calories)} kcal</p>
          ) : null}
          {item.note ? <p className='truncate text-[12px] text-ink-3'>{item.note}</p> : null}
        </div>
      </div>
      <div className='flex shrink-0 items-center gap-1'>
        {item.status === 'available' ? (
          <Button size='sm' variant='danger' onClick={() => onCancel(item)}>
            <Icon name='close' size={14} />
            Cancel
          </Button>
        ) : (
          <Button size='sm' variant='secondary' onClick={() => onRestore(item)}>
            <Icon name='check' size={14} />
            Restore
          </Button>
        )}
        <Button size='sm' variant='ghost' onClick={() => onRemove(item)}>
          <Icon name='trash' size={14} />
        </Button>
      </div>
    </div>
  )
}

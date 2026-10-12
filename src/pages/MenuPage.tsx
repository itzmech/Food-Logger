import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { InfoNote } from '@/components/ui/InfoNote'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MenuCalendar } from '@/components/menu/MenuCalendar'
import { MenuMonthNav } from '@/components/menu/MenuMonthNav'
import { AddMonthSheet } from '@/components/menu/AddMonthSheet'
import { CopyMonthSheet } from '@/components/menu/CopyMonthSheet'
import { DayMenuSheet } from '@/components/menu/DayMenuSheet'
import { OverrideSheet } from '@/components/menu/OverrideSheet'
import { ItemEditModal } from '@/components/menu/ItemEditModal'
import { useMenus } from '@/hooks/useMenu'
import type { MessMenu, MenuItem, MealType, MenuOverride } from '@/types'
import { monthLabel } from '@/utils/date'

export default function MenuPage() {
  const {
    menus,
    loading,
    currentMonth,
    setCurrentMonth,
    currentMenu,
    reload,
    createMonth,
    copyMonth,
    saveItem,
    applyOverride,
    deleteOverride,
    subMonths,
    addMonths,
  } = useMenus()

  const [dayOpen, setDayOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [addMonthSheet, setAddMonthSheet] = useState<boolean>(false)
  const [copySheet, setCopySheet] = useState<{ open: boolean; fromMonth: string } | null>(null)
  const [overrideSheet, setOverrideSheet] = useState<{
    open: boolean
    date: string
    mealType: MealType
    baseItems: MenuItem[]
    existing: MenuOverride | null
  } | null>(null)

  const menu = currentMenu ?? undefined

  const handleDayTap = async (date: string) => {
    setSelectedDate(date)
    setDayOpen(true)
  }

  const handleAddMonth = () => {
    setAddMonthSheet(true)
  }

  const handleCopyMonth = () => {
    // Open the copy-sheet with the current menu as the source.
    setCopySheet({ open: true, fromMonth: currentMenu?.month ?? currentMonth })
  }

  const handleCopy = async (fromMonth: string, toMonth: string, overwrite: boolean) => {
    // If the target already exists and we're overwriting, reuse its id so the
    // put replaces the old record in place (the unique month index stays valid).
    const existingTarget = menus.find((m) => m.month === toMonth)
    const targetId = overwrite && existingTarget ? existingTarget.id : undefined
    await copyMonth(fromMonth, toMonth, targetId)
    await reload()
    // If the target was a new month, switch to it so the user sees the copy.
    if (!overwrite && toMonth !== currentMonth) {
      setCurrentMonth(toMonth)
    }
  }

  const handleEditMenu = (m: MessMenu) => {
    void m
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Mess menu'
        subtitle={menu ? monthLabel(menu.month) : 'No month selected'}
        action={
          menus.length > 0 ? (
            <Button size='sm' variant='secondary' onClick={() => setCurrentMonth(menus[0].month)}>
              Switch month
            </Button>
          ) : null
        }
      />

      <InfoNote tone='accent' icon='check' title='Available ≠ eaten'>
        The mess menu is reference data about what the hostel is serving. Nothing here
        adds calories or protein — you choose what to log in the Food tab.
      </InfoNote>

      {/* Month navigation */}
      <MenuMonthNav
        monthKey={currentMonth}
        menu={menu}
        onPrevMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
        onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
        onAddMonth={handleAddMonth}
        onCopyMonth={handleCopyMonth}
        onEditMenu={handleEditMenu}
      />
      <AddMonthSheet
        open={addMonthSheet}
        onClose={() => setAddMonthSheet(false)}
        onAdd={async (month, title) => {
          try {
            await createMonth(month, title)
            await reload()
            setCurrentMonth(month)
          } finally {
            setAddMonthSheet(false)
          }
        }}
      />
      <CopyMonthSheet
        open={copySheet?.open ?? false}
        onClose={() => setCopySheet(null)}
        fromMonth={copySheet?.fromMonth ?? currentMonth}
        existingMonths={menus.map((m) => m.month)}
        onCopy={handleCopy}
      />

      {loading && !menu ? (
        <div className='space-y-3'>
          <div className='h-32 rounded-2xl border border-line bg-surface animate-pulse' />
          <div className='h-16 rounded-2xl border border-line bg-surface animate-pulse' />
        </div>
      ) : !menu ? (
        <SectionCard title='No menu for this month'>
          <EmptyState
            icon='menu'
            title='No menu has been added for October 2026.'
            message='Tap "Add menu" to create the month\u2019s published menu. You can paste or type each day\u2019s meals — the mess never overwrites your log.'              action={
              <Button onClick={handleAddMonth}>Add menu</Button>
            }
          />
        </SectionCard>
      ) : (
        <>
          <SectionCard title='Monthly calendar' description='Published meals per day. Tap a day to open it.'>
            <MenuCalendar
              monthKey={currentMonth}
              menu={menu}
              loading={loading}
              onDayTap={handleDayTap}
              caption={`${menu.days.length} days · ${menu.days.reduce((n, d) => n + Object.keys(d.meals).length, 0)} meal slots`}
            />
          </SectionCard>

          {/* Day detail */}
          {selectedDate ? (
            <DayMenuSheet
              day={
                menu.days.find((d) => d.date === selectedDate) ?? {
                  date: selectedDate,
                  meals: {} as Record<string, MenuItem[]>,
                  note: null,
                }
              }
              date={selectedDate}
              open={dayOpen}
              onClose={() => setDayOpen(false)}
              onAddItem={(mealType) => {
                setOverrideSheet({
                  open: true,
                  date: selectedDate,
                  mealType,
                  baseItems: [],
                  existing: null,
                })
              }}
              onCancelItem={() => undefined}
              onRestoreItem={() => undefined}
              onRemoveItem={() => undefined}
              onOverrideApplied={async (date, mealType, override) => {
                await applyOverride(date, mealType, override.kind, override.items, override.reason)
                await reload()
                setDayOpen(false)
              }}
              onOverrideDeleted={async (_id, _date, _mealType) => {
                await deleteOverride(_id)
                await reload()
              }}
              overrides={overrideSheet?.open ? [overrideSheet!.existing ?? null].filter(Boolean) as MenuOverride[] : []}
            />
          ) : null}

          <SectionCard
            title='How the menu relates to your log'
            description='Only what you explicitly log appears in your Food totals.'
          >
            <div className='space-y-3 text-sm text-ink-2'>
              <div className='flex gap-3'>
                <div className='flex-1 rounded-xl bg-surface-2/60 px-3 py-2.5'>
                  <p className='font-medium text-ink-2'>Menu (what was served)</p>
                  <p className='text-[12px] text-ink-3'>Mushroom biryani — cancelled</p>
                </div>
                <div className='flex-1 rounded-xl bg-surface-2/60 px-3 py-2.5'>
                  <p className='font-medium text-ink-2'>Food log (what you ate)</p>
                  <p className='text-[12px] text-ink-3'>200 g rice · 520 kcal</p>
                </div>
              </div>
              <p className='text-[12px] leading-relaxed text-ink-3'>
                Cancelled items keep their history but are never logged automatically.
                A meal on the menu is only 'counted' once you log it from the Food tab — or
                via 'Log this food' when viewing a menu item.
              </p>
            </div>
          </SectionCard>

          <ItemEditModal
            open={!!editingItem}
            onClose={() => setEditingItem(null)}
            item={editingItem}
            onSave={async (item) => {
              await saveItem(item)
              await reload()
              setEditingItem(null)
            }}
          />

          <OverrideSheet
            open={overrideSheet?.open ?? false}
            onClose={() => setOverrideSheet(null)}
            date={overrideSheet?.date ?? ''}
            mealType={overrideSheet?.mealType ?? 'breakfast'}
            existingOverride={overrideSheet?.existing ?? null}
            baseItems={overrideSheet?.baseItems ?? []}
            onApply={async (kind, items, reason) => {
              await applyOverride(overrideSheet!.date, overrideSheet!.mealType, kind, items, reason)
              await reload()
              setOverrideSheet(null)
            }}
          />
        </>
      )}
    </div>
  )
}

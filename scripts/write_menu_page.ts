const fs = require('fs');
const p = 'src/pages/MenuPage.tsx';

// Correct content for MenuPage.tsx
const content = `import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { InfoNote } from '@/components/ui/InfoNote'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MenuCalendar } from '@/components/menu/MenuCalendar'
import { MenuMonthNav } from '@/components/menu/MenuMonthNav'
import { DayMenuSheet } from '@/components/menu/DayMenuSheet'
import { OverrideSheet } from '@/components/menu/OverrideSheet'
import { ItemEditModal } from '@/components/menu/ItemEditModal'
import { useMenus } from '@/hooks/useMenu'
import type { MessMenu, MenuDay, MenuItem, MealType, MenuOverride } from '@/types'
import { MEAL_TYPES, MEAL_LABELS } from '@/types'
import { monthLabel, todayISO, addMonths, subMonths } from '@/utils/date'

export default function MenuPage() {
  const {
    menus,
    loading,
    currentMonth,
    setCurrentMonth,
    currentMenu,
    reload,
    getDaySnapshot,
    addItem,
    saveItem,
    cancelItem,
    restoreItem,
    removeItem,
    applyOverride,
    deleteOverride,
    onChanged,
  } = useMenus()

  const [dayOpen, setDayOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [overrideSheet, setOverrideSheet] = useState<{
    open: boolean
    date: string
    mealType: MealType
    baseItems: MenuItem[]
    existing: MenuOverride | null
  } | null>(null)

  const today = todayISO()
  const menu = currentMenu ?? undefined

  // Resolve overrides for the current month.
  const overrides = useMemo(() => {
    if (!menu) return []
    return menu.days.flatMap((day) => day.overrides ?? [])
  }, [menu])

  const handleDayTap = async (date: string) => {
    setSelectedDate(date)
    setDayOpen(true)
  }

  const handleAddMonth = async () => {
    // October 2026 is seeded by DB migration
    setDayOpen(false)
  }

  const handleCopyMonth = async () => {
    if (currentMenu) {
      const from = currentMenu.month
      const to = '2026-11'
      const base = await getMenu(from)
      if (!base) return
      const fromDays = base.days.map((day) => ({ ...day }))
      const toDays: MenuDay[] = fromDays.map((day) => ({
        date: day.date,
        meals: {} as Record<string, MenuItem[]>,
        note: day.note ?? null,
      }))
      for (const meal of MEAL_TYPES) {
        const fromItems = day.meals[meal] ?? []
        const toItems: MenuItem[] = fromItems.map((item) => ({
          ...item,
          id: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
        toDays[0].meals[meal] = toItems
      }
      const toMenu: MessMenu = {
        id: '',
        month: to,
        title: 'November 2026',
        source: 'manual',
        days: toDays,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await saveMenu(toMenu)
      await reload()
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
        canAdd={menus.length === 0}
        menu={menu}
        onPrevMonth={() => setCurrentMonth((m) => subMonths(m, 1))}
        onNextMonth={() => setCurrentMonth((m) => addMonths(m, 1))}
        onAddMonth={handleAddMonth}
        onCopyMonth={handleCopyMonth}
        onEditMenu={handleEditMenu}
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
            message='Tap "Add menu" to create the month\\u2019s published menu. You can paste or type each day\\u2019s meals — the mess never overwrites your log.'
            action={
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
              onAddItem={(mealType) => undefined}
              onEditItem={setEditingItem}
              onCancelItem={(item) => undefined}
              onRestoreItem={(item) => undefined}
              onRemoveItem={(item, mealType) => undefined}
              onOverrideApplied={async (date, mealType, override) => {
                await applyOverride(date, mealType, override.kind, override.items, override.reason)
                await reload()
                setDayOpen(false)
              }}
              onOverrideDeleted={async (id, date, mealType) => {
                await deleteOverride(id)
                await reload()
              }}
              overrides={[]}
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
`

// Replace the literal \u2019 sequences with actual curly quotes
let contentWithQuotes = content
  .replace(/\\u2019s/g, "\u2019s")
  .replace(/\\u2019/g, "\u2019");

fs.writeFileSync(p, contentWithQuotes, 'utf-8');
console.log('File written successfully');
console.log('--- Verify ---');
const lines = contentWithQuotes.split('\n');
console.log('Line 145:', JSON.stringify(lines[144]));
console.log('Line 147:', JSON.stringify(lines[146]));

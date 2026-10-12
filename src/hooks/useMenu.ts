import { useCallback, useEffect, useState } from 'react'
import {
  copyMonth,
  createMenu,
  deleteOverride as deleteOverrideById,
  listMenus,
  getMenu,
  saveMenu,
  saveOverride,
  resolveMonth,
} from '@/db/menuQueries'
import type {
  MessMenu,
  MenuItem,
  MenuOverride,
  MealType,
  MenuOverrideKind,
} from '@/types'
import { MEAL_TYPES } from '@/types'
import { onFoodChanged } from '@/lib/foodEvents'
import { nowIso } from '@/utils/id'
import { newId } from '@/utils/id'

/** A day's resolved menu: base items (excluding cancelled) plus overrides. */
export interface DayMenuSnapshot {
  date: string
  menu: MenuItem[]
  cancelled: MenuItem[]
}

export interface UseMenusResult {
  menus: MessMenu[]
  loading: boolean
  error: Error | null
  currentMonth: string
  setCurrentMonth: (month: string) => void
  currentMenu: MessMenu | undefined
  reload: () => void
  createMonth: (month: string, title: string) => Promise<MessMenu>
  saveMenu: (menu: MessMenu) => Promise<MessMenu>
  copyMonth: (fromMonth: string, toMonth: string, targetId?: string) => Promise<MessMenu>
  getDaySnapshot: (month: string, date: string) => Promise<DayMenuSnapshot>
  addItem: (date: string, mealType: MealType, fields: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt' | 'at' | 'status'>) => Promise<MenuItem>
  saveItem: (item: MenuItem) => Promise<MenuItem>
  cancelItem: (item: MenuItem) => Promise<MenuItem>
  restoreItem: (item: MenuItem) => Promise<MenuItem>
  removeItem: (item: MenuItem, mealType: MealType) => Promise<void>
  applyOverride: (date: string, mealType: MealType, kind: MenuOverrideKind, items: MenuItem[], reason: string | null) => Promise<MenuOverride>
  deleteOverride: (id: string) => Promise<void>
  onChanged: () => void
  subMonths: (month: string, amount: number) => string
  addMonths: (month: string, amount: number) => string
}

export function useMenus(): UseMenusResult {
  const [menus, setMenus] = useState<MessMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const reload = useCallback(async () => {
    try {
      const all = await listMenus()
      setMenus(all)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('Could not load menus.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // Re-read menus whenever anything changes (food or menu).
  useEffect(() => {
    const unsub = onFoodChanged(reload)
    return unsub
  }, [reload])

  return {
    menus,
    loading,
    error,
    currentMonth,
    setCurrentMonth,
    currentMenu: menus.find((m) => m.month === currentMonth),
    reload,
  createMonth: (month, title) => createMenu({ month, title }),
  saveMenu: (menu) => saveMenu(menu),
  copyMonth: (fromMonth, toMonth, targetId) => copyMonth(fromMonth, toMonth, targetId),
    getDaySnapshot: async (month, date) => {
      const base = await getMenu(month)
      if (!base) throw new Error('No menu for ' + month)
      const snapshot = await resolveMonth(month)
      const day = snapshot.days.find((d) => d.date === date)
      if (!day) throw new Error('No such day: ' + date)
      const meals: Record<MealType, MenuItem[]> = {} as Record<MealType, MenuItem[]>
      for (const meal of MEAL_TYPES) {
        meals[meal] = day.meals[meal]?.filter((i) => i.status !== 'cancelled') ?? []
      }
      return { date, menu: meals['breakfast'] ?? [], cancelled: [] }
    },
    addItem: async (date, mealType, fields) => {
      const menu = await getMenu(currentMonth)
      if (!menu) throw new Error('No menu open')
      const dayIndex = menu.days.findIndex((d) => d.date === date)
      if (dayIndex === -1) throw new Error('Day not found')
      const day = menu.days[dayIndex]
      const meal = ((day.meals as Record<MealType, MenuItem[]>)[mealType]!) as MenuItem[] ?? []
      const next: MenuItem = {
        ...fields,
        id: newId(),
        status: 'available',
        at: nowIso(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        foodId: fields.foodId ?? null,
        calories: fields.calories ?? null,
        proteinG: fields.proteinG ?? null,
        carbsG: fields.carbsG ?? null,
        fatG: fields.fatG ?? null,
        isVeg: fields.isVeg ?? true,
        note: fields.note ?? null,
      }
      meal.push(next)
      day.meals[mealType] = meal
      const updated = { ...menu, days: [...menu.days], updatedAt: nowIso() }
      await saveMenu(updated)
      return next
    },
    saveItem: async (item) => {
      const menu = await getMenu(currentMonth)
      if (!menu) throw new Error('No menu open')
      let found = false
      for (const day of menu.days) {
        for (const mealType of MEAL_TYPES) {
          const meal = ((day.meals as Record<MealType, MenuItem[]>)[mealType]!) as MenuItem[]
          if (!meal) continue
          const idx = (meal as MenuItem[]).findIndex((i) => i.id === item.id)
          if (idx === -1) continue
          meal[idx] = item
          found = true
        }
      }
      if (!found) throw new Error('Item not found')
      const updated = { ...menu, days: [...menu.days], updatedAt: nowIso() }
      await saveMenu(updated)
      return item
    },
    cancelItem: async (item) => {
      const menu = await getMenu(currentMonth)
      if (!menu) throw new Error('No menu open')
      for (const day of menu.days) {
        for (const mealType of MEAL_TYPES) {
          const meal = ((day.meals as Record<MealType, MenuItem[]>)[mealType]!) as MenuItem[]
          if (!meal) continue
          const idx = (meal as MenuItem[]).findIndex((i) => i.id === item.id)
          if (idx === -1) continue
          const target = meal[idx]
          const next: MenuItem = { ...target, status: 'cancelled', at: nowIso(), updatedAt: nowIso() }
          meal[idx] = next
          const updated = { ...menu, days: [...menu.days], updatedAt: nowIso() }
          await saveMenu(updated)
          return next
        }
      }
      throw new Error('Item not found')
    },
    restoreItem: async (item) => {
      const menu = await getMenu(currentMonth)
      if (!menu) throw new Error('No menu open')
      for (const day of menu.days) {
        for (const mealType of MEAL_TYPES) {
          const meal = ((day.meals as Record<MealType, MenuItem[]>)[mealType]!) as MenuItem[]
          if (!meal) continue
          const idx = (meal as MenuItem[]).findIndex((i) => i.id === item.id)
          if (idx === -1) continue
          const target = meal[idx]
          const next: MenuItem = { ...target, status: 'available', at: '', updatedAt: nowIso() }
          meal[idx] = next
          const updated = { ...menu, days: [...menu.days], updatedAt: nowIso() }
          await saveMenu(updated)
          return next
        }
      }
      throw new Error('Item not found')
    },
    removeItem: async (item, _mealType) => {
      const menu = await getMenu(currentMonth);
      if (!menu) throw new Error('No menu open');
      for (const day of menu.days) {
        for (const mt of MEAL_TYPES) {
          const meal = (day.meals as Record<MealType, MenuItem[]>)[mt] ?? [];
          const idx = meal.findIndex((i) => i.id === item.id);
          if (idx === -1) continue;
          const next: MenuItem[] = meal.filter((i) => i.id !== item.id);
          (day.meals as Record<MealType, MenuItem[]>)[mt] = next;
          const updated = { ...menu, days: [...menu.days], updatedAt: nowIso() };
          await saveMenu(updated);
          return;
        }
      }
      throw new Error('Item not found');
    },    applyOverride: async (date, mealType, kind, items, reason) => {
      const menu = await getMenu(currentMonth)
      if (!menu) throw new Error('No menu open')
      const override: MenuOverride = {
        id: newId(),
        menuId: menu.id,
        date,
        mealType,
        kind,
        items,
        reason: reason ?? null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      await saveOverride(override)
      return override
    },
    deleteOverride: async (id) => {
      await deleteOverrideById(id)
    },
    onChanged: () => {
      void reload()
    },
    subMonths: (month: string, amount: number) => {
      const [y, m] = month.split('-').map(Number)
      const d = new Date(y, m - 1 - amount, 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    },
    addMonths: (month: string, amount: number) => {
      const [y, m] = month.split('-').map(Number)
      const d = new Date(y, m - 1 + amount, 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    },
  }
}

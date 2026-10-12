/** Menu & menu-override queries.
 *
 * All writes flow through here so the one-way data integrity rule always
 * holds: a base menu never changes. Every correction is stored as a separate
 * `MenuOverride` row, so October cannot be mutated by anything that
 * happens to November, and a cancelled item stays recoverable.
 */

import type {
  ID,
  ISODate,
  MealType,
  MessMenu,
  MenuDay,
  MenuItem,
  MenuOverride,
  MenuOverrideSummary,
  MenuSnapshot,
  MenuSnapshotDay,
} from '@/types'
import { todayISO } from '@/utils/date'
import { MEAL_TYPES } from '@/types'
import { newId, nowIso } from '@/utils/id'
import {
  menuItemsRepo,
  menuOverridesRepo,
  menusRepo,
} from './repositories'
import { emitFoodChanged } from '@/lib/foodEvents'

/* ------------------------------------------------------------------ */
/* Menus                                                              */
/* ------------------------------------------------------------------ */

/** Returns the month menu, if any. */
export async function getMenu(month: string): Promise<MessMenu | undefined> {
  const results = await menusRepo.getAllByIndex('month', month)
  return results[0]
}

/** All saved months, ordered newest first. */
export async function listMenus(): Promise<MessMenu[]> {
  const all = await menusRepo.getAll()
  return all.sort((a, b) => b.month.localeCompare(a.month))
}

/** Creates a new month menu. */
export async function createMenu(draft: {
  month: string
  title: string
  days?: MenuDay[]
}): Promise<MessMenu> {
  const now = nowIso()
  const menu: MessMenu = {
    id: newId(),
    month: draft.month,
    title: draft.title,
    source: 'manual',
    days: draft.days ?? [],
    createdAt: now,
    updatedAt: now,
  }
  await menusRepo.put(menu)
  emitFoodChanged('menu-changed')
  return menu
}

/** Replaces a month menu wholesale (used by imports / copy). */
export async function saveMenu(menu: MessMenu): Promise<MessMenu> {
  await menusRepo.put(menu)
  emitFoodChanged('menu-changed')
  return menu
}

/* ------------------------------------------------------------------ */
/* Menu items                                                         */
/* ------------------------------------------------------------------ */

/** Returns one menu item, if any. */
export async function getMenuItem(id: ID): Promise<MenuItem | undefined> {
  return menuItemsRepo.get(id)
}

/** All menu items. */
export async function listMenuItems(): Promise<MenuItem[]> {
  return menuItemsRepo.getAll()
}

/** Returns all menu items linked to a food database entry. */
export async function listMenuItemsForFood(foodId: ID): Promise<MenuItem[]> {
  return menuItemsRepo.getAllByIndex('foodId', foodId)
}

/** Saves one menu item. Returns the saved item. */
export async function saveMenuItem(item: MenuItem): Promise<MenuItem> {
  await menuItemsRepo.put(item)
  emitFoodChanged('menu-changed')
  return item
}

/** Inserts one menu item (idempotent, safe for batch appends). */
export async function insertMenuItem(item: MenuItem): Promise<MenuItem> {
  await menuItemsRepo.put(item)
  emitFoodChanged('menu-changed')
  return item
}

/* ------------------------------------------------------------------ */
/* Menu overrides                                                     */
/* ------------------------------------------------------------------ */

/** Returns the most recent override for one day + meal, if any. */
export async function getOverride(
  date: ISODate,
  mealType: string,
): Promise<MenuOverrideSummary | undefined> {
  const all = await menuOverridesRepo.getAllByIndex('date', date)
  const matching = all.filter((o) => o.mealType === mealType)
  if (matching.length === 0) return undefined
  // Most recent first (overrides are applied newest-first so older ones
  // never overwrite a newer correction).
  matching.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const top = matching[0]
  return { id: top.id, kind: top.kind, items: top.items, reason: top.reason, createdAt: top.createdAt }
}

/** Saves an override. */
export async function saveOverride(override: MenuOverride): Promise<MenuOverride> {
  await menuOverridesRepo.put(override)
  emitFoodChanged('menu-changed')
  return override
}

/** Deletes one override (does not touch the base menu). */
export async function deleteOverride(id: ID): Promise<void> {
  await menuOverridesRepo.remove(id)
  emitFoodChanged('menu-changed')
}

/* ------------------------------------------------------------------ */
/* Resolved month (base + overrides)                                  */
/* ------------------------------------------------------------------ */

/**
 * Resolves a month into a read-only snapshot.
 *
 * The base month provides the published food. Each override replaces or
 * augments ONE day + meal. This keeps the original data recoverable and
 * makes history understandable: you can see exactly what was changed and
 * when.
 */
export async function resolveMonth(month: string): Promise<MenuSnapshot> {
  const base = await getMenu(month)
  if (!base) {
    throw new Error(`No such month: ${month}`)
  }

  const snapshotDayList: MenuSnapshotDay[] = []
  // Copy base days into the snapshot.
  for (const day of base.days) {
    const snapshotDay: MenuSnapshotDay = { date: day.date, meals: {} as Partial<Record<MealType, MenuItem[]>> }
    // Start each meal with the base items.
    for (const mealType of MEAL_TYPES) {
      snapshotDay.meals[mealType] = day.meals[mealType] ?? []
    }
    snapshotDayList.push(snapshotDay)
  }

  // Apply overrides newest-first (a newer correction wins over an older one
  // for the same day+meal).
  const overrides = await menuOverridesRepo.getAll()
  overrides.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  for (const override of overrides) {
    const target = snapshotDayList.find((d) => d.date === override.date)
    if (!target) continue
    const bucket = target.meals[override.mealType]
    if (!bucket) continue

    if (override.kind === 'replace') {
      // Replace the whole bucket with the override's items (cancelling
      // items simply means putting them into the bucket with status
      // 'cancelled').
      bucket.length = 0
      for (const item of override.items) {
        bucket.push(item)
      }
    } else if (override.kind === 'add') {
      for (const item of override.items) {
        bucket.push(item)
      }
    } else if (override.kind === 'remove') {
      // Remove items whose id is in the override. Mark remaining as
      // cancelled rather than deleting, to keep history.
      const keep = bucket.filter((item) => !override.items.some((ov) => ov.id === item.id))
      for (const item of keep) {
        item.status = 'cancelled'
        item.at = override.createdAt
      }
    }
  }

  return {
    id: base.id,
    month: base.month,
    title: base.title,
    source: base.source,
    days: snapshotDayList,
  }
}

/* ------------------------------------------------------------------ */
/* Copy month                                                         */
/* ------------------------------------------------------------------ */

/**
 * Copies one month to a new month key.
 *
 * The copy is fully independent: it gets brand-new item ids and is fully
 * independent of the source. Older months can never be mutated.
 *
 * If `targetId` is provided (overwrite case), the existing target menu's id
 * is reused so the put replaces the old record in place — the unique `month`
 * index stays valid and no cascade delete is needed.
 */
export async function copyMonth(
  fromMonth: string,
  toMonth: string,
  targetId?: string,
): Promise<MessMenu> {
  const base = await getMenu(fromMonth)
  if (!base) {
    throw new Error(`No such month: ${fromMonth}`)
  }

  // Deep-copy the days.
  const fromDays = base.days.map((day) => ({ ...day }))
  const toDays: MenuDay[] = fromDays.map((day) => ({
    date: day.date,
    meals: {} as Partial<Record<MealType, MenuItem[]>>,
    note: day.note ?? null,
  }))

  // Copy each meal's items with new ids. Menus are keyed by day+meal, so we
  // rebuild a month-level structure to share the same item order.
  for (let i = 0; i < fromDays.length; i++) {
    const fromDay = fromDays[i]
    const toDay = toDays[i]
    for (const mealType of MEAL_TYPES) {
      const fromItems = fromDay.meals[mealType] ?? []
      const toItems: MenuItem[] = fromItems.map((item) => ({
        ...item,
        id: newId(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }))
      toDay.meals[mealType] = toItems
    }
  }

  const toMenu: MessMenu = {
    id: targetId ?? newId(),
    month: toMonth,
    title: base.title,
    source: 'manual',
    days: toDays,
    createdAt: targetId ? base.createdAt : nowIso(),
    updatedAt: nowIso(),
  }

  await menusRepo.put(toMenu)
  // Don't emit food-changed here - the copy only copies the base menu,
  // which has no effect on food totals anyway.
  return toMenu
}

/* ------------------------------------------------------------------ */
/* Demo seed data (optional)                                          */
/* ------------------------------------------------------------------ */

/**
 * Seeds a small demo menu so the page is not empty on first run.
 * This is clearly labelled demo data and can be removed.
 */
export async function seedDemoMenus(): Promise<void> {
  const today = todayISO()
  const now = nowIso()

  // October 2026 (a plausible demo month)
  const octDays: MenuDay[] = [
    {
      date: '2026-10-01',
      meals: {
        breakfast: [
          {
            id: 'demo-oct-b1',
            name: 'Upma',
            foodId: null,
            calories: 180,
            proteinG: 4,
            carbsG: 30,
            fatG: 4,
            isVeg: true,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'demo-oct-b2',
            name: 'Boiled eggs',
            foodId: null,
            calories: 140,
            proteinG: 12,
            carbsG: 2,
            fatG: 9,
            isVeg: false,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
        ],
        lunch: [
          {
            id: 'demo-oct-l1',
            name: 'Rice',
            foodId: null,
            calories: 320,
            proteinG: 6,
            carbsG: 62,
            fatG: 2,
            isVeg: true,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'demo-oct-l2',
            name: 'Dal',
            foodId: null,
            calories: 120,
            proteinG: 8,
            carbsG: 16,
            fatG: 2,
            isVeg: true,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'demo-oct-l3',
            name: 'Paneer curry',
            foodId: null,
            calories: 210,
            proteinG: 12,
            carbsG: 8,
            fatG: 14,
            isVeg: true,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'demo-oct-l4',
            name: 'Salad',
            foodId: null,
            calories: 40,
            proteinG: 2,
            carbsG: 6,
            fatG: 1,
            isVeg: true,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
        ],
        dinner: [
          {
            id: 'demo-oct-d1',
            name: 'Roti',
            foodId: null,
            calories: 120,
            proteinG: 4,
            carbsG: 22,
            fatG: 2,
            isVeg: true,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'demo-oct-d2',
            name: 'Mushroom biryani',
            foodId: null,
            calories: 310,
            proteinG: 8,
            carbsG: 44,
            fatG: 6,
            isVeg: true,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'demo-oct-d3',
            name: 'Raita',
            foodId: null,
            calories: 90,
            proteinG: 4,
            carbsG: 10,
            fatG: 2,
            isVeg: true,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
      note: null,
    },
    {
      date: '2026-10-02',
      meals: {
        breakfast: [
          {
            id: 'demo-oct2-b1',
            name: 'Poha',
            foodId: null,
            calories: 200,
            proteinG: 6,
            carbsG: 34,
            fatG: 6,
            isVeg: true,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
        ],
        lunch: [
          {
            id: 'demo-oct2-l1',
            name: 'Jowar bhakri',
            foodId: null,
            calories: 260,
            proteinG: 7,
            carbsG: 50,
            fatG: 4,
            isVeg: true,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'demo-oct2-l2',
            name: 'Kadhi',
            foodId: null,
            calories: 130,
            proteinG: 6,
            carbsG: 8,
            fatG: 8,
            isVeg: true,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'demo-oct2-l3',
            name: 'Mixed vegetable',
            foodId: null,
            calories: 90,
            proteinG: 3,
            carbsG: 14,
            fatG: 3,
            isVeg: true,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
        ],
        dinner: [
          {
            id: 'demo-oct2-d1',
            name: 'Chapati',
            foodId: null,
            calories: 110,
            proteinG: 4,
            carbsG: 20,
            fatG: 2,
            isVeg: true,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'demo-oct2-d2',
            name: 'Palak paneer',
            foodId: null,
            calories: 200,
            proteinG: 10,
            carbsG: 16,
            fatG: 12,
            isVeg: true,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'demo-oct2-d3',
            name: ' salad',
            foodId: null,
            calories: 30,
            proteinG: 1,
            carbsG: 6,
            fatG: 1,
            isVeg: true,
            note: null,
            status: 'available',
            at: today,
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
      note: null,
    },
  ]

  const octMenu: MessMenu = {
    id: 'demo-oct-001',
    month: '2026-10',
    title: 'October 2026',
    source: 'manual',
    days: octDays,
    createdAt: now,
    updatedAt: now,
  }

  await menusRepo.put(octMenu)
  emitFoodChanged('menu-changed')
}

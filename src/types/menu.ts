import type { ID, ISODate, Timestamped } from './common'

/* ------------------------------------------------------------------ */
/* Meals                                                               */
/* ------------------------------------------------------------------ */

/** The five meals the menu is organised around. */
export type MealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner' | 'outside'

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner', 'outside']

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
  outside: 'Outside Food',
}

/* ------------------------------------------------------------------ */
/* Menu items                                                          */
/* ------------------------------------------------------------------ */

export type MenuItemStatus = 'available' | 'cancelled' | 'added'

/** One published menu item (something served that day). */
export interface MenuItem {
  id: ID
  name: string
  /** Reference to the Food database entry, if linked. */
  foodId: ID | null
  /** Display nutrition of the linked food, if known. */
  calories: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  isVeg: boolean | null
  note: string | null
  /** Availability status. */
  status: MenuItemStatus
  /** When the item was cancelled/added, for the override audit trail. */
  at: ISODate
  createdAt: ISODate
  updatedAt: ISODate
}

/* ------------------------------------------------------------------ */
/* Menu days                                                           */
/* ------------------------------------------------------------------ */

export interface MenuDay {
  date: ISODate
  /** Meals served that day. A missing key simply means "nothing published". */
  meals: Partial<Record<MealType, MenuItem[]>>
  note: string | null
}

/** One month of mess menu, keyed by `YYYY-MM`. */
export interface MessMenu extends Timestamped {
  id: ID
  /** `YYYY-MM` - unique per month, used as the lookup index. */
  month: string
  title: string
  source: 'manual' | 'import'
  days: MenuDay[]
  /** When this month was created. */
  createdAt: ISODate
  /** When this month was last touched (any edit). */
  updatedAt: ISODate
}

/* ------------------------------------------------------------------ */
/* Menu overrides                                                      */
/* ------------------------------------------------------------------ */

export type MenuOverrideKind = 'replace' | 'add' | 'remove'

/** Corrects a published month for one day + meal without rewriting history. */
export interface MenuOverride extends Timestamped {
  id: ID
  menuId: ID
  date: ISODate
  mealType: MealType
  kind: MenuOverrideKind
  /** Items explicitly replaced/add/remove for this day+meal. */
  items: MenuItem[]
  /** Human-readable reason for the override. */
  reason: string | null
  createdAt: ISODate
}

/** Summary of an override applicable to a given date + meal. */
export interface MenuOverrideSummary {
  id: ID
  kind: MenuOverrideKind
  items: MenuItem[]
  reason: string | null
  createdAt: ISODate
}

/** Full menu for one day, built from the base month + any applicable overrides. */
export interface MenuSnapshotDay {
  date: ISODate
  meals: Partial<Record<MealType, MenuItem[]>>
}

/** A fully-resolved month: base month with all overrides merged. */
export interface MenuSnapshot {
  id: ID
  month: string
  title: string
  source: 'manual' | 'import'
  days: MenuSnapshotDay[]
}

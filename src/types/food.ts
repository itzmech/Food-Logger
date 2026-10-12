import type { ID, ISODate, ISODateTime, Timestamped } from './common'

/* ------------------------------------------------------------------ */
/* Meals                                                               */
/* ------------------------------------------------------------------ */

/**
 * The five meals the Food page is organised around.
 * `outside` = food eaten outside the mess (canteen, deliveries, eating out).
 */
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
/* Servings                                                            */
/* ------------------------------------------------------------------ */

/** Serving units the quantity selector supports. */
export type ServingUnit = 'g' | 'ml' | 'piece' | 'bowl' | 'scoop' | 'serving'

export const SERVING_UNITS: ServingUnit[] = ['g', 'ml', 'piece', 'bowl', 'scoop', 'serving']

export const SERVING_UNIT_LABELS: Record<ServingUnit, string> = {
  g: 'grams',
  ml: 'ml',
  piece: 'piece',
  bowl: 'bowl',
  scoop: 'scoop',
  serving: 'serving',
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export type FoodCategory =
  | 'protein'
  | 'carb'
  | 'vegetable'
  | 'fruit'
  | 'dairy'
  | 'fat'
  | 'beverage'
  | 'supplement'
  | 'composite'
  | 'other'

export const FOOD_CATEGORIES: FoodCategory[] = [
  'protein',
  'carb',
  'vegetable',
  'fruit',
  'dairy',
  'fat',
  'beverage',
  'supplement',
  'composite',
  'other',
]

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  protein: 'Protein',
  carb: 'Carbs',
  vegetable: 'Vegetables',
  fruit: 'Fruit',
  dairy: 'Dairy',
  fat: 'Fats & oils',
  beverage: 'Beverages',
  supplement: 'Supplements',
  composite: 'Dish / combo',
  other: 'Other',
}

/* ------------------------------------------------------------------ */
/* Food (reusable database entry)                                      */
/* ------------------------------------------------------------------ */

/**
 * FOOD DATABASE = reusable reference entries.
 *
 * Nutrition is defined per `baseQuantity × baseUnit` (e.g. 130 kcal per
 * 100 g). Creating a Food never implies it was eaten — logging is always an
 * explicit action in the Food tab.
 *
 * `source` keeps seed/demo data clearly separated from user data: seeds can
 * be deleted as a group and are visually labelled.
 */
export interface Food extends Timestamped {
  id: ID
  name: string
  /** Lower-cased name used for the search index. */
  searchName: string
  category: FoodCategory
  /** Reference quantity the macros are defined for. */
  baseQuantity: number
  baseUnit: ServingUnit
  /** Estimated nutrition for `baseQuantity baseUnit` of this food. */
  calories: number
  protein: number
  carbs: number | null
  fat: number | null
  /** 'seed' entries are demo data and can be removed as a group. */
  source: 'custom' | 'seed' | 'import'
  isFavorite: boolean
  /** EMA of usage for the Quick Add ranking (not a raw count). */
  usageScore: number
  lastUsedAt: ISODateTime | null
}

/* ------------------------------------------------------------------ */
/* Food log                                                            */
/* ------------------------------------------------------------------ */

export type FoodLogSource = 'database' | 'quick-add' | 'manual' | 'menu' | 'import'

/**
 * FOOD LOG = food actually consumed on a given day.
 *
 * All nutrition is stored as a snapshot at log time. Editing or deleting the
 * reusable Food afterwards never changes a FoodLog — the log keeps its own
 * copy of name, quantity, unit and macros.
 *
 * `source: 'menu'` is reserved for the future mess-menu flow, where logging
 * from the menu must always be an explicit user action.
 */
export interface FoodLog extends Timestamped {
  id: ID
  date: ISODate
  loggedAt: ISODateTime
  meal: MealType
  /** Reference to the Food the entry was logged from, when applicable. */
  foodId: ID | null
  /** Denormalised name snapshot — survives food edits and deletions. */
  foodNameSnapshot: string
  quantity: number
  unit: ServingUnit
  /** Estimated nutrition of the logged quantity. */
  calories: number
  protein: number
  carbs: number | null
  fat: number | null
  source: FoodLogSource
  note: string | null
}

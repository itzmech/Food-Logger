/**
 * Nutrition math.
 *
 * Pure functions only — no database access, no React. Every log entry stores
 * its own scaled values at write time (snapshot semantics), and these helpers
 * are the single place where that math lives.
 *
 * All nutrition values are ESTIMATES supplied by the user's own food
 * database; nothing here pretends to be laboratory-exact.
 */

import type { Food, FoodLog, MealType, ServingUnit } from '@/types'
import { MEAL_TYPES } from '@/types'
import type { ISODate } from '@/utils/date'

/** Rounds to one decimal without floating-point noise. */
function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function safe(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

/** Rounds the logged quantity for display: grams keep decimals, others don't. */
export function formatQuantity(quantity: number, unit: ServingUnit): string {
  const rounded = unit === 'g' || unit === 'ml' ? round1(quantity) : Math.round(quantity)
  return String(rounded)
}

/** Factor that scales a Food's per-base nutrition to `quantity unit`. */
function unitFactor(food: Food, unit: ServingUnit): number {
  if (unit === food.baseUnit) return 1
  // Weight/volume units can be converted; count-based units cannot.
  if (food.baseUnit === 'g' && unit === 'ml') return 1
  if (food.baseUnit === 'ml' && unit === 'g') return 1
  return Number.NaN
}

export interface ScaledNutrition {
  calories: number
  protein: number
  carbs: number | null
  fat: number | null
}

/**
 * Scales a Food's nutrition to the requested quantity/unit.
 * Throws when the unit is incompatible (e.g. 2 bowls of a food defined per
 * piece) — callers convert to a suitable unit first.
 */
export function scaleFood(food: Food, quantity: number, unit: ServingUnit): ScaledNutrition {
  const factor = unitFactor(food, unit)
  if (!Number.isFinite(factor)) {
    throw new Error(
      `This food is defined per ${food.baseUnit}. Log it in ${food.baseUnit} or edit the food's serving.`,
    )
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Enter a quantity greater than zero.')
  }

  const ratio = (quantity * factor) / safe(food.baseQuantity)
  return {
    calories: Math.max(0, Math.round(safe(food.calories) * ratio)),
    protein: Math.max(0, round1(safe(food.protein) * ratio)),
    carbs: food.carbs == null ? null : Math.max(0, round1(safe(food.carbs) * ratio)),
    fat: food.fat == null ? null : Math.max(0, round1(safe(food.fat) * ratio)),
  }
}

/** Estimated nutrition per 1 baseUnit — used for hints and previews. */
export function perBaseLabel(food: Food): string {
  const macros = [
    `${Math.round(safe(food.calories))} kcal`,
    `${round1(safe(food.protein))}g protein`,
  ]
  return `${macros.join(' · ')} per ${formatQuantity(food.baseQuantity, food.baseUnit)} ${food.baseUnit}`
}

/* ------------------------------------------------------------------ */
/* Totals                                                              */
/* ------------------------------------------------------------------ */

export interface NutritionTotals {
  calories: number
  protein: number
  carbs: number | null
  fat: number | null
  itemCount: number
}

const EMPTY_TOTALS: NutritionTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  itemCount: 0,
}

/**
 * Sums actual FoodLog records. Null carbs/fat stay null when no entry in the
 * set recorded them (an estimate the user never entered stays unknown).
 */
export function sumNutrition(logs: FoodLog[]): NutritionTotals {
  if (logs.length === 0) return { ...EMPTY_TOTALS, carbs: null, fat: null }

  let calories = 0
  let protein = 0
  let carbs = 0
  let carbsSeen = false
  let fat = 0
  let fatSeen = false

  for (const log of logs) {
    calories += safe(log.calories)
    protein += safe(log.protein)
    if (log.carbs != null) {
      carbs += safe(log.carbs)
      carbsSeen = true
    }
    if (log.fat != null) {
      fat += safe(log.fat)
      fatSeen = true
    }
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: carbsSeen ? Math.round(carbs) : null,
    fat: fatSeen ? Math.round(fat) : null,
    itemCount: logs.length,
  }
}

/** Grouping of one day's logs by meal, in fixed display order. */
export interface MealGroup {
  meal: MealType
  logs: FoodLog[]
  totals: NutritionTotals
}

export const EMPTY_MEAL_GROUPS: MealGroup[] = MEAL_TYPES.map((meal) => ({
  meal,
  logs: [],
  totals: { ...EMPTY_TOTALS, carbs: null, fat: null },
}))

export function groupLogsByMeal(logs: FoodLog[]): MealGroup[] {
  const byMeal = new Map<MealType, FoodLog[]>()
  for (const meal of MEAL_TYPES) byMeal.set(meal, [])
  for (const log of logs) {
    const bucket = byMeal.get(log.meal)
    if (bucket) bucket.push(log)
  }
  for (const bucket of byMeal.values()) {
    bucket.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
  }
  return MEAL_TYPES.map((meal) => {
    const mealLogs = byMeal.get(meal) ?? []
    return { meal, logs: mealLogs, totals: sumNutrition(mealLogs) }
  })
}

/* ------------------------------------------------------------------ */
/* Meal defaults                                                       */
/* ------------------------------------------------------------------ */

const MEAL_DEFAULTS: Array<{ meal: MealType; from: number; to: number }> = [
  { meal: 'breakfast', from: 4, to: 11 },
  { meal: 'lunch', from: 11, to: 16 },
  { meal: 'snacks', from: 16, to: 19 },
  { meal: 'dinner', from: 19, to: 23 },
  { meal: 'snacks', from: 23, to: 4 },
]

/** Suggests the meal to preselect based on the time of day. */
export function defaultMealForNow(date: Date = new Date()): MealType {
  const hour = date.getHours()
  for (const rule of MEAL_DEFAULTS) {
    if (rule.from <= rule.to) {
      if (hour >= rule.from && hour < rule.to) return rule.meal
    } else if (hour >= rule.from || hour < rule.to) {
      return rule.meal
    }
  }
  return 'snacks'
}

/* ------------------------------------------------------------------ */
/* Recents ranking                                                     */
/* ------------------------------------------------------------------ */

/** Upper bound for the EMA score so it stays a stable sort key. */
const USAGE_SCORE_MAX = 100
/** Weight of the newest use in the EMA. */
const USAGE_ALPHA = 0.35

/**
 * Exponential moving average of usage — recent favourites float to the top of
 * Quick Add without letting a single old spike dominate forever.
 */
export function bumpUsageScore(previous: number): number {
  const base = Number.isFinite(previous) ? previous : 0
  return Math.min(USAGE_SCORE_MAX, base + USAGE_ALPHA * (USAGE_SCORE_MAX - base))
}

export interface RankedFood {
  food: Food
  lastUsedAt: string | null
}

/**
 * Quick Add ranking: recently/frequently used first, then favourites, then
 * alphabetical — a stable, predictable order for the common case.
 */
export function rankQuickAddFoods(foods: Food[], limit = 8): Food[] {
  return [...foods]
    .filter((food) => food.lastUsedAt != null || food.isFavorite)
    .sort((a, b) => {
      const scoreDelta = safe(b.usageScore) - safe(a.usageScore)
      if (Math.abs(scoreDelta) > 0.01) return scoreDelta
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
      const aTime = a.lastUsedAt ?? ''
      const bTime = b.lastUsedAt ?? ''
      if (aTime !== bTime) return bTime.localeCompare(aTime)
      return a.name.localeCompare(b.name)
    })
    .slice(0, limit)
}

/** Case-insensitive substring search over the database with favourite bias. */
export function searchFoods(foods: Food[], query: string, limit = 30): Food[] {
  const q = query.trim().toLowerCase()
  const pool = q
    ? foods.filter((food) => food.searchName.includes(q))
    : [...foods].sort((a, b) => a.name.localeCompare(b.name))
  return pool
    .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name))
    .slice(0, limit)
}

/** True when the day key is today (local). */
export function isToday(date: ISODate, today: ISODate): boolean {
  return date === today
}

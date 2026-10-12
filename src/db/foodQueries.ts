/**
 * Food & food-log queries.
 *
 * All writes flow through here so snapshot semantics stay enforced in one
 * place: FoodLog rows always carry their own nutrition copy, and touching a
 * Food never rewrites history.
 */

import type { Food, FoodLog, ID, MealType, ServingUnit } from '@/types'
import type { ISODate } from '@/utils/date'
import { newId, nowIso } from '@/utils/id'
import { bumpUsageScore, scaleFood } from '@/lib/nutrition'
import { createFood, createManualFoodLog, toSearchName } from './defaults'
import type { FoodDraft } from './defaults'
import { foodsRepo, foodLogsRepo } from './repositories'
import { emitFoodChanged } from '@/lib/foodEvents'

/* ------------------------------------------------------------------ */
/* Food database                                                       */
/* ------------------------------------------------------------------ */

export async function listFoods(): Promise<Food[]> {
  return foodsRepo.getAll()
}

export async function getFoodById(id: ID): Promise<Food | undefined> {
  return foodsRepo.get(id)
}

export async function saveFood(draft: FoodDraft): Promise<Food> {
  const food = createFood(draft)
  await foodsRepo.put(food)
  emitFoodChanged('food-saved')
  return food
}

export async function updateFood(id: ID, patch: Partial<Food>): Promise<Food> {
  const existing = await foodsRepo.get(id)
  if (!existing) throw new Error('This food no longer exists.')
  const nameChanged = patch.name !== undefined && toSearchName(patch.name) !== existing.searchName
  const next: Food = {
    ...existing,
    ...patch,
    id: existing.id,
    searchName: nameChanged ? toSearchName(patch.name as string) : existing.searchName,
    updatedAt: nowIso(),
  }
  await foodsRepo.put(next)
  emitFoodChanged('food-saved')
  return next
}

/**
 * Removes a reusable food. Historical food logs are intentionally untouched —
 * they keep their own snapshots.
 */
export async function deleteFood(id: ID): Promise<void> {
  await foodsRepo.remove(id)
  emitFoodChanged('food-removed')
}

/** Removes every seed/demo food; user-created foods are never touched. */
export async function deleteSeedFoods(): Promise<number> {
  const all = await foodsRepo.getAll()
  const seeds = all.filter((food) => food.source === 'seed')
  for (const food of seeds) {
    await foodsRepo.remove(food.id)
  }
  if (seeds.length > 0) emitFoodChanged('food-removed')
  return seeds.length
}

/* ------------------------------------------------------------------ */
/* Logging                                                             */
/* ------------------------------------------------------------------ */

export interface LogFoodInput {
  food: Food
  date: ISODate
  meal: MealType
  quantity: number
  unit: ServingUnit
  source?: FoodLog['source']
  note?: string | null
}

/**
 * Logs a quantity of a database food. The log row embeds a full snapshot of
 * the computed nutrition, so later edits to the Food never change it.
 */
export async function logFood(input: LogFoodInput): Promise<FoodLog> {
  const scaled = scaleFood(input.food, input.quantity, input.unit)
  const timestamp = nowIso()
  const log: FoodLog = {
    id: newId(),
    date: input.date,
    loggedAt: timestamp,
    meal: input.meal,
    foodId: input.food.id,
    foodNameSnapshot: input.food.name,
    quantity: input.quantity,
    unit: input.unit,
    calories: scaled.calories,
    protein: scaled.protein,
    carbs: scaled.carbs,
    fat: scaled.fat,
    source: input.source ?? 'database',
    note: input.note ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await foodLogsRepo.put(log)

  // Usage tracking feeds Quick Add; it never affects logged history.
  await updateFood(input.food.id, {
    usageScore: bumpUsageScore(input.food.usageScore),
    lastUsedAt: timestamp,
  })

  emitFoodChanged('log-added')
  return log
}

export interface ManualLogInput {
  date: ISODate
  meal: MealType
  name: string
  quantity: number
  unit: ServingUnit
  calories: number
  protein: number
  carbs: number | null
  fat: number | null
  source?: FoodLog['source']
  note?: string | null
}

/** Logs a one-off food that will not be saved to the database. */
export async function logManualFood(input: ManualLogInput): Promise<FoodLog> {
  const log = createManualFoodLog(input)
  await foodLogsRepo.put(log)
  emitFoodChanged('log-added')
  return log
}

export async function getFoodLogById(id: ID): Promise<FoodLog | undefined> {
  return foodLogsRepo.get(id)
}

export interface FoodLogPatch {
  meal?: MealType
  quantity?: number
  unit?: ServingUnit
  foodNameSnapshot?: string
  calories?: number
  protein?: number
  carbs?: number | null
  fat?: number | null
  note?: string | null
}

/**
 * Edits an existing log row. Nutrition fields are taken from the caller —
 * the edit sheet recomputes them from the (current) food when possible, but
 * the row always ends up with a consistent, explicit snapshot.
 */
export async function updateFoodLog(id: ID, patch: FoodLogPatch): Promise<FoodLog> {
  const existing = await foodLogsRepo.get(id)
  if (!existing) throw new Error('This entry no longer exists.')
  const next: FoodLog = { ...existing, ...patch, updatedAt: nowIso() }
  await foodLogsRepo.put(next)
  emitFoodChanged('log-updated')
  return next
}

/** Removes a log row only; the reusable Food stays in the database. */
export async function deleteFoodLog(id: ID): Promise<void> {
  await foodLogsRepo.remove(id)
  emitFoodChanged('log-removed')
}

/** Re-scales a log's macros from the current food, when still possible. */
export async function computeUpdatedLogMacros(
  log: FoodLog,
  quantity: number,
  unit: ServingUnit,
): Promise<{ calories: number; protein: number; carbs: number | null; fat: number | null } | null> {
  if (log.foodId == null) return null
  const food = await foodsRepo.get(log.foodId)
  if (!food) return null
  try {
    return scaleFood(food, quantity, unit)
  } catch {
    return null
  }
}

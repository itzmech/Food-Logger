/**
 * Default entity factories.
 *
 * Defaults are intentionally empty/null: the app must never invent user
 * progress or personal targets. Every number comes from what the user enters.
 */

import { DEFAULT_JOURNEY_WEEKS, SETTINGS_ID } from '@/lib/constants'
import type { Food, FoodCategory, FoodLog, Goals, ServingUnit, UserSettings } from '@/types'
import { todayISO } from '@/utils/date'
import { newId, nowIso } from '@/utils/id'

export function createDefaultSettings(): UserSettings {
  const timestamp = nowIso()
  return {
    id: SETTINGS_ID,
    name: '',
    units: 'metric',
    theme: 'dark',
    weekStartsOn: 1,
    activeGoalId: null,
    onboardedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createDefaultGoal(): Goals {
  const timestamp = nowIso()
  return {
    id: newId(),
    status: 'active',
    label: `${DEFAULT_JOURNEY_WEEKS}-week journey`,
    startDate: todayISO(),
    weeks: DEFAULT_JOURNEY_WEEKS,
    startWeightKg: null,
    targetWeightKg: null,
    targetWaistCm: null,
    dailyCalories: null,
    dailyProteinG: null,
    weeklyWorkouts: null,
    weeklyCardioMinutes: null,
    notes: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

/** Normalises a food name into the case-insensitive search key. */
export function toSearchName(name: string): string {
  return name.trim().toLowerCase()
}

export interface FoodDraft {
  name: string
  category: FoodCategory
  baseQuantity: number
  baseUnit: ServingUnit
  calories: number
  protein: number
  carbs: number | null
  fat: number | null
  source?: Food['source']
  isFavorite?: boolean
}

/** Builds a Food record from validated form input. */
export function createFood(draft: FoodDraft): Food {
  const timestamp = nowIso()
  return {
    id: newId(),
    name: draft.name.trim(),
    searchName: toSearchName(draft.name),
    category: draft.category,
    baseQuantity: draft.baseQuantity,
    baseUnit: draft.baseUnit,
    calories: draft.calories,
    protein: draft.protein,
    carbs: draft.carbs,
    fat: draft.fat,
    source: draft.source ?? 'custom',
    isFavorite: draft.isFavorite ?? false,
    usageScore: 0,
    lastUsedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export interface ManualLogDraft {
  date: string
  meal: FoodLog['meal']
  name: string
  quantity: number
  unit: ServingUnit
  calories: number
  protein: number
  carbs: number | null
  fat: number | null
}

/** Builds a FoodLog that is independent of the food database (no foodId). */
export function createManualFoodLog(draft: ManualLogDraft): FoodLog {
  const timestamp = nowIso()
  return {
    id: newId(),
    date: draft.date,
    loggedAt: timestamp,
    meal: draft.meal,
    foodId: null,
    foodNameSnapshot: draft.name.trim(),
    quantity: draft.quantity,
    unit: draft.unit,
    calories: draft.calories,
    protein: draft.protein,
    carbs: draft.carbs,
    fat: draft.fat,
    source: 'manual',
    note: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

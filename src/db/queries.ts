/**
 * Composed queries.
 *
 * Small, intention-revealing functions built on the repositories. Hooks call
 * these; components never touch IndexedDB keys or ranges themselves.
 */

import { SETTINGS_ID } from '@/lib/constants'
import type {
  BodyMeasurement,
  CardioSession,
  FoodLog,
  Goals,
  ID,
  MeasurementType,
  MeasurementUnit,
  UserSettings,
  Workout,
} from '@/types'
import type { ISODate } from '@/utils/date'
import { newId, nowIso } from '@/utils/id'
import { createDefaultGoal, createDefaultSettings } from './defaults'
import {
  cardioRepo,
  foodLogsRepo,
  goalsRepo,
  measurementsRepo,
  settingsRepo,
  workoutsRepo,
} from './repositories'

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

/** Returns the settings record, creating the default one on first run. */
export async function getSettings(): Promise<UserSettings> {
  const existing = await settingsRepo.get(SETTINGS_ID)
  if (existing) return existing
  const created = createDefaultSettings()
  await settingsRepo.put(created)
  return created
}

export async function updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getSettings()
  const next: UserSettings = { ...current, ...patch, id: SETTINGS_ID, updatedAt: nowIso() }
  await settingsRepo.put(next)
  return next
}

/* ------------------------------------------------------------------ */
/* Goals                                                               */
/* ------------------------------------------------------------------ */

/** The active goal (most recently started). Undefined until the user sets one. */
export async function getActiveGoal(): Promise<Goals | undefined> {
  const goals = await goalsRepo.getAll()
  const active = goals
    .filter((goal) => goal.status === 'active')
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
  return active[0]
}

/** Creates the goal on first save, patches it afterwards. */
export async function saveActiveGoal(patch: Partial<Goals>): Promise<Goals> {
  const existing = await getActiveGoal()
  const base = existing ?? createDefaultGoal()
  const next: Goals = { ...base, ...patch, status: 'active', updatedAt: nowIso() }
  await goalsRepo.put(next)
  if (!existing) {
    await updateSettings({ activeGoalId: next.id })
  }
  return next
}

/* ------------------------------------------------------------------ */
/* Daily logs                                                          */
/* ------------------------------------------------------------------ */
export async function getFoodLogsForDate(date: ISODate): Promise<FoodLog[]> {
  return foodLogsRepo.getAllByIndex('date', IDBKeyRange.only(date))
}

/** Inclusive range — day keys sort lexicographically. */
export async function getFoodLogsBetween(from: ISODate, to: ISODate): Promise<FoodLog[]> {
  return foodLogsRepo.getAllByIndex('date', IDBKeyRange.bound(from, to))
}
export async function getCardioForDate(date: ISODate): Promise<CardioSession[]> {
  return cardioRepo.getAllByIndex('date', IDBKeyRange.only(date))
}
export async function getCardioBetween(from: ISODate, to: ISODate): Promise<CardioSession[]> {
  return cardioRepo.getAllByIndex('date', IDBKeyRange.bound(from, to))
}

/* ------------------------------------------------------------------ */
/* Workouts (legacy small-workout records, kept for dashboard)         */
/* ------------------------------------------------------------------ */
export async function getWorkoutsForDate(date: ISODate): Promise<Workout[]> {
  return workoutsRepo.getAllByIndex('date', IDBKeyRange.only(date))
}
export async function getWorkoutsBetween(from: ISODate, to: ISODate): Promise<Workout[]> {
  return workoutsRepo.getAllByIndex('date', IDBKeyRange.bound(from, to))
}

/* ------------------------------------------------------------------ */
/* Cardio                                                              */
/* ------------------------------------------------------------------ */

export interface CardioDraft {
  date: ISODate
  type: CardioSession['type']
  durationMinutes: number
  distanceKm?: number | null
  speedKmh?: number | null
  inclinePercent?: number | null
  avgHeartRate?: number | null
  intensity?: CardioSession['intensity']
  /** Manual entry only — estimates are never persisted here. */
  caloriesBurned?: number | null
  note?: string | null
  source?: CardioSession['source']
}

/** Creates a cardio session. Calories are never required. */
export async function saveCardioSession(draft: CardioDraft): Promise<CardioSession> {
  const now = nowIso()
  const next: CardioSession = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    date: draft.date,
    type: draft.type,
    durationMinutes: draft.durationMinutes,
    distanceKm: draft.distanceKm ?? null,
    speedKmh: draft.speedKmh ?? null,
    inclinePercent: draft.inclinePercent ?? null,
    avgHeartRate: draft.avgHeartRate ?? null,
    intensity: draft.intensity ?? null,
    caloriesBurned: draft.caloriesBurned ?? null,
    note: draft.note?.trim() ?? null,
    source: draft.source ?? 'manual',
  }
  await cardioRepo.put(next)
  return next
}

export async function deleteCardioSession(id: ID): Promise<boolean> {
  const existing = await cardioRepo.get(id)
  if (!existing) return false
  await cardioRepo.remove(id)
  return true
}

/* ------------------------------------------------------------------ */
/* Measurements                                                        */
/* ------------------------------------------------------------------ */

export interface MeasurementDraft {
  date: ISODate
  type: MeasurementType
  value: number
  unit: MeasurementUnit
  note?: string | null
}

/** Records a body measurement (e.g. a weight reading). */
export async function saveBodyMeasurement(
  draft: MeasurementDraft,
): Promise<BodyMeasurement> {
  const now = nowIso()
  const next: BodyMeasurement = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    date: draft.date,
    type: draft.type,
    value: draft.value,
    unit: draft.unit,
    note: draft.note?.trim() ?? null,
  }
  await measurementsRepo.put(next)
  return next
}

export async function deleteBodyMeasurement(id: ID): Promise<boolean> {
  const existing = await measurementsRepo.get(id)
  if (!existing) return false
  await measurementsRepo.remove(id)
  return true
}

/* ------------------------------------------------------------------ */
/* Measurements (reads)                                                */
/* ------------------------------------------------------------------ */

/** Most recent measurement of a given type (weight, waist, …). */
export async function getLatestMeasurement(
  type: MeasurementType,
): Promise<BodyMeasurement | undefined> {
  const rows = await measurementsRepo.getAllByIndex('type+date')
  const matching = rows.filter((row) => row.type === type)
  matching.sort((a, b) => b.date.localeCompare(a.date))
  return matching[0]
}

/** Measurements of one type inside an inclusive date range. */
export async function getMeasurementsBetween(
  type: MeasurementType,
  from: ISODate,
  to: ISODate,
): Promise<BodyMeasurement[]> {
  return measurementsRepo.getAllByIndex('type+date', IDBKeyRange.bound([type, from], [type, to]))
}

import type { ID, ISODate, Timestamped } from './common'

/** Body metrics tracked over the journey. */
export type MeasurementType =
  | 'weight'
  | 'waist'
  | 'chest'
  | 'hips'
  | 'arm'
  | 'thigh'
  | 'bodyFat'
  | 'other'

export const MEASUREMENT_TYPES: MeasurementType[] = [
  'weight',
  'waist',
  'chest',
  'hips',
  'arm',
  'thigh',
  'bodyFat',
  'other',
]

export type MeasurementUnit = 'kg' | 'cm' | '%'

/**
 * One measurement value on one day. Storing a single value per record
 * (instead of a wide row) keeps charts and new metrics trivial to add.
 */
export interface BodyMeasurement extends Timestamped {
  id: ID
  date: ISODate
  type: MeasurementType
  value: number
  unit: MeasurementUnit
  note: string | null
}

export type PhotoPose = 'front' | 'side' | 'back' | 'other'

/**
 * Progress photos live in IndexedDB as Blobs — they never leave the device.
 * `weightKg` optionally links a photo to the scale reading of that day.
 */
export interface ProgressPhoto extends Timestamped {
  id: ID
  date: ISODate
  blob: Blob
  mime: string
  pose: PhotoPose
  weightKg: number | null
  note: string | null
}

export type CardioType =
  | 'walk'
  | 'jog'
  | 'run'
  | 'cycling'
  | 'swimming'
  | 'stairs'
  | 'rope'
  | 'hiit'
  | 'other'

export const CARDIO_TYPE_LABELS: Record<CardioType, string> = {
  walk: 'Walking',
  jog: 'Jogging',
  run: 'Running',
  cycling: 'Cycling',
  swimming: 'Swimming',
  stairs: 'Stairs',
  rope: 'Jump rope',
  hiit: 'HIIT',
  other: 'Other',
}

export type CardioIntensity = 'low' | 'moderate' | 'high'

/**
 * Where a cardio record came from. `manual` = typed by the user,
 * `imported` = arrived via a device/sync layer (e.g. Health Connect
 * later). Estimated calories are never stored on the session —
 * they are derived at read time, so provenance stays unambiguous.
 */
export type ActivitySource = 'manual' | 'imported'

export interface CardioSession extends Timestamped {
  id: ID
  date: ISODate
  type: CardioType
  durationMinutes: number
  distanceKm: number | null
  /** Average speed in km/h, when the user recorded it. */
  speedKmh: number | null
  /** Grade in percent (e.g. 10 = 10%), when the user recorded it. */
  inclinePercent: number | null
  avgHeartRate: number | null
  intensity: CardioIntensity | null
  /**
   * Calories entered by the user or imported from a device.
   * Never required, never estimated — the derived estimate lives
   * in `src/lib/activityEstimate.ts` and is computed on read.
   */
  caloriesBurned: number | null
  note: string | null
  /** Provenance: manual entry vs. imported from a device/sync layer. */
  source: ActivitySource
}

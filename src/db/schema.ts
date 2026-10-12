/**
 * Declarative IndexedDB schema.
 *
 * The whole schema is described here once, and `database.ts` applies it during
 * `onupgradeneeded`. Adding a store or index in a future phase means editing
 * this file and bumping `DB_VERSION` — never touching component code.
 */

export const DB_NAME = 'freebuff-fitness'

/**
 * Bump when `STORE_SCHEMAS` changes. Future migrations live in
 * `database.ts → applySchema` (switch on `oldVersion`).
 */
export const DB_VERSION = 11
export interface IndexSchema {
  name: string
  keyPath: string | string[]
  unique?: boolean
  multiEntry?: boolean
}

export interface StoreSchema {
  name: StoreName
  keyPath: string | string[]
  indexes: IndexSchema[]
}

export const STORE_NAMES = [
  'settings',
  'goals',
  'foods',
  'foodLogs',
  'menus',
  'menuItems',
  'menuOverrides',
  'cardio',
  'measurements',
  'photos',
  'workouts',
  'workoutSets',

  'exercises',
  'workoutTemplates',
  'workoutTemplateExercises',
  'workoutSessions',
  'workoutSessionExercises',
  'workoutSessionSets',
  'completedWorkouts',
  'completedWorkoutExercises',
  'completedWorkoutSets',

  'dailyStrengthLogs',
  'dayPlans',
  'tasks',
] as const
export type StoreName = (typeof STORE_NAMES)[number]

export const STORE_SCHEMAS: StoreSchema[] = [
  {
    name: 'settings',
    keyPath: 'id',
    indexes: [],
  },
  {
    name: 'goals',
    keyPath: 'id',
    indexes: [
      { name: 'status', keyPath: 'status' },
      { name: 'startDate', keyPath: 'startDate' },
    ],
  },
  {
    name: 'foods',
    keyPath: 'id',
    indexes: [
      { name: 'searchName', keyPath: 'searchName' },
      { name: 'category', keyPath: 'category' },
    ],
  },
  {
    name: 'foodLogs',
    keyPath: 'id',
    indexes: [
      { name: 'date', keyPath: 'date' },
      { name: 'foodId', keyPath: 'foodId' },
      { name: 'date+meal', keyPath: ['date', 'meal'] },
    ],
  },
  {
    name: 'menus',
    keyPath: 'id',
    indexes: [{ name: 'month', keyPath: 'month', unique: true }],
  },
  {
    name: 'menuItems',
    keyPath: 'id',
    indexes: [
      { name: 'foodId', keyPath: 'foodId' },
      { name: 'status', keyPath: 'status' },
    ],
  },
  {
    name: 'menuOverrides',
    keyPath: 'id',
    indexes: [
      { name: 'menuId', keyPath: 'menuId' },
      { name: 'date', keyPath: 'date' },
    ],
  },
  {
    name: 'cardio',
    keyPath: 'id',
    indexes: [
      { name: 'date', keyPath: 'date' },
      { name: 'type', keyPath: 'type' },
    ],
  },
  {
    name: 'workouts',
    keyPath: 'id',
    indexes: [
      { name: 'date', keyPath: 'date' },
      { name: 'status', keyPath: 'status' },
    ],
  },
  {
    name: 'workoutSets',
    keyPath: 'id',
    indexes: [
      { name: 'workoutId', keyPath: 'workoutId' },
      { name: 'exerciseId', keyPath: 'exerciseId' },
    ],
  },
  {
    name: 'measurements',
    keyPath: 'id',
    indexes: [
      { name: 'date', keyPath: 'date' },
      { name: 'type+date', keyPath: ['type', 'date'] },
    ],
  },
  {
    name: 'photos',
    keyPath: 'id',
    indexes: [{ name: 'date', keyPath: 'date' }],
  },
  {
    name: 'exercises',
    keyPath: 'id',
    indexes: [
      { name: 'searchName', keyPath: 'searchName' },
      { name: 'category', keyPath: 'category' },
    ],
  },
  {
    name: 'workoutTemplates',
    keyPath: 'id',
    indexes: [],
  },
  {
    name: 'workoutTemplateExercises',
    keyPath: 'id',
    indexes: [
      { name: 'templateId', keyPath: 'templateId' },
      { name: 'exerciseId', keyPath: 'exerciseId' },
    ],
  },
  {
    name: 'workoutSessions',
    keyPath: 'id',
    indexes: [],
  },
  {
    name: 'workoutSessionExercises',
    keyPath: 'id',
    indexes: [
      { name: 'sessionId', keyPath: 'sessionId' },
      { name: 'exerciseId', keyPath: 'exerciseId' },
    ],
  },
  {
    name: 'workoutSessionSets',
    keyPath: 'id',
    indexes: [
      { name: 'workoutExerciseId', keyPath: 'workoutExerciseId' },
      { name: 'sessionId', keyPath: 'sessionId' },
    ],
  },
  {
    name: 'completedWorkouts',
    keyPath: 'id',
    indexes: [
      { name: 'completedAtLocal', keyPath: 'completedAtLocal' },
      { name: 'sessionId', keyPath: 'workoutSessionId' },
    ],
  },
  {
    name: 'completedWorkoutExercises',
    keyPath: 'id',
    indexes: [
      { name: 'sessionId', keyPath: 'sessionId' },
      { name: 'exerciseId', keyPath: 'exerciseId' },
    ],
  },
  {
    name: 'completedWorkoutSets',
    keyPath: 'id',
    indexes: [
      { name: 'workoutExerciseId', keyPath: 'workoutExerciseId' },
      { name: 'sessionId', keyPath: 'sessionId' },
    ],
  },
  {
    name: 'dailyStrengthLogs',
    keyPath: 'id',
    indexes: [
      { name: 'date', keyPath: 'date' },
      { name: 'date+exerciseId', keyPath: ['date', 'exerciseId'], unique: true },
      { name: 'exerciseId', keyPath: 'exerciseId' },
      { name: 'skipped', keyPath: 'skipped' },
    ],
  },
  {
    name: 'dayPlans',
    keyPath: 'id',
    indexes: [
      { name: 'date', keyPath: 'date', unique: true },
      { name: 'dayOfWeek', keyPath: 'dayOfWeek' },
    ],
  },
  {
    name: 'tasks',
    keyPath: 'id',
    indexes: [
      { name: 'status', keyPath: 'status' },
      { name: 'dueDate', keyPath: 'dueDate' },
      { name: 'dueDate+status', keyPath: ['dueDate', 'status'] },
      { name: 'category', keyPath: 'category' },
    ],
  },
]

export const STORE_SCHEMA_BY_NAME: Record<StoreName, StoreSchema> = Object.fromEntries(
  STORE_SCHEMAS.map((schema) => [schema.name, schema]),
) as Record<StoreName, StoreSchema>

/**
 * Field migrations applied by `applySchema` when opening a database written
 * by an older app version. Each entry upgrades rows in place; rows that were
 * already written in the current shape are left untouched.
 */
export type RecordMigration = (record: Record<string, unknown>) => Record<string, unknown> | null

export const RECORD_MIGRATIONS: Record<StoreName, RecordMigration[]> = {
  settings: [],
  goals: [],
  foods: [
    (record) => {
      const v1 = record as {
        defaultServing?: { label?: string; grams?: number | null }
        macrosPerServing?: { calories?: number; proteinG?: number; carbsG?: number | null; fatG?: number | null }
        baseQuantity?: unknown
        baseUnit?: unknown
        calories?: unknown
        protein?: unknown
        carbs?: unknown
        fat?: unknown
      }
      if (typeof v1.baseQuantity === 'number' && typeof v1.baseUnit === 'string') return null
      const baseQuantity =
        typeof v1.defaultServing?.grams === 'number' && v1.defaultServing.grams > 0
          ? v1.defaultServing.grams
          : 100
      const label = (v1.defaultServing?.label ?? '').toLowerCase()
      let baseUnit: string = 'g'
      if (label.includes('ml')) baseUnit = 'ml'
      else if (label.includes('scoop')) baseUnit = 'scoop'
      else if (label.includes('bowl')) baseUnit = 'bowl'
      else if (label.includes('piece') || label.includes('egg')) baseUnit = 'piece'
      else if (label.includes('serving')) baseUnit = 'serving'
      return {
        ...record,
        baseQuantity,
        baseUnit,
        calories: typeof v1.calories === 'number' ? v1.calories : (v1.macrosPerServing?.calories ?? 0),
        protein: typeof v1.protein === 'number' ? v1.protein : (v1.macrosPerServing?.proteinG ?? 0),
        carbs: typeof v1.carbs === 'number' ? v1.carbs : (v1.macrosPerServing?.carbsG ?? null),
        fat: typeof v1.fat === 'number' ? v1.fat : (v1.macrosPerServing?.fatG ?? null),
        usageScore: 0,
        lastUsedAt: null,
      }
    },
  ],
  foodLogs: [
    (record) => {
      const v1 = record as {
        mealType?: string
        meal?: unknown
        servingLabel?: string | null
        unit?: unknown
        foodNameSnapshot?: unknown
        name?: unknown
        protein?: unknown
        proteinG?: unknown
        carbs?: unknown
        carbsG?: unknown
        fat?: unknown
        fatG?: unknown
        source?: unknown
      }
      if (typeof v1.meal === 'string' && typeof v1.unit === 'string') return null
      let unit = 'g'
      const label = (v1.servingLabel ?? '').toLowerCase()
      if (label.includes('ml')) unit = 'ml'
      else if (label.includes('scoop')) unit = 'scoop'
      else if (label.includes('bowl')) unit = 'bowl'
      else if (label.includes('piece')) unit = 'piece'
      else if (label.includes('serving')) unit = 'serving'
      const mealRaw = v1.mealType ?? 'other'
      return {
        ...record,
        meal: mealRaw === 'other' ? 'outside' : mealRaw,
        foodNameSnapshot: v1.foodNameSnapshot ?? v1.name ?? 'Food',
        protein: typeof v1.protein === 'number' ? v1.protein : (v1.proteinG ?? 0),
        carbs: typeof v1.carbs === 'number' ? v1.carbs : (v1.carbsG ?? null),
        fat: typeof v1.fat === 'number' ? v1.fat : (v1.fatG ?? null),
        unit,
      }
    },
  ],
  menus: [],
  menuItems: [],
  menuOverrides: [],
  cardio: [
    (record) => {
      // v6: provenance + optional speed/incline for estimates.
      if (typeof record.source === 'string') return null
      return {
        ...record,
        source: 'manual',
        speedKmh: typeof record.speedKmh === 'number' ? record.speedKmh : null,
        inclinePercent:
          typeof record.inclinePercent === 'number' ? record.inclinePercent : null,
      }
    },
  ],
  measurements: [],
  photos: [],
  workouts: [],
  workoutSets: [],

  exercises: [
    (record) => {
      const v = record as {
        equipmentOptions?: unknown
        defaultEquipment?: unknown
        builtIn?: unknown
      }
      if (Array.isArray(v.equipmentOptions) && typeof v.defaultEquipment === 'string' && typeof v.builtIn === 'boolean') return null
      return {
        ...record,
        equipmentOptions: (v.equipmentOptions instanceof Array ? v.equipmentOptions : []),
        defaultEquipment: typeof v.defaultEquipment === 'string' ? v.defaultEquipment : '',
        builtIn: typeof v.builtIn === 'boolean' ? v.builtIn : false,
      } as Record<string, unknown>
    },
  ],
  workoutTemplates: [],
  workoutTemplateExercises: [],
  workoutSessions: [
    (record) => {
      const v = record as { active?: unknown }
      if (typeof v.active === 'boolean') return null
      return { ...record, active: true } as Record<string, unknown>
    },
  ],
  workoutSessionExercises: [
    (record) => {
      const v = record as {
        exerciseEquipmentSnapshot?: unknown
        exerciseEquipmentOptionsSnapshot?: unknown
        builtInSnapshot?: unknown
      }
      if (typeof v.exerciseEquipmentSnapshot === 'string' && Array.isArray(v.exerciseEquipmentOptionsSnapshot) && typeof v.builtInSnapshot === 'boolean') return null
      return {
        ...record,
        exerciseEquipmentSnapshot: typeof v.exerciseEquipmentSnapshot === 'string' ? v.exerciseEquipmentSnapshot : '',
        exerciseEquipmentOptionsSnapshot: v.exerciseEquipmentOptionsSnapshot instanceof Array ? v.exerciseEquipmentOptionsSnapshot : [],
        builtInSnapshot: typeof v.builtInSnapshot === 'boolean' ? v.builtInSnapshot : false,
      } as Record<string, unknown>
    },
  ],
  workoutSessionSets: [],
  completedWorkouts: [
    (record) => {
      if (typeof (record as { completedAtLocal?: unknown }).completedAtLocal === 'string') return null
      return {
        ...record,
        completedAtLocal: (record as { date?: string }).date ?? (record as { completedAt?: string }).completedAt?.slice(0, 10) ?? '',
      } as Record<string, unknown>
    },
  ],
  completedWorkoutExercises: [
    (record) => {
      const v = record as {
        exerciseEquipmentSnapshot?: unknown
        exerciseEquipmentOptionsSnapshot?: unknown
        builtInSnapshot?: unknown
      }
      if (typeof v.exerciseEquipmentSnapshot === 'string' && Array.isArray(v.exerciseEquipmentOptionsSnapshot) && typeof v.builtInSnapshot === 'boolean') return null
      return {
        ...record,
        exerciseEquipmentSnapshot: typeof v.exerciseEquipmentSnapshot === 'string' ? v.exerciseEquipmentSnapshot : '',
        exerciseEquipmentOptionsSnapshot: v.exerciseEquipmentOptionsSnapshot instanceof Array ? v.exerciseEquipmentOptionsSnapshot : [],
        builtInSnapshot: typeof v.builtInSnapshot === 'boolean' ? v.builtInSnapshot : false,
      } as Record<string, unknown>
    },
  ],
  completedWorkoutSets: [],

  dailyStrengthLogs: [
    (record) => {
      const v = record as { skipped?: unknown }
      if (typeof v.skipped === 'boolean') return null
      return { ...record, skipped: false } as Record<string, unknown>
    },
  ],
  dayPlans: [],
  tasks: [],
}

/** Built-in common-exercise catalog.
 *
 * Deterministic, local, offline data. Seeded once into the exercises store
 * when the app first creates its database (empty exercises store).
 *
 * Each entry carries:
 *  - equipmentOptions: the allowed equipment for that exercise
 *  - defaultEquipment: the sensible default selection
 *  - builtIn: true (guards these from accidental deletion in the library UI)
 */

import type { ExerciseCategory } from '@/types'
import { exercisesRepo } from '@/db'
import { newId, nowIso } from '@/utils/id'
import type { Exercise } from '@/types'

interface CatalogEntry {
  name: string
  category: ExerciseCategory
  equipmentOptions: string[]
  defaultEquipment: string
  notes: string | null
}

const CATALOG: CatalogEntry[] = [
  // CHEST
  { name: 'Bench Press', category: 'chest', equipmentOptions: ['Barbell', 'Dumbbell', 'Smith Machine', 'Other'], defaultEquipment: 'Barbell', notes: null },
  { name: 'Incline Bench Press', category: 'chest', equipmentOptions: ['Barbell', 'Dumbbell', 'Smith Machine', 'Other'], defaultEquipment: 'Barbell', notes: null },
  { name: 'Decline Bench Press', category: 'chest', equipmentOptions: ['Barbell', 'Dumbbell', 'Smith Machine', 'Other'], defaultEquipment: 'Barbell', notes: null },
  { name: 'Dumbbell Bench Press', category: 'chest', equipmentOptions: ['Dumbbell', 'Machine', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Incline Dumbbell Press', category: 'chest', equipmentOptions: ['Dumbbell', 'Machine', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Dumbbell Fly', category: 'chest', equipmentOptions: ['Dumbbell', 'Cable', 'Machine', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Cable Fly', category: 'chest', equipmentOptions: ['Cable', 'Machine', 'Other'], defaultEquipment: 'Cable', notes: null },
  { name: 'Pec Deck', category: 'chest', equipmentOptions: ['Machine', 'Other'], defaultEquipment: 'Machine', notes: null },
  { name: 'Push-Up', category: 'chest', equipmentOptions: ['Bodyweight', 'Other'], defaultEquipment: 'Bodyweight', notes: null },

  // BACK
  { name: 'Lat Pulldown', category: 'back', equipmentOptions: ['Cable', 'Machine', 'Other'], defaultEquipment: 'Cable', notes: null },
  { name: 'Pull-Up', category: 'back', equipmentOptions: ['Bodyweight', 'Other'], defaultEquipment: 'Bodyweight', notes: null },
  { name: 'Chin-Up', category: 'back', equipmentOptions: ['Bodyweight', 'Other'], defaultEquipment: 'Bodyweight', notes: null },
  { name: 'Seated Cable Row', category: 'back', equipmentOptions: ['Cable', 'Machine', 'Other'], defaultEquipment: 'Cable', notes: null },
  { name: 'One-Arm Dumbbell Row', category: 'back', equipmentOptions: ['Dumbbell', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Barbell Row', category: 'back', equipmentOptions: ['Barbell', 'Other'], defaultEquipment: 'Barbell', notes: null },
  { name: 'Chest-Supported Row', category: 'back', equipmentOptions: ['Machine', 'Other'], defaultEquipment: 'Machine', notes: null },
  { name: 'Straight-Arm Pulldown', category: 'back', equipmentOptions: ['Cable', 'Other'], defaultEquipment: 'Cable', notes: null },
  { name: 'Cable Row', category: 'back', equipmentOptions: ['Cable', 'Other'], defaultEquipment: 'Cable', notes: null },

  // SHOULDERS
  { name: 'Overhead Press', category: 'shoulders', equipmentOptions: ['Barbell', 'Dumbbell', 'Machine', 'Other'], defaultEquipment: 'Barbell', notes: null },
  { name: 'Dumbbell Shoulder Press', category: 'shoulders', equipmentOptions: ['Dumbbell', 'Machine', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Arnold Press', category: 'shoulders', equipmentOptions: ['Dumbbell', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Lateral Raise', category: 'shoulders', equipmentOptions: ['Dumbbell', 'Cable', 'Machine', 'Resistance Band', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Front Raise', category: 'shoulders', equipmentOptions: ['Dumbbell', 'Cable', 'Resistance Band', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Rear Delt Fly', category: 'shoulders', equipmentOptions: ['Dumbbell', 'Machine', 'Cable', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Face Pull', category: 'shoulders', equipmentOptions: ['Cable', 'Other'], defaultEquipment: 'Cable', notes: null },
  { name: 'Cable Lateral Raise', category: 'shoulders', equipmentOptions: ['Cable', 'Other'], defaultEquipment: 'Cable', notes: null },

  // LEGS
  { name: 'Squat', category: 'legs', equipmentOptions: ['Barbell', 'Dumbbell', 'Smith Machine', 'Bodyweight', 'Kettlebell', 'Other'], defaultEquipment: 'Barbell', notes: null },
  { name: 'Goblet Squat', category: 'legs', equipmentOptions: ['Dumbbell', 'Kettlebell', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Leg Press', category: 'legs', equipmentOptions: ['Machine', 'Other'], defaultEquipment: 'Machine', notes: null },
  { name: 'Romanian Deadlift', category: 'legs', equipmentOptions: ['Barbell', 'Dumbbell', 'Other'], defaultEquipment: 'Barbell', notes: null },
  { name: 'Dumbbell Romanian Deadlift', category: 'legs', equipmentOptions: ['Dumbbell', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Leg Extension', category: 'legs', equipmentOptions: ['Machine', 'Other'], defaultEquipment: 'Machine', notes: null },
  { name: 'Leg Curl', category: 'legs', equipmentOptions: ['Machine', 'Other'], defaultEquipment: 'Machine', notes: null },
  { name: 'Bulgarian Split Squat', category: 'legs', equipmentOptions: ['Dumbbell', 'Bodyweight', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Walking Lunge', category: 'legs', equipmentOptions: ['Dumbbell', 'Bodyweight', 'Other'], defaultEquipment: 'Bodyweight', notes: null },
  { name: 'Reverse Lunge', category: 'legs', equipmentOptions: ['Dumbbell', 'Bodyweight', 'Other'], defaultEquipment: 'Bodyweight', notes: null },
  { name: 'Calf Raise', category: 'legs', equipmentOptions: ['Machine', 'Bodyweight', 'Other'], defaultEquipment: 'Machine', notes: null },
  { name: 'Seated Calf Raise', category: 'legs', equipmentOptions: ['Machine', 'Other'], defaultEquipment: 'Machine', notes: null },

  // BICEPS
  { name: 'Dumbbell Curl', category: 'arms', equipmentOptions: ['Dumbbell', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Barbell Curl', category: 'arms', equipmentOptions: ['Barbell', 'EZ Bar', 'Other'], defaultEquipment: 'Barbell', notes: null },
  { name: 'Hammer Curl', category: 'arms', equipmentOptions: ['Dumbbell', 'Cable', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Incline Dumbbell Curl', category: 'arms', equipmentOptions: ['Dumbbell', 'Cable', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Cable Curl', category: 'arms', equipmentOptions: ['Cable', 'Machine', 'Other'], defaultEquipment: 'Cable', notes: null },
  { name: 'Preacher Curl', category: 'arms', equipmentOptions: ['Barbell', 'Dumbbell', 'Machine', 'Other'], defaultEquipment: 'Barbell', notes: null },

  // TRICEPS
  { name: 'Tricep Pushdown', category: 'arms', equipmentOptions: ['Cable', 'Machine', 'Other'], defaultEquipment: 'Cable', notes: null },
  { name: 'Overhead Tricep Extension', category: 'arms', equipmentOptions: ['Dumbbell', 'Cable', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Dumbbell Tricep Extension', category: 'arms', equipmentOptions: ['Dumbbell', 'Cable', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Skull Crushers', category: 'arms', equipmentOptions: ['Barbell', 'EZ Bar', 'Dumbbell', 'Other'], defaultEquipment: 'Barbell', notes: null },
  { name: 'Close-Grip Bench Press', category: 'arms', equipmentOptions: ['Barbell', 'EZ Bar', 'Machine', 'Other'], defaultEquipment: 'Barbell', notes: null },
  { name: 'Cable Overhead Extension', category: 'arms', equipmentOptions: ['Cable', 'Machine', 'Other'], defaultEquipment: 'Cable', notes: null },

  // LEGS
  { name: 'Squat', category: 'legs', equipmentOptions: ['Barbell', 'Dumbbell', 'Smith Machine', 'Bodyweight', 'Kettlebell', 'Other'], defaultEquipment: 'Barbell', notes: null },
  { name: 'Goblet Squat', category: 'legs', equipmentOptions: ['Dumbbell', 'Kettlebell', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Leg Press', category: 'legs', equipmentOptions: ['Machine', 'Other'], defaultEquipment: 'Machine', notes: null },
  { name: 'Romanian Deadlift', category: 'legs', equipmentOptions: ['Barbell', 'Dumbbell', 'Other'], defaultEquipment: 'Barbell', notes: null },
  { name: 'Dumbbell Romanian Deadlift', category: 'legs', equipmentOptions: ['Dumbbell', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Leg Extension', category: 'legs', equipmentOptions: ['Machine', 'Other'], defaultEquipment: 'Machine', notes: null },
  { name: 'Leg Curl', category: 'legs', equipmentOptions: ['Machine', 'Other'], defaultEquipment: 'Machine', notes: null },
  { name: 'Bulgarian Split Squat', category: 'legs', equipmentOptions: ['Dumbbell', 'Bodyweight', 'Other'], defaultEquipment: 'Dumbbell', notes: null },
  { name: 'Walking Lunge', category: 'legs', equipmentOptions: ['Dumbbell', 'Bodyweight', 'Other'], defaultEquipment: 'Bodyweight', notes: null },
  { name: 'Reverse Lunge', category: 'legs', equipmentOptions: ['Dumbbell', 'Bodyweight', 'Other'], defaultEquipment: 'Bodyweight', notes: null },
  { name: 'Calf Raise', category: 'legs', equipmentOptions: ['Machine', 'Bodyweight', 'Other'], defaultEquipment: 'Machine', notes: null },
  { name: 'Seated Calf Raise', category: 'legs', equipmentOptions: ['Machine', 'Other'], defaultEquipment: 'Machine', notes: null },

  // CORE
  { name: 'Plank', category: 'core', equipmentOptions: ['Bodyweight', 'Other'], defaultEquipment: 'Bodyweight', notes: null },
  { name: 'Cable Crunch', category: 'core', equipmentOptions: ['Cable', 'Other'], defaultEquipment: 'Cable', notes: null },
  { name: 'Crunch', category: 'core', equipmentOptions: ['Bodyweight', 'Other'], defaultEquipment: 'Bodyweight', notes: null },
  { name: 'Leg Raise', category: 'core', equipmentOptions: ['Bodyweight', 'Other'], defaultEquipment: 'Bodyweight', notes: null },
  { name: 'Hanging Leg Raise', category: 'core', equipmentOptions: ['Bodyweight', 'Other'], defaultEquipment: 'Bodyweight', notes: null },
  { name: 'Russian Twist', category: 'core', equipmentOptions: ['Bodyweight', 'Dumbbell', 'Other'], defaultEquipment: 'Bodyweight', notes: null },
]

export function isBuiltInExerciseName(name: string): boolean {
  return CATALOG.some((e) => e.name === name)
}

export async function seedBuiltInExercises(): Promise<void> {
  const existing = await exercisesRepo.getAll()
  if (existing.length > 0) return

  const now = nowIso()
  const rows: Exercise[] = CATALOG.map((entry) => ({
    id: newId(),
    name: entry.name,
    category: entry.category,
    equipment: entry.defaultEquipment,
    equipmentOptions: entry.equipmentOptions,
    defaultEquipment: entry.defaultEquipment,
    builtIn: true,
    notes: entry.notes,
    createdAt: now,
    updatedAt: now,
  }))
  await exercisesRepo.putAll(rows)
}

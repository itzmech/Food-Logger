/**
 * Domain model entry point.
 *
 * Every entity lives in its own module so future phases (food tracker,
 * workout tracker, menu importer, sync layer) can extend one area without
 * touching the others.
 */

export type { ID, ISODate, ISODateTime, Timestamped, SyncStatus, Syncable } from './common'

export type { UserSettings, Goals, GoalStatus } from './settings'

export type {
  MealType,
  FoodCategory,
  ServingUnit,
  Food,
  FoodLog,
  FoodLogSource,
} from './food'
export {
  MEAL_TYPES,
  MEAL_LABELS,
  SERVING_UNITS,
  SERVING_UNIT_LABELS,
  FOOD_CATEGORIES,
  FOOD_CATEGORY_LABELS,
} from './food'

export type {
  MenuItem,
  MenuDay,
  MessMenu,
  MenuOverride,
  MenuOverrideKind,
  MenuItemStatus,
  MenuOverrideSummary,
  MenuSnapshot,
  MenuSnapshotDay,
} from './menu'

export type {
  DailyStrengthLog,
  DayPlan,
  DayPlanExercise,
  ExerciseCategory,
  Exercise,
  ExercisePR,
  StrengthSet,
  WorkoutTemplate,
  WorkoutTemplateExercise,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSessionSet,
  CompletedWorkout,
  CompletedWorkoutExercise,
  CompletedWorkoutSet,
} from './workout'
export {
  EXERCISE_CATEGORY_LABELS,
  bestTodayForLog,
  estimated1RM,
  formatReps,
  volumeForSet,
  isCountedWorkoutDay,
} from './workout'

export type {
  CardioSession,
  CardioType,
  CardioIntensity,
  ActivitySource,
} from './progress'
export { CARDIO_TYPE_LABELS } from './progress'

export type {
  Task,
  TaskDraft,
  TaskPriority,
  TaskStatus,
  TaskCategory,
} from './tasks'
export {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  TASK_PRIORITIES_ORDER,
} from './tasks'

export type {
  Workout,
  WorkoutStatus,
} from './workout'
export type {
  MeasurementType,
  MeasurementUnit,
  BodyMeasurement,
  PhotoPose,
  ProgressPhoto,
} from './progress'
export { MEASUREMENT_TYPES } from './progress'

/** Database layer public API. Components and hooks import from here. */

export { DB_NAME, DB_VERSION, RECORD_MIGRATIONS, STORE_NAMES, STORE_SCHEMAS } from './schema'
export type { StoreName, StoreSchema, IndexSchema } from './schema'

export {
  clearAllStores,
  closeDatabase,
  destroyDatabase,
  getDatabase,
  initDatabase,
} from './database'

export type { Repository } from './repository'
export { createRepository } from './repository'

export {
  cardioRepo,
  foodLogsRepo,
  foodsRepo,
  goalsRepo,
  measurementsRepo,
  menuOverridesRepo,
  menusRepo,
  photosRepo,
  settingsRepo,
} from './repositories'

export {
  dailyStrengthLogsRepo,
  dayPlansRepo,
  exercisesRepo,
  workoutTemplatesRepo,
  workoutTemplateExercisesRepo,
  workoutSessionsRepo,
  workoutSessionExercisesRepo,
  workoutSessionSetsRepo,
  completedWorkoutsRepo,
  completedWorkoutExercisesRepo,
  completedWorkoutSetsRepo,
} from './repositories'
export {
  getWorkoutsBetween,
  getWorkoutsForDate,
} from './queries'
export {
  listExercises,
  createExercise,
} from './workoutQueries'
export {
  deleteBodyMeasurement,
  deleteCardioSession,
  getActiveGoal,
  getCardioBetween,
  getCardioForDate,
  getFoodLogsBetween,
  getFoodLogsForDate,
  getLatestMeasurement,
  getMeasurementsBetween,
  getSettings,
  saveActiveGoal,
  saveBodyMeasurement,
  saveCardioSession,
  updateSettings,
} from './queries'
export { groupTasksForDay } from './taskQueries'
export {
  listCompletedWorkouts,
  listCompletedWorkoutsBetween,
} from './workoutQueries'
export {
  getDailyStrengthLog,
  getStrengthLogsForDate,
  getStrengthLogsBetween,
  getStrengthLogsForRange,
  recentExerciseIds,
  saveStrengthSet,
  saveDailyLogExercise,
  deleteDailyLogExercise,
  setDailyLogSkipped,
  previousSessionForExercise,
  computeExercisePR,
  listExerciseLogsForExercise,
  getDayPlanForDate,
  getDayPlanForDayOfWeek,
  saveDayPlan,
  deleteDayPlan,
} from './strengthLogQueries'
export type { CardioDraft, MeasurementDraft } from './queries'

export { createDefaultGoal, createDefaultSettings } from './defaults'
export type { FoodDraft } from './defaults'
export { getMenu, listMenus, createMenu, saveMenu, getMenuItem, listMenuItems, listMenuItemsForFood, saveMenuItem, insertMenuItem, getOverride, saveOverride, deleteOverride, resolveMonth, copyMonth, seedDemoMenus } from './menuQueries'
export type { MessMenu, MenuDay, MenuItem, MenuOverride, MenuOverrideKind, MenuOverrideSummary, MenuSnapshot, MenuSnapshotDay } from '@/types'

export {
  computeUpdatedLogMacros,
  deleteFood,
  deleteFoodLog,
  deleteSeedFoods,
  getFoodById,
  getFoodLogById,
  listFoods,
  logFood,
  logManualFood,
  saveFood,
  updateFood,
  updateFoodLog,
} from './foodQueries'
export type { FoodLogPatch, LogFoodInput, ManualLogInput } from './foodQueries'

export {
  EXPORT_FORMAT,
  ImportError,
  downloadExport,
  exportDatabase,
  importDatabase,
  resetDatabase,
} from './dataTransfer'
export type { DatabaseExport } from './dataTransfer'

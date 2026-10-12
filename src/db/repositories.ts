/**
 * One repository per store. Import these instead of touching IndexedDB
 * directly - this is the seam a future sync layer plugs into.
 */

import type {
  DailyStrengthLog,
  DayPlan,
  Exercise,
  WorkoutTemplate,
  WorkoutTemplateExercise,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSessionSet,
  CompletedWorkout,
  CompletedWorkoutExercise,
  CompletedWorkoutSet,
} from '@/types'
import type {
  BodyMeasurement,
  CardioSession,
  Food,
  FoodLog,
  Goals,
  MenuItem,
  MenuOverride,
  MessMenu,
  ProgressPhoto,
  Task,
  UserSettings,
} from '@/types'
import type { Workout } from '@/types'
import { createRepository } from './repository'

export const settingsRepo = createRepository<UserSettings>('settings')
export const goalsRepo = createRepository<Goals>('goals')
export const foodsRepo = createRepository<Food>('foods')
export const foodLogsRepo = createRepository<FoodLog>('foodLogs')
export const menusRepo = createRepository<MessMenu>('menus')
export const menuItemsRepo = createRepository<MenuItem>('menuItems')
export const menuOverridesRepo = createRepository<MenuOverride>('menuOverrides')
export const cardioRepo = createRepository<CardioSession>('cardio')
export const measurementsRepo = createRepository<BodyMeasurement>('measurements')
export const photosRepo = createRepository<ProgressPhoto>('photos')

export const workoutsRepo = createRepository<Workout>('workouts')
export const workoutSetsRepo = createRepository<Workout>('workoutSets')

/** Workout entities */
export const exercisesRepo = createRepository<Exercise>('exercises')
export const workoutTemplatesRepo = createRepository<WorkoutTemplate>('workoutTemplates')
export const workoutTemplateExercisesRepo = createRepository<WorkoutTemplateExercise>('workoutTemplateExercises')
export const workoutSessionsRepo = createRepository<WorkoutSession>('workoutSessions')
export const workoutSessionExercisesRepo = createRepository<WorkoutSessionExercise>('workoutSessionExercises')
export const workoutSessionSetsRepo = createRepository<WorkoutSessionSet>('workoutSessionSets')
export const completedWorkoutsRepo = createRepository<CompletedWorkout>('completedWorkouts')
export const completedWorkoutExercisesRepo = createRepository<CompletedWorkoutExercise>('completedWorkoutExercises')
export const completedWorkoutSetsRepo = createRepository<CompletedWorkoutSet>('completedWorkoutSets')
export const dailyStrengthLogsRepo = createRepository<DailyStrengthLog>('dailyStrengthLogs')
export const dayPlansRepo = createRepository<DayPlan>('dayPlans')
export const tasksRepo = createRepository<Task>('tasks')

/**
 * NOTE: the exercise library store is intentionally not created yet - it
 * arrives with the workout tracker phase, together with a DB_VERSION bump
 * and an Exercise repository here.
 */

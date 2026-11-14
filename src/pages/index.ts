import { lazy } from 'react'

/**
 * Every page is code-split so the initial shell stays tiny.
 * The router maps routes to these components.
 */
export const DashboardPage = lazy(() => import('./DashboardPage'))
export const HabitsPage = lazy(() => import('./HabitsPage'))
export const WorkoutPage = lazy(() => import('./WorkoutPage'))
export const CardioPage = lazy(() => import('./CardioPage'))
export const ProgressPage = lazy(() => import('./ProgressPage'))
export const SettingsPage = lazy(() => import('./SettingsPage'))
export const NotFoundPage = lazy(() => import('./NotFoundPage'))
export const TasksPage = lazy(() => import('./TasksPage'))

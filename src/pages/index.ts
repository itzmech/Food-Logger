import { lazy } from 'react'

/**
 * Every page is code-split so the initial shell stays tiny.
 * The router maps routes to these components.
 */
export const DashboardPage = lazy(() => import('./DashboardPage'))
export const FoodPage = lazy(() => import('./FoodPage'))
export const HistoryPage = lazy(() => import('./HistoryPage'))
export const WorkoutPage = lazy(() => import('./WorkoutPage'))
export const ProgressPage = lazy(() => import('./ProgressPage'))
export const MenuPage = lazy(() => import('./MenuPage'))
export const SettingsPage = lazy(() => import('./SettingsPage'))
export const NotFoundPage = lazy(() => import('./NotFoundPage'))
export const AnalyticsPage = lazy(() => import('./AnalyticsPage'))
export const TasksPage = lazy(() => import('./TasksPage'))

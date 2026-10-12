import { createHashRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import {
  AnalyticsPage,
  DashboardPage,
  FoodPage,
  HistoryPage,
  MenuPage,
  NotFoundPage,
  ProgressPage,
  SettingsPage,
  TasksPage,
  WorkoutPage,
} from '@/pages'

/**
 * Hash routing keeps the installed PWA working from any Android launcher
 * (no server rewrites needed) while using the same nested layout everywhere.
 */
export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'food', element: <FoodPage /> },
      { path: 'workout', element: <WorkoutPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'menu', element: <MenuPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

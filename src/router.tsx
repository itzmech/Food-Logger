import { createHashRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import {
  DashboardPage,
  CardioPage,
  HabitsPage,
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
      { path: 'habits', element: <HabitsPage /> },
      { path: 'workout', element: <WorkoutPage /> },
      { path: 'cardio', element: <CardioPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

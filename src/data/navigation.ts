import type { IconName } from '@/components/icons'

/**
 * Single source of truth for primary navigation.
 * Both the mobile bottom bar and the desktop sidebar render from this list,
 * so adding a section later means editing one array.
 */

export interface NavItem {
  id: string
  label: string
  path: string
  icon: IconName
  description: string
  accent: string
}

/** Core product destinations shown in both primary navigation surfaces. */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Home',
    path: '/',
    icon: 'dashboard',
    description: 'Today at a glance',
    accent: '#A855F7',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    path: '/tasks',
    icon: 'check',
    description: 'Deadlines and daily tasks',
    accent: '#A855F7',
  },
  {
    id: 'habits',
    label: 'Habits',
    path: '/habits',
    icon: 'repeat',
    description: 'Schedules and daily habits',
    accent: '#22C55E',
  },
  {
    id: 'workout',
    label: 'Workout',
    path: '/workout',
    icon: 'workout',
    description: 'Sessions and exercise history',
    accent: '#3B82F6',
  },
  {
    id: 'cardio',
    label: 'Cardio',
    path: '/cardio',
    icon: 'cardio',
    description: 'Running and cardio sessions',
    accent: '#22D3EE',
  },
  {
    id: 'progress',
    label: 'Progress',
    path: '/progress',
    icon: 'progress',
    description: 'Streaks and activity history',
    accent: '#22C55E',
  },
]

/** All primary destinations, for the desktop sidebar. */
export const NAV_ITEMS: NavItem[] = PRIMARY_NAV_ITEMS

export const SETTINGS_ITEM: NavItem = {
  id: 'settings',
  label: 'Settings',
  path: '/settings',
  icon: 'settings',
  description: 'Activity targets, data & app info',
  accent: '#94A3B8',
}

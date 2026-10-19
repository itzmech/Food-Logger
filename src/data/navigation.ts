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
}

/** Primary destinations shown in the mobile bottom bar (max 5). */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Home',
    path: '/',
    icon: 'dashboard',
    description: 'Today at a glance',
  },
  {
    id: 'food',
    label: 'Food',
    path: '/food',
    icon: 'food',
    description: 'Meals, calories & protein',
  },
  {
    id: 'workout',
    label: 'Workout',
    path: '/workout',
    icon: 'workout',
    description: 'Sessions, sets & cardio',
  },
  {
    id: 'progress',
    label: 'Progress',
    path: '/progress',
    icon: 'progress',
    description: 'Weight, measurements & charts',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    path: '/tasks',
    icon: 'check',
    description: "Today's to-dos",
  },
]

/** Secondary destinations: kept out of the bottom bar on phones. */
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  {
    id: 'history',
    label: 'History',
    path: '/history',
    icon: 'calendar',
    description: 'Past days, food & workouts',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: 'bar-chart',
    description: 'Trends & summaries',
  },
  {
    id: 'menu',
    label: 'Menu',
    path: '/menu',
    icon: 'menu',
    description: 'Mess menu & overrides',
  },
]

/** All nav items, for the desktop sidebar. */
export const NAV_ITEMS: NavItem[] = [
  ...PRIMARY_NAV_ITEMS,
  ...SECONDARY_NAV_ITEMS,
]

export const SETTINGS_ITEM: NavItem = {
  id: 'settings',
  label: 'Settings',
  path: '/settings',
  icon: 'settings',
  description: 'Goals, data & app info',
}

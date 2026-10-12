/**
 * Centralised app constants.
 *
 * Nothing personal (names, weights, calorie targets) is hard-coded here —
 * that all lives in the database and is entered by the user.
 */

export const APP_NAME = 'Freebuff Fitness'
export const APP_SHORT_NAME = 'Freebuff'
export const APP_TAGLINE = 'Local-first fitness, food & progress tracking'

/** Default journey length; the user can change it per goal. */
export const DEFAULT_JOURNEY_WEEKS = 12

/** Singleton key for the settings record. */
export const SETTINGS_ID = 'user' as const

/** Short weekday labels, Sunday-first (index matches Date#getDay). */
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Single-letter weekday labels, Sunday-first. */
export const WEEKDAY_MIN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

/** Max entries kept in "recent" style lists in later phases. */
export const DEFAULT_PAGE_SIZE = 50

/** File name prefix for exported JSON backups. */
export const EXPORT_FILE_PREFIX = 'freebuff-fitness-backup'

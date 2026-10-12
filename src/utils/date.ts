/**
 * Date helpers.
 *
 * Every "day" in the app is keyed as a local `YYYY-MM-DD` string (ISODate).
 * Local keys sort lexicographically, work as IndexedDB keys/ranges and never
 * suffer from UTC-shifted days.
 */

export type ISODate = string

/** Formats a Date as a local `YYYY-MM-DD` day key. */
export function toISODate(date: Date): ISODate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Today's local day key. */
export function todayISO(): ISODate {
  return toISODate(new Date())
}

/** Parses a `YYYY-MM-DD` key into a local Date at midnight. */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Whole-day difference (positive when `to` is after `from`). */
export function diffInDays(from: ISODate, to: ISODate): number {
  const ms = parseISODate(to).getTime() - parseISODate(from).getTime()
  return Math.round(ms / 86_400_000)
}

/** First day of the week containing `iso`. `weekStartsOn`: 0 = Sunday, 1 = Monday. */
export function startOfWeek(iso: ISODate, weekStartsOn: 0 | 1 = 1): ISODate {
  const d = parseISODate(iso)
  const delta = (d.getDay() - weekStartsOn + 7) % 7
  d.setDate(d.getDate() - delta)
  return toISODate(d)
}

/** Ordered day keys from `from` to `to` inclusive. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const days: ISODate[] = []
  let cursor = from
  while (cursor <= to) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return days
}

export function formatShortDate(iso: ISODate): string {
  return parseISODate(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatLongDate(iso: ISODate): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** 'Today' | 'Yesterday' | short date — for list rows. */
export function formatRelativeDay(iso: ISODate, today: ISODate = todayISO()): string {
  const delta = diffInDays(iso, today)
  if (delta === 0) return 'Today'
  if (delta === 1) return 'Yesterday'
  return formatShortDate(iso)
}

/* --------------------------------------------------------------- */
/* Months                                                          */
/* --------------------------------------------------------------- */

/** `YYYY-MM` key for a date (or today). */
export function monthKeyOf(iso: ISODate = todayISO()): string {
  return iso.slice(0, 7)
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

/** All day keys inside a month key (`YYYY-MM`). */
export function daysOfMonth(monthKey: string): ISODate[] {
  const [y, m] = monthKey.split('-').map(Number)
  const total = new Date(y, m, 0).getDate()
  return Array.from({ length: total }, (_, i) => toISODate(new Date(y, m - 1, i + 1)))
}

/** Add `n` months to a `YYYY-MM` key. */
export function addMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Subtract `n` months from a `YYYY-MM` key. */
export function subMonths(monthKey: string, n: number): string {
  return addMonths(monthKey, -n)
}

/** 0 (Sunday) … 6 (Saturday). */
export function weekdayOf(iso: ISODate): number {
  return parseISODate(iso).getDay()
}

/* --------------------------------------------------------------- */
/* Greetings                                                       */
/* --------------------------------------------------------------- */

export function greetingForDate(date: Date = new Date()): string {
  const h = date.getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

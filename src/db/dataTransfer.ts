/**
 * JSON export / import / reset.
 *
 * Backend-free portability: the whole database can be exported to a file and
 * restored later (or moved to another device) without any server.
 */

import { APP_NAME, EXPORT_FILE_PREFIX } from '@/lib/constants'
import { DB_VERSION, STORE_NAMES } from './schema'
import type { StoreName } from './schema'
import { clearAllStores, getDatabase } from './database'
import { getAllFromStore, putAllInStore } from './idb'
import { todayISO } from '@/utils/date'

export const EXPORT_FORMAT = 'freebuff-fitness-backup'

export interface DatabaseExport {
  app: typeof EXPORT_FORMAT
  appName: string
  schemaVersion: number
  exportedAt: string
  data: Record<StoreName, unknown[]>
}

/** Reads every store into a serialisable payload. */
export async function exportDatabase(): Promise<DatabaseExport> {
  const db = await getDatabase()
  const data = {} as Record<StoreName, unknown[]>
  for (const name of STORE_NAMES) {
    data[name] = await getAllFromStore<unknown>(db, name)
  }
  return {
    app: EXPORT_FORMAT,
    appName: APP_NAME,
    schemaVersion: DB_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }
}

/** Triggers a browser download of the export payload. */
export function downloadExport(payload: DatabaseExport): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${EXPORT_FILE_PREFIX}-${todayISO()}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export class ImportError extends Error {}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Replaces the database contents with an exported payload.
 * Unknown stores are ignored; a schema mismatch is rejected up front.
 */
export async function importDatabase(raw: unknown): Promise<{ records: number }> {
  if (!isPlainObject(raw) || raw.app !== EXPORT_FORMAT) {
    throw new ImportError('This file is not a Freebuff Fitness backup.')
  }

  const schemaVersion = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0
  if (schemaVersion > DB_VERSION) {
    throw new ImportError(
      `This backup was created by a newer version of the app (schema v${schemaVersion}).`,
    )
  }

  const data = raw.data
  if (!isPlainObject(data)) {
    throw new ImportError('The backup file is missing its data section.')
  }

  const db = await getDatabase()
  await clearAllStores()

  let records = 0
  for (const name of STORE_NAMES) {
    const rows = data[name]
    if (!Array.isArray(rows)) continue
    const valid = rows.filter((row) => isPlainObject(row) && typeof row.id === 'string')
    if (valid.length > 0) {
      await putAllInStore(db, name, valid)
      records += valid.length
    }
  }

  return { records }
}

/** Clears every store, returning the app to a first-run state. */
export async function resetDatabase(): Promise<void> {
  await clearAllStores()
}

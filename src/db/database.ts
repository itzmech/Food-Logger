/**
 * Database lifecycle.
 *
 * `getDatabase()` is the single entry point every repository uses. It opens
 * the connection once and memoises it; `applySchema` creates every store and
 * index declared in `schema.ts`.
 */

import { DB_NAME, DB_VERSION, RECORD_MIGRATIONS, STORE_NAMES, STORE_SCHEMAS } from './schema'
import type { StoreName } from './schema'
import { clearStore, deleteDatabase, openDatabase, putInStore } from './idb'
import type { UpgradeHandler } from './idb'

let dbPromise: Promise<IDBDatabase> | null = null

const applySchema: UpgradeHandler = (db, oldVersion, _newVersion, transaction) => {
  for (const schema of STORE_SCHEMAS) {
    const exists = db.objectStoreNames.contains(schema.name)
    const store = exists
      ? transaction.objectStore(schema.name)
      : db.createObjectStore(schema.name, { keyPath: schema.keyPath })

    // Bring an existing store's indexes in line with the declared schema
    // (creates renamed/new indexes, drops removed ones).
    for (const index of schema.indexes) {
      if (!store.indexNames.contains(index.name)) {
        store.createIndex(index.name, index.keyPath, {
          unique: index.unique ?? false,
          multiEntry: index.multiEntry ?? false,
        })
      }
    }
    for (const indexName of Array.from(store.indexNames)) {
      if (!schema.indexes.some((index) => index.name === indexName)) {
        store.deleteIndex(indexName)
      }
    }
  }

  // Field-level migrations for records written by older app versions.
  if (oldVersion > 0 && oldVersion < DB_VERSION) {
    // A failed migration aborts the version-change transaction, which fails
    // the open itself — the catch only silences the dangling rejection.
    void migrateRecords(transaction).catch(() => undefined)
  }
}

/**
 * Walks every store that declares record migrations and upgrades rows in
 * place. Runs inside the version-change transaction — the cursor chain is
 * promise-driven, so the transaction stays alive until it resolves.
 */
async function migrateRecords(transaction: IDBTransaction): Promise<void> {
  for (const schema of STORE_SCHEMAS) {
    const migrations = RECORD_MIGRATIONS[schema.name]
    if (!migrations || migrations.length === 0) continue
    if (!transaction.objectStoreNames.contains(schema.name)) continue

    const store = transaction.objectStore(schema.name)
    await new Promise<void>((resolve, reject) => {
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) {
          resolve()
          return
        }
        let value = cursor.value as Record<string, unknown>
        let changed = false
        for (const migrate of migrations) {
          const next = migrate(value)
          if (next !== null) {
            value = next
            changed = true
          }
        }
        if (changed) {
          cursor.update(value)
        }
        cursor.continue()
      }
      request.onerror = () => reject(request.error ?? new Error('Record migration failed.'))
    })
  }
}

/** Opens (or reuses) the app database. */
export function getDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabase(DB_NAME, DB_VERSION, applySchema).catch((error: unknown) => {
      // Allow a retry after a failed open (e.g. blocked by another tab).
      dbPromise = null
      throw error instanceof Error ? error : new Error(String(error))
    })
  }
  return dbPromise
}

/** Eagerly initialises the database (used by the app bootstrap). */
export async function initDatabase(): Promise<void> {
  await getDatabase()
}

export function closeDatabase(): void {
  if (!dbPromise) return
  const pending = dbPromise
  dbPromise = null
  pending.then((db) => db.close()).catch(() => undefined)
}

/** Clears every store but keeps the schema (used by "Reset data"). */
export async function clearAllStores(): Promise<void> {
  const db = await getDatabase()
  for (const name of STORE_NAMES) {
    await clearStore(db, name)
  }
}

/** Deletes the whole database file — useful for debugging/tests. */
export async function destroyDatabase(): Promise<void> {
  closeDatabase()
  await deleteDatabase(DB_NAME)
}

/** Writes a single record into a store (used by data import). */
export async function writeRecord<T>(store: StoreName, value: T): Promise<void> {
  const db = await getDatabase()
  await putInStore(db, store, value)
}

/** Shared primitives for every entity in the app. */

/** Opaque entity id (uuid string). */
export type ID = string

/** Local day key, `YYYY-MM-DD`. See `src/utils/date.ts`. */
export type ISODate = string

/** Full ISO-8601 timestamp. */
export type ISODateTime = string

/**
 * Fields every persisted entity carries.
 * `updatedAt` exists so a future cloud-sync layer can resolve conflicts
 * without changing the shape of any entity.
 */
export interface Timestamped {
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/** Reserved for the future sync layer — absent means "local only". */
export type SyncStatus = 'local' | 'pending' | 'synced'

export interface Syncable {
  syncStatus?: SyncStatus
}

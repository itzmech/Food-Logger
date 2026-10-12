/**
 * Generic typed repository factory.
 *
 * Every store gets a repository with the same small surface. Swapping
 * IndexedDB for a remote API later means reimplementing this interface —
 * no UI changes required.
 */

import type { ID } from '@/types'
import { getDatabase } from './database'
import {
  clearStore,
  countFromStore,
  deleteFromStore,
  getAllFromIndex,
  getAllFromStore,
  getFromStore,
  putAllInStore,
  putInStore,
} from './idb'

export interface Repository<T extends { id: ID }> {
  get(id: ID): Promise<T | undefined>
  getAll(): Promise<T[]>
  getAllByIndex(indexName: string, query?: IDBValidKey | IDBKeyRange | null): Promise<T[]>
  count(): Promise<number>
  put(value: T): Promise<void>
  putAll(values: T[]): Promise<void>
  remove(id: ID): Promise<void>
  clear(): Promise<void>
}

export function createRepository<T extends { id: ID }>(storeName: string): Repository<T> {
  return {
    async get(id) {
      const db = await getDatabase()
      return getFromStore<T>(db, storeName, id)
    },
    async getAll() {
      const db = await getDatabase()
      return getAllFromStore<T>(db, storeName)
    },
    async getAllByIndex(indexName, query) {
      const db = await getDatabase()
      return getAllFromIndex<T>(db, storeName, indexName, query)
    },
    async count() {
      const db = await getDatabase()
      return countFromStore(db, storeName)
    },
    async put(value) {
      const db = await getDatabase()
      await putInStore(db, storeName, value)
    },
    async putAll(values) {
      if (values.length === 0) return
      const db = await getDatabase()
      await putAllInStore(db, storeName, values)
    },
    async remove(id) {
      const db = await getDatabase()
      await deleteFromStore(db, storeName, id)
    },
    async clear() {
      const db = await getDatabase()
      await clearStore(db, storeName)
    },
  }
}

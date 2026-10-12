/**
 * Minimal promise wrapper around IndexedDB.
 *
 * Deliberately dependency-free: the app only needs open/read/write/delete and
 * wants full control over transaction semantics. Components never import this
 * module — they go through `repositories.ts` / `queries.ts`.
 */

export type UpgradeHandler = (
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number,
  transaction: IDBTransaction,
) => void

export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

export function openDatabase(
  name: string,
  version: number,
  onUpgrade: UpgradeHandler,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB is not available in this browser.'))
      return
    }

    const request = indexedDB.open(name, version)

    request.onupgradeneeded = (event) => {
      const transaction = request.transaction
      if (!transaction) return
      onUpgrade(request.result, event.oldVersion, event.newVersion ?? version, transaction)
    }

    request.onsuccess = () => {
      const db = request.result
      // Another tab wants to upgrade: close this connection so it is not blocked.
      db.onversionchange = () => db.close()
      resolve(db)
    }

    request.onerror = () => reject(request.error ?? new Error('Failed to open the database.'))

    request.onblocked = () =>
      reject(
        new Error(
          'Database upgrade is blocked by another open tab. Close other tabs and try again.',
        ),
      )
  })
}

export function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      resolve()
      return
    }
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Failed to delete the database.'))
    request.onblocked = () => resolve()
  })
}

/** Converts an IDBRequest into a promise. */
export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })
}

/**
 * Runs `work` inside a transaction and resolves once the transaction commits.
 * Write errors are surfaced through the returned promise.
 */
export function withTransaction<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => T | Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let transaction: IDBTransaction
    try {
      transaction = db.transaction(storeName, mode)
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)))
      return
    }

    const store = transaction.objectStore(storeName)
    let result: T
    let settled = false

    Promise.resolve(work(store)).then(
      (value) => {
        result = value
      },
      (error) => {
        settled = true
        try {
          transaction.abort()
        } catch {
          /* transaction already finished */
        }
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )

    transaction.oncomplete = () => {
      if (!settled) resolve(result)
    }
    transaction.onabort = () => {
      if (!settled) reject(transaction.error ?? new Error('Transaction aborted.'))
    }
    transaction.onerror = () => {
      if (!settled) reject(transaction.error ?? new Error('Transaction failed.'))
    }
  })
}

/* ------------------------------------------------------------------ */
/* Store helpers                                                       */
/* ------------------------------------------------------------------ */

export async function getFromStore<T>(
  db: IDBDatabase,
  storeName: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  return withTransaction(db, storeName, 'readonly', (store) =>
    requestToPromise<T | undefined>(store.get(key) as IDBRequest<T | undefined>),
  )
}

export async function getAllFromStore<T>(
  db: IDBDatabase,
  storeName: string,
  query?: IDBValidKey | IDBKeyRange | null,
): Promise<T[]> {
  return withTransaction(db, storeName, 'readonly', (store) =>
    requestToPromise<T[]>(store.getAll(query ?? undefined) as IDBRequest<T[]>),
  )
}

export async function getAllFromIndex<T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  query?: IDBValidKey | IDBKeyRange | null,
): Promise<T[]> {
  return withTransaction(db, storeName, 'readonly', (store) =>
    requestToPromise<T[]>(
      store.index(indexName).getAll(query ?? undefined) as IDBRequest<T[]>,
    ),
  )
}

export async function countFromStore(
  db: IDBDatabase,
  storeName: string,
  query?: IDBValidKey | IDBKeyRange | null,
): Promise<number> {
  return withTransaction(db, storeName, 'readonly', (store) =>
    requestToPromise<number>(store.count(query ?? undefined)),
  )
}

export async function putInStore<T>(
  db: IDBDatabase,
  storeName: string,
  value: T,
): Promise<void> {
  await withTransaction(db, storeName, 'readwrite', (store) =>
    requestToPromise(store.put(value as unknown as never)),
  )
}

export async function putAllInStore<T>(
  db: IDBDatabase,
  storeName: string,
  values: T[],
): Promise<void> {
  await withTransaction(db, storeName, 'readwrite', (store) => {
    for (const value of values) store.put(value as unknown as never)
  })
}

export async function deleteFromStore(
  db: IDBDatabase,
  storeName: string,
  key: IDBValidKey,
): Promise<void> {
  await withTransaction(db, storeName, 'readwrite', (store) => {
    store.delete(key)
  })
}

export async function clearStore(db: IDBDatabase, storeName: string): Promise<void> {
  await withTransaction(db, storeName, 'readwrite', (store) => {
    store.clear()
  })
}

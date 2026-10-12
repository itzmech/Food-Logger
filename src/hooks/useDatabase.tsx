import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { initDatabase } from '@/db'
import { seedBuiltInExercises } from '@/data/exerciseCatalog'

export type DatabaseStatus = 'initializing' | 'ready' | 'error'

export interface DatabaseContextValue {
  status: DatabaseStatus
  error: Error | null
  retry: () => void
}

const DatabaseContext = createContext<DatabaseContextValue>({
  status: 'initializing',
  error: null,
  retry: () => undefined,
})

/**
 * Opens IndexedDB once for the whole app. Pages render only after the
 * database is ready, which keeps every data hook synchronous-looking.
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DatabaseStatus>('initializing')
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('initializing')
    setError(null)

    initDatabase().then(
      () => {
        if (!cancelled) {
          // Seed deterministic built-in exercise catalog once, if the store is empty.
          void seedBuiltInExercises()
          setStatus('ready')
        }
      },
      (cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause : new Error(String(cause)))
          setStatus('error')
        }
      },
    )

    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const value = useMemo(() => ({ status, error, retry }), [status, error, retry])

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>
}

export function useDatabase(): DatabaseContextValue {
  return useContext(DatabaseContext)
}

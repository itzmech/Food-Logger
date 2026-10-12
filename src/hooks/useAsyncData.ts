import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  reload: () => void
  mutate: (value: T | null) => void
}

/**
 * Runs an async loader on mount and whenever `deps` change.
 * Results from stale runs are discarded, so rapid re-renders are safe.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[] = [],
  options: { enabled?: boolean } = {},
): AsyncDataState<T> {
  const { enabled = true } = options
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: Error | null }>({
    data: null,
    loading: true,
    error: null,
  })
  const [nonce, setNonce] = useState(0)

  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: true, error: null })
      return
    }

    let cancelled = false
    setState((previous) => ({ data: previous.data, loading: true, error: null }))

    loaderRef.current().then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: null })
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }
      },
    )

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled])

  const reload = useCallback(() => setNonce((value) => value + 1), [])
  const mutate = useCallback((value: T | null) => {
    setState({ data: value, loading: false, error: null })
  }, [])

  return { ...state, reload, mutate }
}

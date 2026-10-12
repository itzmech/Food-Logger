import { Icon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { LogoMark } from '@/components/ui/LogoMark'
import { APP_NAME, APP_TAGLINE } from '@/lib/constants'

/** Shown while IndexedDB opens (a few milliseconds on a warm device). */
export function SplashScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-base px-8">
      <div className="animate-pulse-soft">
        <LogoMark size={64} />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold tracking-tight text-ink">{APP_NAME}</p>
        <p className="mt-1 text-[13px] text-ink-3">Preparing your local data…</p>
      </div>
    </div>
  )
}

export interface DatabaseErrorScreenProps {
  error: Error | null
  onRetry: () => void
}

/** Shown when IndexedDB cannot be opened (e.g. private mode, blocked upgrade). */
export function DatabaseErrorScreen({ error, onRetry }: DatabaseErrorScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-base px-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-dim text-danger">
        <Icon name="alert" size={24} />
      </span>
      <div className="max-w-sm text-center">
        <p className="text-base font-semibold tracking-tight text-ink">
          Local storage could not start
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">
          {error?.message ??
            'The app needs IndexedDB to store your data on this device. Private browsing modes sometimes block it.'}
        </p>
      </div>
      <Button variant="secondary" onClick={onRetry}>
        <Icon name="refresh" size={16} />
        Try again
      </Button>
      <p className="text-[11px] text-ink-3">{APP_TAGLINE}</p>
    </div>
  )
}

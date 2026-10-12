import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface UseInstallPromptResult {
  /** True when Chrome has offered an install prompt we can replay. */
  canInstall: boolean
  /** True when the app is already running as an installed PWA. */
  isStandalone: boolean
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const displayMode = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true
  return displayMode || iosStandalone
}

/** Captures `beforeinstallprompt` so Settings can offer a one-tap install. */
export function useInstallPrompt(): UseInstallPromptResult {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(detectStandalone)

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setPromptEvent(null)
      setIsStandalone(true)
    }
    const media = window.matchMedia?.('(display-mode: standalone)')
    const onDisplayModeChange = () => setIsStandalone(detectStandalone())

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    media?.addEventListener?.('change', onDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      media?.removeEventListener?.('change', onDisplayModeChange)
    }
  }, [])

  const install = useCallback(async () => {
    if (!promptEvent) return 'unavailable' as const
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') setPromptEvent(null)
    return choice.outcome
  }, [promptEvent])

  return { canInstall: promptEvent !== null, isStandalone, install }
}

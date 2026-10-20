import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/utils/cn'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  /** Extra classes for the panel (e.g. max height). */
  className?: string
  tabIndex?: number
}

export interface BottomSheetFocusProps extends BottomSheetProps {
  /** When true, the panel focus behavior is suppressed so callers can use their
   * own focus restoration without a second focus event from the sheet.
   */
  suppressAutoFocus?: boolean
}  /**
   * Mobile-first bottom sheet.
   *
   * The sheet is rendered through a portal to `document.body` so the overlay
   * resolves against the true viewport regardless of animated route wrappers or
   * other transformed ancestors. The panel scrolls independently, the footer is
   * held sticky, and the Android / iOS keyboard shrinks the viewport without
   * covering the form.
   */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
  tabIndex,
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousOverflow = useRef<string | null>(null)
  const previousTouchAction = useRef<string | null>(null)
  const lastFocused = useRef<HTMLElement | null>(null)
  const [initialMounted, setInitialMounted] = useState(false)

  useEffect(() => {
    // After body scroll is locked, scroll the topedge into view so a sheet
    // opened from a scrolled page does not start with its header below the
    // fold of the visible overlay.
    if (open) {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    // Focus the sheet panel itself once the portal is in the document so the
    // sheet is the logical focus surface while it is open. Internal inputs
    // and buttons take precedence on interaction, so this is a safe fallback.
    const panel = panelRef.current
    if (!panel) return

    // Defer so the panel is already in the DOM and visible under pointer events.
    requestAnimationFrame(() => {
      panel.focus()
    })
  }, [open])

  useEffect(() => {
    if (!open) return

    lastFocused.current = document.activeElement as HTMLElement | null

    const el = document.body
    previousOverflow.current = el.style.overflow
    previousTouchAction.current = el.style.touchAction

    el.style.overflow = 'hidden'
    el.style.touchAction = 'none'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)

    return () => {
      el.style.overflow = previousOverflow.current ?? ''
      el.style.touchAction = previousTouchAction.current ?? ''
      window.removeEventListener('keydown', onKeyDown, true)

      if (lastFocused.current && typeof lastFocused.current.focus === 'function') {
        const el = lastFocused.current
        lastFocused.current = null
        requestAnimationFrame(() => el.focus({ preventScroll: true }))
      }
    }
  }, [open, onClose])

  if (!open) return null

  // Delay the portal render by one commit so the browser never auto-scrolls
  // toward a potentially off-screen panel before the sheet animation begins.
  // The first render is an inert placeholder; the real portal follows on the
  // next render.
  if (!initialMounted) {
    setInitialMounted(true)
    return
  }

  const sheet = (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      tabIndex={tabIndex ?? 0}
      className={cn(
        'fixed inset-0 z-[60] flex items-end justify-center',
        'bg-black/65 backdrop-blur-sm animate-fade-in',
        className,
      )}
    >
      <div
        className={cn(
          'fixed inset-0 bottom-0 w-full h-full max-w-lg flex flex-col rounded-t-3xl border-t border-line bg-base-raised shadow-2xl shadow-black/60 animate-sheet-up',
          'max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden overscroll-contain',
        )}
      >
        <div className="shrink-0 border-b border-line px-5 pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
          <div className="mt-3 flex items-start justify-between gap-3 pb-2">
            <div className="min-w-0">
              {title ? (
                <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
              ) : null}
              {description ? (
                <p className="mt-0.5 text-[13px] leading-snug text-ink-3">{description}</p>
              ) : null}
            </div>
            <IconButton
              icon="close"
              label="Close"
              onClick={onClose}
              className="mr-2 touch-target"
              aria-label="Close sheet"
              type="button"
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-5 pt-3">
          {children}
        </div>

        <div
          className="sticky bottom-0 shrink-0 border-t border-line whitespace-nowrap bg-base-raised/90 backdrop-blur-sm px-5 py-3"
          aria-hidden="true"
        >
          <div className="h-1 w-10 mx-auto rounded-full bg-line/40" />
        </div>
      </div>
    </div>
  )
  return createPortal(sheet, document.body)
}

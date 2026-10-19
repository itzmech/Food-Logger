import { useEffect, useRef } from 'react'
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
}

/**
 * Mobile-first bottom sheet.
 *
 * Scroll locking uses `overflow:hidden` on <body> (position:fixed tricks
 * fight the keyboard on Android). The sheet itself scrolls, and the viewport
 * is declared with `interactive-widget=resizes-content` so the Android
 * keyboard shrinks the layout instead of covering the form.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.touchAction = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      className={cn(
        'fixed inset-0 z-50 flex items-end justify-center',
        'bg-black/65 backdrop-blur-sm animate-fade-in',
        className,
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={cn(
          'fixed inset-0 bottom-0 w-full max-w-lg flex flex-col rounded-t-3xl border-t border-line bg-base-raised shadow-2xl shadow-black/60 animate-sheet-up',
          'max-h-[calc(100dvh_7rem)] sm:max-h-[88dvh] overflow-y-auto overflow-x-hidden overscroll-contain',
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
              className="mr-2 touch-target min-h-9 min-w-9"
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-5 pt-3">
          {children}
        </div>
      </div>
    </div>
  )
}
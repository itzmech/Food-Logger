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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-end justify-center bg-black/65 backdrop-blur-sm animate-fade-in pointer-events-none"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'fixed left-0 right-0 bottom-0 z-50 flex w-full max-w-lg justify-center rounded-t-3xl border border-b-0 border-line bg-base-raised',
          'shadow-2xl shadow-black/60 animate-sheet-up',
          'flex-col max-h-[88dvh] overflow-y-auto overscroll-contain',
          className,
        )}
      >
        <div className="shrink-0 px-5 pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
          <div className="mt-3 flex items-start justify-between gap-3 pb-1">
            <div className="min-w-0">
              {title ? (
                <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
              ) : null}
              {description ? (
                <p className="mt-0.5 text-[13px] leading-snug text-ink-3">{description}</p>
              ) : null}
            </div>
            <IconButton icon="close" label="Close" onClick={onClose} className="-mr-2 -mt-1" />
          </div>
        </div>

        <div className="px-5 pb-5 pt-2">
          {children}
        </div>
      </div>
    </>
  )
}

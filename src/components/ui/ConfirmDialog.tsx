import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'w-full max-w-sm rounded-2xl border border-line bg-overlay p-5',
          'shadow-2xl shadow-black/60 animate-rise',
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{description}</p>
        ) : null}

        <div className="mt-5 flex gap-2">
          <Button
            ref={cancelRef}
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            className="flex-1"
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

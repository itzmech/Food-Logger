import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { TextField } from '@/components/ui/Field'

export interface CopyMonthSheetProps {
  open: boolean
  onClose: () => void
  /** Source month, pre-filled from the current menu. */
  fromMonth: string
  /** Months that already have a menu (for overwrite protection). */
  existingMonths: string[]
  onCopy: (fromMonth: string, toMonth: string, overwrite: boolean) => Promise<void>
}

/** Dialog for copying an existing month's menu into another month.
 * Restored from MenuMonthNav; uses the `copyMonth` query with overwrite protection.
 * Overwrite confirmation is shown inline when the target month already exists.
 */
export function CopyMonthSheet({ open, onClose, fromMonth, existingMonths, onCopy }: CopyMonthSheetProps) {
  const [toMonth, setToMonth] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  if (!open) return null

  const handleClose = () => {
    setConfirming(null)
    setError(null)
    setToMonth('')
    onClose()
  }

  const existingSet = new Set(existingMonths)

  const startCopy = async () => {
    if (!toMonth.trim()) {
      setError('Enter a target month (YYYY-MM)')
      return
    }
    const target = toMonth.trim()
    if (target === fromMonth) {
      setError('Source and target must be different months')
      return
    }
    if (existingSet.has(target)) {
      setConfirming(target)
      return
    }
    await runCopy(target, false)
  }

  const runCopy = async (target: string, overwrite: boolean) => {
    setBusy(true)
    setError(null)
    try {
      await onCopy(fromMonth.trim(), target, overwrite)
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Copy failed')
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  const handleConfirmOverwrite = () => {
    if (!confirming) return
    runCopy(confirming, true)
  }

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-4'>
      <div
        role='dialog'
        aria-modal='true'
        aria-label='Copy month'
        className='w-full max-w-lg rounded-t-3xl border border-line bg-base-raised p-5'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-start justify-between'>
          <h2 className='text-base font-semibold text-ink'>Copy month</h2>
          <IconButton icon='close' label='Close' onClick={handleClose} />
        </div>

        <div className='mt-4 space-y-3'>
          {confirming ? (
            <>
              <p className='text-[12px] text-ink-3'>
                This will replace the existing menu for{' '}
                <span className='font-medium text-ink'>{confirming}</span>.
              </p>
              <div className='rounded-xl bg-danger-dim/40 px-4 py-3'>
                <p className='text-sm font-medium text-danger'>Overwrite existing menu?</p>
                <p className='text-[12px] text-ink-3'>
                  The current menu for {confirming} will be replaced by a copy of{' '}
                  {fromMonth}. This cannot be undone.
                </p>
              </div>
              <div className='mt-5 flex gap-2'>
                <Button variant='secondary' onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmOverwrite} disabled={busy} tone='danger'>
                  {busy ? 'Copying...' : 'Copy anyway'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className='text-[12px] text-ink-3'>
                Copy the current month's published meals into another month. The copy
                gets its own item ids and is fully independent.
              </p>
              <div className='grid grid-cols-2 gap-2'>
                <TextField
                  label='From (YYYY-MM)'
                  value={fromMonth}
                  onChange={() => {}}
                  placeholder='2026-10'
                  readOnly
                />
                <TextField
                  label='To (YYYY-MM)'
                  value={toMonth}
                  onChange={(e) => setToMonth(e.target.value)}
                  placeholder='2026-11'
                />
              </div>
            </>
          )}
        </div>

        {error && !confirming ? <p className='mt-3 text-sm text-danger'>{error}</p> : null}

        {!confirming && (
          <div className='mt-5 flex gap-2'>
            <Button variant='secondary' onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={startCopy} disabled={busy || !toMonth.trim()}>
              {busy ? 'Copying...' : 'Copy menu'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

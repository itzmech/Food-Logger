import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { TextField } from '@/components/ui/Field'

export interface AddMonthSheetProps {
  open: boolean
  onClose: () => void
  onAdd: (month: string, title: string) => void
}

/** Dialog for creating a new month's menu. Previously inline in MenuMonthNav. */
export function AddMonthSheet({ open, onClose, onAdd }: AddMonthSheetProps) {
  const [month, setMonth] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = () => {
    if (!month.trim() || !title.trim()) {
      setError('Enter a month key (YYYY-MM) and a title')
      return
    }
    setBusy(true)
    setError(null)
    onAdd(month.trim(), title.trim())
  }

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-4'>
      <div
        role='dialog'
        aria-modal='true'
        aria-label='Add menu'
        className='w-full max-w-lg rounded-t-3xl border border-line bg-base-raised p-5'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-start justify-between'>
          <h2 className='text-base font-semibold text-ink'>Add menu</h2>
          <IconButton icon='close' label='Close' onClick={onClose} />
        </div>
        <div className='mt-4 space-y-3'>
          <p className='text-[12px] text-ink-3'>
            Create a new month's menu. You will fill in each day's meals after creation.
          </p>
          <TextField
            label='Month (YYYY-MM)'
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            placeholder='2026-10'
          />
          <TextField label='Title' value={title} onChange={(e) => setTitle(e.target.value)} placeholder='October 2026' />
        </div>
        {error ? <p className='mt-3 text-sm text-danger'>{error}</p> : null}
        <div className='mt-5 flex gap-2'>
          <Button variant='secondary' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? 'Creating...' : 'Create menu'}
          </Button>
        </div>
      </div>
    </div>
  )
}

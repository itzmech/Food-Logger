import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import type { MenuItem } from '@/types'
import { nowIso } from '@/utils/id'

export interface ItemEditModalProps {
  open: boolean
  onClose: () => void
  item: MenuItem | null
  onSave: (item: MenuItem) => void
}

/** Modal for adding/editing a menu item inline. */
export function ItemEditModal({
  open,
  onClose,
  item,
  onSave,
}: ItemEditModalProps) {
  const isEditing = item !== null

  const [name, setName] = useState(isEditing ? (item?.name ?? '') : '')
  const [foodId, setFoodId] = useState(isEditing ? (item?.foodId ?? '') : '')
  const [calories, setCalories] = useState(isEditing ? (item?.calories == null ? '' : String(item!.calories)) : '')
  const [proteinG, setProteinG] = useState(isEditing ? (item?.proteinG == null ? '' : String(item!.proteinG)) : '')
  const [carbsG, setCarbsG] = useState(isEditing ? (item?.carbsG == null ? '' : String(item!.carbsG)) : '')
  const [fatG, setFatG] = useState(isEditing ? (item?.fatG == null ? '' : String(item!.fatG)) : '')
  const [isVeg, setIsVeg] = useState(isEditing ? (item?.isVeg ?? true) : true)
  const [note, setNote] = useState(isEditing ? (item?.note ?? '') : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setBusy(true)
    setError(null)
    onSave({
      ...item,
      id: item?.id ?? '',
      name: name.trim(),
      foodId: foodId.trim() || null,
      calories: calories === '' ? null : Number(calories),
      proteinG: proteinG === '' ? null : Number(proteinG),
      carbsG: carbsG === '' ? null : Number(carbsG),
      fatG: fatG === '' ? null : Number(fatG),
      isVeg: isVeg === false ? false : true,
      note: note.trim() || null,
      status: isEditing ? item!.status : 'available',
      at: isEditing ? item!.at : (nowIso() as never),
      createdAt: isEditing ? item!.createdAt : (nowIso() as never),
      updatedAt: nowIso(),
    })
  }

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-4'>
      <div
        role='dialog'
        aria-modal='true'
        aria-label={isEditing ? 'Edit menu item' : 'New menu item'}
        className='w-full max-w-lg rounded-t-3xl border border-line bg-base-raised p-5'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-start justify-between'>
          <h2 className='text-base font-semibold text-ink'>{isEditing ? 'Edit item' : 'New item'}</h2>
          <Button variant='ghost' size='sm' onClick={onClose}>
            <svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2}>
              <path d='M18 6 6 18M6 6l12 12' />
            </svg>
          </Button>
        </div>

        <div className='mt-4 space-y-3'>
          <TextField label='Name' value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label='Food id (optional)' value={foodId} onChange={(e) => setFoodId(e.target.value)} placeholder='Link to a food database entry' />
          <div className='grid grid-cols-3 gap-2'>
            <TextField label='Cal' value={calories} onChange={(e) => setCalories(e.target.value)} />
            <TextField label='Protein g' value={proteinG} onChange={(e) => setProteinG(e.target.value)} />
            <TextField label='Carbs g' value={carbsG} onChange={(e) => setCarbsG(e.target.value)} />
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <TextField label='Fat g' value={fatG} onChange={(e) => setFatG(e.target.value)} />
            <label className='flex items-center gap-2 text-sm text-ink-2'>
              <input
                type='checkbox'
                checked={isVeg}
                onChange={() => setIsVeg((v) => !v)}
                className='h-4 w-4 rounded border-line bg-surface-2 text-accent'
              />
              Veg
            </label>
          </div>
          <TextField label='Note (optional)' value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error ? <p className='mt-3 text-sm text-danger'>{error}</p> : null}

        <div className='mt-5 flex gap-2'>
          <Button variant='secondary' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? 'Saving...' : isEditing ? 'Save changes' : 'Add'}
          </Button>
        </div>
      </div>
    </div>
  )
}

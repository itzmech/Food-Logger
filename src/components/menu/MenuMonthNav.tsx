import { Icon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { monthLabel } from '@/utils/date'
import type { MessMenu } from '@/types'

export interface MenuMonthNavProps {
  monthKey: string
  menu: MessMenu | undefined
  onPrevMonth: () => void
  onNextMonth: () => void
  onAddMonth: () => void
  onCopyMonth: () => void
  onEditMenu: (menu: MessMenu) => void
}

/** Month navigation bar with prev/next, current month label, and Add/Copy actions. Mobile-first: full-width buttons. */
export function MenuMonthNav({
  monthKey,
  menu,
  onPrevMonth,
  onNextMonth,
  onAddMonth,
  onCopyMonth,
  onEditMenu,
}: MenuMonthNavProps) {
  return (
    <div className='sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-line bg-base/95 px-3 py-2 backdrop-blur'>
      <Button variant='secondary' size='sm' onClick={onPrevMonth} aria-label='Previous month'>
        <Icon name='chevron-left' size={16} />
      </Button>
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-semibold text-ink'>{monthLabel(monthKey)}</p>
        <p className='text-[12px] text-ink-3'>{menu?.days?.length ?? 0} days published</p>
      </div>
      <Button variant='secondary' size='sm' onClick={onNextMonth} aria-label='Next month'>
        <Icon name='chevron-right' size={16} />
      </Button>

      {/* Copy month is available when a source menu exists for the current month. */}
      {/* Add menu is available when there is no menu for the current month. */}
      {menu ? (
        <>
          <Button size='sm' variant='secondary' onClick={onCopyMonth}>
            <Icon name='download' size={15} />
            Copy month
          </Button>
          <Button size='sm' onClick={() => onEditMenu(menu)}>
            <Icon name='settings' size={15} />
            Edit menu
          </Button>
        </>
      ) : (
        <Button size='sm' onClick={onAddMonth}>
          <Icon name='plus' size={15} />
          Add menu
        </Button>
      )}
    </div>
  )
}

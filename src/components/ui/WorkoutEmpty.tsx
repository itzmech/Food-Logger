import type { ReactNode } from 'react'
import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'
import { cn } from '@/utils/cn'

export interface WorkoutEmptyProps {
  icon?: IconName
  title: string
  message?: string
  action?: ReactNode
  className?: string
}

export function WorkoutEmpty({ icon = 'workout', title, message, action, className }: WorkoutEmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center gap-3 py-12', className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface-2 text-ink-3">
        <Icon name={icon} size={22} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {message ? <p className="text-[13px] leading-relaxed text-ink-3">{message}</p> : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}

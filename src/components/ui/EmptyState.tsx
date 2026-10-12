import type { ReactNode } from 'react'
import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'
import { cn } from '@/utils/cn'

export interface EmptyStateProps {
  icon?: IconName
  title: string
  message?: string
  action?: ReactNode
  /** Tighter spacing for empty states nested inside cards. */
  compact?: boolean
  className?: string
}

/**
 * Every empty state explains what will appear here and what the user can do
 * next — never a blank panel.
 */
export function EmptyState({
  icon = 'info',
  title,
  message,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 py-6' : 'gap-3 py-10',
        className,
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-2xl border border-line bg-surface-2 text-ink-3',
          compact ? 'h-10 w-10' : 'h-12 w-12',
        )}
      >
        <Icon name={icon} size={compact ? 18 : 22} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {message ? (
          <p className="mx-auto max-w-[17rem] text-[13px] leading-relaxed text-ink-3">{message}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}

import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface SectionHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-3 px-1', className)}>
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          {title}
        </h2>
        {description ? <p className="mt-1 text-[13px] text-ink-3">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

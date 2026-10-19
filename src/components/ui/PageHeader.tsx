import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
  compact?: boolean
}

export function PageHeader({ title, subtitle, action, className, compact = false }: PageHeaderProps) {
  return (
    <header className={cn('flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className={cn(
          'font-bold leading-tight tracking-tight text-ink',
          compact ? 'text-[22px]' : 'text-[26px]',
        )}>{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0 pb-0.5">{action}</div> : null}
    </header>
  )
}

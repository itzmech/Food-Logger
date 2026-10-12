import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <header className={cn('flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-3">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0 pb-1">{action}</div> : null}
    </header>
  )
}

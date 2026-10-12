import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-line-strong bg-surface-2 text-ink-2',
  accent: 'border-accent/30 bg-accent-dim text-accent-strong',
  success: 'border-success/25 bg-success-dim text-success',
  warning: 'border-warning/25 bg-warning-dim text-warning',
  danger: 'border-danger/25 bg-danger-dim text-danger',
}

export interface BadgeProps {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

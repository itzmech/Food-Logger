import type { ReactNode } from 'react'
import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'
import { cn } from '@/utils/cn'

export type InfoNoteTone = 'info' | 'accent' | 'warning'

const TONES: Record<InfoNoteTone, { wrapper: string; icon: string }> = {
  info: { wrapper: 'border-line bg-surface', icon: 'bg-surface-2 text-ink-2' },
  accent: { wrapper: 'border-accent/25 bg-accent-dim', icon: 'bg-accent/20 text-accent-strong' },
  warning: { wrapper: 'border-warning/25 bg-warning-dim', icon: 'bg-warning/20 text-warning' },
}

export interface InfoNoteProps {
  icon?: IconName
  title: string
  children?: ReactNode
  tone?: InfoNoteTone
  className?: string
}

export function InfoNote({ icon = 'info', title, children, tone = 'info', className }: InfoNoteProps) {
  const styles = TONES[tone]

  return (
    <div className={cn('flex gap-3 rounded-2xl border p-3.5', styles.wrapper, className)}>
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          styles.icon,
        )}
      >
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        {children ? (
          <div className="mt-1 text-[12px] leading-relaxed text-ink-2">{children}</div>
        ) : null}
      </div>
    </div>
  )
}

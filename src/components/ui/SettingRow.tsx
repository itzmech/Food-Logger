import type { ReactNode } from 'react'
import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { cn } from '@/utils/cn'

export interface SettingRowProps {
  icon?: IconName
  title: string
  description?: ReactNode
  /** Right-aligned muted text (e.g. current value). */
  value?: ReactNode
  /** Right-aligned interactive element (button, switch, …). */
  action?: ReactNode
  onClick?: () => void
  tone?: 'default' | 'danger' | 'accent'
  disabled?: boolean
}

export function SettingRow({
  icon,
  title,
  description,
  value,
  action,
  onClick,
  tone = 'default',
  disabled = false,
}: SettingRowProps) {
  const interactive = typeof onClick === 'function'

  const body = (
    <>
      {icon ? (
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            tone === 'danger'
              ? 'bg-danger-dim text-danger'
              : tone === 'accent'
                ? 'bg-accent-dim text-accent-strong'
                : 'bg-surface-2 text-ink-2',
          )}
        >
          <Icon name={icon} size={18} />
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm font-medium',
            tone === 'danger' ? 'text-danger' : 'text-ink',
          )}
        >
          {title}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">{description}</span>
        ) : null}
      </span>

      {value ? <span className="shrink-0 text-[13px] text-ink-3">{value}</span> : null}
      {action ? <span className="shrink-0">{action}</span> : null}
    </>
  )

  const classes = cn(
    'flex w-full items-center gap-3 px-4 py-3.5 text-left',
    interactive && !disabled && 'transition-colors hover:bg-surface-2/70 active:bg-surface-2',
    disabled && 'opacity-50',
  )

  if (interactive) {
    return (
      <button type="button" className={classes} onClick={onClick} disabled={disabled}>
        {body}
      </button>
    )
  }

  return <div className={classes}>{body}</div>
}

export interface SettingsGroupProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

/** Section label + card whose rows are separated by hairlines. */
export function SettingsGroup({ title, description, children, className }: SettingsGroupProps) {
  return (
    <section className={cn('space-y-2', className)}>
      <SectionHeader title={title} description={description} />
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
        <div className="divide-y divide-line">{children}</div>
      </div>
    </section>
  )
}

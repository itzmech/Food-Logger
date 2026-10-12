import type { ButtonHTMLAttributes } from 'react'
import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'
import { cn } from '@/utils/cn'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  label: string
  size?: 'sm' | 'md'
  tone?: 'default' | 'danger'
}

export function IconButton({
  icon,
  label,
  size = 'md',
  tone = 'default',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-xl transition-colors duration-150',
        size === 'md' ? 'h-10 w-10' : 'h-8 w-8',
        tone === 'danger'
          ? 'text-danger hover:bg-danger-dim'
          : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        className,
      )}
      {...props}
    >
      <Icon name={icon} size={size === 'md' ? 20 : 16} />
    </button>
  )
}

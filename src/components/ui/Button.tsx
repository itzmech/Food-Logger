import type { ButtonHTMLAttributes, Ref } from 'react'
import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonTone = 'default' | 'danger'

const BASE =
  'inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-deep active:bg-accent-deep',
  secondary: 'border border-line bg-surface-2 text-ink hover:bg-overlay',
  outline: 'border border-line-strong text-ink-2 hover:border-accent/60 hover:text-ink',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'border border-danger/30 bg-danger-dim text-danger hover:bg-danger/25',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
}

/** Shared classes so `Link`s can look like buttons without extra wrappers. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  tone: ButtonTone = 'default',
  className?: string,
): string {
  const toneClass = tone === 'danger' ? 'text-danger hover:bg-danger-dim' : ''
  return cn(BASE, VARIANTS[variant], toneClass, SIZES[size], className)
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  tone?: ButtonTone
  /** React 19 passes refs as props — forwarded to the underlying button. */
  ref?: Ref<HTMLButtonElement>
}

export function Button({ variant = 'primary', size = 'md', tone = 'default', className, ref, ...props }: ButtonProps) {
  return <button ref={ref} className={buttonClasses(variant, size, tone, className)} {...props} />
}

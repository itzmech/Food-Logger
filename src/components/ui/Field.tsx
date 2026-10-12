import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { useId } from 'react'
import { cn } from '@/utils/cn'

const CONTROL =
  'w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-ink-3 transition-colors focus:border-accent/70 focus:outline-none disabled:opacity-50'

interface FieldShellProps {
  label: string
  hint?: ReactNode
  htmlFor?: string
  children: ReactNode
}

function FieldShell({ label, hint, htmlFor, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-[12px] leading-snug text-ink-3">{hint}</p> : null}
    </div>
  )
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return (
    <p role="alert" className="text-[12px] text-danger">
      {error}
    </p>
  )
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: ReactNode
  suffix?: string
  /** Validation message shown below the input. */
  error?: string
}

export function TextField({ label, hint, suffix, error, className, ...props }: TextFieldProps) {
  const id = useId()
  return (
    <FieldShell label={label} hint={hint} htmlFor={props.id ?? id}>
      <div className="relative">
        <input
          id={props.id ?? id}
          className={cn(
            CONTROL,
            'h-11',
            suffix && 'pr-12',
            error && 'border-danger/60 focus:border-danger',
            className,
          )}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-3">
            {suffix}
          </span>
        ) : null}
      </div>
      <FieldError error={error} />
    </FieldShell>
  )
}

export interface NumberFieldProps extends Omit<TextFieldProps, 'type' | 'inputMode'> {
  step?: number
}

export function NumberField({ step = 1, ...props }: NumberFieldProps) {
  return <TextField type="number" inputMode="decimal" step={step} {...props} />
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: ReactNode
  error?: string
}

export function SelectField({ label, hint, className, children, error, ...props }: SelectFieldProps) {
  const id = useId()
  return (
    <FieldShell label={label} hint={hint} htmlFor={props.id ?? id}>
      <select id={props.id ?? id} className={cn(CONTROL, 'h-11 pr-8', error && 'border-danger/60', className)} {...props}>
        {children}
      </select>
      <FieldError error={error} />
    </FieldShell>
  )
}

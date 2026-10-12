import { cn } from '@/utils/cn'

export interface MacroPillProps {
  label: 'P' | 'C' | 'F'
  value: number | null
  className?: string
}

const TONES: Record<MacroPillProps['label'], string> = {
  P: 'text-accent-strong',
  C: 'text-success',
  F: 'text-warning',
}

/** Tiny P/C/F readout used inside meal rows; hidden when unrecorded. */
export function MacroPill({ label, value, className }: MacroPillProps) {
  if (value == null) return null
  return (
    <span className={cn('text-[11px] tabular-nums', TONES[label], className)}>
      {label} {Math.round(value * 10) / 10}g
    </span>
  )
}

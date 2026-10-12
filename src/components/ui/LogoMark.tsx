import { useId } from 'react'
import { cn } from '@/utils/cn'

export interface LogoMarkProps {
  size?: number
  className?: string
}

/** Rounded tile + lightning bolt — the same mark used for the PWA icons. */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  const id = useId()
  const tileId = `${id}-tile`
  const boltId = `${id}-bolt`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn('shrink-0', className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={tileId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#181a26" />
          <stop offset="1" stopColor="#0c0d14" />
        </linearGradient>
        <linearGradient id={boltId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${tileId})`} />
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="14.25"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.08"
        strokeWidth="1.5"
      />
      <path
        d="M38.4 6.5 16.8 34.6h13.1L25.4 57.5 47.2 29.4H34.1z"
        fill={`url(#${boltId})`}
      />
    </svg>
  )
}

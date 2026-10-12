import { LogoMark } from '@/components/ui/LogoMark'
import { APP_NAME, APP_SHORT_NAME } from '@/lib/constants'
import { cn } from '@/utils/cn'

export interface LogoProps {
  size?: number
  subtitle?: string | null
  className?: string
}

export function Logo({ size = 30, subtitle = null, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold leading-tight tracking-tight text-ink">
          {APP_SHORT_NAME}
          <span className="sr-only"> {APP_NAME}</span>
        </p>
        {subtitle ? (
          <p className="truncate text-[11px] leading-tight text-ink-3">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}

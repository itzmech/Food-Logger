import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'

export interface ComingSoonProps {
  icon: IconName
  title: string
  description: string
  /** Which phase brings this feature, shown on the right. */
  phase?: string
}

/**
 * Marks a section that is intentionally not implemented yet. This keeps the
 * placeholder honest instead of faking functionality.
 */
export function ComingSoon({ icon, title, description, phase = 'Next phase' }: ComingSoonProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface-2 text-ink-3">
        <Icon name={icon} size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-ink-2">{title}</p>
          <Badge tone="neutral">{phase}</Badge>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{description}</p>
      </div>
    </div>
  )
}

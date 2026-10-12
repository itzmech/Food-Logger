import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-surface p-4',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]',
        className,
      )}
      {...props}
    />
  )
}

export interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-[13px] leading-snug text-ink-3">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export interface SectionCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  contentClassName?: string
}

/** Card with a header and a consistent gap before its content. */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  ...rest
}: SectionCardProps) {
  return (
    <Card className={className} {...rest}>
      <CardHeader title={title} description={description} action={action} />
      <div className={cn('mt-4', contentClassName)}>{children}</div>
    </Card>
  )
}

import { cn } from '@/utils/cn'

export interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-2', className)} />
}

/** Placeholder used while a lazily-loaded page or card is fetching data. */
export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <Skeleton className="h-4 w-28" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className={index === lines - 1 ? 'h-3 w-2/3' : 'h-3 w-full'} />
        ))}
      </div>
    </div>
  )
}

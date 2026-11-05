import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function TrainCardSkeleton() {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="mt-4 flex items-center gap-6">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-12 w-28" />
        <Skeleton className="h-12 w-28" />
        <Skeleton className="h-12 w-28" />
      </div>
    </div>
  );
}

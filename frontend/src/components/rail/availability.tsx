import { cn, formatINR, classLabel } from '@/lib/utils';
import type { ClassAvailability } from '@/lib/api/schemas';
import { StatusChip } from '@/components/ui/badge';

/** A compact capacity bar: confirmed fill vs total, with RAC/WL headroom. */
export function AvailabilityMeter({ inv, className }: { inv: ClassAvailability; className?: string }) {
  const pct = inv.totalSeats > 0 ? Math.round((inv.confirmedCount / inv.totalSeats) * 100) : 0;
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{inv.availableSeats} of {inv.totalSeats} available</span>
        <span className="font-mono text-muted">{pct}% full</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" role="progressbar"
        aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% of seats booked`}>
        <div
          className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-wl' : pct >= 80 ? 'bg-rac' : 'bg-ok')}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="flex gap-3 text-2xs text-muted">
        <span>RAC {inv.racCount}/{inv.racLimit}</span>
        <span>WL {inv.waitingCount}/{inv.waitingLimit}</span>
      </div>
    </div>
  );
}

/** Selectable class option used on the train detail / booking page. */
export function ClassOption({
  inv, selected, onSelect, disabled,
}: { inv: ClassAvailability; selected: boolean; onSelect: () => void; disabled?: boolean }) {
  const isFull = inv.status === 'FULL';
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled || isFull}
      aria-pressed={selected}
      className={cn(
        'w-full rounded-md border p-3.5 text-left transition-all',
        selected ? 'border-brand bg-brand-tint ring-2 ring-brand/20' : 'border-line bg-surface hover:border-brand/40',
        (disabled || isFull) && 'cursor-not-allowed opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{classLabel(inv.classType)}</p>
          <p className="font-mono text-xs text-muted">{inv.classType}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-ink tnum">{formatINR(inv.fare)}</p>
          <p className="text-2xs text-muted">per passenger</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <StatusChip status={inv.status} size="sm" />
        <span className="text-xs text-muted">
          {inv.status === 'AVAILABLE' && `${inv.availableSeats} left`}
          {inv.status === 'RAC' && `RAC ${inv.racAvailable} left`}
          {inv.status === 'WL' && `WL ${inv.waitingAvailable} left`}
          {inv.status === 'FULL' && 'No capacity'}
        </span>
      </div>
    </button>
  );
}

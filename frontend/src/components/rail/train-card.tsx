import { Link } from '@tanstack/react-router';
import type { Train } from '@/lib/api/schemas';
import { cn, formatDuration, formatINR, classLabel } from '@/lib/utils';
import { StatusChip } from '@/components/ui/badge';
import { ArrowRight, Clock3, Route as RouteIcon } from 'lucide-react';

const availabilityTone: Record<string, string> = {
  AVAILABLE: 'border-ok-line bg-ok-soft/50 hover:border-ok',
  RAC: 'border-rac-line bg-rac-soft/50 hover:border-rac',
  WL: 'border-wl-line bg-wl-soft/50 hover:border-wl',
  FULL: 'border-line bg-paper opacity-60',
};

export function TrainCard({ train, date }: { train: Train; date?: string }) {
  const search = { date };
  return (
    <article className="surface-card overflow-hidden transition-shadow hover:shadow-raise">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
        {/* Identity */}
        <div className="lg:w-56 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-brand tnum">{train.trainNumber}</span>
            {train.trainType && (
              <span className="rounded-sm bg-brand-soft px-1.5 py-0.5 text-2xs font-medium text-brand">{train.trainType}</span>
            )}
          </div>
          <h3 className="mt-0.5 text-md font-semibold text-ink">{train.trainName}</h3>
          {train.daysOfRun && (
            <p className="mt-1 text-2xs text-muted">Runs {train.daysOfRun.length === 7 ? 'daily' : train.daysOfRun.join(', ')}</p>
          )}
        </div>

        {/* Journey */}
        <div className="flex flex-1 items-center gap-3">
          <div className="text-center">
            <p className="font-mono text-xl font-semibold text-ink tnum">{train.departureTime || '—'}</p>
            <p className="mt-0.5 max-w-[110px] truncate text-xs text-muted">{train.source}</p>
          </div>
          <div className="flex flex-1 flex-col items-center px-1">
            <span className="flex items-center gap-1 text-2xs text-muted">
              <Clock3 className="h-3 w-3" aria-hidden />{formatDuration(train.durationMinutes || 0)}
            </span>
            <span className="my-1 flex w-full items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              <span className="h-px flex-1 bg-line" />
              <ArrowRight className="h-3.5 w-3.5 text-muted" aria-hidden />
              <span className="h-px flex-1 bg-line" />
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            {train.distanceKm && (
              <span className="flex items-center gap-1 text-2xs text-muted">
                <RouteIcon className="h-3 w-3" aria-hidden />{train.distanceKm} km
              </span>
            )}
          </div>
          <div className="text-center">
            <p className="font-mono text-xl font-semibold text-ink tnum">{train.arrivalTime || '—'}</p>
            <p className="mt-0.5 max-w-[110px] truncate text-xs text-muted">{train.destination}</p>
          </div>
        </div>

        {/* Classes + CTA */}
        <div className="flex flex-col gap-3 lg:w-[340px] shrink-0">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {train.classes.map((c) => {
              const inv = train.availability?.[c.classType];
              const status = inv?.status || 'AVAILABLE';
              return (
                <Link
                  key={c.classType}
                  to="/trains/$trainNumber"
                  params={{ trainNumber: train.trainNumber }}
                  search={search}
                  className={cn('rounded border px-2 py-1.5 text-center transition-colors', availabilityTone[status])}
                  aria-label={`${classLabel(c.classType)} — ${status}`}
                >
                  <p className="font-mono text-xs font-semibold text-ink">{c.classType}</p>
                  <p className="text-2xs text-muted tnum">{formatINR(c.fare)}</p>
                  {inv && <p className={cn('mt-0.5 text-2xs font-semibold', status === 'AVAILABLE' ? 'text-ok' : status === 'RAC' ? 'text-rac' : status === 'WL' ? 'text-wl' : 'text-cancel')}>
                    {status === 'AVAILABLE' ? `AVL ${inv.availableSeats}` : status === 'RAC' ? `RAC ${inv.racAvailable}` : status === 'WL' ? `WL ${inv.waitingAvailable}` : 'FULL'}
                  </p>}
                </Link>
              );
            })}
          </div>
          <Link
            to="/trains/$trainNumber"
            params={{ trainNumber: train.trainNumber }}
            search={search}
            className="inline-flex h-9 items-center justify-center rounded bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
          >
            View seats &amp; book
          </Link>
        </div>
      </div>
    </article>
  );
}

import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Ticket, ArrowRight, TrainFront } from 'lucide-react';
import { getMyBookings } from '@/lib/api/endpoints';
import { StatusChip } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { FullPageLoader } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatINR, classLabel, todayISO } from '@/lib/utils';
import type { Booking } from '@/lib/api/schemas';

type Filter = 'all' | 'upcoming' | 'queued' | 'cancelled';

function matches(b: Booking, f: Filter) {
  if (f === 'all') return true;
  if (f === 'cancelled') return b.status === 'CANCELLED';
  if (f === 'upcoming') return b.status !== 'CANCELLED' && b.journeyDate >= todayISO();
  if (f === 'queued') return b.status === 'RAC' || b.status === 'WL' || b.status === 'PARTIAL';
  return true;
}

export function TripsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['my-bookings'], queryFn: getMyBookings });

  const filtered = useMemo(() => (data || []).filter((b) => matches(b, filter)), [data, filter]);

  return (
    <div className="app-container py-6 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">My trips</h1>
          <p className="mt-1 text-sm text-muted">Every booking on your account, with live status.</p>
        </div>
        <Link to="/trains"><Button><TrainFront className="h-4 w-4" /> Book a new trip</Button></Link>
      </div>

      <div className="mt-5">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="queued">RAC / Waiting</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-5">
        {isLoading && <FullPageLoader label="Loading your trips…" />}
        {isError && <Alert tone="error" title="Couldn’t load your trips">{(error as Error)?.message}</Alert>}
        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyState icon={Ticket} title={filter === 'all' ? 'No bookings yet' : 'Nothing in this view'}
            description={filter === 'all' ? 'Search for a train and make your first booking — it will appear here.' : 'Try a different filter, or book a new trip.'}
            action={<Link to="/trains"><Button variant="outline">Search trains</Button></Link>} />
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((b) => (
              <Link key={b.pnr} to="/trips/$pnr" params={{ pnr: b.pnr }}
                className="surface-card flex flex-col gap-3 p-4 transition-shadow hover:shadow-raise sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-4">
                  <span className="hidden h-11 w-11 items-center justify-center rounded bg-brand-soft text-brand sm:flex">
                    <TrainFront className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-ink">{b.trainName}</p>
                      <span className="font-mono text-xs text-muted">#{b.trainNumber}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {b.source} → {b.destination} · {formatDate(b.journeyDate)} · {classLabel(b.classType)}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted">PNR {b.pnr} · {b.passengers.length} passenger{b.passengers.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <StatusChip status={b.status} size="sm" />
                  <span className="font-semibold text-ink tnum">{formatINR(b.totalFare)}</span>
                  <ArrowRight className="h-4 w-4 text-muted" aria-hidden />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

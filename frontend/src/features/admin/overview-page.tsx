import { useQuery } from '@tanstack/react-query';
import { Users, TrainFront, Ticket, IndianRupee, CheckCircle2, Clock3, Hourglass, XCircle } from 'lucide-react';
import { getAdminStats } from '@/lib/api/endpoints';
import { FullPageLoader } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { formatNumber, formatINR } from '@/lib/utils';

export function AdminOverviewPage() {
  const { data: stats, isLoading, isError, error } = useQuery({ queryKey: ['admin', 'stats'], queryFn: getAdminStats, refetchInterval: 15000 });

  if (isLoading) return <FullPageLoader label="Loading dashboard…" />;
  if (isError || !stats) return <Alert tone="error" title="Couldn’t load stats">{(error as Error)?.message}</Alert>;

  const cards = [
    { label: 'Registered users', value: formatNumber(stats.users), icon: Users, tone: 'text-brand bg-brand-soft' },
    { label: 'Trains in catalog', value: formatNumber(stats.trains), icon: TrainFront, tone: 'text-brand bg-brand-soft' },
    { label: 'Total bookings', value: formatNumber(stats.bookings), icon: Ticket, tone: 'text-brand bg-brand-soft' },
    { label: 'Active fare value', value: formatINR(stats.revenue), icon: IndianRupee, tone: 'text-ok bg-ok-soft' },
  ];

  const totalPax = stats.confirmed + stats.rac + stats.wl + stats.cancelled || 1;
  const breakdown = [
    { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle2, cls: 'bg-ok', text: 'text-ok' },
    { label: 'RAC', value: stats.rac, icon: Clock3, cls: 'bg-rac', text: 'text-rac' },
    { label: 'Waiting list', value: stats.wl, icon: Hourglass, cls: 'bg-wl', text: 'text-wl' },
    { label: 'Cancelled', value: stats.cancelled, icon: XCircle, cls: 'bg-cancel', text: 'text-cancel' },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="surface-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">{label}</p>
              <span className={`flex h-9 w-9 items-center justify-center rounded ${tone}`}><Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} /></span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-ink tnum">{value}</p>
          </div>
        ))}
      </div>

      <div className="surface-card mt-6 p-6">
        <h2 className="text-md font-semibold text-ink">Passenger status breakdown</h2>
        <p className="mt-1 text-sm text-muted">Across every booking in the system. Refreshes automatically.</p>
        <div className="mt-5 space-y-4">
          {breakdown.map(({ label, value, icon: Icon, cls, text }) => (
            <div key={label}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className={`flex items-center gap-2 font-medium ${text}`}><Icon className="h-4 w-4" />{label}</span>
                <span className="font-mono text-muted tnum">{formatNumber(value)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                <div className={`h-full rounded-full ${cls}`} style={{ width: `${Math.round((value / totalPax) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-muted">
        These are live counts from the demo database — no fabricated metrics. “Active fare value” sums fares of non-cancelled bookings and is indicative only.
      </p>
    </div>
  );
}

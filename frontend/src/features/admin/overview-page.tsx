import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight, CircleAlert, Clock3, IndianRupee, MailWarning, ShieldCheck, Ticket, TrainFront, Users } from 'lucide-react';
import { getAdminBookings, getAdminEmailOutbox, getAdminReadiness, getAdminStats } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth/store';
import { StatusChip } from '@/components/ui/badge';
import { FullPageLoader } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { formatNumber, formatINR, formatDate } from '@/lib/utils';

export function AdminOverviewPage() {
  const admin = useAuth((state) => state.user);
  const statsQuery = useQuery({ queryKey: ['admin', 'stats'], queryFn: getAdminStats, refetchInterval: 15000 });
  const bookingsQuery = useQuery({ queryKey: ['admin', 'bookings'], queryFn: getAdminBookings, refetchInterval: 30000 });
  const emailQuery = useQuery({ queryKey: ['admin', 'email-outbox', 'DEAD'], queryFn: () => getAdminEmailOutbox('DEAD'), refetchInterval: 30000 });
  const healthQuery = useQuery({ queryKey: ['admin', 'readiness'], queryFn: getAdminReadiness, refetchInterval: 15000, retry: false });
  const stats = statsQuery.data;

  if (statsQuery.isLoading) return <FullPageLoader label="Loading operations overview…" />;
  if (statsQuery.isError || !stats) return <Alert tone="error" title="Operations metrics unavailable">{(statsQuery.error as Error)?.message || 'Could not load administration metrics.'}</Alert>;

  const cards = [
    { label: 'Reservations', value: formatNumber(stats.bookings), icon: Ticket, tone: 'bg-brand-soft text-brand', hint: 'All time' },
    { label: 'Customers', value: formatNumber(stats.users), icon: Users, tone: 'bg-partial-soft text-partial', hint: 'Registered accounts' },
    { label: 'Train services', value: formatNumber(stats.trains), icon: TrainFront, tone: 'bg-accent-soft text-accent-strong', hint: 'In the catalog' },
    { label: 'Active fare value', value: formatINR(stats.revenue), icon: IndianRupee, tone: 'bg-ok-soft text-ok', hint: 'No payments processed' },
  ];
  const totalPassengers = Math.max(1, stats.confirmed + stats.rac + stats.wl + stats.cancelled);
  const statuses = [
    { label: 'Confirmed', value: stats.confirmed, tone: 'bg-ok', text: 'text-ok' },
    { label: 'RAC', value: stats.rac, tone: 'bg-rac', text: 'text-rac' },
    { label: 'Waiting list', value: stats.wl, tone: 'bg-wl', text: 'text-wl' },
    { label: 'Cancelled', value: stats.cancelled, tone: 'bg-cancel', text: 'text-cancel' },
  ];
  const recent = (bookingsQuery.data || []).slice(0, 6);

  return (
    <div className="space-y-5">
      <section className="relative isolate overflow-hidden rounded-[1.6rem] bg-[#104a3b] p-6 text-white shadow-pop sm:p-8">
        <div className="soft-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -right-16 -top-40 h-80 w-80 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#efb08c]">Operations overview</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Good to see you, {admin?.name.split(' ')[0] || 'Administrator'}.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/70">A live view of reservations, service data and delivery exceptions across RailGPT.</p></div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/bookings" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#e7a379] px-4 text-sm font-semibold text-[#18352e] transition hover:-translate-y-px">Open booking desk <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/admin/system" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-medium text-white transition hover:bg-white/10"><Activity className="h-4 w-4" /> System health</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key operations metrics">
        {cards.map(({ label, value, icon: Icon, tone, hint }) => <article key={label} className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
          <div className="flex items-start justify-between"><div><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-ink tnum">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span></div>
          <p className="mt-3 border-t border-line pt-3 text-xs text-muted">{hint}</p>
        </article>)}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Reservation mix</p><h3 className="mt-1 text-lg font-semibold text-ink">Passenger status</h3><p className="mt-1 text-sm text-muted">Current counts across all PNRs</p></div><Ticket className="h-5 w-5 text-muted" /></div>
          <div className="mt-6 space-y-4">{statuses.map(({ label, value, tone, text }) => <div key={label}>
            <div className="mb-1.5 flex items-center justify-between text-sm"><span className={`font-medium ${text}`}>{label}</span><span className="font-mono text-xs text-muted tnum">{formatNumber(value)} · {Math.round(value / totalPassengers * 100)}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(value > 0 ? 1 : 0, value / totalPassengers * 100)}%` }} /></div>
          </div>)}</div>
          <p className="mt-5 text-xs leading-5 text-muted">Fare value is an illustrative booking total; RailGPT does not process payments or represent official railway revenue.</p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <p className="eyebrow">Needs attention</p><h3 className="mt-1 text-lg font-semibold text-ink">Operational signals</h3>
          <div className="mt-5 space-y-3">
            <SignalRow icon={healthQuery.data?.status === 'UP' ? ShieldCheck : CircleAlert} title="Backend readiness" detail={healthQuery.data?.status === 'UP' ? 'API and database are ready' : healthQuery.isLoading ? 'Checking readiness…' : 'Readiness check needs attention'} tone={healthQuery.data?.status === 'UP' ? 'ok' : healthQuery.isLoading ? 'muted' : 'warning'} />
            <SignalRow icon={MailWarning} title="Failed email delivery" detail={emailQuery.isLoading ? 'Checking notification queue…' : `${emailQuery.data?.length || 0} message${emailQuery.data?.length === 1 ? '' : 's'} need review`} tone={emailQuery.data?.length ? 'warning' : 'ok'} />
            <SignalRow icon={Clock3} title="RAC and waiting list" detail={`${formatNumber(stats.rac)} RAC · ${formatNumber(stats.wl)} waiting`} tone="muted" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <QuickLink to="/admin/email-outbox" label="Review email" icon={MailWarning} />
            <QuickLink to="/admin/activity" label="View staff activity" icon={Activity} />
          </div>
          {healthQuery.isError && <p className="mt-3 text-xs text-muted">Health endpoint unavailable. Check the backend and database connection.</p>}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div><p className="eyebrow">Latest activity</p><h3 className="mt-1 text-lg font-semibold text-ink">Recent reservations</h3></div>
          <Link to="/admin/bookings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:gap-2.5">View booking desk <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {bookingsQuery.isError ? <p className="p-5 text-sm text-muted">Recent reservations are temporarily unavailable.</p> : recent.length === 0 ? <p className="p-8 text-center text-sm text-muted">No reservations have been recorded yet.</p> : <div className="divide-y divide-line">
          {recent.map((booking) => <Link key={booking.pnr} to="/admin/bookings" className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-brand-tint/40 sm:px-6">
            <div className="min-w-0"><p className="font-medium text-ink">{booking.trainName} <span className="ml-1 font-mono text-xs font-normal text-muted">#{booking.trainNumber}</span></p><p className="mt-1 text-xs text-muted">PNR {booking.pnr} · {booking.source} → {booking.destination} · {formatDate(booking.journeyDate)}</p></div>
            <div className="flex items-center gap-3"><StatusChip status={booking.status} size="sm" /><span className="hidden font-mono text-xs text-muted sm:inline">{booking.userEmail || '—'}</span></div>
          </Link>)}
        </div>}
      </section>
    </div>
  );
}

function SignalRow({ icon: Icon, title, detail, tone }: { icon: typeof ShieldCheck; title: string; detail: string; tone: 'ok' | 'warning' | 'muted' }) {
  const dot = tone === 'ok' ? 'bg-ok' : tone === 'warning' ? 'bg-rac' : 'bg-muted';
  return <div className="flex items-start gap-3 rounded-xl border border-line bg-paper/60 p-3"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dot}`} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{title}</p><p className="mt-0.5 text-xs leading-5 text-muted">{detail}</p></div><Icon className="h-4 w-4 shrink-0 text-muted" /></div>;
}

function QuickLink({ to, label, icon: Icon }: { to: '/admin/email-outbox' | '/admin/activity'; label: string; icon: typeof Activity }) {
  return <Link to={to} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line px-3 text-xs font-medium text-body transition-colors hover:border-brand/30 hover:bg-brand-soft hover:text-brand"><Icon className="h-4 w-4" />{label}</Link>;
}

import { Suspense } from 'react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { Activity, ClipboardList, LayoutDashboard, MailCheck, ShieldCheck, TrainFront, Users, Waypoints, type LucideIcon } from 'lucide-react';
import { FullPageLoader } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

const ADMIN_NAV: { to: string; label: string; icon: LucideIcon; description: string; exact?: boolean }[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, description: 'Operations at a glance', exact: true },
  { to: '/admin/bookings', label: 'Booking desk', icon: ClipboardList, description: 'Reservations and cancellations' },
  { to: '/admin/trains', label: 'Train catalog', icon: TrainFront, description: 'Routes, classes and fares' },
  { to: '/admin/users', label: 'Accounts', icon: Users, description: 'Customers and staff access' },
  { to: '/admin/audit', label: 'Booking audit', icon: Waypoints, description: 'PNR events and queue changes' },
  { to: '/admin/activity', label: 'Staff activity', icon: Activity, description: 'Administrative change history' },
  { to: '/admin/email-outbox', label: 'Email delivery', icon: MailCheck, description: 'Notifications and retries' },
  { to: '/admin/system', label: 'System health', icon: ShieldCheck, description: 'Backend readiness and metrics' },
];

export function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = ADMIN_NAV.find(({ to, exact }) => exact ? pathname === to : pathname.startsWith(to)) || ADMIN_NAV[0];

  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-5 px-4 py-5 sm:px-7 sm:py-7 lg:grid-cols-[252px_minmax(0,1fr)] lg:gap-7 lg:px-8">
      <aside className="self-start rounded-[1.5rem] border border-line bg-surface p-3 shadow-card lg:sticky lg:top-24">
        <div className="hidden items-center gap-3 px-3 pb-4 pt-2 lg:flex">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><ShieldCheck className="h-5 w-5" /></span>
          <div><p className="text-sm font-semibold text-ink">Operations</p><p className="mt-0.5 text-2xs text-muted">ADMIN WORKSPACE</p></div>
        </div>
        <nav aria-label="Operations sections" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {ADMIN_NAV.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return <Link key={to} to={to} aria-current={active ? 'page' : undefined}
              className={cn('flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', active ? 'bg-brand text-white shadow-sm' : 'text-body hover:bg-brand-soft hover:text-brand')}>
              <Icon className="h-[17px] w-[17px] shrink-0" aria-hidden />
              <span>{label}</span>
            </Link>;
          })}
        </nav>
        <div className="mt-4 hidden rounded-xl bg-paper p-3 lg:block">
          <p className="flex items-center gap-2 text-xs font-semibold text-ink"><span className="h-2 w-2 rounded-full bg-ok" /> Staff access enabled</p>
          <p className="mt-1.5 text-2xs leading-4 text-muted">Changes in this workspace are recorded for operational review.</p>
        </div>
      </aside>

      <section className="min-w-0">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
          <div><p className="eyebrow">RailGPT · Operations</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{current.label}</h1><p className="mt-1 text-sm text-muted">{current.description}</p></div>
          <span className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs text-muted sm:inline-flex"><span className="h-2 w-2 rounded-full bg-ok" /> Staff workspace</span>
        </div>
        <Suspense fallback={<FullPageLoader label="Opening operations section…" />}><Outlet /></Suspense>
      </section>
    </div>
  );
}

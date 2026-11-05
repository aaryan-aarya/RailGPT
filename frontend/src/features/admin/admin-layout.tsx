import { Suspense } from 'react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, TrainFront, Ticket, Users, ShieldCheck } from 'lucide-react';
import { FullPageLoader } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/admin/trains', label: 'Trains', icon: TrainFront },
  { to: '/admin/bookings', label: 'Bookings', icon: Ticket },
  { to: '/admin/users', label: 'Users', icon: Users },
] as const;

export function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="app-container py-6 lg:py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand text-white"><ShieldCheck className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-semibold text-ink">Admin console</h1>
          <p className="text-xs text-muted">Manage the catalog, bookings and users. Administrator access only.</p>
        </div>
      </div>

      <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-line" aria-label="Admin">
        {ADMIN_NAV.map(({ to, label, icon: Icon, ...rest }) => {
          const active = 'exact' in rest && rest.exact ? pathname === to : pathname.startsWith(to);
          return (
            <Link key={to} to={to}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                active ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink',
              )}>
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6"><Suspense fallback={<FullPageLoader />}><Outlet /></Suspense></div>
    </div>
  );
}

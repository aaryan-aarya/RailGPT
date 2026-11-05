import { Suspense } from 'react';
import { Outlet, Link, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Search, Ticket, ScanLine, MessageSquareText, FlaskConical } from 'lucide-react';
import { Brand } from './brand';
import { UserMenu } from './user-menu';
import { getMeta } from '@/lib/api/endpoints';
import { FullPageLoader } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/trains', label: 'Search trains', icon: Search },
  { to: '/pnr', label: 'PNR status', icon: ScanLine },
  { to: '/trips', label: 'My trips', icon: Ticket },
  { to: '/assistant', label: 'Assistant', icon: MessageSquareText },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: getMeta, staleTime: 1000 * 60 * 10, retry: false });
  const isDemo = meta?.mode === 'demo';

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded focus:bg-brand focus:px-4 focus:py-2 focus:text-white">
        Skip to main content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="app-container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Brand />
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
              {NAV.map(({ to, label }) => (
                <Link
                  key={to} to={to}
                  className={cn(
                    'rounded px-3 py-2 text-sm font-medium transition-colors',
                    pathname.startsWith(to) ? 'bg-brand-soft text-brand' : 'text-body hover:bg-paper hover:text-ink',
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Honest demo banner */}
      {isDemo && (
        <div className="border-b border-accent/25 bg-accent-soft">
          <div className="app-container flex items-center gap-2 py-1.5 text-xs text-accent-strong">
            <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>
              <span className="font-semibold">Demo environment.</span>{' '}
              Illustrative trains, fares and availability — not a live Indian Railways integration.
            </p>
          </div>
        </div>
      )}

      {/* Main */}
      <main id="main" className="flex-1 pb-20 lg:pb-0">
        <Suspense fallback={<FullPageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="hidden border-t border-line bg-surface lg:block">
        <div className="app-container flex flex-col gap-6 py-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Brand />
            <p className="mt-3 text-sm text-muted">
              Railway reservation and travel assistance — search, book, track and manage your journeys in one place.
            </p>
          </div>
          <div className="flex gap-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Product</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link to="/trains" className="text-body hover:text-brand">Search trains</Link></li>
                <li><Link to="/pnr" className="text-body hover:text-brand">PNR status</Link></li>
                <li><Link to="/trips" className="text-body hover:text-brand">My trips</Link></li>
                <li><Link to="/assistant" className="text-body hover:text-brand">Travel assistant</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Account</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link to="/login" className="text-body hover:text-brand">Sign in</Link></li>
                <li><Link to="/register" className="text-body hover:text-brand">Create account</Link></li>
                <li><Link to="/profile" className="text-body hover:text-brand">Profile</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="app-container flex flex-col gap-1 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} RailGPT. Built with Spring Boot &amp; React.</p>
            <p>{meta?.disclaimer || (isDemo ? 'Demo data — not affiliated with Indian Railways / IRCTC.' : 'Reserve responsibly.')}</p>
          </div>
        </div>
      </footer>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface lg:hidden" aria-label="Mobile">
        <div className="grid grid-cols-4">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link key={to} to={to}
                className={cn('flex flex-col items-center gap-0.5 py-2.5 text-2xs font-medium', active ? 'text-brand' : 'text-muted')}>
                <Icon className="h-5 w-5" aria-hidden />
                {label.split(' ')[0]}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

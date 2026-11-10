import { Suspense, useEffect, useState } from 'react';
import { Outlet, Link, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Search, Ticket, ScanLine, MessageSquareText, FlaskConical, LayoutGrid, Moon, Sun, ShieldCheck } from 'lucide-react';
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
  { to: '/services', label: 'Services', icon: LayoutGrid },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdminArea = pathname.startsWith('/admin');
  const isAdminLogin = pathname === '/admin/login';
  const [nightMode, setNightMode] = useState(() => document.documentElement.classList.contains('dark'));
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: getMeta, staleTime: 1000 * 60 * 10, retry: false });
  const isDemo = meta?.mode === 'demo';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', nightMode);
    try { localStorage.setItem('railgpt:theme', nightMode ? 'dark' : 'light'); } catch { /* preference storage is optional */ }
  }, [nightMode]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded focus:bg-brand focus:px-4 focus:py-2 focus:text-white">
        Skip to main content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/90 shadow-[0_4px_20px_rgba(24,53,46,0.035)] backdrop-blur-xl">
        <div className="app-container flex h-[4.5rem] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-7">
            <Brand />
            {isAdminArea && !isAdminLogin && <span className="hidden items-center gap-2 border-l border-line pl-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted sm:inline-flex"><span className="h-2 w-2 rounded-full bg-brand" /> Official operations</span>}
            {!isAdminArea && <nav className="hidden items-center gap-1 rounded-full border border-line/80 bg-paper/80 p-1 lg:flex" aria-label="Primary">
              {NAV.map(({ to, label }) => (
                <Link
                  key={to} to={to}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200',
                    pathname.startsWith(to) ? 'bg-brand text-white shadow-sm' : 'text-body hover:bg-brand-soft hover:text-brand',
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setNightMode((current) => !current)}
              aria-label={nightMode ? 'Switch to day mode' : 'Switch to night mode'}
              aria-pressed={nightMode}
              title={nightMode ? 'Switch to day mode' : 'Switch to night mode'}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand">
              {nightMode ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
            </button>
            {!isAdminArea && <Link to="/admin/login" aria-label="Admin login" title="Admin login"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft px-3 text-xs font-semibold text-brand transition-colors hover:border-brand/40 hover:bg-brand hover:text-white sm:gap-2 sm:px-4 sm:text-sm">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              <span className="sm:hidden">Admin</span><span className="hidden sm:inline">Admin login</span>
            </Link>}
            {isAdminArea && !isAdminLogin && <span className="hidden rounded-full bg-brand-soft px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-brand sm:inline-flex">Staff workspace</span>}
            {!isAdminLogin && <UserMenu adminMode={isAdminArea} />}
          </div>
        </div>
      </header>

      {/* Honest demo banner */}
      {isDemo && !isAdminArea && (
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
      <main id="main" className={cn('flex-1', isAdminArea ? '' : 'pb-24 lg:pb-0')}>
        <Suspense fallback={<FullPageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Footer */}
      {!isAdminArea && <footer className="hidden border-t border-line bg-paper lg:block">
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
                <li><Link to="/services" className="text-body hover:text-brand">Passenger services</Link></li>
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
      </footer>}

      {/* Mobile bottom navigation */}
      {!isAdminArea && <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-line/80 bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(24,53,46,0.08)] backdrop-blur-xl lg:hidden" aria-label="Mobile">
        <div className="mx-auto grid max-w-xl grid-cols-5 px-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link key={to} to={to}
                className={cn('flex flex-col items-center gap-1 py-2.5 text-2xs font-medium transition-colors', active ? 'text-brand' : 'text-muted')}>
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} aria-hidden />
                {label.split(' ')[0]}
              </Link>
            );
          })}
        </div>
      </nav>}
    </div>
  );
}

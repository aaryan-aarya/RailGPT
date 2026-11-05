import { lazy } from 'react';
import {
  createRootRoute, createRoute, createRouter, redirect,
} from '@tanstack/react-router';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/lib/auth/store';
import { LandingPage } from '@/features/search/landing-page';
import { SearchResultsPage } from '@/features/search/search-results-page';
import { LoginPage, RegisterPage } from '@/features/auth/auth-pages';
import { PnrPage } from '@/features/pnr/pnr-page';
import { NotFoundPage } from '@/features/misc/not-found';

// Route-level code splitting: these screens load on demand.
const TrainDetailPage = lazy(() => import('@/features/booking/train-detail-page').then((m) => ({ default: m.TrainDetailPage })));
const BookingPage = lazy(() => import('@/features/booking/booking-page').then((m) => ({ default: m.BookingPage })));
const ConfirmationPage = lazy(() => import('@/features/booking/confirmation-page').then((m) => ({ default: m.ConfirmationPage })));
const TripsPage = lazy(() => import('@/features/trips/trips-page').then((m) => ({ default: m.TripsPage })));
const TripDetailPage = lazy(() => import('@/features/trips/trip-detail-page').then((m) => ({ default: m.TripDetailPage })));
const ProfilePage = lazy(() => import('@/features/profile/profile-page').then((m) => ({ default: m.ProfilePage })));
const AssistantPage = lazy(() => import('@/features/assistant/assistant-page').then((m) => ({ default: m.AssistantPage })));
const AdminLayout = lazy(() => import('@/features/admin/admin-layout').then((m) => ({ default: m.AdminLayout })));
const AdminOverviewPage = lazy(() => import('@/features/admin/overview-page').then((m) => ({ default: m.AdminOverviewPage })));
const AdminTrainsPage = lazy(() => import('@/features/admin/trains-page').then((m) => ({ default: m.AdminTrainsPage })));
const AdminBookingsPage = lazy(() => import('@/features/admin/bookings-page').then((m) => ({ default: m.AdminBookingsPage })));
const AdminUsersPage = lazy(() => import('@/features/admin/users-page').then((m) => ({ default: m.AdminUsersPage })));

// ---- Guards ----
function requireAuth(locationHref: string) {
  const { status } = useAuth.getState();
  if (status !== 'authenticated') {
    throw redirect({ to: '/login', search: { redirect: locationHref } });
  }
}
function requireAdmin(locationHref: string) {
  const { status, user } = useAuth.getState();
  if (status !== 'authenticated') throw redirect({ to: '/login', search: { redirect: locationHref } });
  if (user?.role !== 'ADMIN') throw redirect({ to: '/' });
}

// ---- Search param validators ----
const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

// ---- Route tree ----
const rootRoute = createRootRoute({ component: AppShell, notFoundComponent: NotFoundPage });

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: LandingPage });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/login', component: LoginPage,
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({ redirect: str(s.redirect) }),
});
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/register', component: RegisterPage });

const trainsRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/trains', component: SearchResultsPage,
  validateSearch: (s: Record<string, unknown>): { source?: string; destination?: string; date?: string } =>
    ({ source: str(s.source), destination: str(s.destination), date: str(s.date) }),
});

const trainDetailRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/trains/$trainNumber', component: TrainDetailPage,
  validateSearch: (s: Record<string, unknown>): { date?: string; class?: string } => ({ date: str(s.date), class: str(s.class) }),
});

const bookRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/book/$trainNumber', component: BookingPage,
  validateSearch: (s: Record<string, unknown>): { date?: string; class?: string } => ({ date: str(s.date), class: str(s.class) }),
  beforeLoad: ({ location }) => requireAuth(location.href),
});

const confirmationRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/booking/confirmation/$pnr', component: ConfirmationPage,
  beforeLoad: ({ location }) => requireAuth(location.href),
});

const pnrRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/pnr', component: PnrPage,
  validateSearch: (s: Record<string, unknown>): { pnr?: string } => ({ pnr: str(s.pnr) }),
});

const tripsRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/trips', component: TripsPage,
  beforeLoad: ({ location }) => requireAuth(location.href),
});
const tripDetailRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/trips/$pnr', component: TripDetailPage,
  beforeLoad: ({ location }) => requireAuth(location.href),
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/profile', component: ProfilePage,
  beforeLoad: ({ location }) => requireAuth(location.href),
});

const assistantRoute = createRoute({ getParentRoute: () => rootRoute, path: '/assistant', component: AssistantPage });

// Admin (layout + children)
const adminRoute = createRoute({
  getParentRoute: () => rootRoute, path: '/admin', component: AdminLayout,
  beforeLoad: ({ location }) => requireAdmin(location.href),
});
const adminIndexRoute = createRoute({ getParentRoute: () => adminRoute, path: '/', component: AdminOverviewPage });
const adminTrainsRoute = createRoute({ getParentRoute: () => adminRoute, path: '/trains', component: AdminTrainsPage });
const adminBookingsRoute = createRoute({ getParentRoute: () => adminRoute, path: '/bookings', component: AdminBookingsPage });
const adminUsersRoute = createRoute({ getParentRoute: () => adminRoute, path: '/users', component: AdminUsersPage });

const routeTree = rootRoute.addChildren([
  indexRoute, loginRoute, registerRoute,
  trainsRoute, trainDetailRoute, bookRoute, confirmationRoute,
  pnrRoute, tripsRoute, tripDetailRoute, profileRoute, assistantRoute,
  adminRoute.addChildren([adminIndexRoute, adminTrainsRoute, adminBookingsRoute, adminUsersRoute]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

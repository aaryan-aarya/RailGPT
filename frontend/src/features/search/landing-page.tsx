import { Link } from '@tanstack/react-router';
import { Search, ScanLine, Ticket, MessageSquareText, Armchair, RefreshCw, ShieldCheck, ArrowRight } from 'lucide-react';
import { SearchForm } from '@/components/rail/search-form';
import { StatusChip } from '@/components/ui/badge';

const FEATURES = [
  { icon: Search, title: 'Search & compare', body: 'Find trains by station and date, with class-wise fares and live seat availability side by side.' },
  { icon: Armchair, title: 'Real seat allocation', body: 'Confirmed berths, coach and seat numbers, plus RAC and waiting-list queue positions you can track.' },
  { icon: ScanLine, title: 'PNR tracking', body: 'Check any PNR’s status and watch queue positions move as cancellations free up seats.' },
  { icon: RefreshCw, title: 'Smart cancellation', body: 'Cancel a ticket and the next passengers in the RAC / waiting-list queue are promoted automatically.' },
  { icon: Ticket, title: 'Multi-passenger booking', body: 'Book up to six passengers on a single PNR with per-passenger status and berth details.' },
  { icon: ShieldCheck, title: 'Secure accounts', body: 'JWT-secured sign-in, role-based admin access and bookings tied to your account.' },
];

const STEPS = [
  { n: '01', title: 'Search your route', body: 'Pick your origin, destination and journey date to see every matching train.' },
  { n: '02', title: 'Choose class & seats', body: 'Compare Sleeper, AC and Chair Car availability and fares, then add your passengers.' },
  { n: '03', title: 'Book & track', body: 'Get a PNR instantly, then track confirmation, RAC or waiting-list status any time.' },
];

export function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-brand-strong">
        <RouteMotif />
        <div className="app-container relative py-12 lg:py-16">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Railway reservation &amp; travel assistance
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl text-balance">
              Book trains, track your PNR, and travel with clarity.
            </h1>
            <p className="mt-3 max-w-xl text-md text-white/70">
              RailGPT brings search, seat availability, booking and PNR tracking into one clean, reliable workspace —
              with a travel assistant to answer your questions along the way.
            </p>
          </div>
          <div className="relative mt-8 max-w-4xl">
            <SearchForm />
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="app-container py-12 lg:py-16">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold text-ink">Everything a reservation needs</h2>
          <p className="mt-2 text-muted">Built around the real mechanics of railway booking — confirmed seats, RAC and waiting lists.</p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="surface-card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-md font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-surface">
        <div className="app-container py-12 lg:py-16">
          <h2 className="text-2xl font-semibold text-ink">Three steps to your seat</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map(({ n, title, body }) => (
              <div key={n} className="relative rounded-md border border-line bg-paper/50 p-6">
                <span className="font-mono text-sm font-semibold text-accent">{n}</span>
                <h3 className="mt-2 text-md font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Status explainer */}
      <section className="app-container py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Understand your ticket status</h2>
            <p className="mt-2 text-muted">
              Railway reservations aren’t just “booked” or “not booked”. RailGPT shows exactly where you stand and what happens next.
            </p>
            <Link to="/assistant" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
              Ask the travel assistant <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            <StatusRow status="CONFIRMED" text="You have a reserved coach, seat and berth. Ready to travel." />
            <StatusRow status="RAC" text="Reservation Against Cancellation — you can board and share a berth, and move up as seats free up." />
            <StatusRow status="WL" text="Waiting list — your position in the queue. You’re confirmed automatically as cancellations happen." />
          </div>
        </div>
      </section>

      {/* Assistant teaser */}
      <section className="border-t border-line bg-brand-tint">
        <div className="app-container flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between lg:py-14">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand text-white">
              <MessageSquareText className="h-6 w-6" aria-hidden />
            </span>
            <div className="max-w-xl">
              <h2 className="text-xl font-semibold text-ink">Have a question about your journey?</h2>
              <p className="mt-1.5 text-sm text-muted">
                The RailGPT travel assistant explains RAC and waiting lists, checks PNR status and helps you find trains.
                It’s a rule-based assistant today — honest about what it can do.
              </p>
            </div>
          </div>
          <Link to="/assistant" className="inline-flex h-11 shrink-0 items-center gap-2 rounded bg-brand px-5 text-md font-medium text-white hover:bg-brand-strong transition-colors">
            Open the assistant <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatusRow({ status, text }: { status: 'CONFIRMED' | 'RAC' | 'WL'; text: string }) {
  return (
    <div className="flex items-start gap-4 rounded-md border border-line bg-surface p-4">
      <StatusChip status={status} className="mt-0.5 shrink-0" />
      <p className="text-sm text-body">{text}</p>
    </div>
  );
}

/** Subtle railway route-line motif for the hero background (decorative only). */
function RouteMotif() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.14]" aria-hidden preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 400">
      <path d="M-50 320 C 200 280, 320 200, 520 210 S 900 300, 1250 240" fill="none" stroke="#E08A2E" strokeWidth="2" />
      <path d="M-50 360 C 220 330, 340 250, 540 255 S 920 340, 1250 290" fill="none" stroke="#ffffff" strokeWidth="1.5" />
      {[180, 420, 700, 980].map((x, i) => (
        <circle key={i} cx={x} cy={250 + (i % 2) * 40} r="5" fill="#E08A2E" />
      ))}
    </svg>
  );
}

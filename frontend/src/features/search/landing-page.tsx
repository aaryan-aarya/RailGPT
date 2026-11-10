import { Link } from '@tanstack/react-router';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Armchair, BadgeCheck, Clock3,
  MapPinned, MessageSquareText, ScanLine, Search, ShieldCheck, Sparkles,
  Ticket, TrainFront, TrainTrack,
} from 'lucide-react';
import { SearchForm } from '@/components/rail/search-form';
import { StatusChip } from '@/components/ui/badge';

const FEATURES = [
  { icon: Search, title: 'Find the right train', body: 'Compare departure times, journey lengths, fares and seat availability without losing your place.', tag: 'SEARCH' },
  { icon: Armchair, title: 'Know where you stand', body: 'See confirmed seats, RAC and waiting-list positions clearly, for every passenger on your PNR.', tag: 'AVAILABILITY' },
  { icon: ScanLine, title: 'Keep your journey close', body: 'Look up a PNR, follow status changes and find your ticket details from one simple trip view.', tag: 'TRIP CARE' },
  { icon: ShieldCheck, title: 'Book with confidence', body: 'Your booking belongs to your account, and retry-safe requests help prevent accidental duplicates.', tag: 'ACCOUNT' },
];

const STEPS = [
  { n: '01', title: 'Choose your route', body: 'Tell us where you’re going and when you’d like to travel.' },
  { n: '02', title: 'Pick your journey', body: 'Compare trains and choose a class that suits your plans.' },
  { n: '03', title: 'Travel with clarity', body: 'Get your PNR and return whenever you need an update.' },
];

export function LandingPage() {
  return (
    <div className="overflow-hidden">
      <section className="relative isolate bg-[#104a3b] text-white">
        <div className="soft-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -right-40 -top-64 h-[42rem] w-[42rem] rounded-full bg-[#236d54]/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-52 left-[22%] h-[30rem] w-[60rem] rounded-full bg-[#0b3d32]/70 blur-3xl" />
        <div className="app-container relative grid gap-10 pb-14 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-12 lg:pb-20 lg:pt-20">
          <div className="relative z-10 max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-2 text-xs font-medium tracking-wide text-white/80 shadow-inner">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e7a379] opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#e7a379]" /></span>
              A calmer way to plan a rail journey
            </p>
            <h1 className="mt-6 max-w-[13ch] text-balance text-[2.8rem] font-semibold leading-[1.04] tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.35rem]">
              The journey starts with a better plan<span className="text-[#e7a379]">.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
              Find a train, understand your options and keep your trip details together — from your first search to your PNR.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#journey-search" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#e7a379] px-5 text-sm font-semibold text-[#18352e] shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efb08c]">
                Plan a journey <ArrowDownRight className="h-4 w-4" />
              </a>
              <Link to="/pnr" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-medium text-white/90 transition hover:border-white/50 hover:bg-white/10">
                Check PNR <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/15 pt-5 text-xs text-white/65 sm:text-sm">
              <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-[#e7a379]" /> Clear booking status</span>
              <span className="inline-flex items-center gap-2"><Ticket className="h-4 w-4 text-[#e7a379]" /> Tickets in one place</span>
            </div>
          </div>

          <JourneyIllustration />

          <div id="journey-search" className="relative z-20 scroll-mt-28 lg:col-span-2 lg:-mt-1">
            <div className="mx-auto max-w-5xl rounded-[1.6rem] border border-white/70 bg-surface p-4 text-ink shadow-[0_28px_80px_rgba(4,29,23,0.28)] sm:p-6 lg:p-7">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Start here</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">Where would you like to go?</h2>
                </div>
                <span className="hidden items-center gap-1.5 pb-1 text-xs text-muted sm:inline-flex"><MapPinned className="h-3.5 w-3.5" /> Search by station</span>
              </div>
              <SearchForm />
            </div>
          </div>
        </div>
      </section>

      <section className="app-container py-16 sm:py-20 lg:py-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow">Made for the whole trip</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">Less uncertainty. More journey.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted sm:pb-1">The details that matter are easier to find, so you can spend less time chasing updates.</p>
        </div>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body, tag }, index) => (
            <article key={title} className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-raise sm:p-6">
              <span className="absolute right-4 top-4 font-mono text-xs text-[#b4c1b8]">0{index + 1}</span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white"><Icon className="h-5 w-5" aria-hidden /></span>
              <p className="mt-6 text-[10px] font-semibold tracking-[0.18em] text-accent">{tag}</p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-paper">
        <div className="app-container grid gap-10 py-16 sm:py-20 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:py-24">
          <div>
            <p className="eyebrow">A little more peace of mind</p>
            <h2 className="mt-3 max-w-md text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">Know what your ticket is telling you.</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted">Confirmed, RAC and waiting-list status are shown in plain language, with passenger-level details where you need them.</p>
            <Link to="/assistant" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:gap-3">Explore the travel guide <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="rounded-[1.6rem] border border-line bg-surface p-5 shadow-card sm:p-7">
            <StatusRow status="CONFIRMED" label="Your seat is reserved" text="Coach, seat and berth details are ready for your journey." />
            <StatusRow status="RAC" label="You’re on the move" text="Your reservation can move forward as availability changes." />
            <StatusRow status="WL" label="Your place in the queue" text="See your current position and check back for updates." />
          </div>
        </div>
      </section>

      <section className="app-container py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Three simple steps</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">From idea to itinerary.</h2>
        </div>
        <div className="relative mt-10 grid gap-4 md:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-7 hidden border-t border-dashed border-[#b8c9bd] md:block" />
          {STEPS.map(({ n, title, body }) => (
            <div key={n} className="relative rounded-2xl border border-line bg-surface p-6 shadow-card">
              <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-[5px] border-paper bg-brand text-sm font-semibold text-white shadow-sm">{n}</span>
              <h3 className="mt-5 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 sm:pb-20">
        <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[1.8rem] bg-brand-strong px-6 py-10 text-white shadow-pop sm:px-10 sm:py-12 lg:px-14">
          <div className="soft-grid pointer-events-none absolute inset-0 opacity-30" />
          <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-5 -top-16 h-52 w-52 rounded-full border border-white/10" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#efb08c]"><MessageSquareText className="h-5 w-5" /></span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">A question before you go?</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">The travel guide can help explain PNRs, ticket status and the booking journey.</p>
            </div>
            <Link to="/assistant" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#e7a379] px-5 text-sm font-semibold text-[#18352e] transition hover:-translate-y-0.5 hover:bg-[#efb08c]">Ask the travel guide <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatusRow({ status, label, text }: { status: 'CONFIRMED' | 'RAC' | 'WL'; label: string; text: string }) {
  return (
    <div className="flex gap-4 border-b border-line py-4 last:border-b-0 last:pb-0 first:pt-0">
      <span className="mt-0.5"><StatusChip status={status} /></span>
      <div><h3 className="text-sm font-semibold text-ink">{label}</h3><p className="mt-1 text-sm leading-5 text-muted">{text}</p></div>
    </div>
  );
}

function JourneyIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[34rem] lg:ml-auto">
      <div className="absolute -inset-5 rounded-[2.5rem] border border-white/[0.08]" />
      <div className="relative aspect-[1.18] overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-br from-[#286b53] via-[#1d604d] to-[#153e36] p-5 shadow-[0_32px_80px_rgba(0,0,0,0.25)] sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_22%,rgba(230,180,139,.22),transparent_28%),linear-gradient(155deg,transparent_44%,rgba(255,255,255,.035)_44.2%,transparent_44.5%)]" />
        <div className="relative flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55"><span>Journey planner</span><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#e7a379]" /> Route view</span></div>
        <div className="relative mt-7 flex items-center justify-between">
          <div><p className="font-mono text-xs text-white/50">FROM</p><p className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Your city</p></div>
          <span className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[0.07] text-[#efb08c]"><TrainTrack className="h-4 w-4" /></span>
          <div className="text-right"><p className="font-mono text-xs text-white/50">TO</p><p className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Somewhere new</p></div>
        </div>
        <svg className="absolute inset-x-0 top-[37%] h-[54%] w-full" viewBox="0 0 560 250" fill="none" aria-hidden>
          <path d="M-30 183C73 183 80 63 183 63s106 119 206 119 104-91 201-91" stroke="rgba(255,255,255,.17)" strokeWidth="18" strokeLinecap="round" />
          <path d="M-30 183C73 183 80 63 183 63s106 119 206 119 104-91 201-91" stroke="rgba(231,163,121,.9)" strokeWidth="2.5" strokeDasharray="5 9" strokeLinecap="round" />
          <circle cx="75" cy="151" r="8" fill="#173f35" stroke="#e7a379" strokeWidth="4" />
          <circle cx="183" cy="63" r="8" fill="#173f35" stroke="#e7a379" strokeWidth="4" />
          <circle cx="389" cy="182" r="8" fill="#173f35" stroke="#e7a379" strokeWidth="4" />
          <circle cx="500" cy="91" r="10" fill="#e7a379" />
        </svg>
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between sm:bottom-7 sm:left-7 sm:right-7">
          <div className="rounded-2xl border border-white/15 bg-[#123f34]/75 px-4 py-3 backdrop-blur-md">
            <p className="font-mono text-[10px] text-white/50">THE LITTLE DETAILS</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-white"><Clock3 className="h-4 w-4 text-[#e7a379]" /> Seats · Status · Your plans</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e7a379] text-[#18352e] shadow-lg"><TrainFront className="h-6 w-6" /></span>
        </div>
        <div className="absolute right-4 top-[42%] h-2 w-2 rounded-full bg-white/35" />
        <div className="absolute left-[48%] top-[34%] h-1.5 w-1.5 rounded-full bg-[#efb08c]" />
        <div className="absolute bottom-[36%] left-[22%] h-1.5 w-1.5 rounded-full bg-white/35" />
        <Sparkles className="absolute right-[17%] top-[20%] h-4 w-4 text-[#efb08c]/80" />
      </div>
    </div>
  );
}

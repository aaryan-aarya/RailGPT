import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertCircle, ArrowRight, BusFront, CheckCircle2, CircleHelp, Clock3, CreditCard,
  ExternalLink, Headphones, MapPin, MessageSquareText, Package, ShieldCheck,
  Ticket, Utensils, Wallet, WandSparkles,
} from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ServiceAction = 'local' | 'food' | 'porter' | 'taxi' | 'refund' | 'wallet' | 'support' | 'prediction';

const groups: { title: string; items: { title: string; description: string; icon: typeof Ticket; action?: ServiceAction; to?: '/trains' | '/trips' | '/pnr' | '/profile' | '/assistant'; external?: string; tag?: string }[] }[] = [
  { title: 'Plan and book', items: [
    { title: 'Reserved tickets', description: 'Search trains, compare classes, book passengers, then manage or cancel your PNR.', icon: Ticket, to: '/trains', tag: 'Available in RailGPT' },
    { title: 'Unreserved & platform tickets', description: 'Start a local or short-distance journey, or arrange station entry.', icon: MapPin, action: 'local', tag: 'Railway integration needed' },
    { title: 'My bookings', description: 'Review current and past bookings, ticket status, and ticket documents.', icon: Clock3, to: '/trips', tag: 'Available in RailGPT' },
    { title: 'Waitlist prediction', description: 'See an illustrative estimate for a RailGPT waiting-list booking.', icon: WandSparkles, action: 'prediction', tag: 'Illustrative only' },
  ] },
  { title: 'During your journey', items: [
    { title: 'Train status & coach position', description: 'Look up your PNR and view the train and coach information available in this project.', icon: BusFront, to: '/pnr', tag: 'Sample data' },
    { title: 'Official live train enquiry', description: 'Open NTES for official running status, train schedule, station and coach position enquiry.', icon: BusFront, external: 'https://enquiry.indianrail.gov.in/ntes/', tag: 'Indian Railways NTES' },
    { title: 'Order food', description: 'Prepare an onboard meal request for a supported train and station.', icon: Utensils, action: 'food', tag: 'Catering integration needed' },
    { title: 'Porter assistance', description: 'Prepare a station porter assistance request.', icon: Package, action: 'porter', tag: 'Railway integration needed' },
    { title: 'Last-mile taxi', description: 'Prepare a pickup request for your arrival station.', icon: MapPin, action: 'taxi', tag: 'Transport integration needed' },
  ] },
  { title: 'Help, payments & account', items: [
    { title: 'RailMadad & feedback', description: 'Describe an issue or request; live submission needs the official RailMadad connection.', icon: Headphones, action: 'support', tag: 'Railway integration needed' },
    { title: 'Refund request', description: 'Prepare a refund enquiry for a cancelled or disrupted journey.', icon: CreditCard, action: 'refund', tag: 'No payment gateway connected' },
    { title: 'R-Wallet', description: 'View a non-monetary wallet preview. Real balances and top-ups require railway payment services.', icon: Wallet, action: 'wallet', tag: 'Payment integration needed' },
    { title: 'Profile & security', description: 'Manage your RailGPT contact details and password.', icon: ShieldCheck, to: '/profile', tag: 'Available in RailGPT' },
    { title: 'Travel assistant', description: 'Get help understanding bookings, PNR, RAC, waiting lists and fares.', icon: MessageSquareText, to: '/assistant', tag: 'Available in RailGPT' },
  ] },
];

const actionTitles: Record<ServiceAction, string> = {
  local: 'Unreserved and platform ticket preview', food: 'Onboard food request preview', porter: 'Porter assistance preview',
  taxi: 'Station pickup preview', refund: 'Refund enquiry preview', wallet: 'R-Wallet preview',
  support: 'Passenger support preview', prediction: 'Waiting-list estimate preview',
};

export function ServicesPage() {
  const [active, setActive] = useState<ServiceAction | null>(null);
  const [done, setDone] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [reference, setReference] = useState('');
  const [requests, setRequests] = useState<{ reference: string; action: ServiceAction; createdAt: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('railgpt:service-drafts') || '[]'); } catch { return []; }
  });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const record = { reference: `LOCAL-${Date.now().toString().slice(-8)}`, action: active!, createdAt: new Date().toISOString() };
    const next = [record, ...requests].slice(0, 10);
    setRequests(next);
    setReference(record.reference);
    try { localStorage.setItem('railgpt:service-drafts', JSON.stringify(next)); } catch { /* Browser storage may be unavailable. */ }
    setDone(true);
  }

  return (
    <div className="app-container max-w-6xl py-7 lg:py-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Passenger services</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Rail travel, in one place</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Explore booking, journey information, onboard services, support and account tools.</p>
        </div>
        <Link to="/trains" className="inline-flex h-10 items-center justify-center gap-2 rounded bg-brand px-4 text-sm font-medium text-white hover:bg-brand-strong">
          Search trains <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6 rounded-md border border-accent/30 bg-accent-soft p-4 text-sm text-accent-strong">
        <p className="flex items-start gap-2 font-medium"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Integration status</p>
        <p className="mt-1.5">RailGPT is an independent sample project. Its train inventory and bookings are illustrative; it is not connected to Indian Railways, IRCTC, RailMadad, R-Wallet, catering, porter, or taxi systems. The previews below do not place real orders, create official tickets, charge money, or contact railway staff.</p>
      </div>

      {groups.map((group) => (
        <section key={group.title} className="mt-9">
          <h2 className="text-lg font-semibold text-ink">{group.title}</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map(({ title, description, icon: Icon, action, to, external, tag }) => {
              const card = (
                <>
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand"><Icon className="h-5 w-5" /></span>
                  <h3 className="mt-3 font-semibold text-ink">{title}</h3>
                  <p className="mt-1 min-h-10 text-sm leading-5 text-muted">{description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand">{tag}{to && <ArrowRight className="h-3.5 w-3.5" />}</span>
                </>
              );
              return external ? (
                <a key={title} href={external} target="_blank" rel="noreferrer" className="surface-card p-4 transition hover:border-brand/40 hover:shadow-sm">{card}<span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand">Open official service <ExternalLink className="h-3.5 w-3.5" /></span></a>
              ) : to ? (
                <Link key={title} to={to} className="surface-card p-4 transition hover:border-brand/40 hover:shadow-sm">{card}</Link>
              ) : (
                <button key={title} type="button" onClick={() => { setActive(action!); setDone(false); }} className="surface-card p-4 text-left transition hover:border-brand/40 hover:shadow-sm">{card}</button>
              );
            })}
          </div>
        </section>
      ))}

      {active && <PreviewPanel action={active} done={done} reference={reference} walletAmount={walletAmount} setWalletAmount={setWalletAmount} onSubmit={submit} onClose={() => { setActive(null); setDone(false); }} />}

      {requests.length > 0 && <section className="mt-9">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-ink">Your local service activity</h2><p className="mt-1 text-xs text-muted">Saved in this browser only. These are not railway or provider request numbers.</p></div><button type="button" className="text-xs font-medium text-muted underline hover:text-ink" onClick={() => { setRequests([]); localStorage.removeItem('railgpt:service-drafts'); }}>Clear local history</button></div>
        <div className="mt-3 divide-y divide-line rounded-md border border-line bg-surface">{requests.map((item) => <div key={item.reference} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"><span className="font-medium text-ink">{actionTitles[item.action]}</span><span className="font-mono text-xs text-muted">{item.reference} · {new Date(item.createdAt).toLocaleString()}</span></div>)}</div>
      </section>}

      <div className="mt-9 flex items-start gap-3 rounded-md border border-line bg-surface p-4 text-sm text-muted">
        <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p>Live parity requires approved railway service/API access, production identity and payment setup, and service-provider agreements. See the existing booking and PNR pages for the capabilities already implemented inside this project.</p>
      </div>
    </div>
  );
}

function PreviewPanel({ action, done, reference, walletAmount, setWalletAmount, onSubmit, onClose }: {
  action: ServiceAction; done: boolean; reference: string; walletAmount: string; setWalletAmount: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void; onClose: () => void;
}) {
  let fields: ReactNode;
  if (action === 'local') fields = <><Field label="From station / city"><Input required placeholder="e.g. NDLS" /></Field><Field label="To station / city"><Input required placeholder="e.g. GZB" /></Field><Field label="Travel date"><Input required type="date" /></Field><Field label="Ticket type"><select className="h-10 w-full rounded border border-line bg-surface px-3 text-sm text-ink"><option>Unreserved journey</option><option>Platform entry</option></select></Field></>;
  else if (action === 'food') fields = <><Field label="PNR or train number"><Input required placeholder="Ticket reference" /></Field><Field label="Station for delivery"><Input required placeholder="Station name or code" /></Field><Field label="Meal request"><Input required placeholder="Meal and quantity" /></Field></>;
  else if (action === 'porter') fields = <><Field label="Station"><Input required placeholder="Station name" /></Field><Field label="Train / PNR"><Input placeholder="Optional reference" /></Field><Field label="Assistance needed"><Input required placeholder="Arrival, departure, luggage count…" /></Field></>;
  else if (action === 'taxi') fields = <><Field label="Arrival station"><Input required placeholder="Station name" /></Field><Field label="Pickup date and time"><Input required type="datetime-local" /></Field><Field label="Destination"><Input required placeholder="Area or address" /></Field></>;
  else if (action === 'refund') fields = <><Field label="PNR or booking reference"><Input required placeholder="Reference" /></Field><Field label="Reason"><select className="h-10 w-full rounded border border-line bg-surface px-3 text-sm text-ink"><option>Cancelled ticket</option><option>Train disruption</option><option>Payment / booking issue</option><option>Other</option></select></Field><Field label="Details"><textarea required className="min-h-20 w-full rounded border border-line bg-surface p-3 text-sm" placeholder="Describe the issue" /></Field></>;
  else if (action === 'wallet') fields = <><Field label="Top-up amount (₹)"><Input required type="number" min="1" max="10000" value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)} placeholder="Amount" /></Field><p className="text-xs text-muted">This preview does not store a balance or process a payment.</p></>;
  else if (action === 'support') fields = <><Field label="PNR / train / station"><Input placeholder="Reference (optional)" /></Field><Field label="Issue category"><select className="h-10 w-full rounded border border-line bg-surface px-3 text-sm text-ink"><option>Train cleanliness</option><option>Water / electricity</option><option>Staff behaviour</option><option>Ticketing / refund</option><option>Security</option><option>Other assistance</option></select></Field><Field label="Describe your request"><textarea required className="min-h-24 w-full rounded border border-line bg-surface p-3 text-sm" placeholder="Issue details" /></Field></>;
  else fields = <><Field label="PNR"><Input required placeholder="RailGPT booking PNR" /></Field><Field label="Current waitlist number"><Input required type="number" min="1" placeholder="e.g. 12" /></Field><Field label="Days until journey"><Input required type="number" min="0" placeholder="e.g. 5" /></Field><p className="text-xs text-muted">No verified railway history or prediction service is connected, so this project will not invent a confirmation probability.</p></>;

  return (
    <section className="surface-card mt-8 p-5" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="text-lg font-semibold text-ink">{actionTitles[action]}</h2><p className="mt-1 text-sm text-muted">Prototype only — no request leaves this browser.</p></div>
        <button type="button" className="text-sm text-muted hover:text-ink" onClick={onClose}>Close</button>
      </div>
      <OfficialLinks action={action} />
      {done ? <Alert tone="success" title="Saved as a local demo"><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Local reference <strong className="font-mono">{reference}</strong>. Nothing was submitted to a railway or service provider.</span></Alert> : (
        <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{fields}<div className="sm:col-span-2"><Button type="submit">Preview only</Button></div></form>
      )}
    </section>
  );
}

function OfficialLinks({ action }: { action: ServiceAction }) {
  const links: Partial<Record<ServiceAction, { label: string; href: string }[]>> = {
    food: [{ label: 'Continue to official IRCTC e-Catering', href: 'https://www.ecatering.irctc.co.in/' }],
    support: [
      { label: 'Open official RailMadad', href: 'https://railmadad.indianrailways.gov.in/madad/final/home.jsp' },
      { label: 'Call railway passenger helpline 139', href: 'tel:139' },
    ],
    local: [{ label: 'Open official IRCTC website', href: 'https://www.irctc.co.in/nget/train-search' }],
    refund: [{ label: 'Open official IRCTC website', href: 'https://www.irctc.co.in/nget/train-search' }],
  };
  const available = links[action];
  if (!available) return null;
  return <div className="mt-4 flex flex-wrap gap-2">{available.map((link) => <a key={link.href} href={link.href} target={link.href.startsWith('tel:') ? undefined : '_blank'} rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded border border-line bg-surface px-3 text-xs font-medium text-brand hover:border-brand/40">{link.label}<ExternalLink className="h-3.5 w-3.5" /></a>)}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium text-body">{label}<span className="mt-1.5 block">{children}</span></label>;
}

import { Link, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Ticket, ScanLine, ArrowRight } from 'lucide-react';
import { getPnr, getTrain } from '@/lib/api/endpoints';
import { PnrTicket } from '@/components/rail/pnr-ticket';
import { FullPageLoader } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { StatusChip } from '@/components/ui/badge';

export function ConfirmationPage() {
  const { pnr } = useParams({ from: '/booking/confirmation/$pnr' });
  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ['pnr', pnr], queryFn: () => getPnr(pnr),
  });
  const { data: train } = useQuery({
    queryKey: ['train', booking?.trainNumber, booking?.journeyDate],
    queryFn: () => getTrain(booking!.trainNumber, booking!.journeyDate),
    enabled: Boolean(booking),
  });

  if (isLoading) return <FullPageLoader label="Retrieving your ticket…" />;
  if (isError || !booking) {
    return (
      <div className="app-container max-w-2xl py-10">
        <Alert tone="error" title="Couldn’t load this booking">The PNR could not be found. Check My Trips for your bookings.</Alert>
        <Link to="/trips" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">Go to My Trips <ArrowRight className="h-4 w-4" /></Link>
      </div>
    );
  }

  const isConfirmed = booking.status === 'CONFIRMED';
  const isQueue = booking.status === 'RAC' || booking.status === 'WL' || booking.status === 'PARTIAL';

  return (
    <div className="app-container max-w-2xl py-8 lg:py-12">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-soft text-ok">
          <CheckCircle2 className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-ink">Booking successful</h1>
        <p className="mt-1.5 text-muted">
          {isConfirmed && 'Your seats are confirmed. Save your PNR for reference.'}
          {isQueue && 'You’re in the queue. Track your PNR — you’ll move up as seats free up.'}
        </p>
        <div className="mt-3 flex justify-center"><StatusChip status={booking.status} /></div>
      </div>

      <div className="mt-8"><PnrTicket booking={booking} train={train} /></div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link to="/trips" className="inline-flex h-11 items-center justify-center gap-2 rounded border border-line bg-surface text-sm font-medium text-ink hover:border-brand/40 transition-colors">
          <Ticket className="h-4 w-4" /> View my trips
        </Link>
        <Link to="/pnr" search={{ pnr: booking.pnr }} className="inline-flex h-11 items-center justify-center gap-2 rounded bg-brand text-sm font-medium text-white hover:bg-brand-strong transition-colors">
          <ScanLine className="h-4 w-4" /> Track this PNR
        </Link>
      </div>
      <p className="mt-4 text-center text-xs text-muted">
        A copy of this ticket is available any time under My Trips. No payment was processed in this demo environment.
      </p>
    </div>
  );
}

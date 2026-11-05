import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, XCircle, Info } from 'lucide-react';
import { getPnr, getTrain, cancelBooking } from '@/lib/api/endpoints';
import { PnrTicket } from '@/components/rail/pnr-ticket';
import { BerthMap } from '@/components/rail/berth-map';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { FullPageLoader } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';

export function TripDetailPage() {
  const { pnr } = useParams({ from: '/trips/$pnr' });
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data: booking, isLoading, isError, error } = useQuery({ queryKey: ['pnr', pnr], queryFn: () => getPnr(pnr) });
  const { data: train } = useQuery({
    queryKey: ['train', booking?.trainNumber, booking?.journeyDate],
    queryFn: () => getTrain(booking!.trainNumber, booking!.journeyDate),
    enabled: Boolean(booking),
  });

  const confirmedPax = booking?.passengers.find((p) => p.status === 'CONFIRMED' && p.seatNumber);

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelBooking(pnr);
      await queryClient.invalidateQueries({ queryKey: ['pnr', pnr] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      toast({ title: 'Booking cancelled', description: 'Any released seats were offered to the next passengers in the queue.', tone: 'success' });
      setCancelOpen(false);
    } catch (e) {
      toast({ title: 'Cancellation failed', description: e instanceof ApiError ? e.message : 'Please try again.', tone: 'error' });
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading) return <FullPageLoader label="Loading ticket…" />;
  if (isError || !booking) {
    return (
      <div className="app-container max-w-2xl py-10">
        <Alert tone="error" title="Couldn’t load this ticket">{(error as Error)?.message}</Alert>
        <Link to="/trips" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"><ArrowLeft className="h-4 w-4" /> Back to My Trips</Link>
      </div>
    );
  }

  return (
    <div className="app-container max-w-2xl py-6 lg:py-8">
      <Link to="/trips" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to My Trips
      </Link>

      <div className="mt-4"><PnrTicket booking={booking} train={train} /></div>

      {confirmedPax && (
        <div className="mt-5">
          <h2 className="mb-2 text-md font-semibold text-ink">Your berth</h2>
          <BerthMap classType={booking.classType} seatNumber={confirmedPax.seatNumber} />
        </div>
      )}

      {booking.status !== 'CANCELLED' && (
        <div className="surface-card mt-5 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5 text-sm text-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>Cancelling releases your seats to the RAC / waiting-list queue. This action can’t be undone.</p>
          </div>
          <Button variant="danger" onClick={() => setCancelOpen(true)} className="shrink-0">
            <XCircle className="h-4 w-4" /> Cancel ticket
          </Button>
        </div>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent title="Cancel this booking?" description={`PNR ${booking.pnr} · ${booking.trainName}`}>
          <p className="text-sm text-body">
            All passengers on this PNR will be cancelled. Confirmed seats are released and the next passengers in the
            RAC / waiting-list queue are promoted automatically. No refund is processed in this demo environment.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <DialogClose asChild><Button variant="outline">Keep booking</Button></DialogClose>
            <Button variant="danger" loading={cancelling} onClick={handleCancel}>
              <XCircle className="h-4 w-4" /> Yes, cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

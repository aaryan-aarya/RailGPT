import type { Booking, Train } from '@/lib/api/schemas';
import { StatusChip } from '@/components/ui/badge';
import { cn, formatINR, formatDate, classLabel, berthLabel, genderLabel } from '@/lib/utils';
import { TrainFront, CalendarDays, ArrowRight } from 'lucide-react';

interface PnrTicketProps {
  booking: Booking;
  train?: Train;
  className?: string;
}

/** A perforated, ticket-style representation of a booking (the product's hero artifact). */
export function PnrTicket({ booking, train, className }: PnrTicketProps) {
  const active = booking.passengers.filter((p) => p.status !== 'CANCELLED');
  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-surface shadow-raise', className)}>
      {/* Header band */}
      <div className="flex items-center justify-between gap-3 bg-brand px-5 py-4 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white/10">
            <TrainFront className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{booking.trainName}</p>
            <p className="font-mono text-xs text-white/70">#{booking.trainNumber} · {classLabel(booking.classType)}</p>
          </div>
        </div>
        <StatusChip status={booking.status} className="shrink-0 bg-white/95" />
      </div>

      {/* Route + date */}
      <div className="px-5 pt-5">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-md font-semibold text-ink">{booking.boarding || booking.source}</p>
            {train?.departureTime && <p className="font-mono text-sm text-muted">{train.departureTime}</p>}
          </div>
          <div className="flex flex-1 items-center gap-2 px-1 text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            <span className="h-px flex-1 bg-line" />
            <ArrowRight className="h-4 w-4" aria-hidden />
            <span className="h-px flex-1 bg-line" />
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          </div>
          <div className="min-w-0 text-right">
            <p className="truncate text-md font-semibold text-ink">{booking.reservation || booking.destination}</p>
            {train?.arrivalTime && <p className="font-mono text-sm text-muted">{train.arrivalTime}</p>}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <CalendarDays className="h-4 w-4" aria-hidden />
          <span>{formatDate(booking.journeyDate)}</span>
        </div>
      </div>

      {/* Perforation */}
      <div className="ticket-notch my-5 border-t border-dashed border-line" />

      {/* PNR + passengers */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">PNR</p>
            <p className="font-mono text-2xl font-semibold tracking-wider text-brand tnum">{booking.pnr}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted">Total fare</p>
            <p className="text-xl font-semibold text-ink tnum">{formatINR(booking.totalFare)}</p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2 font-medium">Passenger</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Coach / Berth</th>
              </tr>
            </thead>
            <tbody>
              {booking.passengers.map((p) => (
                <tr key={p.id} className={cn('border-t border-line', p.status === 'CANCELLED' && 'opacity-55')}>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-ink">{p.name}</p>
                    <p className="text-xs text-muted">{p.age} yrs · {genderLabel(p.gender)}</p>
                  </td>
                  <td className="px-3 py-2.5"><StatusChip status={p.status} size="sm" /></td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {p.status === 'CONFIRMED' && <span className="text-ink">{p.coachNumber} / {p.seatNumber} · {berthLabel(p.berthType)}</span>}
                    {p.status === 'RAC' && <span className="text-rac">RAC {p.racNumber}</span>}
                    {p.status === 'WL' && <span className="text-wl">WL {p.waitingNumber}</span>}
                    {p.status === 'CANCELLED' && <span className="text-cancel">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {active.length === 0 && (
          <p className="mt-3 text-sm text-cancel">This booking has been cancelled. No fare is due.</p>
        )}
      </div>
    </div>
  );
}

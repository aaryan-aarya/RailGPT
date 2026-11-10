import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Ban, Mail, RefreshCw, RotateCcw } from 'lucide-react';
import { cancelBooking, emailTicket, getAdminBookings } from '@/lib/api/endpoints';
import type { Booking } from '@/lib/api/schemas';
import { DataTable } from '@/components/ui/data-table';
import { StatusChip } from '@/components/ui/badge';
import { FullPageLoader } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { formatDate, formatINR, classLabel } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';

type BookingFilter = 'ALL' | 'CONFIRMED' | 'QUEUED' | 'CANCELLED';
const visible = (booking: Booking, filter: BookingFilter) => filter === 'ALL'
  || (filter === 'QUEUED' && ['RAC', 'WL', 'PARTIAL'].includes(booking.status))
  || booking.status === filter;

export function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<BookingFilter>('ALL');
  const [selected, setSelected] = useState<Booking | null>(null);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ['admin', 'bookings'], queryFn: getAdminBookings, refetchInterval: 30000 });
  const cancel = useMutation({
    mutationFn: (pnr: string) => cancelBooking(pnr),
    onSuccess: async (booking) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
        queryClient.invalidateQueries({ queryKey: ['booking-audit'] }),
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
      ]);
      toast({ title: 'Reservation cancelled', description: `PNR ${booking.pnr} was cancelled and released capacity was reallocated.`, tone: 'success' });
      setSelected(null);
    },
    onError: (cause) => toast({ title: 'Cancellation failed', description: cause instanceof ApiError ? cause.message : 'Please try again.', tone: 'error' }),
  });
  const sendTicket = useMutation({
    mutationFn: (pnr: string) => emailTicket(pnr),
    onSuccess: (result) => toast({ title: 'Ticket email queued', description: result.message, tone: 'success' }),
    onError: (cause) => toast({ title: 'Could not send ticket email', description: cause instanceof ApiError ? cause.message : 'Please try again.', tone: 'error' }),
  });

  const columns: ColumnDef<Booking, unknown>[] = [
    { accessorKey: 'pnr', header: 'PNR', cell: ({ row }) => <span className="font-mono font-semibold tracking-wide text-brand">{row.original.pnr}</span> },
    { accessorKey: 'trainName', header: 'Journey', cell: ({ row }) => <div><p className="font-semibold text-ink">{row.original.trainName}</p><p className="mt-0.5 text-xs text-muted">{row.original.source} → {row.original.destination} · #{row.original.trainNumber}</p></div> },
    { accessorKey: 'userEmail', header: 'Customer', cell: ({ row }) => <span className="text-xs text-body">{row.original.userEmail || '—'}</span> },
    { accessorKey: 'journeyDate', header: 'Date / class', cell: ({ row }) => <div><p className="text-sm text-ink">{formatDate(row.original.journeyDate)}</p><p className="mt-0.5 text-xs text-muted">{classLabel(row.original.classType)}</p></div> },
    { accessorKey: 'passengers', header: 'Travellers', enableSorting: false, cell: ({ row }) => <span>{row.original.passengers.length}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusChip status={row.original.status} size="sm" /> },
    { accessorKey: 'totalFare', header: 'Fare', cell: ({ row }) => <span className="font-mono text-xs text-ink tnum">{formatINR(row.original.totalFare)}</span> },
    { id: 'actions', header: 'Actions', enableSorting: false, cell: ({ row }) => <div className="flex items-center gap-1">{row.original.status !== 'CANCELLED' && <Button variant="ghost" size="icon" aria-label={`Email ticket for PNR ${row.original.pnr}`} title="Email ticket" loading={sendTicket.isPending && sendTicket.variables === row.original.pnr} onClick={() => sendTicket.mutate(row.original.pnr)}><Mail className="h-4 w-4 text-brand" /></Button>}{row.original.status !== 'CANCELLED' ? <Button variant="ghost" size="icon" aria-label={`Cancel PNR ${row.original.pnr}`} title="Cancel reservation" onClick={() => setSelected(row.original)}><Ban className="h-4 w-4 text-wl" /></Button> : <span className="px-2 text-xs text-muted">Closed</span>}</div> },
  ];
  const filtered = (data || []).filter((booking) => visible(booking, filter));

  return <div className="space-y-4">
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Reservations</p><h2 className="mt-1 text-lg font-semibold text-ink">Booking desk</h2><p className="mt-1 text-sm text-muted">Review PNRs, filter by status and manage cancellation requests.</p></div><Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}><RefreshCw className="h-4 w-4" /> Refresh</Button></div>
      <div className="mt-4"><Tabs value={filter} onValueChange={(value) => setFilter(value as BookingFilter)}><TabsList><TabsTrigger value="ALL">All bookings ({data?.length || 0})</TabsTrigger><TabsTrigger value="CONFIRMED">Confirmed</TabsTrigger><TabsTrigger value="QUEUED">RAC / waitlist</TabsTrigger><TabsTrigger value="CANCELLED">Cancelled</TabsTrigger></TabsList></Tabs></div>
    </section>
    {isLoading && <FullPageLoader label="Loading reservations…" />}
    {isError && <Alert tone="error" title="Couldn’t load reservations">{(error as Error)?.message}</Alert>}
    {data && <div className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5"><p className="mb-3 text-xs text-muted">Showing {filtered.length} of {data.length} reservations · newest first</p><DataTable data={filtered} columns={columns} searchPlaceholder="Search PNR, train, route, or customer…" emptyMessage="No reservations match these filters." /></div>}

    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
      <DialogContent title="Cancel this reservation?" description={selected ? `PNR ${selected.pnr} · ${selected.trainName}` : ''}>
        {selected && <div className="space-y-3"><p className="text-sm leading-6 text-body">All passengers on this PNR will be cancelled. Released seats will be reallocated to the RAC and waiting list, and affected passengers will receive status emails.</p><div className="rounded-xl bg-paper p-3 text-xs text-muted">{selected.source} → {selected.destination} · {formatDate(selected.journeyDate)} · {selected.passengers.length} passenger(s)</div><p className="text-xs text-wl">This action cannot be undone. No refund is processed by RailGPT.</p></div>}
        <div className="mt-5 flex justify-end gap-2"><DialogClose asChild><Button variant="outline">Keep booking</Button></DialogClose><Button variant="danger" loading={cancel.isPending} onClick={() => selected && cancel.mutate(selected.pnr)}><RotateCcw className="h-4 w-4" /> Cancel reservation</Button></div>
      </DialogContent>
    </Dialog>
  </div>;
}

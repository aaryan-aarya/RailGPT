import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { getAdminBookings } from '@/lib/api/endpoints';
import type { Booking } from '@/lib/api/schemas';
import { DataTable } from '@/components/ui/data-table';
import { StatusChip } from '@/components/ui/badge';
import { FullPageLoader } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { formatDate, formatINR, classLabel } from '@/lib/utils';

export function AdminBookingsPage() {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['admin', 'bookings'], queryFn: getAdminBookings });

  const columns: ColumnDef<Booking, unknown>[] = [
    { accessorKey: 'pnr', header: 'PNR', cell: ({ row }) => <span className="font-mono font-medium text-brand">{row.original.pnr}</span> },
    { accessorKey: 'trainName', header: 'Train', cell: ({ row }) => (
      <div><p className="font-medium text-ink">{row.original.trainName}</p><p className="font-mono text-xs text-muted">#{row.original.trainNumber} · {classLabel(row.original.classType)}</p></div>
    ) },
    { accessorKey: 'userEmail', header: 'User', cell: ({ row }) => <span className="text-sm">{row.original.userEmail || '—'}</span> },
    { accessorKey: 'journeyDate', header: 'Journey', cell: ({ row }) => <span className="text-sm">{formatDate(row.original.journeyDate)}</span> },
    { accessorKey: 'passengers', header: 'Pax', enableSorting: false, cell: ({ row }) => row.original.passengers.length },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusChip status={row.original.status} size="sm" /> },
    { accessorKey: 'totalFare', header: 'Fare', cell: ({ row }) => <span className="tnum">{formatINR(row.original.totalFare)}</span> },
  ];

  return (
    <div>
      <p className="mb-4 text-sm text-muted">{data?.length || 0} bookings · newest first</p>
      {isLoading && <FullPageLoader label="Loading bookings…" />}
      {isError && <Alert tone="error" title="Couldn’t load bookings">{(error as Error)?.message}</Alert>}
      {data && <DataTable data={data} columns={columns} searchPlaceholder="Search by PNR, train, user…" emptyMessage="No bookings match your search." />}
    </div>
  );
}

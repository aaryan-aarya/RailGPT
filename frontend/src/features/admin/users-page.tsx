import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { getAdminUsers } from '@/lib/api/endpoints';
import type { User } from '@/lib/api/schemas';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { FullPageLoader } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { initials } from '@/lib/utils';

export function AdminUsersPage() {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['admin', 'users'], queryFn: getAdminUsers });

  const columns: ColumnDef<User, unknown>[] = [
    { accessorKey: 'name', header: 'User', cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{initials(row.original.name)}</span>
        <span className="font-medium text-ink">{row.original.name}</span>
      </div>
    ) },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => <span className="text-sm">{row.original.email}</span> },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => row.original.role === 'ADMIN' ? <Badge tone="accent">Admin</Badge> : <Badge>User</Badge> },
    { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => <span className="text-sm text-muted">{row.original.phone || '—'}</span> },
    { accessorKey: 'createdAt', header: 'Joined', cell: ({ row }) => <span className="text-sm text-muted">{row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span> },
  ];

  return (
    <div>
      <p className="mb-4 text-sm text-muted">{data?.length || 0} registered users</p>
      {isLoading && <FullPageLoader label="Loading users…" />}
      {isError && <Alert tone="error" title="Couldn’t load users">{(error as Error)?.message}</Alert>}
      {data && <DataTable data={data} columns={columns} searchPlaceholder="Search by name or email…" emptyMessage="No users match your search." />}
    </div>
  );
}

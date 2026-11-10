import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { ShieldCheck, UserRound, UserRoundCog } from 'lucide-react';
import { getAdminUsers, updateAdminUserRole } from '@/lib/api/endpoints';
import type { User } from '@/lib/api/schemas';
import { useAuth } from '@/lib/auth/store';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { FullPageLoader } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { initials } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';

export function AdminUsersPage() {
  const self = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const { data: users, isLoading, isError, error } = useQuery({ queryKey: ['admin', 'users'], queryFn: getAdminUsers });
  const [pending, setPending] = useState<{ user: User; role: User['role'] } | null>(null);
  const updateRole = useMutation({
    mutationFn: ({ user, role }: { user: User; role: User['role'] }) => updateAdminUserRole(user.id, role),
    onSuccess: async (user) => { await queryClient.invalidateQueries({ queryKey: ['admin'] }); toast({ title: 'Access role updated', description: `${user.email} is now ${user.role === 'ADMIN' ? 'an administrator' : 'a customer'}.`, tone: 'success' }); setPending(null); },
    onError: (cause) => toast({ title: 'Role update failed', description: (cause as Error).message, tone: 'error' }),
  });

  const columns: ColumnDef<User, unknown>[] = [
    { accessorKey: 'name', header: 'Account', cell: ({ row }) => <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-xs font-semibold text-brand">{initials(row.original.name)}</span><div className="min-w-0"><p className="font-semibold text-ink">{row.original.name}</p><p className="text-2xs text-muted">Account #{row.original.id}</p></div></div> },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => <span className="text-sm text-body">{row.original.email}</span> },
    { accessorKey: 'role', header: 'Access', cell: ({ row }) => row.original.role === 'ADMIN' ? <Badge tone="brand"><ShieldCheck className="h-3.5 w-3.5" /> Administrator</Badge> : <Badge><UserRound className="h-3.5 w-3.5" /> Customer</Badge> },
    { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => <span className="text-sm text-muted">{row.original.phone || '—'}</span> },
    { accessorKey: 'createdAt', header: 'Joined', cell: ({ row }) => <span className="text-xs text-muted">{row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span> },
    { id: 'actions', header: 'Access control', enableSorting: false, cell: ({ row }) => {
      const user = row.original;
      if (self?.id === user.id) return <span className="text-2xs text-muted">Your account</span>;
      const role = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
      return <Button size="sm" variant={role === 'ADMIN' ? 'outline' : 'secondary'} onClick={() => setPending({ user, role })}><UserRoundCog className="h-4 w-4" /> {role === 'ADMIN' ? 'Grant admin' : 'Remove admin'}</Button>;
    } },
  ];

  return <div className="space-y-4">
    <section className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5"><div><p className="eyebrow">Identity and access</p><h2 className="mt-1 text-lg font-semibold text-ink">Customer and staff accounts</h2><p className="mt-1 text-sm text-muted">Admin role changes are recorded and the final administrator cannot be demoted.</p></div><span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand">{users?.length || 0} accounts</span></section>
    {isLoading && <FullPageLoader label="Loading accounts…" />}
    {isError && <Alert tone="error" title="Couldn’t load accounts">{(error as Error)?.message}</Alert>}
    {users && <div className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5"><DataTable data={users} columns={columns} searchPlaceholder="Search name, email, phone or role…" emptyMessage="No accounts match your search." /></div>}
    <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
      <DialogContent title={pending?.role === 'ADMIN' ? 'Grant administrator access?' : 'Remove administrator access?'} description={pending?.user.email}>
        {pending && <div className="space-y-3"><p className="text-sm leading-6 text-body">{pending.role === 'ADMIN' ? 'This account will be able to access the operations workspace, manage train data and reservations, and view customer records.' : 'This account will lose access to the operations workspace immediately. It will remain a customer account.'}</p><p className="rounded-xl bg-paper p-3 text-xs leading-5 text-muted">The action will be recorded with your administrator identity. You cannot change your own role here.</p></div>}
        <div className="mt-5 flex justify-end gap-2"><DialogClose asChild><Button variant="outline">Go back</Button></DialogClose><Button loading={updateRole.isPending} onClick={() => pending && updateRole.mutate(pending)}>{pending?.role === 'ADMIN' ? 'Grant access' : 'Remove access'}</Button></div>
      </DialogContent>
    </Dialog>
  </div>;
}

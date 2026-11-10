import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MailWarning, RefreshCw, RotateCcw } from 'lucide-react';
import { getAdminEmailOutbox, retryAdminEmail } from '@/lib/api/endpoints';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { FullPageLoader } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';

export function AdminEmailOutboxPage() {
  const [status, setStatus] = useState('DEAD');
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'email-outbox', status], queryFn: () => getAdminEmailOutbox(status),
  });
  const retry = useMutation({
    mutationFn: retryAdminEmail,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'email-outbox'] });
      toast({ title: 'Email queued for retry', tone: 'success' });
    },
    onError: (err) => toast({ title: 'Could not retry email', description: (err as Error).message, tone: 'error' }),
  });

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><MailWarning className="h-5 w-5 text-brand" /> Booking email notifications</h2><p className="mt-1 text-sm text-muted">Inspect booking, cancellation and passenger status emails; retry failed delivery after fixing SMTP.</p></div>
        <label className="text-sm text-muted">Status <Select value={status} onChange={(e) => setStatus(e.target.value)} className="ml-2 w-36"><option value="DEAD">Failed</option><option value="PENDING">Pending</option><option value="SENT">Sent</option></Select></label>
      </div>
      {isLoading && <div className="py-8"><FullPageLoader label="Loading email jobs…" /></div>}
      {isError && <div className="mt-4"><Alert tone="error" title="Couldn’t load email jobs">{(error as Error).message}</Alert></div>}
      {data && <div className="mt-5 divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
        {data.length === 0 ? <p className="px-4 py-10 text-center text-sm text-muted">No {status.toLowerCase()} email jobs.</p> : data.map((job) => (
          <article key={job.id} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0"><p className="font-medium text-ink">PNR {job.pnr} · {job.recipient}</p><p className="mt-1 text-xs text-muted">{eventLabel(job.eventType)} · status {job.statusSnapshot} · {job.status} · {job.attempts} attempt{job.attempts === 1 ? '' : 's'} · queued {new Date(job.createdAt).toLocaleString()}</p>{job.lastError && <p className="mt-1 break-words text-xs text-wl">{job.lastError}</p>}</div>
            {job.status === 'DEAD' && <Button variant="outline" size="sm" loading={retry.isPending} onClick={() => retry.mutate(job.id)}><RotateCcw className="h-4 w-4" /> Retry</Button>}
          </article>
        ))}
      </div>}
      <p className="mt-4 flex items-start gap-2 text-xs text-muted"><RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Delivery requires valid SMTP settings. Jobs retry automatically with backoff; retrying a failed job resets its attempt counter.</p>
    </section>
  );
}

function eventLabel(eventType: 'BOOKED' | 'CANCELLED' | 'STATUS_CHANGE') {
  if (eventType === 'CANCELLED') return 'Booking cancelled';
  if (eventType === 'STATUS_CHANGE') return 'Passenger status update';
  return 'Booking confirmation';
}

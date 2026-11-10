import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { getBookingAudit } from '@/lib/api/endpoints';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { FullPageLoader } from '@/components/ui/spinner';

const PAGE_SIZE = 25;

export function AdminAuditPage() {
  const [draftPnr, setDraftPnr] = useState('');
  const [activePnr, setActivePnr] = useState('');
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'audit', activePnr, page],
    queryFn: () => getBookingAudit({ pnr: activePnr || undefined, page, size: PAGE_SIZE }),
  });

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(0);
    setActivePnr(draftPnr.trim());
  }

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><History className="h-5 w-5 text-brand" /> Booking audit log</h2>
          <p className="mt-1 text-sm text-muted">Booking creation, cancellation, and queue promotion events.</p>
        </div>
        <form onSubmit={search} className="flex gap-2">
          <Input value={draftPnr} onChange={(event) => setDraftPnr(event.target.value)} placeholder="Filter by PNR" aria-label="Filter audit log by PNR" />
          <Button type="submit" variant="outline"><Search className="h-4 w-4" /> Search</Button>
        </form>
      </div>

      {isLoading && <div className="py-8"><FullPageLoader label="Loading audit events…" /></div>}
      {isError && <div className="mt-4"><Alert tone="error" title="Couldn’t load audit events">{(error as Error).message}</Alert></div>}

      {data && (
        <>
          <p className="mb-3 mt-5 text-sm text-muted">{data.totalElements} event{data.totalElements === 1 ? '' : 's'}{activePnr ? ` for PNR ${activePnr}` : ''}</p>
          <div className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
            {data.content.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">No audit events found.</p>
            ) : data.content.map((event) => (
              <article key={event.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-ink">{event.eventType.replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-sm text-body">{event.details}</p>
                  <p className="mt-1 font-mono text-xs text-brand">PNR {event.pnr}</p>
                </div>
                <div className="shrink-0 text-xs text-muted sm:text-right">
                  <p>{new Date(event.createdAt).toLocaleString()}</p>
                  <p className="mt-1">{event.actorEmail === 'SYSTEM' ? 'System' : event.actorEmail || '—'}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>Page {data.number + 1} of {Math.max(1, data.totalPages)}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 0 || isLoading} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Button>
              <Button variant="outline" size="sm" disabled={!data || page + 1 >= data.totalPages || isLoading} onClick={() => setPage((current) => current + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

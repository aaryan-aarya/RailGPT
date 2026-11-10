import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { getAdminActivity } from '@/lib/api/endpoints';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { FullPageLoader } from '@/components/ui/spinner';

export function AdminActivityPage() {
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['admin', 'activity', query, page], queryFn: () => getAdminActivity({ q: query || undefined, page, size: 25 }) });
  function search(event: FormEvent) { event.preventDefault(); setPage(0); setQuery(draft.trim()); }

  return <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Accountability</p><h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-ink"><Activity className="h-5 w-5 text-brand" /> Staff activity</h2><p className="mt-1 text-sm text-muted">Train catalog, staff role and email recovery actions are recorded here.</p></div><span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand">Administrative events</span></div>
    <form onSubmit={search} className="mt-5 flex max-w-xl gap-2"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input className="pl-9" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search action, staff email, or target…" /></div><Button type="submit" variant="outline">Search</Button></form>
    {isLoading && <div className="py-8"><FullPageLoader label="Loading staff activity…" /></div>}
    {isError && <div className="mt-5"><Alert tone="error" title="Couldn’t load staff activity">{(error as Error).message}</Alert></div>}
    {data && <>
      <p className="mb-3 mt-5 text-xs text-muted">{data.totalElements} recorded administrative action{data.totalElements === 1 ? '' : 's'}</p>
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {data.content.length === 0 ? <p className="px-4 py-10 text-center text-sm text-muted">No administrative activity found.</p> : data.content.map((event) => <article key={event.id} className="flex flex-col gap-3 bg-surface px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Activity className="h-4 w-4" /></span><div className="min-w-0"><p className="font-semibold text-ink">{event.action.replace(/_/g, ' ')}</p><p className="mt-1 text-sm leading-5 text-body">{event.details}</p><p className="mt-1 font-mono text-2xs text-muted">{event.targetType} · {event.targetId}</p></div></div>
          <div className="shrink-0 text-xs text-muted sm:text-right"><p>{new Date(event.createdAt).toLocaleString()}</p><p className="mt-1 max-w-56 truncate">{event.actorEmail}</p></div>
        </article>)}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-muted"><span>Page {data.number + 1} of {Math.max(1, data.totalPages)}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 0 || isLoading} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Button><Button variant="outline" size="sm" disabled={page + 1 >= data.totalPages || isLoading} onClick={() => setPage((current) => current + 1)}>Next <ChevronRight className="h-4 w-4" /></Button></div></div>
    </>}
    <p className="mt-5 rounded-xl bg-paper px-4 py-3 text-xs leading-5 text-muted">Booking and queue events are available in the separate Booking audit section. This log records administrative configuration and recovery actions.</p>
  </section>;
}

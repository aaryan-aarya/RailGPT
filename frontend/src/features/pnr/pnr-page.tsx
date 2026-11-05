import { useState, type FormEvent } from 'react';
import { useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ScanLine, RefreshCw, Info } from 'lucide-react';
import { getPnr, getTrain } from '@/lib/api/endpoints';
import { PnrTicket } from '@/components/rail/pnr-ticket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { FullPageLoader } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api/client';

export function PnrPage() {
  const search = useSearch({ from: '/pnr' }) as { pnr?: string };
  const [input, setInput] = useState(search.pnr || '');
  const [submitted, setSubmitted] = useState(search.pnr || '');
  const [inputError, setInputError] = useState('');

  const { data: booking, isLoading, isFetching, isError, error, dataUpdatedAt } = useQuery({
    queryKey: ['pnr', submitted],
    queryFn: () => getPnr(submitted),
    enabled: Boolean(submitted),
    refetchInterval: submitted ? 30000 : false,
    retry: false,
  });
  const { data: train } = useQuery({
    queryKey: ['train', booking?.trainNumber, booking?.journeyDate],
    queryFn: () => getTrain(booking!.trainNumber, booking!.journeyDate),
    enabled: Boolean(booking),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = input.replace(/\D/g, '');
    if (clean.length !== 10) { setInputError('Enter a valid 10-digit PNR.'); return; }
    setInputError('');
    setSubmitted(clean);
  }

  return (
    <div className="app-container max-w-2xl py-8 lg:py-12">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-brand-soft text-brand">
          <ScanLine className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-ink">Check PNR status</h1>
        <p className="mt-1.5 text-muted">Enter a 10-digit PNR to see live confirmation, RAC or waiting-list status.</p>
      </div>

      <form onSubmit={onSubmit} className="surface-card mt-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label htmlFor="pnr-input" className="sr-only">PNR number</label>
          <Input id="pnr-input" inputMode="numeric" autoComplete="off" placeholder="e.g. 2456789012"
            className="font-mono tracking-wider" maxLength={10}
            value={input} onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))} />
          {inputError && <p className="field-error" role="alert">{inputError}</p>}
        </div>
        <Button type="submit" size="lg" className="sm:w-40">Check status</Button>
      </form>

      <div className="mt-6">
        {!submitted && (
          <EmptyState icon={ScanLine} title="Track any PNR"
            description="Status refreshes automatically every 30 seconds while this page is open. Passenger names are masked unless you own the booking." />
        )}

        {submitted && isLoading && <FullPageLoader label="Looking up PNR…" />}

        {submitted && isError && (
          <Alert tone="error" title="PNR not found">
            {error instanceof ApiError ? error.message : 'We couldn’t find that PNR. Double-check the number and try again.'}
          </Alert>
        )}

        {submitted && booking && (
          <div>
            <div className="mb-3 flex items-center justify-between text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} aria-hidden />
                {dataUpdatedAt ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Live'}
                {' · auto-refreshes every 30s'}
              </span>
            </div>
            <PnrTicket booking={booking} train={train} />
            <div className="mt-4 flex items-start gap-2 rounded-md border border-line bg-surface p-3.5 text-xs text-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>
                RAC and waiting-list positions move up automatically when confirmed passengers cancel.
                Names are masked for privacy unless you’re signed in as the booking owner.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

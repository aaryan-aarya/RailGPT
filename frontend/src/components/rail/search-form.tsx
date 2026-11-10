import { useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeftRight, Search } from 'lucide-react';
import { StationPicker } from './station-picker';
import { Button } from '@/components/ui/button';
import { todayISO, addDaysISO } from '@/lib/utils';

interface SearchFormProps {
  initial?: { source?: string; destination?: string; date?: string };
  compact?: boolean;
}

export function SearchForm({ initial, compact }: SearchFormProps) {
  const navigate = useNavigate();
  const [source, setSource] = useState(initial?.source || '');
  const [destination, setDestination] = useState(initial?.destination || '');
  const [date, setDate] = useState(initial?.date || todayISO());
  const [error, setError] = useState('');

  function swap() {
    setSource(destination);
    setDestination(source);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!source || !destination) { setError('Choose both a source and a destination.'); return; }
    if (source.toLowerCase() === destination.toLowerCase()) { setError('Source and destination cannot be the same.'); return; }
    setError('');
    navigate({ to: '/trains', search: { source, destination, date } });
  }

  return (
    <form onSubmit={onSubmit} className="surface-card rounded-2xl p-4 sm:p-5" aria-label="Search trains">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr_auto_auto] md:items-end">
        <StationPicker id="search-source" label="From" value={source} onChange={setSource} placeholder="Origin station" />
        <button
          type="button" onClick={swap} aria-label="Swap source and destination"
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper text-brand transition-all hover:rotate-180 hover:border-brand hover:bg-brand hover:text-white md:mb-0.5"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <StationPicker id="search-destination" label="To" value={destination} onChange={setDestination} placeholder="Destination station" />
        <div>
          <label htmlFor="search-date" className="field-label">Journey date</label>
          <input
            id="search-date" type="date" className="field-input md:w-[170px]"
            value={date} min={todayISO()} max={addDaysISO(120)}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="md:mb-0">
          <Search className="h-4 w-4" aria-hidden />
          Search
        </Button>
      </div>
      {error && <p className="field-error mt-2" role="alert">{error}</p>}
      {!compact && (
        <p className="mt-3 text-xs text-muted">
          Search by station and date to see live class-wise availability, fares and RAC / waiting-list positions.
        </p>
      )}
    </form>
  );
}

import { useMemo, useState } from 'react';
import { useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { TrainFront, SearchX, ArrowUpDown } from 'lucide-react';
import { searchTrains } from '@/lib/api/endpoints';
import { SearchForm } from '@/components/rail/search-form';
import { TrainCard } from '@/components/rail/train-card';
import { TrainCardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert } from '@/components/ui/alert';
import { Select } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import type { Train } from '@/lib/api/schemas';

type SortKey = 'departure' | 'duration' | 'price' | 'availability';

function minFare(t: Train) { return Math.min(...t.classes.map((c) => c.fare)); }
function bestAvailability(t: Train) {
  if (!t.availability) return 0;
  return Math.max(...Object.values(t.availability).map((a) => a.availableSeats));
}

export function SearchResultsPage() {
  const search = useSearch({ from: '/trains' }) as { source?: string; destination?: string; date?: string };
  const { source, destination, date } = search;
  const [sort, setSort] = useState<SortKey>('departure');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['trains', 'search', source, destination, date],
    queryFn: () => searchTrains({ source, destination, date }),
    enabled: Boolean(source && destination),
  });

  const sorted = useMemo(() => {
    if (!data) return [];
    const list = [...data];
    switch (sort) {
      case 'duration': list.sort((a, b) => (a.durationMinutes || 0) - (b.durationMinutes || 0)); break;
      case 'price': list.sort((a, b) => minFare(a) - minFare(b)); break;
      case 'availability': list.sort((a, b) => bestAvailability(b) - bestAvailability(a)); break;
      default: list.sort((a, b) => (a.departureTime || '').localeCompare(b.departureTime || ''));
    }
    return list;
  }, [data, sort]);

  const hasSearch = Boolean(source && destination);

  return (
    <div className="app-container py-6 lg:py-8">
      <SearchForm compact initial={{ source, destination, date }} />

      <div className="mt-6">
        {hasSearch && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-ink">
                {source} <span className="text-muted">→</span> {destination}
              </h1>
              <p className="mt-0.5 text-sm text-muted">
                {date ? formatDate(date) : 'Any date'} · {isLoading ? 'searching…' : `${sorted.length} train${sorted.length === 1 ? '' : 's'}`}
              </p>
            </div>
            {sorted.length > 1 && (
              <label className="flex items-center gap-2 text-sm text-muted">
                <ArrowUpDown className="h-4 w-4" aria-hidden />
                <span className="sr-only">Sort trains</span>
                <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-44 py-1.5 text-sm">
                  <option value="departure">Departure time</option>
                  <option value="duration">Shortest duration</option>
                  <option value="price">Lowest fare</option>
                  <option value="availability">Most availability</option>
                </Select>
              </label>
            )}
          </div>
        )}

        {!hasSearch && (
          <EmptyState icon={TrainFront} title="Search for trains"
            description="Enter a source, destination and journey date above to see available trains." />
        )}

        {hasSearch && isLoading && (
          <div className="space-y-4">{[1, 2, 3].map((i) => <TrainCardSkeleton key={i} />)}</div>
        )}

        {hasSearch && isError && (
          <Alert tone="error" title="Couldn’t load trains">
            {(error as Error)?.message || 'Something went wrong.'}{' '}
            <button className="font-medium underline" onClick={() => refetch()}>Retry</button>
          </Alert>
        )}

        {hasSearch && !isLoading && !isError && sorted.length === 0 && (
          <EmptyState icon={SearchX} title="No trains found for this route"
            description="Try different stations or another date. The demo catalog covers major routes across India." />
        )}

        {hasSearch && !isLoading && sorted.length > 0 && (
          <div className="space-y-4">
            {sorted.map((t) => <TrainCard key={t.trainNumber} train={t} date={date} />)}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Route as RouteIcon, TrainFront } from 'lucide-react';
import { getTrain } from '@/lib/api/endpoints';
import { ClassOption, AvailabilityMeter } from '@/components/rail/availability';
import { BerthMap } from '@/components/rail/berth-map';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { FullPageLoader } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { todayISO, addDaysISO, formatDuration, classLabel, formatDate } from '@/lib/utils';

export function TrainDetailPage() {
  const { trainNumber } = useParams({ from: '/trains/$trainNumber' });
  const search = useSearch({ from: '/trains/$trainNumber' }) as { date?: string; class?: string; berth?: string };
  const navigate = useNavigate();
  const [date, setDate] = useState(search.date || todayISO());
  const [selectedClass, setSelectedClass] = useState<string>(search.class || '');
  const [selectedBerth, setSelectedBerth] = useState<string>(search.berth || '');

  const { data: train, isLoading, isError, error } = useQuery({
    queryKey: ['train', trainNumber, date],
    queryFn: () => getTrain(trainNumber, date),
  });

  useEffect(() => {
    if (train && (!selectedClass || !train.classes.some((c) => c.classType === selectedClass))) {
      const firstAvailable = train.classes.find((c) => train.availability?.[c.classType]?.status !== 'FULL');
      const requestedClass = train.classes.find((c) => c.classType === search.class)?.classType;
      setSelectedClass(requestedClass || firstAvailable?.classType || train.classes[0]?.classType || '');
    }
  }, [train, selectedClass, search.class]);

  useEffect(() => {
    if (!selectedBerth || !selectedClass) return;
    const chairClass = ['CC', 'EC', '2S'].includes(selectedClass);
    const validPreferences = chairClass ? ['WINDOW', 'AISLE']
      : selectedClass === '1A' ? ['LB', 'UB']
      : selectedClass === '2A' ? ['LB', 'UB', 'SL', 'SU']
      : ['LB', 'MB', 'UB', 'SL', 'SU'];
    if (!validPreferences.includes(selectedBerth)) setSelectedBerth('');
  }, [selectedClass, selectedBerth]);

  if (isLoading) return <FullPageLoader label="Loading train details…" />;
  if (isError || !train) {
    return (
      <div className="app-container py-10">
        <Alert tone="error" title="Train not found">{(error as Error)?.message || 'This train could not be loaded.'}</Alert>
        <Link to="/trains" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to search
        </Link>
      </div>
    );
  }

  const inv = selectedClass ? train.availability?.[selectedClass] : undefined;
  const canBook = inv && inv.status !== 'FULL';

  return (
    <div className="app-container py-6 lg:py-8">
      <Link to="/trains" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to results
      </Link>

      {/* Train header */}
      <div className="surface-card mt-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-brand tnum">{train.trainNumber}</span>
              {train.trainType && <Badge tone="brand">{train.trainType}</Badge>}
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-ink">{train.trainName}</h1>
            {train.daysOfRun && (
              <p className="mt-1 text-sm text-muted">Runs {train.daysOfRun.length === 7 ? 'daily' : train.daysOfRun.join(', ')}</p>
            )}
          </div>
          <div>
            <label htmlFor="detail-date" className="field-label flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Journey date</label>
            <input id="detail-date" type="date" className="field-input w-[180px]" value={date}
              min={todayISO()} max={addDaysISO(120)} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4 rounded-md bg-paper/60 p-4">
          <div>
            <p className="font-mono text-2xl font-semibold text-ink tnum">{train.departureTime || '—'}</p>
            <p className="text-sm text-muted">{train.source}</p>
          </div>
          <div className="flex flex-1 flex-col items-center px-2">
            <span className="flex items-center gap-1 text-xs text-muted"><Clock3 className="h-3.5 w-3.5" />{formatDuration(train.durationMinutes || 0)}</span>
            <span className="my-1.5 flex w-full items-center">
              <span className="h-2 w-2 rounded-full bg-brand" /><span className="h-px flex-1 bg-line" />
              <TrainFront className="h-4 w-4 text-muted" /><span className="h-px flex-1 bg-line" />
              <span className="h-2 w-2 rounded-full bg-accent" />
            </span>
            {train.distanceKm && <span className="flex items-center gap-1 text-xs text-muted"><RouteIcon className="h-3.5 w-3.5" />{train.distanceKm} km</span>}
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-semibold text-ink tnum">{train.arrivalTime || '—'}</p>
            <p className="text-sm text-muted">{train.destination}</p>
          </div>
        </div>
      </div>

      {/* Class selection */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="text-lg font-semibold text-ink">Choose your class</h2>
          <p className="mt-1 text-sm text-muted">Availability for {formatDate(date)}. Fares are per passenger.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {train.classes.map((c) => {
              const classInv = train.availability?.[c.classType];
              if (!classInv) return null;
              return (
                <ClassOption key={c.classType} inv={classInv} selected={selectedClass === c.classType}
                  onSelect={() => setSelectedClass(c.classType)} />
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {inv && (
            <>
              <div className="surface-card p-5">
            <h3 className="text-md font-semibold text-ink">{classLabel(selectedClass)} availability</h3>
                <div className="mt-4"><AvailabilityMeter inv={inv} /></div>
              </div>
              <div className="surface-card p-4 sm:p-5">
                <p className="mb-3 text-sm font-semibold text-ink">Choose a berth preference <span className="font-normal text-muted">(optional)</span></p>
                <BerthMap classType={selectedClass} seatNumber={null} selectedBerth={selectedBerth || null}
                  onSelectBerth={(berth) => setSelectedBerth(berth || '')} />
              </div>
              <div className="surface-card p-5">
                {canBook ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Class</span>
                      <span className="font-medium text-ink">{classLabel(selectedClass)} ({selectedClass})</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted">Date</span>
                      <span className="font-medium text-ink">{formatDate(date)}</span>
                    </div>
                    <Button className="mt-4 w-full" size="lg"
                      onClick={() => navigate({ to: '/book/$trainNumber', params: { trainNumber }, search: { date, class: selectedClass, berth: selectedBerth || undefined } })}>
                      Proceed to book <ArrowRight className="h-4 w-4" />
                    </Button>
                    <p className="mt-2.5 text-center text-2xs text-muted">You’ll add passenger details on the next step.</p>
                  </>
                ) : (
                  <Alert tone="warning" title="This class is full">
                    No confirmed, RAC or waiting-list capacity remains for {classLabel(selectedClass)} on this date. Try another class or date.
                  </Alert>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

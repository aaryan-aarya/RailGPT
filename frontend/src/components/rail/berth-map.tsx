import type { CSSProperties } from 'react';
import { cn, berthLabel } from '@/lib/utils';

const PATTERNS: Record<string, string[]> = {
  SL: ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'],
  '3A': ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'],
  '2A': ['LB', 'UB', 'LB', 'UB', 'SL', 'SU'],
  '1A': ['LB', 'UB', 'LB', 'UB'],
  CC: ['WINDOW', 'MIDDLE', 'AISLE', 'AISLE', 'WINDOW'],
  EC: ['WINDOW', 'AISLE', 'AISLE', 'WINDOW'],
  '2S': ['WINDOW', 'MIDDLE', 'AISLE', 'AISLE', 'MIDDLE', 'WINDOW'],
};

const SHORT: Record<string, string> = {
  LB: 'L', MB: 'M', UB: 'U', SL: 'SL', SU: 'SU', WINDOW: 'W', MIDDLE: 'M', AISLE: 'A',
};

/**
 * A coach cross-section strip showing the repeating berth/seat pattern for the
 * class, with the passenger's allocated position highlighted. This mirrors the
 * real allocation math (berth = pattern[(seat-1) % pattern.length]).
 */
export function BerthMap({ classType, seatNumber, className, selectedBerth, onSelectBerth }: {
  classType: string;
  seatNumber: number | null;
  className?: string;
  selectedBerth?: string | null;
  onSelectBerth?: (berth: string | null) => void;
}) {
  const pattern = PATTERNS[classType] || PATTERNS.SL;
  const activeIndex = seatNumber ? (seatNumber - 1) % pattern.length : -1;
  const isChair = ['CC', 'EC', '2S'].includes(classType);
  const interactive = Boolean(onSelectBerth);
  const preferenceOptions = isChair ? ['WINDOW', 'AISLE'] : [...new Set(pattern)];

  return (
    <div className={cn('rounded border border-line bg-paper/60 p-3', className)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {isChair ? 'Seating layout' : 'Berth layout'}
        </span>
        {seatNumber ? (
          <span className="font-mono text-xs text-brand">
            Berth {seatNumber} · {berthLabel(pattern[activeIndex])}
          </span>
        ) : selectedBerth ? <span className="text-xs font-medium text-brand">Preference: {berthLabel(selectedBerth)}</span> : null}
      </div>
      <div className="berth-layout-scroll -mx-1 px-1 pb-1">
      <div className="flex items-stretch gap-1.5" style={{ minWidth: `${pattern.length * 64}px` } as CSSProperties}
        role={interactive ? 'group' : 'img'}
        aria-label={interactive ? 'Choose berth preference from the layout' : seatNumber ? `Allocated ${berthLabel(pattern[activeIndex])} berth` : 'Berth layout'}>
        {pattern.map((b, i) => {
          const active = seatNumber ? i === activeIndex : selectedBerth === b;
          const isSide = b === 'SL' || b === 'SU';
          const selectable = preferenceOptions.includes(b);
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              {interactive && selectable ? <button
                type="button"
                aria-label={`Choose ${berthLabel(b)} berth preference, position ${i + 1}`}
                aria-pressed={selectedBerth === b}
                onClick={() => onSelectBerth?.(b)}
                className={cn(
                  'flex h-11 w-full items-center justify-center rounded-lg border font-mono text-xs font-semibold transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand',
                  active
                    ? 'border-brand bg-brand text-white shadow-raise'
                    : isSide
                      ? 'border-line bg-surface text-muted hover:border-brand/40 hover:text-brand'
                      : 'border-line bg-surface text-body hover:border-brand/40 hover:text-brand',
                )}
                title={berthLabel(b)}
              >
                {SHORT[b] || b}
              </button> : <div
                className={cn(
                  'flex h-11 w-full items-center justify-center rounded-lg border font-mono text-xs font-semibold transition-colors',
                  active ? 'border-brand bg-brand text-white shadow-sm' : isSide || (interactive && !selectable) ? 'border-line bg-paper text-muted' : 'border-line bg-surface text-body',
                )}
                title={berthLabel(b)}
              >{SHORT[b] || b}</div>}
              <span className={cn('text-center text-2xs', active ? 'font-semibold text-brand' : 'text-muted')}>
                {berthLabel(b)}
              </span>
            </div>
          );
        })}
      </div>
      </div>
      {interactive && <button type="button" aria-pressed={!selectedBerth} onClick={() => onSelectBerth?.(null)}
        className={cn('mt-3 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors', !selectedBerth ? 'border-brand bg-brand-soft text-brand' : 'border-line text-muted hover:border-brand/40 hover:text-brand')}>
        No preference
      </button>}
      <p className="mt-2 text-2xs text-muted">
        {interactive
          ? 'Choose a preference visually. Your berth is assigned according to availability.'
          : isChair ? 'Window and aisle seats alternate across each row.' : 'Lower / Middle / Upper berths repeat per bay; side berths run along the aisle.'}
      </p>
    </div>
  );
}

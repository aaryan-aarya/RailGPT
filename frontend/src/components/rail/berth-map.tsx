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
export function BerthMap({ classType, seatNumber, className }: { classType: string; seatNumber: number | null; className?: string }) {
  const pattern = PATTERNS[classType] || PATTERNS.SL;
  const activeIndex = seatNumber ? (seatNumber - 1) % pattern.length : -1;
  const isChair = ['CC', 'EC', '2S'].includes(classType);

  return (
    <div className={cn('rounded border border-line bg-paper/60 p-3', className)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {isChair ? 'Seating layout' : 'Berth layout'}
        </span>
        {seatNumber && (
          <span className="font-mono text-xs text-brand">
            Berth {seatNumber} · {berthLabel(pattern[activeIndex])}
          </span>
        )}
      </div>
      <div className="flex items-stretch gap-1.5" role="img"
        aria-label={seatNumber ? `Allocated ${berthLabel(pattern[activeIndex])} berth` : 'Berth layout'}>
        {pattern.map((b, i) => {
          const active = i === activeIndex;
          const isSide = b === 'SL' || b === 'SU';
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-11 w-full items-center justify-center rounded-sm border font-mono text-xs font-semibold transition-colors',
                  active
                    ? 'border-brand bg-brand text-white shadow-sm'
                    : isSide
                      ? 'border-line bg-surface text-muted'
                      : 'border-line bg-surface text-body',
                )}
                title={berthLabel(b)}
              >
                {SHORT[b] || b}
              </div>
              <span className={cn('text-2xs', active ? 'font-semibold text-brand' : 'text-muted')}>
                {berthLabel(b)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-2xs text-muted">
        {isChair ? 'Window and aisle seats alternate across each row.' : 'Lower / Middle / Upper berths repeat per bay; side berths run along the aisle.'}
      </p>
    </div>
  );
}

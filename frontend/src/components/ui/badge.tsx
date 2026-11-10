import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock3, Hourglass, XCircle, CircleDot } from 'lucide-react';
import type { BookingStatus, PaxStatus, AvailabilityStatus } from '@/lib/api/schemas';

export function Badge({ children, className, tone = 'neutral' }: { children: ReactNode; className?: string; tone?: 'neutral' | 'brand' | 'accent' }) {
  const tones = {
    neutral: 'bg-paper text-body border-line',
    brand: 'bg-brand-soft text-brand border-brand/15',
    accent: 'bg-accent-soft text-accent-strong border-accent/20',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}

const statusConfig: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  CONFIRMED: { label: 'Confirmed', cls: 'bg-ok-soft text-ok border-ok-line', Icon: CheckCircle2 },
  RAC: { label: 'RAC', cls: 'bg-rac-soft text-rac border-rac-line', Icon: Clock3 },
  WL: { label: 'Waiting', cls: 'bg-wl-soft text-wl border-wl-line', Icon: Hourglass },
  CANCELLED: { label: 'Cancelled', cls: 'bg-cancel-soft text-cancel border-cancel-line', Icon: XCircle },
  PARTIAL: { label: 'Partially confirmed', cls: 'bg-partial-soft text-partial border-partial-line', Icon: CircleDot },
  AVAILABLE: { label: 'Available', cls: 'bg-ok-soft text-ok border-ok-line', Icon: CheckCircle2 },
  FULL: { label: 'Full', cls: 'bg-cancel-soft text-cancel border-cancel-line', Icon: XCircle },
};

export function StatusChip({ status, size = 'md', className }: { status: BookingStatus | PaxStatus | AvailabilityStatus | string; size?: 'sm' | 'md'; className?: string }) {
  const cfg = statusConfig[status] || { label: status, cls: 'bg-paper text-body border-line', Icon: CircleDot };
  const { Icon } = cfg;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-[0.06em]',
        size === 'sm' ? 'px-1.5 py-0.5 text-2xs' : 'px-2 py-1 text-xs',
        cfg.cls,
        className,
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
      {cfg.label}
    </span>
  );
}

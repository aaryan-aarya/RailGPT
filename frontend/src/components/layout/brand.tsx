import { Link } from '@tanstack/react-router';
import { TrainFront } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Brand({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5', className)} aria-label="RailGPT home">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-[0_5px_12px_rgba(23,107,85,0.22)] ring-1 ring-brand/10">
        <TrainFront className="h-[19px] w-[19px]" aria-hidden />
      </span>
      <span className={cn('text-[19px] font-semibold tracking-[-0.055em]', light ? 'text-white' : 'text-ink')}>
        Rail<span className="text-brand">GPT</span>
      </span>
    </Link>
  );
}

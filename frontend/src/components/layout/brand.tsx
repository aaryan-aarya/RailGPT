import { Link } from '@tanstack/react-router';
import { TrainFront } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Brand({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5', className)} aria-label="RailGPT home">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-strong text-accent shadow-sm">
        <TrainFront className="h-5 w-5" aria-hidden />
      </span>
      <span className={cn('text-lg font-semibold tracking-tight', light ? 'text-white' : 'text-ink')}>
        Rail<span className="text-accent">GPT</span>
      </span>
    </Link>
  );
}

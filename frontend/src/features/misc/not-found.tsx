import { Link } from '@tanstack/react-router';
import { TrainFront, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="app-container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
        <TrainFront className="h-8 w-8" aria-hidden />
      </span>
      <p className="mt-5 font-mono text-sm font-semibold text-accent">404</p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">This track doesn’t exist</h1>
      <p className="mt-2 max-w-sm text-muted">The page you’re looking for may have been moved or the address is incorrect.</p>
      <Link to="/" className="mt-6"><Button><ArrowLeft className="h-4 w-4" /> Back to home</Button></Link>
    </div>
  );
}

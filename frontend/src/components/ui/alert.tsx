import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'info' | 'success' | 'warning' | 'error';

const config: Record<Tone, { cls: string; Icon: typeof Info }> = {
  info: { cls: 'bg-brand-soft/60 border-brand/20 text-brand', Icon: Info },
  success: { cls: 'bg-ok-soft border-ok-line text-ok', Icon: CheckCircle2 },
  warning: { cls: 'bg-rac-soft border-rac-line text-rac', Icon: AlertTriangle },
  error: { cls: 'bg-wl-soft border-wl-line text-wl', Icon: XCircle },
};

export function Alert({ tone = 'info', title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  const { cls, Icon } = config[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded border px-4 py-3 text-sm', cls, className)}>
      <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'leading-relaxed')}>{children}</div>}
      </div>
    </div>
  );
}

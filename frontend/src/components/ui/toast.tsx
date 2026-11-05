import * as ToastPrimitive from '@radix-ui/react-toast';
import { create } from 'zustand';
import { CheckCircle2, Info, XCircle, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info' | 'warning';
interface ToastItem { id: number; title: string; description?: string; tone: ToastTone }

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}

let seq = 1;
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: seq++ }].slice(-4) })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export function toast(t: { title: string; description?: string; tone?: ToastTone }) {
  useToastStore.getState().push({ title: t.title, description: t.description, tone: t.tone || 'info' });
}

const icons: Record<ToastTone, typeof Info> = {
  success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle,
};
const tones: Record<ToastTone, string> = {
  success: 'text-ok', error: 'text-wl', info: 'text-brand', warning: 'text-rac',
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={4500}>
      {toasts.map((t) => {
        const Icon = icons[t.tone];
        return (
          <ToastPrimitive.Root
            key={t.id}
            className={cn(
              'flex items-start gap-3 rounded-md border border-line bg-surface px-4 py-3 shadow-pop',
              'data-[state=open]:animate-slide-up',
            )}
            onOpenChange={(open) => { if (!open) dismiss(t.id); }}
          >
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', tones[t.tone])} aria-hidden />
            <div className="min-w-0 flex-1">
              <ToastPrimitive.Title className="text-sm font-semibold text-ink">{t.title}</ToastPrimitive.Title>
              {t.description && <ToastPrimitive.Description className="mt-0.5 text-sm text-muted">{t.description}</ToastPrimitive.Description>}
            </div>
            <ToastPrimitive.Close className="rounded p-1 text-muted hover:text-ink" aria-label="Dismiss notification">
              <X className="h-4 w-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 outline-none" />
    </ToastPrimitive.Provider>
  );
}

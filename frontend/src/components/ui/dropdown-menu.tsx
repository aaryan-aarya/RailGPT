import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({ children, className, align = 'end' }: { children: ReactNode; className?: string; align?: 'start' | 'end' | 'center' }) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align={align}
        sideOffset={6}
        className={cn(
          'z-50 min-w-[200px] rounded-md border border-line bg-surface p-1.5 shadow-pop',
          'data-[state=open]:animate-fade-in',
          className,
        )}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ children, className, onSelect, disabled }: { children: ReactNode; className?: string; onSelect?: () => void; disabled?: boolean }) {
  return (
    <DropdownMenuPrimitive.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-sm text-body outline-none',
        'data-[highlighted]:bg-brand-soft data-[highlighted]:text-brand data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
        className,
      )}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  );
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <DropdownMenuPrimitive.Label className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{children}</DropdownMenuPrimitive.Label>;
}

export function DropdownMenuSeparator() {
  return <DropdownMenuPrimitive.Separator className="my-1.5 h-px bg-line" />;
}

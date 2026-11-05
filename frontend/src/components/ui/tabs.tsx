import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.List className={cn('inline-flex items-center gap-1 rounded-md bg-paper p-1 border border-line', className)}>
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        'rounded px-3.5 py-1.5 text-sm font-medium text-muted transition-colors',
        'data-[state=active]:bg-surface data-[state=active]:text-brand data-[state=active]:shadow-card',
        'hover:text-ink',
        className,
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.Content value={value} className={cn('mt-4 focus:outline-none', className)}>
      {children}
    </TabsPrimitive.Content>
  );
}

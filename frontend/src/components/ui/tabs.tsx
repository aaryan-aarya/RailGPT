import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.List className={cn('inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-line bg-paper p-1', className)}>
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-muted transition-all',
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

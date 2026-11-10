import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Mail } from 'lucide-react';
import { emailTicket, getMeta } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

export function TicketActions({ pnr }: { pnr: string }) {
  const [sending, setSending] = useState(false);
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: getMeta, staleTime: 1000 * 60 * 10, retry: false });

  if (meta?.mode === 'demo') {
    return <p className="mt-5 text-sm text-muted">PDF downloads and email delivery require the Spring backend.</p>;
  }

  async function sendByEmail() {
    setSending(true);
    try {
      const result = await emailTicket(pnr);
      toast({ title: 'Ticket emailed', description: result.message, tone: 'success' });
    } catch (error) {
      toast({
        title: 'Could not email ticket',
        description: error instanceof ApiError ? error.message : 'Please try again.',
        tone: 'error',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <a
        href={`/api/booking/pnr/${encodeURIComponent(pnr)}/ticket.pdf`}
        className="inline-flex h-11 items-center justify-center gap-2 rounded border border-line bg-surface text-sm font-medium text-ink transition-colors hover:border-brand/40"
      >
        <Download className="h-4 w-4" /> Download ticket PDF
      </a>
      <Button variant="outline" onClick={sendByEmail} loading={sending}>
        <Mail className="h-4 w-4" /> Email ticket again
      </Button>
    </div>
  );
}

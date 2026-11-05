import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageSquareText, SendHorizonal, Sparkles, UserRound } from 'lucide-react';
import { askAssistant } from '@/lib/api/endpoints';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  suggestions?: string[];
}

let msgSeq = 1;
const GREETING: Message = {
  id: 0,
  role: 'assistant',
  text: 'Hi! I’m the RailGPT travel assistant. I can explain RAC and waiting lists, check a PNR, look up seat availability, and help you find trains. What would you like to know?',
  suggestions: ['What is RAC?', 'What is waiting list?', 'Recommend a train', 'Show all trains'],
};

export function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput('');
    setMessages((m) => [...m, { id: msgSeq++, role: 'user', text: question }]);
    setBusy(true);
    try {
      const res = await askAssistant(question);
      setMessages((m) => [...m, { id: msgSeq++, role: 'assistant', text: res.answer, suggestions: res.suggestions }]);
    } catch {
      setMessages((m) => [...m, { id: msgSeq++, role: 'assistant', text: 'Sorry, I couldn’t reach the assistant just now. Please try again in a moment.' }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="app-container max-w-3xl py-6 lg:py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand text-white">
          <MessageSquareText className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-ink">Travel assistant</h1>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Sparkles className="h-3 w-3 text-accent" aria-hidden />
            Rule-based assistant — answers from the live catalog and your bookings.
          </p>
        </div>
      </div>

      <div className="surface-card mt-5 flex h-[62vh] min-h-[420px] flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite" aria-label="Conversation">
          {messages.map((m) => (
            <div key={m.id} className={cn('flex gap-3', m.role === 'user' ? 'flex-row-reverse' : '')}>
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                m.role === 'assistant' ? 'bg-brand text-white' : 'bg-accent-soft text-accent-strong')}>
                {m.role === 'assistant' ? <MessageSquareText className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
              </span>
              <div className={cn('max-w-[80%]', m.role === 'user' ? 'text-right' : '')}>
                <div className={cn('inline-block whitespace-pre-line rounded-lg px-4 py-2.5 text-sm leading-relaxed',
                  m.role === 'assistant' ? 'bg-paper text-body' : 'bg-brand text-white')}>
                  {m.text}
                </div>
                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.suggestions.map((s) => (
                      <button key={s} type="button" onClick={() => send(s)}
                        className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-brand transition-colors hover:border-brand/40 hover:bg-brand-soft">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white"><MessageSquareText className="h-4 w-4" /></span>
              <div className="flex items-center gap-1.5 rounded-lg bg-paper px-4 py-3">
                <Dot delay="0ms" /><Dot delay="150ms" /><Dot delay="300ms" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form onSubmit={onSubmit} className="border-t border-line p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <label htmlFor="assistant-input" className="sr-only">Ask the travel assistant</label>
            <input
              id="assistant-input" ref={inputRef}
              className="field-input flex-1"
              placeholder="Ask about RAC, PNR status, trains, fares…"
              value={input} onChange={(e) => setInput(e.target.value)}
              maxLength={500} autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send message">
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-2xs text-muted">
            The assistant is rule-based (not a large language model) and never processes payments. Personal details are masked unless you own the booking.
          </p>
        </form>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: delay }} />;
}

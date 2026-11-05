import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Search } from 'lucide-react';
import { getStations } from '@/lib/api/endpoints';
import type { Station } from '@/lib/api/schemas';
import { cn } from '@/lib/utils';

interface StationPickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}

/** Accessible station combobox with type-ahead over the station catalog. */
export function StationPicker({ id, value, onChange, placeholder = 'Select station', label, error }: StationPickerProps) {
  const { data: stations = [] } = useQuery({ queryKey: ['stations'], queryFn: () => getStations(), staleTime: 1000 * 60 * 30 });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stations.slice(0, 40);
    return stations.filter((s) =>
      s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.city.toLowerCase().includes(q),
    ).slice(0, 40);
  }, [query, stations]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => { setHighlight(0); }, [query]);

  function select(s: Station) {
    onChange(s.name);
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (open && filtered[highlight]) select(filtered[highlight]); }
    else if (e.key === 'Escape') { setOpen(false); }
  }

  const display = open ? query : value;

  return (
    <div ref={rootRef} className="relative">
      {label && <label htmlFor={id} className="field-label">{label}</label>}
      <div className={cn('field-input flex items-center gap-2 px-3', error && 'border-wl focus:ring-wl/15')}>
        <MapPin className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[highlight] ? `${id}-opt-${highlight}` : undefined}
          className="w-full bg-transparent py-2 text-base text-ink placeholder:text-muted/70 focus:outline-none"
          placeholder={placeholder}
          value={display}
          autoComplete="off"
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={onKeyDown}
        />
        {value && !open && (
          <button type="button" aria-label="Clear station" className="text-muted hover:text-ink"
            onClick={() => { onChange(''); setQuery(''); }}>
            <Search className="hidden" />
            <span aria-hidden className="text-xs">✕</span>
          </button>
        )}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          ref={listRef}
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-md border border-line bg-surface py-1 shadow-pop"
        >
          {filtered.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">No stations match “{query}”.</li>}
          {filtered.map((s, i) => (
            <li
              key={s.code}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={value === s.name}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => { e.preventDefault(); select(s); }}
              className={cn('flex cursor-pointer items-center justify-between px-3 py-2 text-sm', i === highlight ? 'bg-brand-soft text-brand' : 'text-body')}
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-muted">{s.city}</span>
              </span>
              <span className="font-mono text-xs text-muted">{s.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Indian-style currency formatting (₹1,23,456). */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

/** "2026-12-01" -> "Tue, 01 Dec 2026" */
export function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateShort(iso: string): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/** Minutes -> "15h 35m" */
export function formatDuration(minutes: number): string {
  if (!minutes && minutes !== 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function isValidISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

/** Mask a passenger name for public PNR display: "Rahul Kumar" -> "R•••• K••••". */
export function maskName(name: string): string {
  if (!name) return '••••';
  return name
    .split(/\s+/)
    .map((w) => (w.length <= 1 ? '•' : w[0] + '•'.repeat(Math.max(2, w.length - 1))))
    .join(' ');
}

export function initials(name: string): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

export const BERTH_LABELS: Record<string, string> = {
  LB: 'Lower', MB: 'Middle', UB: 'Upper', SL: 'Side Lower', SU: 'Side Upper',
  WINDOW: 'Window', MIDDLE: 'Middle', AISLE: 'Aisle', RAC: 'RAC', WL: 'Waiting',
};

export function berthLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return BERTH_LABELS[code] || code;
}

export const CLASS_LABELS: Record<string, string> = {
  SL: 'Sleeper', '3A': 'AC 3 Tier', '2A': 'AC 2 Tier', '1A': 'AC First', CC: 'Chair Car', EC: 'Exec. Chair', '2S': 'Second Sitting',
};

export function classLabel(code: string): string {
  return CLASS_LABELS[code] || code;
}

export function genderLabel(g: string): string {
  return g === 'M' ? 'Male' : g === 'F' ? 'Female' : g === 'O' ? 'Other' : g;
}

/** Relative "time ago" for booking timestamps. */
export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

import { describe, it, expect } from 'vitest';
import {
  formatINR, formatDuration, maskName, initials, berthLabel, classLabel,
  genderLabel, isValidISODate, todayISO, addDaysISO,
} from './utils';

describe('formatINR', () => {
  it('formats Indian-style currency', () => {
    expect(formatINR(123456)).toContain('1,23,456');
    expect(formatINR(0)).toContain('0');
  });
});

describe('formatDuration', () => {
  it('renders hours and minutes', () => {
    expect(formatDuration(935)).toBe('15h 35m');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(120)).toBe('2h 00m');
  });
});

describe('maskName', () => {
  it('masks all but the first letter of each word', () => {
    expect(maskName('Rahul Kumar')).toBe('R•••• K••••');
    expect(maskName('A')).toBe('•');
    expect(maskName('')).toBe('••••');
  });
});

describe('initials', () => {
  it('returns up to two initials', () => {
    expect(initials('Aarav Mehta')).toBe('AM');
    expect(initials('Cher')).toBe('C');
  });
});

describe('labels', () => {
  it('maps berth codes', () => {
    expect(berthLabel('LB')).toBe('Lower');
    expect(berthLabel('SU')).toBe('Side Upper');
    expect(berthLabel(null)).toBe('—');
  });
  it('maps class codes', () => {
    expect(classLabel('3A')).toBe('AC 3 Tier');
    expect(classLabel('SL')).toBe('Sleeper');
  });
  it('maps gender', () => {
    expect(genderLabel('F')).toBe('Female');
    expect(genderLabel('O')).toBe('Other');
  });
});

describe('dates', () => {
  it('validates ISO dates', () => {
    expect(isValidISODate('2026-12-01')).toBe(true);
    expect(isValidISODate('2026-13-40')).toBe(false);
    expect(isValidISODate('not-a-date')).toBe(false);
  });
  it('produces ISO today and offsets', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(addDaysISO(3)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(addDaysISO(3) > todayISO()).toBe(true);
  });
});

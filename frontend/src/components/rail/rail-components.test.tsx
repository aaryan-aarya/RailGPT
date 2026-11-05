import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BerthMap } from './berth-map';
import { PnrTicket } from './pnr-ticket';
import { AvailabilityMeter, ClassOption } from './availability';
import { StatusChip } from '@/components/ui/badge';
import type { Booking, ClassAvailability } from '@/lib/api/schemas';

const booking: Booking = {
  id: 1, pnr: '2456789012', trainNumber: '12951', trainName: 'Mumbai Rajdhani',
  userEmail: 'a@b.com', journeyDate: '2026-12-01', classType: '3A',
  boarding: 'Mumbai Central', reservation: 'New Delhi',
  source: 'Mumbai Central', destination: 'New Delhi',
  status: 'CONFIRMED', totalFare: 5230, createdAt: Date.now(), cancelledAt: null,
  passengers: [
    { id: 1, name: 'Aarav Mehta', age: 29, gender: 'M', berthPreference: 'LB', status: 'CONFIRMED', seatNumber: 12, coachNumber: 'B1', berthType: 'LB', racNumber: null, waitingNumber: null },
    { id: 2, name: 'Priya Mehta', age: 27, gender: 'F', berthPreference: null, status: 'RAC', seatNumber: null, coachNumber: null, berthType: 'RAC', racNumber: 3, waitingNumber: null },
  ],
};

const inv: ClassAvailability = {
  classType: 'SL', totalSeats: 72, fare: 500, racLimit: 18, waitingLimit: 40,
  confirmedCount: 60, availableSeats: 12, racCount: 0, waitingCount: 0,
  racAvailable: 18, waitingAvailable: 40, status: 'AVAILABLE',
};

describe('StatusChip', () => {
  it('renders human-readable status labels', () => {
    render(<StatusChip status="CONFIRMED" />);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    render(<StatusChip status="RAC" />);
    expect(screen.getByText('RAC')).toBeInTheDocument();
  });
});

describe('BerthMap', () => {
  it('highlights the allocated berth', () => {
    render(<BerthMap classType="SL" seatNumber={1} />);
    expect(screen.getByText(/Berth 1/)).toBeInTheDocument();
    expect(screen.getAllByText('Lower').length).toBeGreaterThan(0);
  });
  it('renders without a seat allocation', () => {
    render(<BerthMap classType="SL" seatNumber={null} />);
    expect(screen.getByText('Berth layout')).toBeInTheDocument();
  });
});

describe('PnrTicket', () => {
  it('renders the PNR, train and passenger details', () => {
    render(<PnrTicket booking={booking} />);
    expect(screen.getByText('2456789012')).toBeInTheDocument();
    expect(screen.getByText('Mumbai Rajdhani')).toBeInTheDocument();
    expect(screen.getByText('Aarav Mehta')).toBeInTheDocument();
    expect(screen.getByText('Priya Mehta')).toBeInTheDocument();
    expect(screen.getByText('RAC 3')).toBeInTheDocument();
  });
});

describe('AvailabilityMeter', () => {
  it('shows available seats and capacity', () => {
    render(<AvailabilityMeter inv={inv} />);
    expect(screen.getByText(/12 of 72 available/)).toBeInTheDocument();
  });
});

describe('ClassOption', () => {
  it('renders class label and fare and responds to selection', () => {
    let selected = false;
    render(<ClassOption inv={inv} selected={false} onSelect={() => { selected = true; }} />);
    expect(screen.getByText('Sleeper')).toBeInTheDocument();
    screen.getByRole('button').click();
    expect(selected).toBe(true);
  });
});

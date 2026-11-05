import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiError, setAccessToken, getAccessToken, onUnauthorized } from './client';
import * as api from './endpoints';
import { useAuth } from '@/lib/auth/store';
import { z } from 'zod';
import type {
  User, AuthResponse, Train, TrainClass, ClassAvailability, Booking, Passenger,
  Station, AdminStats, Meta,
} from './schemas';

/**
 * Frontend API integration tests. They exercise the REAL typed client, endpoint
 * wrappers and auth store against a mocked fetch that returns Spring-shaped
 * responses, verifying: request construction (method/path/headers/body),
 * response parsing through the Zod contract, error handling, 401 session
 * clearing, and the auth lifecycle. The live backend parity is proven separately
 * by contract.live.test.ts against a real server.
 */

type FetchMock = ReturnType<typeof vi.fn>;

function mockResponse(status: number, body: unknown, empty = false): Response {
  return new Response(empty ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stubFetch(status: number, body: unknown, empty = false): FetchMock {
  const fn = vi.fn(async () => mockResponse(status, body, empty));
  vi.stubGlobal('fetch', fn);
  return fn;
}

const USER: User = { id: 1, name: 'Aarav Sharma', email: 'aarav@railgpt.app', role: 'USER', phone: null, createdAt: 1700000000000 };
const ADMIN: User = { ...USER, id: 2, email: 'admin@railgpt.app', role: 'ADMIN' };
const AUTH: AuthResponse = { token: 'jwt-token', expiresIn: 3600, user: USER };
const TRAIN_CLASS: TrainClass = { classType: 'SL', totalSeats: 72, fare: 500, racLimit: 18, waitingLimit: 40 };
const AVAILABILITY: ClassAvailability = { ...TRAIN_CLASS, confirmedCount: 0, availableSeats: 72, racCount: 0, waitingCount: 0, racAvailable: 18, waitingAvailable: 40, status: 'AVAILABLE' };
const TRAIN: Train = { id: 1, trainNumber: '12903', trainName: 'Frontier Mail', source: 'Mumbai Central', destination: 'Amritsar Jn', departureTime: '08:00', arrivalTime: '18:00', durationMinutes: 600, distanceKm: 1900, trainType: 'Superfast', daysOfRun: ['Mon'], classes: [TRAIN_CLASS], availability: { SL: AVAILABILITY } };
const PASSENGER: Passenger = { id: 1, name: 'Pax 1', age: 30, gender: 'M', berthPreference: null, status: 'CONFIRMED', seatNumber: 1, coachNumber: 'S1', berthType: 'LB', racNumber: null, waitingNumber: null };
const BOOKING: Booking = { id: 1, pnr: '2123456789', trainNumber: '12903', trainName: 'Frontier Mail', userEmail: 'aarav@railgpt.app', journeyDate: '2026-12-01', classType: 'SL', boarding: 'Mumbai Central', reservation: 'Amritsar Jn', source: 'Mumbai Central', destination: 'Amritsar Jn', status: 'CONFIRMED', totalFare: 500, createdAt: 1700000000000, cancelledAt: null, passengers: [PASSENGER] };
const STATION: Station = { code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi' };
const STATS: AdminStats = { users: 2, trains: 30, bookings: 1, confirmed: 1, rac: 0, wl: 0, cancelled: 0, revenue: 500 };
const META: Meta = { mode: 'production', name: 'RailGPT API', version: '1.0.0', disclaimer: 'Illustrative catalog', stations: 40, trains: 30 };

beforeEach(() => {
  setAccessToken(null);
  useAuth.getState().clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setAccessToken(null);
});

describe('apiFetch client', () => {
  it('builds same-origin /api requests with JSON + bearer headers and credentials', async () => {
    setAccessToken('abc');
    const fn = stubFetch(200, { ok: true });
    await apiFetch('/auth/logout', { method: 'POST', body: { a: 1 } });
    const [url, init] = fn.mock.calls[0];
    expect(url).toBe('/api/auth/logout');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['Authorization']).toBe('Bearer abc');
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
  });

  it('omits Authorization when no token is held', async () => {
    const fn = stubFetch(200, []);
    await apiFetch('/train/all');
    expect(fn.mock.calls[0][1].headers['Authorization']).toBeUndefined();
  });

  it('parses Spring error bodies into ApiError', async () => {
    stubFetch(409, { code: 'TRAIN_HAS_BOOKINGS', message: 'Active bookings exist.' });
    await expect(apiFetch('/train/12903', { method: 'DELETE' })).rejects.toMatchObject({
      status: 409, code: 'TRAIN_HAS_BOOKINGS', message: 'Active bookings exist.',
    });
  });

  it('maps network failures to ApiError(0, NETWORK)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('failed'); }));
    await expect(apiFetch('/meta')).rejects.toMatchObject({ status: 0, code: 'NETWORK' });
  });

  it('invokes the unauthorized handler on 401 when a token is present', async () => {
    setAccessToken('expired');
    const handler = vi.fn();
    onUnauthorized(handler);
    stubFetch(401, { code: 'UNAUTHORIZED', message: 'Authentication required.' });
    await expect(apiFetch('/booking/my')).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('returns undefined for empty 204-style bodies', async () => {
    stubFetch(200, null, true);
    expect(await apiFetch('/auth/logout', { method: 'POST' })).toBeUndefined();
  });

  it('validates responses against the provided Zod schema', async () => {
    stubFetch(200, { nope: true });
    await expect(apiFetch('/meta', { schema: z.object({ mode: z.string() }) })).rejects.toThrow();
  });
});

describe('endpoint wrappers (request + contract)', () => {
  it('login posts credentials and parses AuthResponse', async () => {
    const fn = stubFetch(200, AUTH);
    const res = await api.login('aarav@railgpt.app', 'Travel@123');
    expect(fn.mock.calls[0][0]).toBe('/api/auth/login');
    expect(fn.mock.calls[0][1].method).toBe('POST');
    expect(res.token).toBe('jwt-token');
    expect(res.user.email).toBe('aarav@railgpt.app');
  });

  it('register posts the profile and parses AuthResponse', async () => {
    const fn = stubFetch(201, AUTH);
    await api.register({ name: 'Aarav', email: 'aarav@railgpt.app', password: 'Travel@123' });
    expect(fn.mock.calls[0][0]).toBe('/api/auth/register');
    expect(fn.mock.calls[0][1].method).toBe('POST');
  });

  it('getMe unwraps { user }', async () => {
    stubFetch(200, { user: USER });
    expect((await api.getMe()).email).toBe('aarav@railgpt.app');
  });

  it('logout posts and returns ok', async () => {
    const fn = stubFetch(200, { ok: true });
    expect(await api.logout()).toEqual({ ok: true });
    expect(fn.mock.calls[0][1].method).toBe('POST');
  });

  it('updateProfile PATCHes and unwraps user; changePassword POSTs', async () => {
    const fn = stubFetch(200, { user: { ...USER, name: 'New Name' } });
    expect((await api.updateProfile({ name: 'New Name' })).name).toBe('New Name');
    expect(fn.mock.calls[0][1].method).toBe('PATCH');
    expect(fn.mock.calls[0][0]).toBe('/api/user/profile');
    const fn2 = stubFetch(200, { ok: true });
    await api.changePassword({ currentPassword: 'a', newPassword: 'b' });
    expect(fn2.mock.calls[0][0]).toBe('/api/user/change-password');
  });

  it('getStations encodes the query and parses stations', async () => {
    const fn = stubFetch(200, [STATION]);
    expect(await api.getStations('new delhi')).toEqual([STATION]);
    expect(fn.mock.calls[0][0]).toBe('/api/stations?q=new%20delhi');
  });

  it('searchTrains builds the query string and parses trains with availability', async () => {
    const fn = stubFetch(200, [TRAIN]);
    const res = await api.searchTrains({ source: 'Delhi', destination: 'Amritsar', date: '2026-12-01' });
    expect(fn.mock.calls[0][0]).toContain('/api/train/search?');
    expect(fn.mock.calls[0][0]).toContain('source=Delhi');
    expect(res[0].availability?.SL.status).toBe('AVAILABLE');
  });

  it('getAllTrains and getTrain parse the train contract', async () => {
    stubFetch(200, [TRAIN]);
    expect((await api.getAllTrains())[0].trainNumber).toBe('12903');
    const fn = stubFetch(200, TRAIN);
    await api.getTrain('12903', '2026-12-01');
    expect(fn.mock.calls[0][0]).toBe('/api/train/12903?date=2026-12-01');
  });

  it('bookTicket POSTs passengers and parses the booking', async () => {
    const fn = stubFetch(201, BOOKING);
    const res = await api.bookTicket({ trainNumber: '12903', journeyDate: '2026-12-01', classType: 'SL', passengers: [{ name: 'Pax 1', age: 30, gender: 'M' }] });
    expect(fn.mock.calls[0][1].method).toBe('POST');
    expect(res.pnr).toBe('2123456789');
    expect(res.passengers[0].seatNumber).toBe(1);
  });

  it('getPnr, getMyBookings and cancelBooking use the right paths/methods', async () => {
    stubFetch(200, BOOKING);
    expect((await api.getPnr('2123456789')).pnr).toBe('2123456789');
    const fn = stubFetch(200, [BOOKING]);
    expect(await api.getMyBookings()).toHaveLength(1);
    expect(fn.mock.calls[0][0]).toBe('/api/booking/my');
    const fn2 = stubFetch(200, { ...BOOKING, status: 'CANCELLED', cancelledAt: 1700000001000 });
    const cancelled = await api.cancelBooking('2123456789');
    expect(fn2.mock.calls[0][1].method).toBe('DELETE');
    expect(fn2.mock.calls[0][0]).toBe('/api/booking/cancel/2123456789');
    expect(cancelled.status).toBe('CANCELLED');
  });

  it('askAssistant posts the question and parses the answer', async () => {
    const fn = stubFetch(200, { answer: 'RAC means Reservation Against Cancellation.', suggestions: ['Check PNR status'] });
    const res = await api.askAssistant('What is RAC?');
    expect(fn.mock.calls[0][0]).toBe('/api/chatbot/ask');
    expect(res.answer).toContain('RAC');
  });

  it('admin endpoints parse stats/users/trains/bookings', async () => {
    stubFetch(200, STATS);
    expect((await api.getAdminStats()).revenue).toBe(500);
    stubFetch(200, [ADMIN]);
    expect((await api.getAdminUsers())[0].role).toBe('ADMIN');
    stubFetch(200, [TRAIN]);
    expect(await api.getAdminTrains()).toHaveLength(1);
    stubFetch(200, [BOOKING]);
    expect(await api.getAdminBookings()).toHaveLength(1);
  });

  it('admin train CRUD uses POST /train/add, PUT and DELETE /train/:n', async () => {
    const fn = stubFetch(201, TRAIN);
    await api.addTrain(TRAIN);
    expect(fn.mock.calls[0][0]).toBe('/api/train/add');
    expect(fn.mock.calls[0][1].method).toBe('POST');
    const fn2 = stubFetch(200, TRAIN);
    await api.updateTrain('12903', TRAIN);
    expect(fn2.mock.calls[0][0]).toBe('/api/train/12903');
    expect(fn2.mock.calls[0][1].method).toBe('PUT');
    const fn3 = stubFetch(200, { ok: true });
    await api.deleteTrain('12903');
    expect(fn3.mock.calls[0][1].method).toBe('DELETE');
  });

  it('getMeta parses the production meta contract', async () => {
    stubFetch(200, META);
    expect((await api.getMeta()).mode).toBe('production');
  });
});

describe('auth store lifecycle', () => {
  it('login stores the token in memory and authenticates', async () => {
    stubFetch(200, AUTH);
    const user = await useAuth.getState().login('aarav@railgpt.app', 'Travel@123');
    expect(user.email).toBe('aarav@railgpt.app');
    expect(getAccessToken()).toBe('jwt-token');
    expect(useAuth.getState().status).toBe('authenticated');
  });

  it('bootstrap restores the session from the cookie via /auth/me', async () => {
    stubFetch(200, { user: USER });
    await useAuth.getState().bootstrap();
    expect(useAuth.getState().status).toBe('authenticated');
    expect(useAuth.getState().user?.email).toBe('aarav@railgpt.app');
  });

  it('bootstrap falls back to unauthenticated when /auth/me fails', async () => {
    stubFetch(401, { code: 'UNAUTHORIZED', message: 'Authentication required.' });
    await useAuth.getState().bootstrap();
    expect(useAuth.getState().status).toBe('unauthenticated');
    expect(getAccessToken()).toBeNull();
  });

  it('logout clears the token and session', async () => {
    stubFetch(200, AUTH);
    await useAuth.getState().login('aarav@railgpt.app', 'Travel@123');
    stubFetch(200, { ok: true });
    await useAuth.getState().logout();
    expect(getAccessToken()).toBeNull();
    expect(useAuth.getState().status).toBe('unauthenticated');
  });
});

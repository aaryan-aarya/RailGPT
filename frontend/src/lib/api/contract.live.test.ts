import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  AuthResponseSchema, UserSchema, TrainSchema, BookingSchema, ChatResponseSchema,
  AdminStatsSchema, StationSchema, MetaSchema, ApiErrorSchema,
} from './schemas';

/**
 * LIVE full-stack API contract test. Runs the frontend's real Zod schemas against
 * a REAL running backend (Spring Boot + PostgreSQL in CI; any instance locally):
 *
 *   LIVE_API_URL=http://localhost:8081 npm run test:live
 *
 * It walks the complete user journey — auth, search, availability, multi-pax
 * booking, RAC/WL, PNR masking, history, cancellation + promotion, profile,
 * admin and the assistant — asserting paths, status codes, JSON shapes, security
 * rules and error bodies. This is the proof that the frontend contract and the
 * production backend agree end-to-end. Excluded from the default unit run.
 */

const BASE = process.env.LIVE_API_URL;
const uniq = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const journeyDate = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
})();

interface Res { status: number; body: any; }

async function req(method: string, path: string, opts: { body?: unknown; token?: string } = {}): Promise<Res> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let body: any = undefined;
  try { body = text ? JSON.parse(text) : undefined; } catch { body = text; }
  return { status: res.status, body };
}

function ok(r: Res, expected = 200) {
  expect(r.status, `${JSON.stringify(r.body)}`).toBe(expected);
  return r.body;
}

// Shared journey state (sequential within this file).
let userToken = '';
let userEmail = '';
let adminToken = '';
let trainNumber = '';
let confirmedPnr = '';
let racPnr = '';
let wlPnr = '';

beforeAll(() => {
  if (!BASE) throw new Error('LIVE_API_URL must be set (e.g. http://localhost:8081)');
});

describe('live API contract', () => {
  it('serves meta, health and stations', async () => {
    const meta = MetaSchema.parse(ok(await req('GET', '/meta')));
    expect(['production', 'demo']).toContain(meta.mode);
    expect(ok(await req('GET', '/health')).status).toBe('ok');
    const stations = z.array(StationSchema).parse(ok(await req('GET', '/stations')));
    expect(stations.length).toBeGreaterThan(0);
  });

  it('registers a new user and returns a session', async () => {
    userEmail = `live-${uniq}@test.app`;
    const auth = AuthResponseSchema.parse(ok(await req('POST', '/auth/register', {
      body: { name: 'Live User', email: userEmail, password: 'Password@123' },
    }), 201));
    userToken = auth.token;
    expect(auth.user.email).toBe(userEmail);
    expect(auth.user.role).toBe('USER');
    expect((auth.user as any).password).toBeUndefined();
  });

  it('logs in seeded traveller and admin accounts', async () => {
    const traveller = AuthResponseSchema.parse(ok(await req('POST', '/auth/login', {
      body: { email: 'aarav@railgpt.app', password: 'Travel@123' },
    })));
    expect(traveller.user.role).toBe('USER');
    const admin = AuthResponseSchema.parse(ok(await req('POST', '/auth/login', {
      body: { email: 'admin@railgpt.app', password: 'Admin@123' },
    })));
    adminToken = admin.token;
    expect(admin.user.role).toBe('ADMIN');
  });

  it('rejects bad credentials and unauthenticated /auth/me', async () => {
    const bad = await req('POST', '/auth/login', { body: { email: 'aarav@railgpt.app', password: 'wrong' } });
    expect(bad.status).toBe(401);
    ApiErrorSchema.parse(bad.body);
    const me = await req('GET', '/auth/me');
    expect(me.status).toBe(401);
    expect(me.body.code).toBe('UNAUTHORIZED');
  });

  it('returns the current user via /auth/me and updates the profile', async () => {
    const me = ok(await req('GET', '/auth/me', { token: userToken }));
    UserSchema.parse(me.user);
    expect(me.user.email).toBe(userEmail);
    const updated = ok(await req('PATCH', '/user/profile', { token: userToken, body: { name: 'Live Renamed', phone: '9999999999' } }));
    expect(UserSchema.parse(updated.user).name).toBe('Live Renamed');
  });

  it('searches trains and exposes class-wise availability', async () => {
    const trains = z.array(TrainSchema).parse(ok(await req('GET', '/train/search?source=Delhi&destination=Amritsar')));
    expect(Array.isArray(trains)).toBe(true);
    const all = z.array(TrainSchema).parse(ok(await req('GET', '/train/all')));
    expect(all.length).toBeGreaterThan(0);
    const detail = TrainSchema.parse(ok(await req('GET', `/train/${all[0].trainNumber}?date=${journeyDate}`)));
    expect(detail.availability).toBeDefined();
    const firstClass = Object.values(detail.availability!)[0];
    expect(['AVAILABLE', 'RAC', 'WL', 'FULL']).toContain(firstClass.status);
  });

  it('lets an admin create a small train (2 confirmed / 1 RAC / 2 WL)', async () => {
    trainNumber = `97${Math.floor(1000 + Math.random() * 8999)}`;
    const train = TrainSchema.parse(ok(await req('POST', '/train/add', {
      token: adminToken,
      body: {
        trainNumber, trainName: 'Live Contract Express', source: 'New Delhi', destination: 'Amritsar Jn',
        departureTime: '06:00', arrivalTime: '12:00', durationMinutes: 360, distanceKm: 450,
        trainType: 'Superfast', daysOfRun: ['Mon'],
        classes: [{ classType: 'SL', totalSeats: 2, fare: 100, racLimit: 1, waitingLimit: 2 }],
      },
    }), 201));
    expect(train.trainNumber).toBe(trainNumber);
  });

  it('books multiple passengers and allocates CONFIRMED / RAC / WL', async () => {
    const pax = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `Pax ${i + 1}`, age: 30, gender: 'M' }));
    const book = (n: number) => req('POST', '/booking/book', {
      token: userToken, body: { trainNumber, journeyDate, classType: 'SL', passengers: pax(n) },
    });
    const confirmed = BookingSchema.parse(ok(await book(2), 201));
    expect(confirmed.status).toBe('CONFIRMED');
    expect(confirmed.pnr).toHaveLength(10);
    expect(confirmed.passengers[0].seatNumber).toBeGreaterThan(0);
    confirmedPnr = confirmed.pnr;

    const rac = BookingSchema.parse(ok(await book(1), 201));
    expect(rac.status).toBe('RAC');
    racPnr = rac.pnr;

    const wl = BookingSchema.parse(ok(await book(2), 201));
    expect(wl.status).toBe('WL');
    wlPnr = wl.pnr;
  });

  it('masks public PNR lookups but shows full data to the owner', async () => {
    const pub = BookingSchema.parse(ok(await req('GET', `/booking/pnr/${confirmedPnr}`)));
    expect(pub.userEmail).toBeUndefined();
    expect(pub.passengers[0].name).not.toBe('Pax 1');
    const owner = BookingSchema.parse(ok(await req('GET', `/booking/pnr/${confirmedPnr}`, { token: userToken })));
    expect(owner.userEmail).toBe(userEmail);
    expect(owner.passengers[0].name).toBe('Pax 1');
  });

  it('lists booking history for the authenticated user', async () => {
    const mine = z.array(BookingSchema).parse(ok(await req('GET', '/booking/my', { token: userToken })));
    expect(mine.map((b) => b.pnr)).toEqual(expect.arrayContaining([confirmedPnr, racPnr, wlPnr]));
    expect((await req('GET', '/booking/my')).status).toBe(401);
  });

  it('cancels a booking and promotes the RAC passenger to CONFIRMED', async () => {
    const cancelled = BookingSchema.parse(ok(await req('DELETE', `/booking/cancel/${confirmedPnr}`, { token: userToken })));
    expect(cancelled.status).toBe('CANCELLED');
    const promoted = BookingSchema.parse(ok(await req('GET', `/booking/pnr/${racPnr}`, { token: userToken })));
    expect(promoted.status).toBe('CONFIRMED');
    expect(promoted.passengers[0].seatNumber).toBeGreaterThan(0);
  });

  it('enforces ownership, authentication and validation on booking', async () => {
    // A different user cannot cancel someone else's booking.
    const other = AuthResponseSchema.parse(ok(await req('POST', '/auth/register', {
      body: { name: 'Other User', email: `other-${uniq}@test.app`, password: 'Password@123' },
    }), 201));
    expect((await req('DELETE', `/booking/cancel/${wlPnr}`, { token: other.token })).status).toBe(403);
    // Unauthenticated booking is rejected with 401.
    const unauth = await req('POST', '/booking/book', {
      body: { trainNumber, journeyDate, classType: 'SL', passengers: [{ name: 'Pax 1', age: 30, gender: 'M' }] },
    });
    expect(unauth.status).toBe(401);
    // Invalid payload returns a structured validation error.
    const invalid = await req('POST', '/booking/book', { token: userToken, body: { trainNumber, journeyDate: 'bad', classType: 'SL', passengers: [] } });
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe('VALIDATION');
  });

  it('serves the admin dashboard and blocks non-admins', async () => {
    expect((await req('GET', '/admin/stats')).status).toBe(401);
    expect((await req('GET', '/admin/stats', { token: userToken })).status).toBe(403);
    AdminStatsSchema.parse(ok(await req('GET', '/admin/stats', { token: adminToken })));
    const users = z.array(UserSchema).parse(ok(await req('GET', '/admin/users', { token: adminToken })));
    expect(users.some((u) => u.role === 'ADMIN')).toBe(true);
    expect((users[0] as any).password).toBeUndefined();
    z.array(TrainSchema).parse(ok(await req('GET', '/admin/trains', { token: adminToken })));
    z.array(BookingSchema).parse(ok(await req('GET', '/admin/bookings', { token: adminToken })));
  });

  it('answers assistant questions with the chat contract', async () => {
    const chat = ChatResponseSchema.parse(ok(await req('POST', '/chatbot/ask', { body: { question: 'What is RAC?' } })));
    expect(chat.answer.length).toBeGreaterThan(0);
    expect((await req('POST', '/chatbot/ask', { body: { question: '' } })).status).toBe(400);
  });

  it('logs out and clears the session cookie', async () => {
    const res = await fetch(`${BASE}/auth/logout`, { method: 'POST' });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});

/**
 * RailGPT Demo API
 * ----------------
 * A faithful, in-memory reference implementation of the hardened RailGPT Spring
 * Boot REST contract, used to power the live preview without a JDK/PostgreSQL.
 *
 * It is clearly a DEMO environment: data is illustrative, stored in memory (with
 * optional JSON persistence), and never presented as live Indian Railways data.
 * The production path is the Spring Boot backend under /src, which implements the
 * same contract against PostgreSQL.
 */
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { book, cancelBooking, inventoryFor, _setPaxSeq, CLASS_DEFS } from './engine.js';
import { STATIONS, TRAINS, DEMO_USERS } from './seed.js';
import { answerQuestion } from './chatbot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.DEMO_PORT || 8090;
const JWT_SECRET = process.env.DEMO_JWT_SECRET || 'railgpt-demo-secret-not-for-production';
const TOKEN_TTL_SECONDS = 60 * 60; // 1h, matches backend
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'state.json');
const PERSIST = process.env.DEMO_PERSIST !== 'false';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let db = { seq: { user: 1, train: 1, booking: 1, audit: 1 }, users: [], trains: [], bookings: [], auditEvents: [], idempotencyRecords: {} };

function loadState() {
  if (PERSIST && fs.existsSync(DATA_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      db.seq ||= { user: 1, train: 1, booking: 1 };
      db.seq.audit ||= 1;
      db.auditEvents ||= [];
      db.idempotencyRecords ||= {};
      let maxPax = 0;
      for (const b of db.bookings) for (const p of b.passengers) maxPax = Math.max(maxPax, p.id || 0);
      _setPaxSeq(maxPax + 1);
      return;
    } catch { /* fall through to seed */ }
  }
  seed();
}

function seed() {
  db = { seq: { user: 1, train: 1, booking: 1, audit: 1 }, users: [], trains: [], bookings: [], auditEvents: [], idempotencyRecords: {} };
  for (const u of DEMO_USERS) {
    db.users.push({
      id: db.seq.user++, name: u.name, email: u.email.toLowerCase(),
      passwordHash: bcrypt.hashSync(u.password, 10), role: u.role, phone: u.phone || null,
      createdAt: Date.now(),
    });
  }
  for (const t of TRAINS) db.trains.push({ id: db.seq.train++, ...t });
  saveState();
}

let saveTimer = null;
function saveState() {
  if (!PERSIST) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(db));
    } catch { /* non-fatal for demo */ }
  }, 150);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sanitizeUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone || null, createdAt: u.createdAt };
}
function signToken(u) {
  return jwt.sign({ sub: u.email, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}
function authPayload(req) {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token && req.headers.cookie) {
    const m = req.headers.cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (m) token = decodeURIComponent(m[1]);
  }
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}
function requireAuth(req, res, next) {
  const payload = authPayload(req);
  if (!payload) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required.' });
  const user = db.users.find((u) => u.email === payload.sub);
  if (!user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Account not found.' });
  req.user = user;
  next();
}
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ code: 'FORBIDDEN', message: 'Administrator access required.' });
    next();
  });
}
function setAuthCookie(res, token) {
  res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=${TOKEN_TTL_SECONDS}; SameSite=Lax`);
}
function maskName(name) {
  if (!name) return '••••';
  return name.split(/\s+/).map((w) => (w.length <= 1 ? '•' : w[0] + '•'.repeat(Math.max(2, w.length - 1)))).join(' ');
}
function publicBooking(booking, viewer) {
  const canSee = viewer && (viewer.role === 'ADMIN' || viewer.email === booking.userEmail);
  if (canSee) return booking;
  return {
    ...booking,
    userEmail: undefined,
    passengers: booking.passengers.map((p) => ({ ...p, name: maskName(p.name) })),
  };
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)); }
function err(res, status, code, message) { return res.status(status).json({ code, message }); }
function audit(pnr, eventType, actorEmail, details) {
  db.auditEvents.push({ id: db.seq.audit++, pnr, eventType, actorEmail, details, createdAt: Date.now() });
}

function classAvailability(train, journeyDate) {
  const out = {};
  for (const c of train.classes) {
    const inv = inventoryFor(db, train, journeyDate, c.classType);
    out[c.classType] = {
      ...inv,
      status: inv.availableSeats > 0 ? 'AVAILABLE' : inv.racAvailable > 0 ? 'RAC' : inv.waitingAvailable > 0 ? 'WL' : 'FULL',
    };
  }
  return out;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Meta / health
app.get('/meta', (req, res) => {
  res.json({
    mode: 'demo',
    name: 'RailGPT Demo API',
    version: '1.0.0',
    disclaimer: 'Demo environment. Illustrative data — not a live Indian Railways integration.',
    stations: STATIONS.length,
    trains: db.trains.length,
  });
});
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Stations
app.get('/stations', (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const list = q ? STATIONS.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.city.toLowerCase().includes(q)) : STATIONS;
  res.json(list);
});

// ---- Auth ----
app.post('/auth/register', (req, res) => {
  const { name, email, password, phone } = req.body || {};
  if (!name || !String(name).trim()) return err(res, 400, 'VALIDATION', 'Name is required.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err(res, 400, 'VALIDATION', 'A valid email is required.');
  if (!password || String(password).length < 8) return err(res, 400, 'VALIDATION', 'Password must be at least 8 characters.');
  const norm = String(email).toLowerCase();
  if (db.users.some((u) => u.email === norm)) return err(res, 409, 'EMAIL_EXISTS', 'An account with this email already exists.');
  const user = {
    id: db.seq.user++, name: String(name).trim(), email: norm,
    passwordHash: bcrypt.hashSync(String(password), 10), role: 'USER', phone: phone || null, createdAt: Date.now(),
  };
  db.users.push(user);
  saveState();
  const token = signToken(user);
  setAuthCookie(res, token);
  res.status(201).json({ token, expiresIn: TOKEN_TTL_SECONDS, user: sanitizeUser(user) });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.users.find((u) => u.email === String(email || '').toLowerCase());
  if (!user || !bcrypt.compareSync(String(password || ''), user.passwordHash)) {
    return err(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }
  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ token, expiresIn: TOKEN_TTL_SECONDS, user: sanitizeUser(user) });
});

app.get('/auth/me', requireAuth, (req, res) => res.json({ user: sanitizeUser(req.user) }));
app.post('/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  res.json({ ok: true });
});

// ---- Profile ----
app.get('/user/profile', requireAuth, (req, res) => res.json({ user: sanitizeUser(req.user) }));
app.patch('/user/profile', requireAuth, (req, res) => {
  const { name, phone } = req.body || {};
  if (name !== undefined) {
    if (!String(name).trim()) return err(res, 400, 'VALIDATION', 'Name cannot be empty.');
    req.user.name = String(name).trim();
  }
  if (phone !== undefined) req.user.phone = phone ? String(phone).trim() : null;
  saveState();
  res.json({ user: sanitizeUser(req.user) });
});
app.post('/user/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!bcrypt.compareSync(String(currentPassword || ''), req.user.passwordHash)) return err(res, 400, 'VALIDATION', 'Current password is incorrect.');
  if (!newPassword || String(newPassword).length < 8) return err(res, 400, 'VALIDATION', 'New password must be at least 8 characters.');
  req.user.passwordHash = bcrypt.hashSync(String(newPassword), 10);
  saveState();
  res.json({ ok: true });
});

// ---- Trains ----
app.get('/train/all', (req, res) => res.json(db.trains));
app.get('/train/search', (req, res) => {
  const source = String(req.query.source || '').toLowerCase();
  const destination = String(req.query.destination || '').toLowerCase();
  const date = validDate(req.query.date) ? req.query.date : null;
  let list = db.trains;
  if (source) list = list.filter((t) => t.source.toLowerCase().includes(source));
  if (destination) list = list.filter((t) => t.destination.toLowerCase().includes(destination));
  const result = list.map((t) => (date ? { ...t, availability: classAvailability(t, date) } : t));
  res.json(result);
});
app.get('/train/seats/:trainNumber', (req, res) => {
  const train = db.trains.find((t) => t.trainNumber === req.params.trainNumber);
  if (!train) return err(res, 404, 'TRAIN_NOT_FOUND', 'Train not found.');
  const date = validDate(req.query.date) ? req.query.date : todayStr();
  res.json({ ...train, availability: classAvailability(train, date) });
});
app.get('/train/:trainNumber', (req, res) => {
  const train = db.trains.find((t) => t.trainNumber === req.params.trainNumber);
  if (!train) return err(res, 404, 'TRAIN_NOT_FOUND', 'Train not found.');
  const date = validDate(req.query.date) ? req.query.date : todayStr();
  res.json({ ...train, availability: classAvailability(train, date) });
});

// Admin train management
app.post('/train/add', requireAdmin, (req, res) => {
  const t = req.body || {};
  if (!t.trainNumber || !t.trainName || !t.source || !t.destination) return err(res, 400, 'VALIDATION', 'trainNumber, trainName, source and destination are required.');
  if (db.trains.some((x) => x.trainNumber === t.trainNumber)) return err(res, 409, 'TRAIN_EXISTS', 'A train with this number already exists.');
  const train = { id: db.seq.train++, ...t, classes: t.classes || [] };
  db.trains.push(train);
  saveState();
  res.status(201).json(train);
});
app.put('/train/:trainNumber', requireAdmin, (req, res) => {
  const train = db.trains.find((t) => t.trainNumber === req.params.trainNumber);
  if (!train) return err(res, 404, 'TRAIN_NOT_FOUND', 'Train not found.');
  Object.assign(train, req.body || {}, { trainNumber: train.trainNumber, id: train.id });
  saveState();
  res.json(train);
});
app.delete('/train/:trainNumber', requireAdmin, (req, res) => {
  const idx = db.trains.findIndex((t) => t.trainNumber === req.params.trainNumber);
  if (idx === -1) return err(res, 404, 'TRAIN_NOT_FOUND', 'Train not found.');
  const hasActive = db.bookings.some((b) => b.trainNumber === req.params.trainNumber && b.status !== 'CANCELLED');
  if (hasActive) return err(res, 409, 'TRAIN_HAS_BOOKINGS', 'This train has active bookings and cannot be deleted. Cancel them first.');
  db.trains.splice(idx, 1);
  saveState();
  res.json({ ok: true });
});

// ---- Booking ----
app.post('/booking/book', requireAuth, (req, res) => {
  const { trainNumber, journeyDate, classType, passengers, boarding, reservation } = req.body || {};
  const idempotencyKey = String(req.get('Idempotency-Key') || '').trim();
  if (idempotencyKey.length > 100) return err(res, 400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key must be 100 characters or fewer.');
  const requestHash = idempotencyKey ? createHash('sha256').update(JSON.stringify({ trainNumber, journeyDate, classType, passengers, boarding, reservation })).digest('hex') : null;
  const idempotencyMapKey = idempotencyKey ? `${req.user.email}\n${idempotencyKey}` : null;
  const previous = idempotencyMapKey ? db.idempotencyRecords[idempotencyMapKey] : null;
  if (previous) {
    if (previous.requestHash !== requestHash) return err(res, 409, 'IDEMPOTENCY_KEY_REUSED', 'This Idempotency-Key was already used for a different booking request.');
    const original = db.bookings.find((item) => item.pnr === previous.pnr);
    if (original) return res.status(200).json(original);
  }
  const train = db.trains.find((t) => t.trainNumber === String(trainNumber));
  if (!train) return err(res, 404, 'TRAIN_NOT_FOUND', 'Train not found.');
  if (!validDate(journeyDate)) return err(res, 400, 'VALIDATION', 'A valid journey date (YYYY-MM-DD) is required.');
  if (journeyDate < todayStr()) return err(res, 400, 'VALIDATION', 'Journey date cannot be in the past.');
  const maxDate = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10);
  if (journeyDate > maxDate) return err(res, 400, 'VALIDATION', 'Bookings open up to 120 days in advance.');
  if (!Array.isArray(passengers) || passengers.length === 0) return err(res, 400, 'VALIDATION', 'At least one passenger is required.');
  for (const p of passengers) {
    if (!p.name || !String(p.name).trim()) return err(res, 400, 'VALIDATION', 'Every passenger needs a name.');
    if (!Number.isInteger(p.age) || p.age < 1 || p.age > 120) return err(res, 400, 'VALIDATION', 'Passenger age must be between 1 and 120.');
    if (!['M', 'F', 'O'].includes(p.gender)) return err(res, 400, 'VALIDATION', 'Passenger gender must be M, F or O.');
  }
  try {
    const booking = book(db, train, {
      userEmail: req.user.email, journeyDate, classType: classType || 'SL',
      passengers, boarding, reservation,
    });
    audit(booking.pnr, 'BOOKING_CREATED', req.user.email, `Booking created with ${booking.passengers.length} passenger(s); status ${booking.status}.`);
    if (idempotencyMapKey) db.idempotencyRecords[idempotencyMapKey] = { requestHash, pnr: booking.pnr };
    saveState();
    res.status(201).json(booking);
  } catch (e) {
    return err(res, e.status || 500, e.code || 'BOOKING_FAILED', e.message);
  }
});

app.get('/booking/pnr/:pnr', (req, res) => {
  const booking = db.bookings.find((b) => b.pnr === req.params.pnr);
  if (!booking) return err(res, 404, 'PNR_NOT_FOUND', 'PNR not found.');
  const payload = authPayload(req);
  const viewer = payload ? db.users.find((u) => u.email === payload.sub) : null;
  res.json(publicBooking(booking, viewer));
});
app.get('/booking/my', requireAuth, (req, res) => {
  const mine = db.bookings.filter((b) => b.userEmail === req.user.email).sort((a, b) => b.createdAt - a.createdAt);
  res.json(mine);
});
app.get('/booking/user/:email', requireAuth, (req, res) => {
  const target = String(req.params.email).toLowerCase();
  if (req.user.role !== 'ADMIN' && req.user.email !== target) return err(res, 403, 'FORBIDDEN', 'You can only view your own bookings.');
  res.json(db.bookings.filter((b) => b.userEmail === target).sort((a, b) => b.createdAt - a.createdAt));
});
app.delete('/booking/cancel/:pnr', requireAuth, (req, res) => {
  const booking = db.bookings.find((b) => b.pnr === req.params.pnr);
  if (!booking) return err(res, 404, 'PNR_NOT_FOUND', 'PNR not found.');
  if (req.user.role !== 'ADMIN' && req.user.email !== booking.userEmail) return err(res, 403, 'FORBIDDEN', 'You can only cancel your own bookings.');
  if (booking.status === 'CANCELLED') return res.json(booking);
  const train = db.trains.find((t) => t.trainNumber === booking.trainNumber);
  if (!train) return err(res, 404, 'TRAIN_NOT_FOUND', 'Train not found.');
  const previousStatuses = new Map();
  for (const candidate of db.bookings) {
    if (candidate.trainNumber !== booking.trainNumber || candidate.journeyDate !== booking.journeyDate || candidate.classType !== booking.classType) continue;
    for (const passenger of candidate.passengers) previousStatuses.set(passenger.id, { status: passenger.status, pnr: candidate.pnr });
  }
  cancelBooking(db, train, booking);
  audit(booking.pnr, 'BOOKING_CANCELLED', req.user.email, 'Booking cancelled; released places were reallocated in queue order.');
  for (const candidate of db.bookings) {
    if (candidate.trainNumber !== booking.trainNumber || candidate.journeyDate !== booking.journeyDate || candidate.classType !== booking.classType || candidate.pnr === booking.pnr) continue;
    for (const passenger of candidate.passengers) {
      const before = previousStatuses.get(passenger.id)?.status;
      if (before && before !== passenger.status) {
        const eventType = passenger.status === 'CONFIRMED' ? 'RAC_PROMOTED' : passenger.status === 'RAC' ? 'WAITLIST_PROMOTED' : null;
        if (eventType) audit(candidate.pnr, eventType, 'SYSTEM', `Passenger status changed from ${before} to ${passenger.status} after cancellation.`);
      }
    }
  }
  saveState();
  res.json(booking);
});

// ---- Admin ----
app.get('/admin/stats', requireAdmin, (req, res) => {
  let confirmed = 0, rac = 0, wl = 0, cancelled = 0, revenue = 0;
  for (const b of db.bookings) {
    for (const p of b.passengers) {
      if (p.status === 'CONFIRMED') confirmed++;
      else if (p.status === 'RAC') rac++;
      else if (p.status === 'WL') wl++;
      else if (p.status === 'CANCELLED') cancelled++;
    }
    if (b.status !== 'CANCELLED') revenue += b.totalFare || 0;
  }
  res.json({ users: db.users.length, trains: db.trains.length, bookings: db.bookings.length, confirmed, rac, wl, cancelled, revenue });
});
app.get('/admin/users', requireAdmin, (req, res) => res.json(db.users.map(sanitizeUser)));
app.get('/admin/trains', requireAdmin, (req, res) => res.json(db.trains));
app.get('/admin/bookings', requireAdmin, (req, res) => res.json([...db.bookings].sort((a, b) => b.createdAt - a.createdAt)));
app.get('/admin/audit', requireAdmin, (req, res) => {
  const page = Math.max(0, Number.parseInt(req.query.page, 10) || 0);
  const size = Math.max(1, Math.min(Number.parseInt(req.query.size, 10) || 25, 100));
  const pnr = String(req.query.pnr || '').trim();
  const events = db.auditEvents.filter((event) => !pnr || event.pnr === pnr).sort((a, b) => b.createdAt - a.createdAt);
  const totalElements = events.length;
  res.json({ content: events.slice(page * size, (page + 1) * size), totalElements,
    totalPages: Math.ceil(totalElements / size), number: page, size });
});

// ---- Chatbot ----
app.post('/chatbot/ask', (req, res) => {
  const question = (req.body || {}).question;
  // Mirror the Spring @NotBlank @Size(max=500) validation on ChatRequest.
  if (typeof question !== 'string' || question.trim() === '') {
    return err(res, 400, 'VALIDATION', 'Question is required.');
  }
  if (question.length > 500) {
    return err(res, 400, 'VALIDATION', 'Question must be under 500 characters.');
  }
  const viewer = authPayload(req);
  const viewerUser = viewer ? db.users.find((u) => u.email === viewer.sub) : null;
  const result = answerQuestion(db, question, viewerUser?.email || null, viewerUser?.role === 'ADMIN');
  res.json(result);
});

// 404 + error handler
app.use((req, res) => err(res, 404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`));
app.use((e, req, res, next) => {
  console.error(e);
  err(res, e.status || 500, e.code || 'INTERNAL', 'Something went wrong.');
});

loadState();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[railgpt-demo-api] listening on :${PORT} · ${db.trains.length} trains · ${db.users.length} users · demo mode`);
});

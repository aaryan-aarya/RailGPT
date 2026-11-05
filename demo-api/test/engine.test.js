import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  book, cancelBooking, inventoryFor, rebalance, berthForSeat, coachForSeat,
  aggregateStatus, _resetPaxSeq,
} from '../src/engine.js';

function makeTrain(overrides = {}) {
  return {
    trainNumber: '12951',
    trainName: 'Mumbai Rajdhani',
    source: 'Mumbai Central',
    destination: 'New Delhi',
    classes: [
      { classType: 'SL', totalSeats: 4, fare: 500, racLimit: 2, waitingLimit: 2 },
    ],
    ...overrides,
  };
}

function makeDb() {
  _resetPaxSeq();
  return { seq: { booking: 1 }, bookings: [] };
}

const pax = (name, age = 30, gender = 'M') => ({ name, age, gender });
const DATE = '2026-12-01';

function bookN(db, train, n, userEmail = 'a@b.com') {
  return book(db, train, {
    userEmail, journeyDate: DATE, classType: 'SL',
    passengers: Array.from({ length: n }, (_, i) => pax(`P${i + 1}`)),
  });
}

test('confirmed allocation uses lowest free seats and correct berth/coach', () => {
  const db = makeDb(); const train = makeTrain();
  const b = bookN(db, train, 4);
  assert.equal(b.status, 'CONFIRMED');
  assert.deepEqual(b.passengers.map((p) => p.seatNumber), [1, 2, 3, 4]);
  assert.deepEqual(b.passengers.map((p) => p.berthType), ['LB', 'MB', 'UB', 'LB']);
  assert.ok(b.passengers.every((p) => p.coachNumber === 'S1'));
});

test('overflow goes to RAC then WL with correct queue numbers', () => {
  const db = makeDb(); const train = makeTrain();
  bookN(db, train, 4); // fills 4 confirmed
  const rac = bookN(db, train, 2, 'rac@b.com'); // 2 RAC
  assert.equal(rac.status, 'RAC');
  assert.deepEqual(rac.passengers.map((p) => p.racNumber), [1, 2]);
  const wl = bookN(db, train, 2, 'wl@b.com'); // 2 WL
  assert.equal(wl.status, 'WL');
  assert.deepEqual(wl.passengers.map((p) => p.waitingNumber), [1, 2]);
});

test('booking beyond total capacity is rejected (no oversell)', () => {
  const db = makeDb(); const train = makeTrain();
  bookN(db, train, 4);
  bookN(db, train, 2, 'r@b.com');
  bookN(db, train, 2, 'w@b.com');
  assert.throws(() => bookN(db, train, 1, 'x@b.com'), /fully booked|capacity/i);
});

test('BUG B1 FIX: cancelling then rebooking reuses the freed seat, no duplicates', () => {
  const db = makeDb(); const train = makeTrain();
  const b = bookN(db, train, 4); // seats 1..4
  // Cancel the whole booking then rebook 1 -> should get seat 1 (lowest free).
  cancelBooking(db, train, b);
  const again = bookN(db, train, 1, 'new@b.com');
  assert.equal(again.passengers[0].seatNumber, 1);
  const inv = inventoryFor(db, train, DATE, 'SL');
  assert.equal(inv.confirmedCount, 1);
  assert.equal(inv.availableSeats, 3);
});

test('BUG B2/B3 FIX: cancelling CONFIRMED promotes RAC1 into the freed seat', () => {
  const db = makeDb(); const train = makeTrain();
  const confirmed = bookN(db, train, 4); // seats 1..4
  const rac = bookN(db, train, 1, 'rac@b.com'); // RAC1
  assert.equal(rac.passengers[0].status, 'RAC');
  cancelBooking(db, train, confirmed); // releases 4 seats
  // RAC passenger should now be CONFIRMED with a real seat.
  assert.equal(rac.passengers[0].status, 'CONFIRMED');
  assert.ok(rac.passengers[0].seatNumber >= 1);
  assert.equal(rac.passengers[0].racNumber, null);
  const inv = inventoryFor(db, train, DATE, 'SL');
  assert.equal(inv.confirmedCount, 1);
});

test('BUG B3 FIX: cancelling a WL ticket never promotes anyone to CONFIRMED', () => {
  const db = makeDb(); const train = makeTrain();
  bookN(db, train, 4); // full confirmed
  const rac = bookN(db, train, 2, 'rac@b.com');
  const wl = bookN(db, train, 2, 'wl@b.com');
  cancelBooking(db, train, wl); // cancel WL only
  // RAC must remain RAC; no confirmed capacity was released.
  assert.ok(rac.passengers.every((p) => p.status === 'RAC'));
  const inv = inventoryFor(db, train, DATE, 'SL');
  assert.equal(inv.confirmedCount, 4);
  assert.equal(inv.availableSeats, 0);
});

test('BUG B4 FIX: cancelling RAC does not create phantom confirmed inventory', () => {
  const db = makeDb(); const train = makeTrain();
  bookN(db, train, 4);
  const rac = bookN(db, train, 2, 'rac@b.com');
  cancelBooking(db, train, rac);
  const inv = inventoryFor(db, train, DATE, 'SL');
  assert.equal(inv.availableSeats, 0); // still full, no phantom seats
  assert.equal(inv.confirmedCount, 4);
  assert.equal(inv.racCount, 0);
});

test('WL -> RAC backfill when a RAC passenger cancels', () => {
  const db = makeDb(); const train = makeTrain();
  bookN(db, train, 4);
  const rac = bookN(db, train, 2, 'rac@b.com');
  const wl = bookN(db, train, 2, 'wl@b.com');
  cancelBooking(db, train, rac); // both RAC cancel -> 2 WL should become RAC
  assert.ok(wl.passengers.every((p) => p.status === 'RAC'));
  assert.deepEqual(wl.passengers.map((p) => p.racNumber), [1, 2]);
});

test('rebalance is idempotent', () => {
  const db = makeDb(); const train = makeTrain();
  bookN(db, train, 4);
  const rac = bookN(db, train, 2, 'r@b.com');
  bookN(db, train, 2, 'w@b.com');
  const before = JSON.stringify(db.bookings.map((b) => b.passengers.map((p) => [p.status, p.racNumber, p.waitingNumber])));
  rebalance(db, train, DATE, 'SL');
  rebalance(db, train, DATE, 'SL');
  const after = JSON.stringify(db.bookings.map((b) => b.passengers.map((p) => [p.status, p.racNumber, p.waitingNumber])));
  assert.equal(before, after);
  assert.equal(rac.passengers[0].status, 'RAC');
});

test('multi-passenger booking splits across CONFIRMED and RAC correctly', () => {
  const db = makeDb(); const train = makeTrain();
  bookN(db, train, 3); // 3 confirmed, 1 seat left
  const mixed = book(db, train, {
    userEmail: 'm@b.com', journeyDate: DATE, classType: 'SL',
    passengers: [pax('A'), pax('B'), pax('C')], // 1 confirmed + 2 RAC
  });
  const statuses = mixed.passengers.map((p) => p.status);
  assert.deepEqual(statuses, ['CONFIRMED', 'RAC', 'RAC']);
  assert.equal(mixed.status, 'PARTIAL');
});

test('per-date inventory is isolated', () => {
  const db = makeDb(); const train = makeTrain();
  bookN(db, train, 4); // fills DATE
  const other = book(db, train, {
    userEmail: 'x@b.com', journeyDate: '2026-12-02', classType: 'SL',
    passengers: [pax('NextDay')],
  });
  assert.equal(other.passengers[0].status, 'CONFIRMED');
  assert.equal(other.passengers[0].seatNumber, 1);
});

test('per-class inventory is isolated', () => {
  const db = makeDb();
  const train = makeTrain({
    classes: [
      { classType: 'SL', totalSeats: 2, fare: 500, racLimit: 1, waitingLimit: 1 },
      { classType: '3A', totalSeats: 2, fare: 1500, racLimit: 1, waitingLimit: 1 },
    ],
  });
  bookN(db, train, 2); // fill SL
  const ac = book(db, train, {
    userEmail: 'ac@b.com', journeyDate: DATE, classType: '3A', passengers: [pax('AC')],
  });
  assert.equal(ac.passengers[0].status, 'CONFIRMED');
  assert.equal(ac.passengers[0].coachNumber, 'B1');
});

test('fare totals sum across passengers', () => {
  const db = makeDb(); const train = makeTrain();
  const b = bookN(db, train, 3);
  assert.equal(b.totalFare, 1500);
});

test('PNR is 10 digits and unique', () => {
  const db = makeDb(); const train = makeTrain({ classes: [{ classType: 'SL', totalSeats: 100, fare: 100, racLimit: 10, waitingLimit: 10 }] });
  const pnrs = new Set();
  for (let i = 0; i < 20; i += 1) {
    const b = bookN(db, train, 1, `u${i}@b.com`);
    assert.match(b.pnr, /^\d{10}$/);
    assert.ok(!pnrs.has(b.pnr));
    pnrs.add(b.pnr);
  }
});

test('berth/coach math matches Indian Railways sleeper layout', () => {
  assert.equal(berthForSeat('SL', 1), 'LB');
  assert.equal(berthForSeat('SL', 7), 'SL');
  assert.equal(berthForSeat('SL', 8), 'SU');
  assert.equal(coachForSeat('SL', 72), 'S1');
  assert.equal(coachForSeat('SL', 73), 'S2');
  assert.equal(coachForSeat('3A', 1), 'B1');
});

test('aggregate status logic', () => {
  assert.equal(aggregateStatus([{ status: 'CONFIRMED' }, { status: 'CONFIRMED' }]), 'CONFIRMED');
  assert.equal(aggregateStatus([{ status: 'CONFIRMED' }, { status: 'RAC' }]), 'PARTIAL');
  assert.equal(aggregateStatus([{ status: 'RAC' }]), 'RAC');
  assert.equal(aggregateStatus([{ status: 'WL' }]), 'WL');
  assert.equal(aggregateStatus([{ status: 'CANCELLED' }]), 'CANCELLED');
});

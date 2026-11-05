/**
 * RailGPT reservation engine (reference implementation).
 *
 * This module is the single source of truth for allocation / RAC / waiting-list /
 * cancellation semantics. It is deliberately written as pure functions over a plain
 * state object so it can be unit-tested here and ported 1:1 to the Spring Boot
 * service layer.
 *
 * Correctness guarantees (fixes for the bugs found in the audit):
 *  - Inventory is DERIVED from passenger rows, never a drifting counter.
 *  - Seats are allocated as the lowest free berth (no duplicates after cancellation).
 *  - Promotion only happens when a CONFIRMED seat is actually released.
 *  - Cancelling a RAC/WL passenger never fabricates confirmed capacity.
 *  - rebalance() is idempotent and restores queue ordering after any mutation.
 */

export const CLASS_DEFS = {
  SL: { label: 'Sleeper', berthsPerCoach: 72, coachPrefix: 'S', pattern: ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'] },
  '3A': { label: 'AC 3 Tier', berthsPerCoach: 72, coachPrefix: 'B', pattern: ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'] },
  '2A': { label: 'AC 2 Tier', berthsPerCoach: 54, coachPrefix: 'A', pattern: ['LB', 'UB', 'LB', 'UB', 'SL', 'SU'] },
  '1A': { label: 'AC First Class', berthsPerCoach: 24, coachPrefix: 'H', pattern: ['LB', 'UB', 'LB', 'UB'] },
  CC: { label: 'Chair Car', berthsPerCoach: 78, coachPrefix: 'C', pattern: ['WINDOW', 'MIDDLE', 'AISLE', 'AISLE', 'WINDOW'] },
  EC: { label: 'Executive Chair', berthsPerCoach: 56, coachPrefix: 'E', pattern: ['WINDOW', 'AISLE', 'AISLE', 'WINDOW'] },
  '2S': { label: 'Second Sitting', berthsPerCoach: 108, coachPrefix: 'D', pattern: ['WINDOW', 'MIDDLE', 'AISLE', 'AISLE', 'MIDDLE', 'WINDOW'] },
};

export const BERTH_LABELS = {
  LB: 'Lower', MB: 'Middle', UB: 'Upper', SL: 'Side Lower', SU: 'Side Upper',
  WINDOW: 'Window', MIDDLE: 'Middle', AISLE: 'Aisle',
};

export function classDef(classType) {
  return CLASS_DEFS[classType] || CLASS_DEFS.SL;
}

export function berthForSeat(classType, seatNumber) {
  const def = classDef(classType);
  return def.pattern[(seatNumber - 1) % def.pattern.length];
}

export function coachForSeat(classType, seatNumber) {
  const def = classDef(classType);
  const coachNo = Math.floor((seatNumber - 1) / def.berthsPerCoach) + 1;
  return `${def.coachPrefix}${coachNo}`;
}

/** All passengers across all bookings for a given train/date/class. */
export function passengersFor(db, trainNumber, journeyDate, classType) {
  const out = [];
  for (const b of db.bookings) {
    if (b.trainNumber !== trainNumber) continue;
    if (b.journeyDate !== journeyDate) continue;
    if (b.classType !== classType) continue;
    for (const p of b.passengers) out.push({ booking: b, pax: p });
  }
  return out;
}

export function inventoryFor(db, train, journeyDate, classType) {
  const cls = (train.classes || []).find((c) => c.classType === classType) || {
    classType, totalSeats: 100, fare: 0, racLimit: 20, waitingLimit: 40,
  };
  const rows = passengersFor(db, train.trainNumber, journeyDate, classType);
  const confirmed = rows.filter((r) => r.pax.status === 'CONFIRMED');
  const rac = rows.filter((r) => r.pax.status === 'RAC');
  const wl = rows.filter((r) => r.pax.status === 'WL');
  const availableSeats = Math.max(0, cls.totalSeats - confirmed.length);
  return {
    classType,
    totalSeats: cls.totalSeats,
    fare: cls.fare,
    racLimit: cls.racLimit,
    waitingLimit: cls.waitingLimit,
    confirmedCount: confirmed.length,
    availableSeats,
    racCount: rac.length,
    waitingCount: wl.length,
    racAvailable: Math.max(0, cls.racLimit - rac.length),
    waitingAvailable: Math.max(0, cls.waitingLimit - wl.length),
  };
}

function lowestFreeSeat(db, trainNumber, journeyDate, classType, totalSeats) {
  const taken = new Set(
    passengersFor(db, trainNumber, journeyDate, classType)
      .filter((r) => r.pax.status === 'CONFIRMED' && r.pax.seatNumber)
      .map((r) => r.pax.seatNumber),
  );
  for (let s = 1; s <= totalSeats; s += 1) if (!taken.has(s)) return s;
  return null;
}

function allocateSeat(db, trainNumber, journeyDate, classType, pax, totalSeats) {
  const seat = lowestFreeSeat(db, trainNumber, journeyDate, classType, totalSeats);
  if (seat == null) return false;
  pax.status = 'CONFIRMED';
  pax.seatNumber = seat;
  pax.berthType = berthForSeat(classType, seat);
  pax.coachNumber = coachForSeat(classType, seat);
  pax.racNumber = null;
  pax.waitingNumber = null;
  return true;
}

/**
 * Idempotent queue rebalance. Promotes RAC -> CONFIRMED while seats are free,
 * then WL -> RAC while RAC slots are free, then renumbers both queues.
 */
export function rebalance(db, train, journeyDate, classType) {
  const cls = (train.classes || []).find((c) => c.classType === classType);
  if (!cls) return;
  const rows = passengersFor(db, train.trainNumber, journeyDate, classType);

  // Promote RAC -> CONFIRMED while capacity exists.
  let available = cls.totalSeats - rows.filter((r) => r.pax.status === 'CONFIRMED').length;
  const racQueue = rows
    .filter((r) => r.pax.status === 'RAC')
    .sort((a, b) => (a.pax.racNumber || 0) - (b.pax.racNumber || 0));
  for (const r of racQueue) {
    if (available <= 0) break;
    if (allocateSeat(db, train.trainNumber, journeyDate, classType, r.pax, cls.totalSeats)) {
      available -= 1;
    }
  }

  // Promote WL -> RAC while RAC slots exist.
  const racCountNow = passengersFor(db, train.trainNumber, journeyDate, classType)
    .filter((r) => r.pax.status === 'RAC').length;
  let racSlots = cls.racLimit - racCountNow;
  const wlQueue = rows
    .filter((r) => r.pax.status === 'WL')
    .sort((a, b) => (a.pax.waitingNumber || 0) - (b.pax.waitingNumber || 0));
  for (const r of wlQueue) {
    if (racSlots <= 0) break;
    r.pax.status = 'RAC';
    r.pax.racNumber = 0; // renumbered below
    r.pax.waitingNumber = null;
    r.pax.seatNumber = null;
    r.pax.coachNumber = null;
    r.pax.berthType = 'RAC';
    racSlots -= 1;
  }

  // Renumber RAC and WL queues deterministically by booking time then position.
  const byCreated = (a, b) => (a.booking.createdAt - b.booking.createdAt) || (a.pax.id - b.pax.id);
  passengersFor(db, train.trainNumber, journeyDate, classType)
    .filter((r) => r.pax.status === 'RAC').sort(byCreated)
    .forEach((r, i) => { r.pax.racNumber = i + 1; r.pax.berthType = 'RAC'; });
  passengersFor(db, train.trainNumber, journeyDate, classType)
    .filter((r) => r.pax.status === 'WL').sort(byCreated)
    .forEach((r, i) => { r.pax.waitingNumber = i + 1; r.pax.berthType = 'WL'; });

  // Refresh the aggregate status of every booking touched by this rebalance so a
  // promoted booking no longer reports a stale RAC/WL status (mirrors the Spring
  // BookingService.refreshBookingStatuses fix).
  const touched = new Set(passengersFor(db, train.trainNumber, journeyDate, classType).map((r) => r.booking));
  for (const b of touched) {
    b.status = aggregateStatus(b.passengers);
  }
}

let paxSeq = 1;
export function _resetPaxSeq() { paxSeq = 1; }
export function _setPaxSeq(n) { paxSeq = n; }

/**
 * Book passengers. Returns { booking } or throws { status, code, message }.
 * Allocation is atomic from the caller's perspective (single-threaded JS here;
 * the Spring port wraps the equivalent in @Transactional + a train row lock).
 */
export function book(db, train, { userEmail, journeyDate, classType, passengers, boarding, reservation }) {
  const cls = (train.classes || []).find((c) => c.classType === classType);
  if (!cls) throw httpError(400, 'CLASS_NOT_FOUND', `Class ${classType} is not offered on this train.`);
  if (!passengers || passengers.length === 0) throw httpError(400, 'NO_PASSENGERS', 'At least one passenger is required.');
  if (passengers.length > 6) throw httpError(400, 'TOO_MANY_PASSENGERS', 'A maximum of 6 passengers is allowed per booking.');

  const inv = inventoryFor(db, train, journeyDate, classType);
  const totalCapacity = inv.availableSeats + inv.racAvailable + inv.waitingAvailable;
  if (passengers.length > totalCapacity) {
    throw httpError(409, 'TRAIN_FULL', 'Not enough seats/RAC/waiting-list capacity for this booking.');
  }

  const createdAt = Date.now();
  const booking = {
    id: db.seq.booking++,
    pnr: generatePnr(db),
    trainNumber: train.trainNumber,
    trainName: train.trainName,
    userEmail,
    journeyDate,
    classType,
    boarding: boarding || train.source,
    reservation: reservation || train.destination,
    source: train.source,
    destination: train.destination,
    status: 'CONFIRMED',
    totalFare: 0,
    createdAt,
    cancelledAt: null,
    passengers: [],
  };

  // Register the booking once (by reference) so inventory derivation sees each
  // passenger as it is allocated within this same booking.
  db.bookings.push(booking);

  for (const input of passengers) {
    const pax = {
      id: paxSeq++,
      name: input.name,
      age: input.age,
      gender: input.gender,
      berthPreference: input.berthPreference || null,
      status: 'WL',
      seatNumber: null,
      coachNumber: null,
      berthType: null,
      racNumber: null,
      waitingNumber: null,
    };

    const current = inventoryFor(db, train, journeyDate, classType);
    if (current.availableSeats > 0) {
      allocateSeat(db, train.trainNumber, journeyDate, classType, pax, cls.totalSeats);
    } else if (current.racAvailable > 0) {
      pax.status = 'RAC';
      pax.racNumber = current.racCount + 1;
      pax.berthType = 'RAC';
    } else if (current.waitingAvailable > 0) {
      pax.status = 'WL';
      pax.waitingNumber = current.waitingCount + 1;
      pax.berthType = 'WL';
    } else {
      // Unreachable given the capacity pre-check, but roll back defensively.
      db.bookings = db.bookings.filter((b) => b !== booking);
      throw httpError(409, 'TRAIN_FULL', 'Train is fully booked for this class and date.');
    }

    booking.passengers.push(pax);
  }

  booking.totalFare = booking.passengers.reduce((sum, p) => sum + fareFor(cls, p.age), 0);
  booking.status = aggregateStatus(booking.passengers);
  rebalance(db, train, journeyDate, classType);
  booking.status = aggregateStatus(booking.passengers);
  return booking;
}

export function fareFor(cls) {
  // Published class fare. Age is captured for the record; no fabricated discounts.
  return cls.fare;
}

export function aggregateStatus(passengers) {
  const active = passengers.filter((p) => p.status !== 'CANCELLED');
  if (active.length === 0) return 'CANCELLED';
  if (active.every((p) => p.status === 'CONFIRMED')) return 'CONFIRMED';
  if (active.some((p) => p.status === 'CONFIRMED')) return 'PARTIAL';
  if (active.some((p) => p.status === 'RAC')) return 'RAC';
  return 'WL';
}

export function cancelBooking(db, train, booking) {
  if (booking.status === 'CANCELLED') return booking;
  for (const pax of booking.passengers) {
    if (pax.status === 'CANCELLED') continue;
    pax.status = 'CANCELLED';
    pax.seatNumber = null;
    pax.coachNumber = null;
    pax.berthType = null;
    pax.racNumber = null;
    pax.waitingNumber = null;
  }
  booking.status = 'CANCELLED';
  booking.cancelledAt = Date.now();
  rebalance(db, train, booking.journeyDate, booking.classType);
  return booking;
}

export function generatePnr(db) {
  // 10-digit numeric PNR, collision-checked.
  for (let i = 0; i < 50; i += 1) {
    let pnr = '';
    pnr += String(2 + Math.floor(Math.random() * 8)); // leading digit 2-9
    for (let j = 0; j < 9; j += 1) pnr += String(Math.floor(Math.random() * 10));
    if (!db.bookings.some((b) => b.pnr === pnr)) return pnr;
  }
  throw httpError(500, 'PNR_GENERATION_FAILED', 'Could not generate a unique PNR.');
}

export function httpError(status, code, message) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

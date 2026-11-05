/**
 * RailGPT Travel Assistant — rule-based reference implementation.
 *
 * This mirrors the Spring Boot ChatbotService. It is intentionally NOT an LLM.
 * It answers from the live demo catalog and booking state, and it masks personal
 * data for anyone who is not the booking owner / an admin.
 */
import { inventoryFor, CLASS_DEFS } from './engine.js';

function maskName(name) {
  if (!name) return '••••';
  return name.split(/\s+/).map((w) => (w.length <= 1 ? '•' : w[0] + '•'.repeat(Math.max(2, w.length - 1)))).join(' ');
}

export function answerQuestion(db, question, viewerEmail, isAdmin) {
  const raw = String(question || '').trim();
  if (!raw) return { answer: 'Please type a question about trains, PNR status, RAC, waiting list or fares.', suggestions: defaultSuggestions() };
  if (raw.length > 500) return { answer: 'That question is a bit long. Please keep it under 500 characters.', suggestions: defaultSuggestions() };
  const q = raw.toLowerCase();

  // RAC / WL / Tatkal FAQs
  if (q.includes('rac')) {
    return { answer: 'RAC (Reservation Against Cancellation) means you can board the train and share a berth. When confirmed passengers cancel, RAC passengers are promoted to full confirmed berths in queue order.', suggestions: ['What is waiting list?', 'Check my PNR status'] };
  }
  if (q.includes('waiting') || /\bwl\b/.test(q)) {
    return { answer: 'A Waiting List (WL) ticket is not yet confirmed. It moves up as RAC and confirmed passengers cancel. You can track the exact position with your PNR.', suggestions: ['What is RAC?', 'Check my PNR status'] };
  }
  if (q.includes('tatkal')) {
    return { answer: 'Tatkal is a short-notice booking quota that opens one day before the journey. This demo environment does not process live Tatkal bookings.', suggestions: ['Search trains', 'What is RAC?'] };
  }
  if (q.includes('refund') || q.includes('cancel')) {
    return { answer: 'You can cancel a booking from “My Trips”. Confirmed, RAC and waiting-list tickets are released back to the pool and the next passengers in queue are promoted automatically. No payment is processed in this demo.', suggestions: ['How do I check my PNR?', 'What is RAC?'] };
  }

  // PNR status
  if (q.includes('pnr')) {
    const token = raw.split(/\s+/).map((w) => w.replace(/[^0-9]/g, '')).find((w) => /^\d{10}$/.test(w));
    if (!token) return { answer: 'Please share a 10-digit PNR, for example: “PNR 2456789012”.', suggestions: defaultSuggestions() };
    const booking = db.bookings.find((b) => b.pnr === token);
    if (!booking) return { answer: `I couldn't find PNR ${token}. Please double-check the number.`, suggestions: defaultSuggestions() };
    const canSee = isAdmin || (viewerEmail && booking.userEmail === viewerEmail);
    const paxLines = booking.passengers.map((p) => {
      const name = canSee ? p.name : maskName(p.name);
      const detail = p.status === 'CONFIRMED' ? `${p.coachNumber}/${p.seatNumber} (${p.berthType})`
        : p.status === 'RAC' ? `RAC ${p.racNumber}`
        : p.status === 'WL' ? `WL ${p.waitingNumber}` : 'Cancelled';
      return `${name}: ${p.status} — ${detail}`;
    }).join('\n');
    return { answer: `PNR ${booking.pnr} · ${booking.trainName} (${booking.trainNumber}) · ${booking.journeyDate}\n${paxLines}`, suggestions: ['What is RAC?', 'Show my bookings'] };
  }

  // My bookings
  if (q.includes('my booking') || q.includes('show my booking') || (q.includes('booking') && viewerEmail)) {
    if (!viewerEmail) return { answer: 'Please sign in to see your bookings, or check a specific PNR.', suggestions: ['Check PNR status'] };
    const mine = db.bookings.filter((b) => b.userEmail === viewerEmail);
    if (mine.length === 0) return { answer: 'You have no bookings yet. Search for a train to make your first booking.', suggestions: ['Search trains'] };
    const lines = mine.slice(0, 5).map((b) => `${b.pnr} · ${b.trainName} · ${b.journeyDate} · ${b.status}`).join('\n');
    return { answer: `You have ${mine.length} booking(s):\n${lines}`, suggestions: ['Check PNR status'] };
  }

  // Seat availability / train info by number
  const numberToken = raw.split(/\s+/).find((w) => /^\d{4,5}$/.test(w));
  if (numberToken && (q.includes('train') || q.includes('seat') || q.includes('available'))) {
    const train = db.trains.find((t) => t.trainNumber === numberToken);
    if (!train) return { answer: `I couldn't find train ${numberToken} in the demo catalog.`, suggestions: ['Show all trains'] };
    const today = new Date().toISOString().slice(0, 10);
    const lines = train.classes.map((c) => {
      const inv = inventoryFor(db, train, today, c.classType);
      return `${CLASS_DEFS[c.classType]?.label || c.classType}: ${inv.availableSeats} available · RAC ${inv.racCount}/${c.racLimit} · WL ${inv.waitingCount}/${c.waitingLimit}`;
    }).join('\n');
    return { answer: `${train.trainName} (${train.trainNumber}) · ${train.source} → ${train.destination}\nAvailability for ${today}:\n${lines}`, suggestions: ['Book a ticket', 'What is RAC?'] };
  }

  // Recommend
  if (q.includes('recommend') || q.includes('suggest')) {
    const today = new Date().toISOString().slice(0, 10);
    const ranked = db.trains.map((t) => {
      const best = Math.max(...t.classes.map((c) => inventoryFor(db, t, today, c.classType).availableSeats));
      return { t, best };
    }).sort((a, b) => b.best - a.best).slice(0, 3);
    const lines = ranked.map(({ t, best }) => `${t.trainNumber} ${t.trainName} (${t.source} → ${t.destination}) — ${best} seats`).join('\n');
    return { answer: `Here are trains with the most availability today:\n${lines}`, suggestions: ['Search trains'] };
  }

  // List trains / find trains between stations
  if (q.includes('find train') || q.includes('all train') || q.includes('list train') || q.includes('show train')) {
    const lines = db.trains.slice(0, 12).map((t) => `${t.trainNumber} ${t.trainName} — ${t.source} → ${t.destination}`).join('\n');
    return { answer: `Demo catalog (${db.trains.length} trains):\n${lines}`, suggestions: ['Search trains', 'Recommend a train'] };
  }

  // Fare / class info
  if (q.includes('fare') || q.includes('price') || q.includes('cost') || q.includes('class')) {
    return { answer: 'Fares depend on the train and class (Sleeper, AC 3-Tier, AC 2-Tier, First AC, Chair Car). Open any train to see class-wise fares and live availability. Fares shown are indicative demo values.', suggestions: ['Search trains', 'What classes are available?'] };
  }
  if (q.includes('classes') || q.includes('coach')) {
    const list = Object.entries(CLASS_DEFS).map(([code, d]) => `${code} — ${d.label}`).join('\n');
    return { answer: `Classes supported:\n${list}`, suggestions: ['Search trains'] };
  }

  return {
    answer: 'I can help with train search, seat availability, PNR status, RAC / waiting-list explanations, fares and cancellations. Try one of the suggestions below.',
    suggestions: defaultSuggestions(),
  };
}

function defaultSuggestions() {
  return ['What is RAC?', 'What is waiting list?', 'Check PNR status', 'Recommend a train'];
}

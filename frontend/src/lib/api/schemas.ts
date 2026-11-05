import { z } from 'zod';

/**
 * Zod schemas are the single source of truth for the RailGPT API contract.
 * They mirror the hardened Spring Boot backend (and the demo API) exactly and
 * give us end-to-end TypeScript types + runtime validation of every response.
 */

export const RoleSchema = z.enum(['USER', 'ADMIN']);
export type Role = z.infer<typeof RoleSchema>;

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: RoleSchema,
  phone: z.string().nullable().optional(),
  createdAt: z.number().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  expiresIn: z.number(),
  user: UserSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const StationSchema = z.object({
  code: z.string(),
  name: z.string(),
  city: z.string(),
  state: z.string(),
});
export type Station = z.infer<typeof StationSchema>;

export const TrainClassSchema = z.object({
  classType: z.string(),
  totalSeats: z.number(),
  fare: z.number(),
  racLimit: z.number(),
  waitingLimit: z.number(),
});
export type TrainClass = z.infer<typeof TrainClassSchema>;

export const AvailabilityStatusSchema = z.enum(['AVAILABLE', 'RAC', 'WL', 'FULL']);
export type AvailabilityStatus = z.infer<typeof AvailabilityStatusSchema>;

export const ClassAvailabilitySchema = TrainClassSchema.extend({
  confirmedCount: z.number(),
  availableSeats: z.number(),
  racCount: z.number(),
  waitingCount: z.number(),
  racAvailable: z.number(),
  waitingAvailable: z.number(),
  status: AvailabilityStatusSchema,
});
export type ClassAvailability = z.infer<typeof ClassAvailabilitySchema>;

export const TrainSchema = z.object({
  id: z.number(),
  trainNumber: z.string(),
  trainName: z.string(),
  source: z.string(),
  destination: z.string(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  durationMinutes: z.number().optional(),
  distanceKm: z.number().optional(),
  trainType: z.string().optional(),
  daysOfRun: z.array(z.string()).optional(),
  classes: z.array(TrainClassSchema),
  availability: z.record(z.string(), ClassAvailabilitySchema).optional(),
});
export type Train = z.infer<typeof TrainSchema>;

export const PaxStatusSchema = z.enum(['CONFIRMED', 'RAC', 'WL', 'CANCELLED']);
export type PaxStatus = z.infer<typeof PaxStatusSchema>;

export const BookingStatusSchema = z.enum(['CONFIRMED', 'RAC', 'WL', 'CANCELLED', 'PARTIAL']);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const PassengerSchema = z.object({
  id: z.number(),
  name: z.string(),
  age: z.number(),
  gender: z.string(),
  berthPreference: z.string().nullable().optional(),
  status: PaxStatusSchema,
  seatNumber: z.number().nullable(),
  coachNumber: z.string().nullable(),
  berthType: z.string().nullable(),
  racNumber: z.number().nullable(),
  waitingNumber: z.number().nullable(),
});
export type Passenger = z.infer<typeof PassengerSchema>;

export const BookingSchema = z.object({
  id: z.number(),
  pnr: z.string(),
  trainNumber: z.string(),
  trainName: z.string(),
  userEmail: z.string().optional(),
  journeyDate: z.string(),
  classType: z.string(),
  boarding: z.string().optional(),
  reservation: z.string().optional(),
  source: z.string(),
  destination: z.string(),
  status: BookingStatusSchema,
  totalFare: z.number(),
  createdAt: z.number(),
  cancelledAt: z.number().nullable(),
  passengers: z.array(PassengerSchema),
});
export type Booking = z.infer<typeof BookingSchema>;

export const ChatResponseSchema = z.object({
  answer: z.string(),
  suggestions: z.array(z.string()).optional(),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const AdminStatsSchema = z.object({
  users: z.number(),
  trains: z.number(),
  bookings: z.number(),
  confirmed: z.number(),
  rac: z.number(),
  wl: z.number(),
  cancelled: z.number(),
  revenue: z.number(),
});
export type AdminStats = z.infer<typeof AdminStatsSchema>;

export const MetaSchema = z.object({
  mode: z.string(),
  name: z.string(),
  version: z.string(),
  disclaimer: z.string().optional(),
  stations: z.number().optional(),
  trains: z.number().optional(),
});
export type Meta = z.infer<typeof MetaSchema>;

// ---- Request payloads ----
export const PassengerInputSchema = z.object({
  name: z.string().min(2, 'Enter the passenger’s full name'),
  age: z.coerce.number().int('Age must be a whole number').min(1, 'Age must be at least 1').max(120, 'Age must be 120 or under'),
  gender: z.enum(['M', 'F', 'O'], { message: 'Select a gender' }),
  berthPreference: z.string().optional(),
});
export type PassengerInput = z.infer<typeof PassengerInputSchema>;

export const BookingRequestSchema = z.object({
  trainNumber: z.string(),
  journeyDate: z.string(),
  classType: z.string(),
  passengers: z.array(PassengerInputSchema).min(1, 'Add at least one passenger').max(6, 'Up to 6 passengers per booking'),
});
export type BookingRequest = z.infer<typeof BookingRequestSchema>;

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

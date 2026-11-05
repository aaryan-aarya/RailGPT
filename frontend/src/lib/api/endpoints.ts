import { apiFetch } from './client';
import {
  AuthResponseSchema, UserSchema, TrainSchema, BookingSchema, ChatResponseSchema,
  AdminStatsSchema, StationSchema, MetaSchema,
  type AuthResponse, type User, type Train, type Booking, type ChatResponse,
  type AdminStats, type Station, type Meta, type BookingRequest,
} from './schemas';
import { z } from 'zod';

// ---- Meta ----
export const getMeta = () => apiFetch<Meta>('/meta', { schema: MetaSchema });

// ---- Auth ----
export const login = (email: string, password: string) =>
  apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: { email, password }, schema: AuthResponseSchema });

export const register = (input: { name: string; email: string; password: string; phone?: string }) =>
  apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: input, schema: AuthResponseSchema });

export const getMe = () =>
  apiFetch<{ user: User }>('/auth/me', { schema: z.object({ user: UserSchema }) }).then((r) => r.user);

export const logout = () => apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' });

// ---- Profile ----
export const updateProfile = (input: { name?: string; phone?: string }) =>
  apiFetch<{ user: User }>('/user/profile', { method: 'PATCH', body: input, schema: z.object({ user: UserSchema }) }).then((r) => r.user);

export const changePassword = (input: { currentPassword: string; newPassword: string }) =>
  apiFetch<{ ok: boolean }>('/user/change-password', { method: 'POST', body: input });

// ---- Stations & trains ----
export const getStations = (q?: string) =>
  apiFetch<Station[]>(`/stations${q ? `?q=${encodeURIComponent(q)}` : ''}`, { schema: z.array(StationSchema) });

export const searchTrains = (params: { source?: string; destination?: string; date?: string }) => {
  const qs = new URLSearchParams();
  if (params.source) qs.set('source', params.source);
  if (params.destination) qs.set('destination', params.destination);
  if (params.date) qs.set('date', params.date);
  return apiFetch<Train[]>(`/train/search?${qs.toString()}`, { schema: z.array(TrainSchema) });
};

export const getAllTrains = () => apiFetch<Train[]>('/train/all', { schema: z.array(TrainSchema) });

export const getTrain = (trainNumber: string, date?: string) =>
  apiFetch<Train>(`/train/${trainNumber}${date ? `?date=${date}` : ''}`, { schema: TrainSchema });

// ---- Booking ----
export const bookTicket = (input: BookingRequest) =>
  apiFetch<Booking>('/booking/book', { method: 'POST', body: input, schema: BookingSchema });

export const getPnr = (pnr: string) =>
  apiFetch<Booking>(`/booking/pnr/${pnr}`, { schema: BookingSchema });

export const getMyBookings = () =>
  apiFetch<Booking[]>('/booking/my', { schema: z.array(BookingSchema) });

export const cancelBooking = (pnr: string) =>
  apiFetch<Booking>(`/booking/cancel/${pnr}`, { method: 'DELETE', schema: BookingSchema });

// ---- Chatbot ----
export const askAssistant = (question: string) =>
  apiFetch<ChatResponse>('/chatbot/ask', { method: 'POST', body: { question }, schema: ChatResponseSchema });

// ---- Admin ----
export const getAdminStats = () => apiFetch<AdminStats>('/admin/stats', { schema: AdminStatsSchema });
export const getAdminUsers = () => apiFetch<User[]>('/admin/users', { schema: z.array(UserSchema) });
export const getAdminTrains = () => apiFetch<Train[]>('/admin/trains', { schema: z.array(TrainSchema) });
export const getAdminBookings = () => apiFetch<Booking[]>('/admin/bookings', { schema: z.array(BookingSchema) });
export const addTrain = (train: Partial<Train>) => apiFetch<Train>('/train/add', { method: 'POST', body: train, schema: TrainSchema });
export const updateTrain = (trainNumber: string, train: Partial<Train>) =>
  apiFetch<Train>(`/train/${trainNumber}`, { method: 'PUT', body: train, schema: TrainSchema });
export const deleteTrain = (trainNumber: string) =>
  apiFetch<{ ok: boolean }>(`/train/${trainNumber}`, { method: 'DELETE' });

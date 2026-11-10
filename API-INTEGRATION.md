# RailGPT — Frontend ↔ Spring Boot API Integration Matrix

Phase 2 maps every frontend feature to the production Spring Boot API. The browser
only ever calls **same-origin relative URLs** (`/api/...`); the Vite dev proxy
strips `/api` and forwards to Spring Boot on `:8081` (default). The Node demo API
(`:8090`) is an optional fallback selected with `VITE_API_TARGET` / `--demo`.

**Contract source of truth:** `frontend/src/lib/api/schemas.ts` (Zod). The backend
DTOs/entities mirror it field-for-field. Parity is enforced by:
- `frontend/src/lib/api/api.test.ts` — client/endpoint/auth-store integration (mocked fetch).
- `frontend/src/lib/api/contract.live.test.ts` — the real Zod schemas against a live backend.
- `src/test/java/.../ApiContractTest.java` — HTTP-level regression on H2 (real JWT + security).
- `PostgresIntegrationTest` — the same journey on real PostgreSQL 16 (Testcontainers).
- CI `fullstack` job — boots the real jar + PostgreSQL and runs the live contract suite.

## Authentication model
- JWT issued by `/auth/login` and `/auth/register`; returned in the body **and** an
  httpOnly `token` cookie (SameSite=Lax; `Secure` when `COOKIE_SECURE=true`).
- The frontend keeps the access token **in memory** (not localStorage) and sends
  `Authorization: Bearer <token>`; the cookie is a fallback for session restore (`/auth/me`).
- `JwtFilter` accepts Bearer header or cookie. Security is stateless; CSRF disabled
  (token-based, same-origin via proxy). 401 → `{code:"UNAUTHORIZED"}`; 403 → `{code:"FORBIDDEN"}`.
- On any 401 with a token present, the client clears the session and the router
  redirects to `/login`. Route guards (`requireAuth` / `requireAdmin`) protect pages.

## Feature → endpoint matrix

| # | Frontend feature | UI route | Endpoint(s) | Method | Auth | Response (Zod) |
|---|------------------|----------|-------------|--------|------|----------------|
| 1 | Landing / search form | `/` | `/stations`, `/train/search` | GET | public | `Station[]`, `Train[]` |
| 2 | Station picker | (component) | `/stations?q=` | GET | public | `Station[]` |
| 3 | Train search + availability | `/trains` | `/train/search?source&destination&date` | GET | public | `Train[]` (with `availability`) |
| 4 | Train detail / class select | `/trains/$n` | `/train/{n}?date` (alias `/train/seats/{n}`) | GET | public | `Train` + `availability{class→ClassAvailability}` |
| 5 | Multi-passenger booking | `/book/$n` | `/booking/book` | POST | USER | `Booking` (201) |
| 5a | Retry-safe booking | booking submit | `/booking/book` (`Idempotency-Key` header) | POST | USER | existing or new `Booking` |
| 6 | Booking confirmation | `/booking/confirmation/$pnr` | `/booking/pnr/{pnr}`, `/train/{n}` | GET | USER | `Booking`, `Train` |
| 7 | PNR tracking (public masked) | `/pnr` | `/booking/pnr/{pnr}` | GET | public | `Booking` (masked for non-owners) |
| 8 | Booking history | `/trips` | `/booking/my` | GET | USER | `Booking[]` |
| 9 | Trip detail + cancellation | `/trips/$pnr` | `/booking/pnr/{pnr}`, `/booking/cancel/{pnr}` | GET, DELETE | USER | `Booking` |
| 9a | Ticket PDF + email | confirmation / trip detail | `/booking/pnr/{pnr}/ticket.pdf`, `/booking/pnr/{pnr}/email` | GET, POST | owner or ADMIN | PDF, `{message}` |
| 10 | Registration | `/register` | `/auth/register`, `/auth/verify-otp`, `/auth/resend-otp` | POST | public | OTP challenge (202), then `AuthResponse` (201) |
| 11 | Login | `/login` | `/auth/login` | POST | public | `AuthResponse` |
| 12 | Session restore / logout | (app shell) | `/auth/me`, `/auth/logout` | GET, POST | cookie / public | `{user}`, `{ok}` |
| 13 | Profile edit / password | `/profile` | `/user/profile` (GET/PATCH), `/user/change-password` | GET/PATCH/POST | USER | `{user}`, `{ok}` |
| 14 | Travel assistant | `/assistant` | `/chatbot/ask` | POST | public | `ChatResponse` |
| 15 | Admin overview | `/admin` | `/admin/stats` | GET | ADMIN | `AdminStats` |
| 16 | Admin trains CRUD | `/admin/trains` | `/admin/trains`, `/train/add`, `/train/{n}` (PUT/DELETE) | GET/POST/PUT/DELETE | ADMIN | `Train[]`, `Train`, `{ok}` |
| 17 | Admin bookings | `/admin/bookings` | `/admin/bookings` | GET | ADMIN | `Booking[]` |
| 18 | Admin users | `/admin/users` | `/admin/users` | GET | ADMIN | `User[]` (no password) |
| 19 | Admin booking audit | `/admin/audit?pnr=&page=&size=` | `/admin/audit` | GET | ADMIN | paged audit events |
| — | Meta / health / banner | (app shell) | `/meta`, `/health` | GET | public | `Meta`, `{status}` |

## Request payloads (validated both sides)
- **Register:** `{name(2–100), email, password(8–100), phone?}` → Spring returns `{message,email}` (202) and sends a six-digit OTP.
- **Verify OTP:** `{email, otp(6 digits)}` → creates the account and returns `AuthResponse` (201).
- **Resend OTP:** `{email}` → `{message}` (200), limited by a 60-second cooldown.
- **Login:** `{email, password}`.
- **Profile PATCH:** `{name?(2–100), phone?(≤20)}`.
- **Change password:** `{currentPassword, newPassword(8–100)}`.
- **Booking:** `{trainNumber, journeyDate(YYYY-MM-DD), classType, passengers[1–6], boarding?, reservation?}`;
  passenger `{name(2–100), age(1–120), gender(M|F|O), berthPreference?}`.
- Booking clients send a stable `Idempotency-Key` per submit attempt. Replaying the same key and payload returns the original booking; reusing it with a different payload returns `409 IDEMPOTENCY_KEY_REUSED`.
- On successful booking, the Spring backend attempts to email ticket details and an attached PDF to the booking account email. The authenticated owner or an ADMIN can download the PDF or request another email using the ticket endpoints above.
- **Train add/update:** `{trainNumber(4–10), trainName, source, destination, departureTime?, arrivalTime?, durationMinutes?, distanceKm?, trainType?, daysOfRun?, classes[≥1]}`;
  class `{classType, totalSeats(≥1), fare(≥0), racLimit(≥0), waitingLimit(≥0)}`.
- **Chatbot:** `{question(1–500)}`.

## Error contract
All errors are `{code, message}` with the appropriate HTTP status:
`400 VALIDATION` (bean validation / malformed body), `401 UNAUTHORIZED` /
`INVALID_CREDENTIALS`, `403 FORBIDDEN`, `404 TRAIN_NOT_FOUND` / `PNR_NOT_FOUND` /
`USER_NOT_FOUND`, `409 EMAIL_EXISTS` / `TRAIN_EXISTS` / `TRAIN_HAS_BOOKINGS` /
`TRAIN_FULL`, `500 INTERNAL` (no stack traces leaked). The client maps these to
`ApiError(status, code, message)`; network failures map to `ApiError(0, "NETWORK")`.

## UI states (objective 11)
Every data-driven page implements **loading** (skeleton/spinner), **empty**
(`EmptyState`), **error** (`Alert` with the server message + retry where relevant),
and **unauthorized** (route guard redirect to `/login`; global 401 session clear).
Admin pages additionally enforce the ADMIN role at the route and the API (403).

## Verified status
- Frontend: type-check + production build pass; **40 unit/integration tests pass**;
  **15 live contract tests pass** against a running backend.
- Backend: compilation + **all Maven tests pass** on CI, including the H2
  `ApiContractTest` and the real-PostgreSQL `PostgresIntegrationTest`.
- Full-stack CI job boots the real Spring jar + PostgreSQL and runs the live
  contract suite end-to-end.

> The catalog remains **illustrative sample data**, not a live Indian Railways /
> IRCTC feed. `/meta` reports `mode:"production"` for Spring (persistent, JWT-auth)
> with a disclaimer; the demo fallback reports `mode:"demo"`. No live availability
> is invented and demo data is never presented as real production inventory.

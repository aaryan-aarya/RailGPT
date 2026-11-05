# RailGPT

A railway reservation and travel-assistance product: search trains, check class-wise
availability, book multi-passenger tickets, track PNR / RAC / waiting-list status,
cancel with automatic queue promotion, and manage everything from a role-guarded
admin console.

> **Honesty note.** RailGPT runs on an **illustrative catalog**, not a live Indian
> Railways / IRCTC feed. Train numbers and names are modeled on well-known services
> so the product feels familiar, but schedules, fares and capacities are sample
> values. The travel assistant is **rule-based, not an LLM**. The UI labels the
> environment accordingly. No payments are processed.

---

## Architecture

This is a small monorepo with three parts:

| Part | Stack | Role |
|------|-------|------|
| `src/` + `pom.xml` | **Spring Boot 3.2 · Java 17 · PostgreSQL** | The production backend. JWT auth, roles, ownership, transactional booking engine. |
| `frontend/` | **React 18 · Vite · TypeScript · TanStack Router/Query · Tailwind · Radix** | The entire user-facing product (13 features). |
| `demo-api/` | **Node · Express** | A lightweight reference API that mirrors the Spring contract exactly, so the product can be previewed without a Java/PostgreSQL setup. **Not for production.** |

The browser only ever calls same-origin relative URLs (`/api/...`). In development a
Vite proxy forwards `/api` to whichever backend you choose:

- **Demo API** on `:8090` (default) — zero setup, in-memory.
- **Spring Boot** on `:8081` — the real backend, backed by PostgreSQL.

Switch with `VITE_API_TARGET` (see below). The frontend code is identical in both modes.

---

## Features

1. **Landing page** — product identity and a search-first entry point.
2. **Register / login** — JWT sessions, validation, demo quick-fill (demo mode only).
3. **User dashboard** — upcoming trips and shortcuts.
4. **Train search** — source / destination / date, with live class-wise availability.
5. **Availability + class selection** — seat / RAC / waiting-list meters per class.
6. **Passenger booking** — 1–6 passengers on one PNR, berth preferences, 2-step wizard.
7. **PNR tracking** — public lookup masks personal data for non-owners.
8. **Booking history** — filterable, sortable trips table.
9. **Cancellation** — whole-PNR cancel; queued passengers are promoted automatically.
10. **RAC / WL information** — clear status chips, berth map and queue positions.
11. **Profile** — edit details, change password.
12. **Travel assistant** — rule-based answers about RAC/WL, PNR, fares, cancellations.
13. **Admin console** — role-guarded overview, train CRUD, bookings and users.

---

## Quick start

The **primary backend is Spring Boot + PostgreSQL** (`:8081`). The React frontend
(`:5173`) talks to it through the Vite dev proxy (`/api` → `:8081`). A Node demo
API (`:8090`) is kept only as an **optional fallback** for previewing the UI
without Java/PostgreSQL — its data is illustrative, never real inventory.

### Option A — the complete application (Spring Boot + PostgreSQL + React)

Requires **Java 17**, **Node 18+** and a reachable **PostgreSQL**. Maven is
optional — the `./mvnw` wrapper downloads it on first run (needs Maven Central).

```bash
# 1. Create a fresh database (never reuse the old incompatible schema).
createdb railgpt

# 2. Export configuration. Spring Boot reads ENV VARS (not a .env file), so export
#    them or use your process manager / IDE env. See .env.example for the list.
export DB_URL="jdbc:postgresql://localhost:5432/railgpt"
export DB_USERNAME="postgres"
export DB_PASSWORD="<your-db-password>"
export JWT_SECRET="$(openssl rand -base64 48)"   # >= 32 bytes
export CORS_ALLOWED_ORIGINS="http://localhost:5173"

# 3. Run the backend. Flyway applies migrations, Hibernate validates, then the
#    catalog + demo accounts are seeded (empty DB only).
./mvnw spring-boot:run                            # :8081

# 4. Frontend (second terminal). Defaults to the Spring backend on :8081.
cd frontend && npm install && npm run dev         # :5173, proxies /api -> :8081
```

Or run the frontend from the repo root (it defaults to the real backend):

```bash
node scripts/dev.mjs                              # frontend :5173 -> Spring :8081
```

Open `http://localhost:5173`. API docs: `http://localhost:8081/swagger-ui.html`.
For a production profile: `./mvnw spring-boot:run -Dspring-boot.run.profiles=prod`
(forces `ddl-auto=validate`, secure cookies; still no hardcoded credentials).

### Option B — demo fallback (no Java/DB needed)

```bash
node scripts/dev.mjs --demo                       # demo API :8090 + frontend :5173
# or manually:
cd demo-api && npm install && npm start           # :8090
cd frontend && VITE_API_TARGET=http://localhost:8090 npm run dev   # :5173
```

The UI shows a "Demo environment" banner in this mode. Demo data is **not** real
production inventory and is never presented as live Indian Railways availability.

**Seeded accounts** (created in both the demo API and the Spring backend):

| Role | Email | Password |
|------|-------|----------|
| User | `aarav@railgpt.app` | `Travel@123` |
| Admin | `admin@railgpt.app` | `Admin@123` |

> **Schema note.** The hardened backend uses a significantly upgraded schema
> (per-date / per-class inventory, multi-passenger bookings). Start with a **fresh
> database**; the old single-passenger schema is not compatible.

### Testing

```bash
# Frontend unit + API integration tests (mocked fetch; 40 tests)
cd frontend && npm test

# Frontend production type-check + build
cd frontend && npm run build

# Live API contract tests against a RUNNING backend using the real Zod schemas.
# Point at Spring (:8081) or the demo (:8090):
cd frontend && LIVE_API_URL=http://localhost:8081 npm run test:live

# Backend: full Maven suite (H2 unit + real-PostgreSQL Testcontainers integration)
./mvnw test                                       # needs Java 17 + Docker

# Demo engine tests
cd demo-api && npm test
```

CI (`.github/workflows/backend-ci.yml`) runs two jobs on every push to `main` /
`arena/**` and on PRs: **backend** (compile + all Maven tests incl. PostgreSQL
Testcontainers, with a guard that fails if the integration tests are skipped) and
**fullstack** (boots the real Spring Boot jar against a PostgreSQL service
container, then runs the frontend live contract suite + unit tests + build).

---

## Configuration

All secrets come from the environment — nothing sensitive is committed. See
[`.env.example`](.env.example) for the full list. Key variables:

| Variable | Purpose |
|----------|---------|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection (`DB_PASSWORD` required). |
| `JWT_SECRET` | JWT signing key, **≥ 32 bytes**. If unset, an ephemeral key is generated (dev only). |
| `JWT_EXPIRATION_MS` | Token lifetime (default 1h). |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed browser origins. |
| `COOKIE_SECURE` | `true` when served over HTTPS. |
| `SERVER_PORT` | Backend port (default `8081`). |
| `VITE_API_TARGET` | Backend the frontend dev proxy targets (default `:8081` Spring; set `:8090` for the demo fallback). |
| `LIVE_API_URL` | Base URL for the frontend live contract tests (`npm run test:live`). |
| `DEMO_PORT`, `DEMO_PERSIST`, `DEMO_JWT_SECRET` | Demo API only. |

---

## Booking engine

The engine is the heart of the product and is implemented identically in the demo
API (JavaScript) and the Spring backend (Java):

- **Per-(train, date, class) inventory**, derived from actual passenger rows — it can
  never drift out of sync with a stale counter.
- **Lowest-free-seat** allocation with realistic berth/coach patterns per class
  (SL/3A/2A/1A/CC/EC/2S).
- **RAC and waiting-list queues** with capacity limits; overflow beyond confirmed
  seats goes to RAC, then WL, then is rejected (`TRAIN_FULL`).
- **Cancellation** releases the whole PNR and **promotes** queued passengers
  (RAC → CONFIRMED, WL → RAC), renumbering queues deterministically.
- **Multi-passenger** bookings (1–6) on a single 10-digit PNR, with an aggregate
  status (`CONFIRMED` / `PARTIAL` / `RAC` / `WL` / `CANCELLED`).
- **Journey-date validation** (no past dates, up to 120 days in advance).
- **Concurrency safety** in Spring via a pessimistic lock per train inside a
  transaction.

---

## Security

- JWT auth accepted via **`Authorization: Bearer`** *and* an **httpOnly cookie**
  (the original code set a cookie but only read the header — now both work).
- **Roles** (`USER` / `ADMIN`) enforced with Spring Security; admin routes and train
  writes require `ADMIN`. Registration never trusts a client-supplied role.
- **Ownership** enforced on booking reads/cancels; non-owners get `403`.
- **Public PNR lookup masks** passenger names and hides the owner's email unless the
  viewer is the owner or an admin.
- **Enumeration-safe** login errors; BCrypt password hashing.
- **Consistent error contract** `{ code, message }` with proper HTTP statuses.
- **Bean validation** on every request body.
- **Externalized secrets** (DB password, JWT key) and explicit CORS origins.

---

## Database migrations (Flyway)

The schema is managed by **Flyway**, not `hibernate.ddl-auto=update`:

- Migrations live in `src/main/resources/db/migration/` (`V1__initial_schema.sql`).
- On startup Flyway applies pending migrations, then Hibernate runs with
  `ddl-auto=validate` (it checks the schema but never mutates it).
- `application-prod.properties` hard-codes `ddl-auto=validate` + Flyway enabled and
  contains **no credentials** — everything resolves from environment variables.
- The migration only `CREATE`s objects; it never drops/alters existing tables, so it
  will not overwrite an existing database.

> **Breaking schema change.** The hardened schema (per-date/per-class inventory,
> multi-passenger bookings) is incompatible with the original single-passenger
> schema. Use a **fresh database**. Pointing Flyway at an old incompatible database
> makes it fail loudly on the first `CREATE TABLE` — migrate such a database
> manually rather than risk data loss. See `DECISIONS.md`.

---

## Testing & verification status

| Component | What's verified | How |
|-----------|-----------------|-----|
| Demo API engine | ✅ 16/16 tests | `cd demo-api && npm test` |
| Frontend types + build | ✅ passes | `cd frontend && npm run build` |
| Frontend unit/render | ✅ 15/15 tests | `cd frontend && npx vitest run` |
| Spring compilation | ✅ passes (Java 17) | GitHub Actions **Backend CI** (`./mvnw test-compile`) |
| Spring unit tests (H2) | ✅ 31/31 pass | GitHub Actions **Backend CI** (`./mvnw test`) |
| Spring integration (PostgreSQL) | ✅ 7/7 pass, 0 skipped | GitHub Actions **Backend CI** (real PostgreSQL via Testcontainers) |

**Java test suites included:**
- `BookingServiceTest` — seat allocation, RAC/WL overflow, capacity, cancel +
  promotion, ownership, PNR masking, past-date rejection, PARTIAL status, berth
  patterns (H2, no Docker needed).
- `UserServiceTest` — registration, enumeration-safe login, BCrypt, profile/password.
- `TrainServiceTest` — search, class availability, CRUD, delete-with-bookings guard.
- `JwtUtilTest` — token subject/role, tamper/expiry/wrong-key rejection.
- `PostgresIntegrationTest` — **real PostgreSQL via Testcontainers**: Flyway
  migrations, JWT auth, roles, ownership, and the full booking flow over HTTP.
  Auto-skipped when Docker is unavailable (`disabledWithoutDocker = true`).

**Verification note.** The authoring sandbox has no JDK/Maven/Docker and blocks
Maven Central, so the Spring backend is compiled and tested on **GitHub Actions**
instead of locally. The `Backend CI` workflow compiles main + test sources with
Java 17 and runs the full suite: **38/38 tests pass, 0 failures, 0 skipped**,
including the 7-test real-PostgreSQL integration suite (see the latest run on the
[Actions tab](https://github.com/aaryan-aarya/RailGPT/actions/workflows/backend-ci.yml)).
To reproduce locally, run `./mvnw test` with Java 17, Maven Central access and a
Docker daemon (for Testcontainers); `./mvnw spring-boot:run` starts the API.
The frontend and demo API are built, tested and running in the sandbox.

### Continuous integration

`.github/workflows/backend-ci.yml` runs on pushes to `main` and `arena/**` branches,
on pull requests, and on manual dispatch. It uses Java 17 (Temurin) with Maven
dependency caching, compiles via the Maven wrapper, and runs **all** backend tests —
including the real-PostgreSQL Testcontainers integration suite (Docker is
preinstalled on the `ubuntu-latest` runner). A guard step fails the build if the
PostgreSQL integration tests were skipped rather than executed. Per-class test
totals and any failure details are published as check-run annotations and a job
summary; Surefire reports are uploaded as build artifacts. Testcontainers is
pinned to 1.21.4 (Boot 3.2.5's default 1.19.7 fails Docker discovery on current
runners and silently skips the integration suite).

---

## API overview

All endpoints return JSON; errors use `{ code, message }`. Auth via Bearer token or
the `token` cookie. Full interactive docs at `/swagger-ui.html` when the Spring
backend is running.

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`
- `GET/PATCH /user/profile`, `POST /user/change-password`
- `GET /train/all`, `GET /train/search`, `GET /train/{number}`, `GET /train/seats/{number}`
- `POST /train/add`, `POST /train/addAll`, `PUT/DELETE /train/{number}` *(admin)*
- `POST /booking/book`, `GET /booking/pnr/{pnr}`, `GET /booking/my`,
  `GET /booking/user/{email}`, `DELETE /booking/cancel/{pnr}`
- `GET /admin/stats`, `/admin/users`, `/admin/trains`, `/admin/bookings` *(admin)*
- `POST /chatbot/ask`
- `GET /meta`, `/health`, `/stations`

---

## Project layout

```
RailGPT/
├── src/                     # Spring Boot backend (production)
│   ├── main/java/.../       # config, controller, service, repository, entity, dto, exception
│   ├── main/resources/
│   │   ├── application*.properties
│   │   ├── seed-data.json
│   │   └── db/migration/    # Flyway SQL migrations (V1__initial_schema.sql)
│   └── test/java/.../       # BookingServiceTest, UserServiceTest, TrainServiceTest,
│                            # JwtUtilTest (H2) + PostgresIntegrationTest (Testcontainers)
├── frontend/                # React + Vite + TypeScript app
├── demo-api/                # Node reference API + engine tests (NOT the production backend)
├── scripts/dev.mjs          # local dev orchestrator
├── .env.example             # configuration template (no real secrets)
├── DECISIONS.md             # key design/engineering decisions
├── mvnw / mvnw.cmd          # Maven wrapper (downloads Maven on first run)
└── pom.xml                  # Maven build
```

See [`DECISIONS.md`](DECISIONS.md) for the reasoning behind the major choices.

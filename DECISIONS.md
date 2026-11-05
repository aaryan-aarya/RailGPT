# RailGPT — Design & Engineering Decisions

This records the consequential decisions made while building RailGPT, so the
reasoning is auditable. The user delegated these choices with the goal of a
real-feeling, large-scale product.

## Product decisions

**D1 — Journey date + per-(train, date, class) inventory.**
Bookings are for a specific date, and availability is tracked per train/date/class.
Past dates are rejected; bookings open up to 120 days ahead. Inventory is *derived
from passenger rows* rather than stored as a mutable counter, so it cannot drift.
*Why:* a real reservation system is date-specific; a single global seat counter is
the root cause of the original over/under-booking bugs.

**D2 — Classes & indicative fares, no payments.**
Supported classes: SL, 3A, 2A, 1A, CC, EC, 2S, each with realistic berth/coach
patterns and capacity. Fares are indicative sample values. No payment gateway is
integrated. *Why:* keeps the product honest and focused on reservation mechanics.

**D3 — Multi-passenger, single PNR.**
1–6 passengers per booking, each with an individual status/seat, under one 10-digit
PNR with an aggregate status (CONFIRMED / PARTIAL / RAC / WL / CANCELLED).
*Why:* matches how real group bookings work.

**D4 — Rule-based assistant, labeled honestly.**
The travel assistant answers from the catalog and booking state using keyword rules.
It is explicitly **not** an LLM and the UI says so. It masks personal data for
non-owners. *Why:* no verified LLM integration exists in the source; claiming "AI"
would be dishonest.

**D5 — Public PNR lookup masks personal data.**
Anyone can check a PNR, but passenger names are masked and the owner's email hidden
unless the viewer is the owner or an admin. *Why:* PNR status is a public utility,
but personal data must not leak.

**D6 — Frontend stack.**
React 18 + Vite + TypeScript; TanStack Router (code-based) + Query; Zustand for auth
state; Tailwind + Radix primitives; React Hook Form + Zod; TanStack Table; IBM Plex
Sans/Mono. *Why:* type-safe, accessible, code-split, and production-grade without a
heavy meta-framework.

## Backend hardening (Spring Boot preserved)

The existing Spring Boot + PostgreSQL backend was **kept and hardened**, not
replaced. All original routes remain; the data model was upgraded to support D1–D3.

- **Auth bridge fixed.** The original set an httpOnly cookie but the filter only read
  the `Authorization` header, so cookie sessions never authenticated. The filter now
  accepts **both** Bearer and cookie, parses defensively (invalid token → anonymous,
  never a 500), and populates role authorities.
- **Roles & ownership.** `USER`/`ADMIN` roles enforced via Spring Security; admin
  routes and train writes require `ADMIN`; booking reads/cancels enforce ownership.
  Registration never trusts a client-supplied role.
- **Booking engine correctness.** Ported 1:1 from the tested JavaScript reference:
  lowest-free-seat allocation, RAC/WL queues, idempotent rebalance/promotion on
  cancel, whole-PNR cancel, collision-checked 10-digit PNR, capacity pre-check with
  rollback. Concurrency is serialized with a **pessimistic lock per train** inside a
  transaction.
- **Error contract.** Typed `ApiException` + a global handler produce
  `{ code, message }` with correct HTTP statuses; no stack traces leak to clients.
- **Validation.** Bean Validation on every request body (passenger age/gender, date
  format, class, sizes).
- **Externalized secrets.** DB password and JWT key come from the environment; the
  JWT key is generated ephemerally if unset (dev) instead of being hardcoded. CORS
  origins are explicit, not `*`.
- **PII-safe masking.** Public PNR responses detach the entity before masking so the
  masked values are never persisted.

## Demo API (preview path)

A Node/Express reference API mirrors the Spring contract exactly so the product can
be previewed without Java/PostgreSQL. Its engine is covered by 16 `node:test` tests.
It is clearly labeled **demo / not for production** and the UI shows a demo banner
driven by `/meta`. The frontend is backend-agnostic: point `VITE_API_TARGET` at the
Spring backend to switch to the real thing with zero frontend changes.

## Schema migrations (Flyway)

Flyway owns the schema (`src/main/resources/db/migration/V1__initial_schema.sql`);
Hibernate runs `ddl-auto=validate` and never mutates it. `application-prod.properties`
forces `validate` + Flyway and holds **no credentials**. The migration only creates
objects (never drops/alters), so it cannot overwrite an existing database. Because
the hardened schema is a breaking change from the original single-passenger model,
a fresh database is required; an old incompatible database makes Flyway fail loudly
on the first `CREATE TABLE` (safer than silent data loss).

**Flyway version vs PostgreSQL 16 warning.** CI logs an informational notice that
Flyway 9.22.3 has only tested PostgreSQL up to 15. We deliberately keep 9.22.3:
it is the version Spring Boot 3.2.5 manages and the **final 9.x release** (no
9.22.4 exists), so there is no minor/patch upgrade that adds tested PG 16 support.
The only fix is Flyway 10.x — a major upgrade that splits PostgreSQL support into
a separate `flyway-database-postgresql` artifact and is the combination Boot 3.3+
(not 3.2.x) ships and tests. The warning is benign here: all 7 PostgreSQL 16
integration tests pass (migration applied, history recorded, Hibernate validation
OK, full booking/auth flows). Revisit Flyway 10 when the project upgrades to
Spring Boot 3.3+, as one deliberate upgrade rather than a warning-driven hack.

## Verification honesty

- Demo API engine: **16/16 tests pass**.
- Frontend: **type-check + production build pass**, **15/15 unit/render tests pass**,
  and it is served and proxy-verified. No headless browser is available in this
  environment, so UI runtime verification is build + jsdom render tests + HTTP
  checks — not a real-browser walkthrough.
- Spring backend: hardened, Flyway migrations added, and a full test suite written
  (H2 unit tests + a Testcontainers PostgreSQL integration test). The authoring
  sandbox has no JDK/Maven/Docker and blocks Maven Central, so verification runs on
  **GitHub Actions (`Backend CI`)**: compilation succeeds on Java 17 and **38/38
  tests pass (0 failures, 0 skipped)** — 31 H2/unit tests plus 7 real-PostgreSQL
  integration tests (Flyway migrations, JWT auth/roles/ownership, booking engine
  over HTTP). CI surfaced and we fixed three real defects: stale aggregate PNR
  status after RAC/WL promotion on cancellation, public-PNR masking that could
  auto-flush masked names from detached entities, and an immutable-collection
  merge crash when updating a train's running days. Testcontainers is pinned to
  1.21.4 because Boot 3.2.5's 1.19.7 fails Docker discovery on current runners
  (the integration suite silently skipped); the PG test client uses
  `JdkClientHttpRequestFactory` because Spring 6.1's `SimpleClientHttpRequestFactory`
  always streams bodies and cannot read a 401 on POST. Local reproduction:
  `./mvnw test` with Java 17 + Maven Central + Docker.

## Known limitations / future work

- Illustrative catalog, not a live IRCTC feed; no payments; no real Tatkal quota.
- Train-level pessimistic locking is correct but coarse; a per-(train,date,class)
  lock or an inventory row would raise throughput at very large scale.
- Flyway now owns the schema (`ddl-auto=validate`); a Flyway/Liquibase migration
  path from the OLD incompatible schema is intentionally not automated (fresh DB).
- The assistant is rule-based; an LLM could be added later behind the same contract.
- The Spring backend is verified on GitHub Actions (compile + 38/38 tests incl.
  real PostgreSQL); running it locally still requires Java 17, Maven Central
  access and Docker for the integration suite.

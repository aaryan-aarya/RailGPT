# RailGPT deployment and operations

This is a deployment template for the RailGPT sample application. It does not
connect to Indian Railways or process payments. Official railway/provider APIs
must be separately approved and configured before claiming those capabilities.

## Container deployment

## Free hosted demo on Render

`render.yaml` describes the free demo's Render API and frontend. The API uses
Neon PostgreSQL and Brevo SMTP rather than a Render free database or SMTP port
587. Create the Neon database first, then create the Render Blueprint from this
repository and enter the database URL/username/password and Brevo SMTP login/key
as secret values when prompted. The Blueprint generates independent JWT and OTP
secrets and sets the production CORS origin to the deployed frontend URL.

Neon JDBC URLs must use `jdbc:postgresql://...?...sslmode=require`. Brevo uses
`smtp-relay.brevo.com` and port `2525`; enter an SMTP key as the mail password,
and set `MAIL_FROM_ADDRESS` to a sender verified with Brevo. The Blueprint asks
for a one-time administrator email and password (at least 14 characters). After
the first successful API start, disable `BOOTSTRAP_ADMIN_ENABLED` and remove the
bootstrap email/password from Render. The demo seeds the illustrative train
catalog while keeping bundled sample accounts disabled. Render's free API can
sleep while idle; its free plan is not an always-on production SLA. Export
database backups before making changes to the Neon schema or environment.

The production Compose file runs PostgreSQL, the Spring API, and the static web
app behind Nginx. The API and database have no published host ports. Nginx binds
to loopback by default so a host-level TLS reverse proxy can reach it.

Before startup, configure `POSTGRES_ADMIN_PASSWORD`, `DB_PASSWORD` (a separate
application-role password), `JWT_SECRET` (at least 32 random bytes),
`OTP_HASH_SECRET` (a different random value, at least 32 bytes), and the exact
public HTTPS `CORS_ALLOWED_ORIGINS`. Configure `MAIL_HOST`, `MAIL_PORT`,
`MAIL_USERNAME`, and `MAIL_APP_PASSWORD` for your SMTP provider to enable email
verification and ticket delivery. Production startup now fails if required
secrets, secure cookies, HTTPS origins, or SMTP credentials are missing or left
as sample placeholders. SMTP STARTTLS is required. Do not put
production secrets in `.env` files committed to source control; use the hosting
platform's secret store. Start with:

```sh
docker compose -f compose.production.yml up --build -d
```

Terminate TLS at the public ingress/load balancer, forward the original
`X-Forwarded-Proto`, and set the public web origin to HTTPS. Configure trusted
proxy address ranges at that edge before using client-IP rate limiting; do not
trust arbitrary client-supplied forwarded headers. The included Nginx limits
login/OTP routes more tightly than general API routes, but deployments behind
another proxy should enforce the authoritative limit at the internet-facing
edge and tune per-client limits for their traffic.

The illustrative seed data and sample accounts are disabled in the production
profile. To create the first administrator on a fresh database, set
`BOOTSTRAP_ADMIN_ENABLED=true`, provide `ADMIN_BOOTSTRAP_EMAIL` and a unique
`ADMIN_BOOTSTRAP_PASSWORD` of at least 14 characters for the first startup, then
remove those values and restart with bootstrap disabled. The bootstrap never
promotes an existing account.

## Staff operations console

Administrators sign in at `/admin/login` with their registered email and
password. The console provides a booking desk (including ticket email resend and
cancellation), train catalog management, user role management, booking and staff
activity audit logs, failed email delivery retry, and backend readiness/runtime
metrics. Staff actions are written to the `admin_activity_events` table by
Flyway migration V6. Role changes take effect on the next API request; an admin
cannot demote their own account, and the final administrator cannot be demoted.
Use the console only over HTTPS and grant the ADMIN role sparingly.

The console manages this application's catalog and data. It does not manage
railway/provider integrations, payments, infrastructure secrets, or live train
operations, which require separate approved services and operational controls.

PostgreSQL initialization creates a separate application role for the API; the
database superuser is only used for container initialization, health checks and
backups. The init script runs only when PostgreSQL creates a new data volume. If
you attach an existing database volume, provision the restricted application
role and grants manually before starting the API.

## Health, metrics, and logs

- `GET /actuator/health/liveness` checks whether the process can run.
- `GET /actuator/health/readiness` includes the database readiness check.
- `GET /actuator/prometheus` exposes metrics and requires an admin account; keep
  it on a private monitoring network and configure the scraper accordingly.
- `GET /healthz` on the web container proxies the readiness probe for ingress.
- The transactional email outbox sends booking/ticket, cancellation, and passenger
  status-change notifications; it retries transient failures with exponential
  backoff and marks jobs `DEAD` after eight attempts. SMTP errors are logged
  without logging ticket contents or passenger details.

Configure centralized logs, metrics scraping, alerting for readiness failures,
HTTP 5xx/429 spikes, database saturation, and repeated email delivery failures.
The included stack does not provision a hosted monitoring vendor or alert
destination.

## Database backups and recovery

Create an ad-hoc custom-format backup from the Compose database service:

```sh
node scripts/backup-postgres.mjs
```

Set `BACKUP_DIR` to a protected destination if needed. The script uses the
database initialization account (default `railgpt_admin`) inside the database
container. Backups contain account,
booking, and passenger data: encrypt them, restrict access, define retention, and
store copies outside the application host. Schedule the script using the host's
task scheduler or a managed backup service; this repository does not install a
backup scheduler.

For production, use managed PostgreSQL backups or configure WAL archiving and
point-in-time recovery. A backup is not proven until it has been restored: do
regular restore drills into an isolated database and record recovery time and
data-loss objectives. Never test a restore against the live database.

## Release and security operations

- CI compiles the Java backend, runs its H2 and PostgreSQL integration suites,
  and builds/tests the frontend. Promote a known commit through staging before
  production and retain a rollback image/tag.
- Review dependency updates and container images; scan the built images and
  application dependencies in the deployment pipeline.
- Review the app against OWASP ASVS, keep API docs and Actuator metrics restricted
  to admins/private monitoring, and review account/session and privacy controls.
- Configure production HTTPS, domain/DNS, TLS renewal, database capacity,
  SMTP deliverability, and external secret rotation in the hosting environment.
- The local demo API and browser-only service previews are not production
  services. Do not route production traffic to them.

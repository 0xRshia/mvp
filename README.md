# هم‌قدم — Persian city events MVP

A Persian, RTL event-discovery and ticketing app built with React 19 and the Next.js App Router API on Vinext. The original Workers target uses Cloudflare D1; the VPS target uses persistent SQLite on Node.js. All authoritative user, booking, payment and event data lives in the database. Phone verification uses Kavenegar; paid checkout uses Zarinpal.

## Run locally

Registration deadlines use the Persian calendar and Tehran time. Event creation requires
`registrationDate` (`YYYY/MM/DD`) and `registrationTime` (`HH:mm`, five-minute increments)
in both JSON and multipart submissions. The deadline must be in the future and no later
than the event start. Catalog/detail responses expose `registration_ends_at` in epoch milliseconds.

Apply `drizzle/0004_event_registration_deadline.sql` before running this version against an
existing database. It preserves bookings and backfills every event's registration deadline
to exactly 24 hours before its start; near-term existing events may immediately close for
new registrations. New-event forms default to 24 hours before start, or the start itself
when less than 24 hours away. Missing deadlines in direct database inserts default to zero
and are closed for registration. Existing payment holds, payment recovery and ticket
cancellation keep their current rules. Closed events stay in discovery until event start,
but are excluded from recommendations.

The required `maps_url` field accepts complete HTTP/HTTPS links from any map provider
or website (maximum 2,048 characters). Links open directly in a separate tab; they
are never fetched, expanded, or embedded by the app. Credentials and non-web schemes
are rejected. Only supported explicit Google Maps coordinates are extracted; other
destinations keep unknown coordinates. Existing location data needs no migration.

Node.js 22.13+ is required.

```sh
npm ci
cp .env.example .env
npm run build
for migration in drizzle/*.sql; do
  node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file "$migration" || break
done
npm run dev
```

Apply all migrations in filename order once to a fresh local database. For an existing database, back it up and apply only migrations it has not received; do not rerun the initialization loop. The theme/recommendation update adds `drizzle/0001_curly_jetstream.sql`, which preserves existing records and leaves their unknown creation dates null. Ticketing adds `drizzle/0002_ticketing_checkin.sql`: additive ticket/scanner tables and nullable purchaser snapshots preserve existing purchases. Restart the preview after applying a migration. Preview URL: `http://localhost:5173`. `npm start -- --port 5173` serves the built Worker on the same port after stopping the development server. Local data persists under ignored `.wrangler/state`.

## Included flows

- Light and dark themes, defaulting to light with a device-local preference; cream, near-black, gray, and warm orange branding. Saved system preferences migrate to light.
- Suggested events from confirmed booking categories (including free registrations), followed by confirmed paid ticket popularity and newest creation dates. Suggestions respect discovery filters and exclude already-booked or unavailable events. Historical events with unknown creation dates appear after dated events in the same ranking tier and never receive a newly-added label.
- Discovery groups Free → Suggested → New → All in RTL swipeable rows, with eight-event previews and a final listing link. `/events` and `/events/free` show full filtered grids; `?view=new` orders known creation dates newest first, and `?view=suggested` preserves recommendation ranking with an eight-event cap. Browsing filters survive client navigation in memory; reloading restores defaults and never persists precise coordinates. The homepage title and introduction are centered above the location selector.
- Initial location choice, browser geolocation, manual city/neighborhood selection, straight-line distance sorting, category/text/date/free filters.
- Event details, finite or unlimited capacity, 1–6 tickets per order, free registration, paid holds and redirect to Zarinpal. Available-capacity badges use an orange tint and contrasting text in cards and booking panels; sold-out badges remain neutral. Free and paid events share an animated Persian hours/minutes/seconds countdown below the title in details and cards when less than 48 hours remain until registration closes. At expiry, the countdown becomes a registration-closed message. Reduced motion disables digit animations, not time updates; booking deadlines remain authoritative.
- Iranian phone normalization, expiring SMS OTPs, rate limits, single-use verification, database-backed sessions and logout.
- Reservation history has three tabs: رفته (ended confirmed bookings), پیش رو (unended confirmed bookings, live payment holds, and payments needing follow-up), and لغو شده (cancellations, failed bookings, and expired holds). Actual payment status labels and retry/recheck actions remain available. Confirmed history cards offer a full-width PDF download, followed by a full-width venue-location link when a stored destination or valid coordinates exist. Each purchased seat has a separate Persian ticket page with event address and its own persistent QR. PDF download is also available immediately after confirmation. Future unused free reservations can be cancelled.
- Separate host login, server-enforced host permissions, event creation and publish/pause controls, sales charts, and exact totals. Each event has a panel with purchaser name/phone search, paginated purchases, check-in totals, and UTF-8 CSV export of all matching purchases across pages. The overview retains its explicitly labeled current-page export.
- Public scanner-only staff page with an event-specific private link, camera/image QR reading, green admission confirmation, and duplicate-ticket warnings. Hosts can open, copy, share, or revoke the staff link from the event panel.
- Jalali input and display, Tehran timezone, Persian digits, Toman prices, responsive client navigation and self-hosted Iran Sans X. Critical WOFF2 weights are preloaded with optional font display to avoid late font swaps. Subtle stagger, tab, and state transitions respect reduced-motion preferences.
- A guarded WebMCP search tool on browsers supporting `document.modelContext`; normal UI works independently.

## Connect real providers

Set these in the local `.env` or the hosting platform's secret/environment settings. Never commit `.env`.

| Variable               | Purpose                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `KAVENEGAR_API_KEY`    | Kavenegar account API key                                                                                                    |
| `KAVENEGAR_TEMPLATE`   | Approved Verify Lookup template with `token`                                                                                 |
| `OTP_SECRET`           | Random secret of at least 32 characters for OTP HMAC                                                                         |
| `ZARINPAL_MERCHANT_ID` | Approved merchant identifier                                                                                                 |
| `APP_ORIGIN`           | Exact HTTPS application origin; used for the registered callback                                                             |
| `HOST_PHONES`          | Comma-separated Iranian mobile numbers allowed to host, e.g. `0912…` in full 11-digit form                                   |
| `SEED_SAMPLE_EVENTS`   | `true` for the requested sample Tehran café catalog; `false` to stop sample initialization and hide existing sample listings |

The callback is `/api/payments/callback`. Match its domain with the merchant account. Kavenegar needs an approved template and adequate account credit. Outside the temporary accounts described below, host privileges require both successful phone verification and a match in the server-side allowlist; signup cannot self-assign privileges.

Without credentials the UI reports that SMS/paid checkout is unavailable, unless the explicit payment bypass below is enabled. The temporary login below is the only SMS shortcut; other numbers still require OTP verification. There is no test OTP or automatic successful-payment fallback. The integration tests create isolated local fixtures and remove them afterwards. They do not contact providers.

Paid sample events never charge real money. Sample dates, capacities, prices and venue addresses are illustrative and do not advertise genuine café programs; this is disclosed in the product. Hosts can publish real events. Sample data is inserted once and stored with fixed dates. Notification delivery after reservation is deliberately deferred.

## Development payment bypass

Set the server-side `SKIP_PAY_DEV=true` in the ignored local `.env`, then restart the server. For a hosted demo or other deployment, explicitly configure the same variable in that Worker's environment and restart or redeploy. It works in any environment where enabled, including production builds. Only the exact string `true` enables it; missing, `false`, and other values disable it. The example configuration defaults to `false`; local configuration does not activate it on a deployed host.

New paid bookings, including visible paid sample events, immediately confirm without contacting Zarinpal or requiring gateway credentials. They continue to the ticket page with normal PDF/QR tickets and consume real capacity. Authentication, purchaser details, amount/quantity limits and event availability still apply. Free bookings retain their normal behavior.

Bypassed bookings retain their quoted prices but store `payment_state=skipped_dev`, with no payment reference, authority or hold expiry. The UI labels them as test bookings without a charge. They count as bookings and attendees, but not as collected revenue, sales amounts or paid-ticket popularity. Existing pending bookings still use their original payment retry/verification flow; repeating a request never changes its original payment mode.

Set `SKIP_PAY_DEV=false` or remove it and restart/redeploy to restore normal checkout for new bookings. Previously issued tickets remain valid and keep their test-booking label. No database migration is required.

## Temporary demo login

<!-- TODO(PRODUCTION): REMOVE_TEMP_LOGIN -->

Set the server-side `TEMP_LOGIN_ENABLED=true` in the ignored local `.env`, then restart the development server. For a hosted demo, set the same environment variable on that host and restart or redeploy so the Worker receives it. Only the exact value `true` enables this feature; an unset or `false` value disables it. No hosting changes are performed by the local setup.

| Phone | Role while enabled | Destination |
| --- | --- | --- |
| `09108624707` | Regular user | Reservations, or the valid requested event |
| `09108624708` | Host | Host dashboard |

These numbers log in immediately without SMS credentials or an OTP. Persian digits and equivalent `+98` numbers are accepted. They create real database accounts and the normal 30-day HttpOnly session cookie; repeated logins reuse the same account. Existing names are preserved; blank names use the supplied name or a Persian test-account label. No events or reservations are created by login. Server-side temporary roles take precedence over `HOST_PHONES` for these two numbers while enabled.

### Remove before production

1. Set `TEMP_LOGIN_ENABLED=false` (or remove it) and restart/redeploy. Remove both test numbers from `HOST_PHONES` if they were independently added there. This blocks new shortcut logins and removes the temporary host role. Already-issued sessions remain valid as ordinary users until revoked or expired.
2. Run `scripts/remove-temp-login-sessions.sql` against the intended database to revoke both accounts' sessions. For the local database described above, after a current build:

   ```sh
   node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file scripts/remove-temp-login-sessions.sql
   ```

   For a hosted database, run the same SQL through that database's SQL console or established deployment workflow; the local command does not revoke hosted sessions. The SQL deletes only these accounts' sessions. Review any dependent events and reservations separately before deciding whether to remove account data.
3. Find `TODO(PRODUCTION): REMOVE_TEMP_LOGIN` markers and remove the temporary account mappings, login branch, role exceptions, UI/configuration, tests and this documentation. Remove the cleanup SQL after using it on every intended database. No schema migration is needed.

## Validation

```sh
npm run typecheck
npm run build
# Builds must be current; the suite starts its own isolated local Worker:
npm run test:integration
# Catalog grouping and recommendation checks only (same isolated database):
npm run test:recommendations
# General location-link validation through JSON and multipart event creation:
npm run test:location-links
```

The integration suite is restricted to loopback. It creates an isolated temporary database, random test OTP secret and test accounts, starts the built Worker on port 5174, and removes its temporary database and process afterwards. It does not change your `.env` or development database. It verifies real API handlers and the same SQLite statements used by D1: concurrent overselling, idempotent retries, OTP replay/attempt limits, ownership, cancellations, host publishing, calendar rejection, missing-provider behavior, expiry, late confirmation, recovery and logout. Payment-bypass checks cover exact flag activation, paid sample bookings, stable tickets, capacity, existing payment holds, configuration changes and exclusion from revenue/popularity. Temporary-login checks cover both roles without SMS credentials, normalized numbers, persistent sessions, account reuse, host event creation, rate/origin checks, and disabled or missing configuration.

Ticketing checks cover stable unique QR issuance, purchase ownership, unpaid/cancelled/past-event behavior, attendee name/phone search, host isolation, full CSV export and formula escaping, event-scoped staff access, link revocation, and concurrent single-use check-in. Browser validation additionally checks the actual PDF pages and QR decoding. Real camera permissions and focus should be checked on the intended staff phones over HTTPS.

Live SMS delivery, gateway approval, provider timeouts, and bank settlement require a final test with real credentials. Browser geolocation permission behavior also depends on the device and HTTPS availability.

## Design decisions and why they matter

- **Ticket identity:** a cryptographically random 256-bit token identifies each seat; QR payloads contain no name, phone or reservation ID. Unique reservation/ordinal pairs keep tickets stable across retries and downloads. Only confirmed reservations issue tickets; existing confirmed purchases receive tickets on their first download. A previously downloaded ticket becomes unusable when its reservation is cancelled. The ticket artwork is rendered with the locally hosted Persian font into the PDF to preserve joining and RTL layout; text on these pages is rasterized, while app ticket details remain available as accessible HTML.
- **Purchaser identity:** checkout snapshots the purchaser name and verified phone onto the reservation. Multi-ticket orders appear as one purchase with a quantity; all pages carry the purchaser name. Individual guest-name collection is not part of this flow. Legacy reservations without snapshots use the existing account identity.
- **Staff access:** `/scanner#<private-token>` opens without an account. The secret remains in the URL fragment and is sent only in a request header; it does not enter server URL logs or referrers. The link grants check-in for one event, with no attendee-list, CSV, or buyer-phone access. Hosts can revoke it by generating a new link. Staff need internet access, and camera access requires HTTPS (or loopback during local testing).
- **Single admission:** a conditional database update checks the ticket, confirmed reservation, event, link validity, event end time, and unused status together. Concurrent staff scans produce exactly one admission; later attempts report the original check-in. A used reservation cannot be cancelled to release its occupied seats.

- **Atomic capacity:** a single conditional `INSERT … SELECT` counts confirmed seats and unexpired holds and reserves only when capacity permits. There is no application-side availability check followed by an unguarded insert. D1 serializes these writes.
- **Payment safety:** prices and rial totals are snapshotted server-side. Browser callbacks never prove payment. Normal paid checkout requires server-to-server verification codes 100/101 to finalize an order. A transactional batch either confirms within current capacity or records `paid_unfulfilled` for host follow-up. Duplicate confirmations allocate no extra seats. The explicit `SKIP_PAY_DEV` path confirms new bookings as `skipped_dev` in the capacity-checked insert, preserving a distinction between issued tickets and collected money.
- **Timeouts:** uncertain provider responses remain recoverable; they do not become success. Holds expire after 15 minutes without depending on a cleanup job. A paid late return that cannot reacquire capacity is clearly flagged for manual provider refund. Automatic refunds and scheduled reconciliation are not implemented; hosts use their gateway account for exceptional refunds, and users can recheck their payments.
- **Privacy:** precise coordinates stay in page memory. Location-based city selection uses the nearest catalog venue within 50 km, not administrative boundary geocoding. Manual city choice is available. Neighborhood distances use a labeled approximate center. Only the reservation owner and the corresponding authorized host can see attendee data.
- **MVP boundary:** hosts are approved by an environment allowlist; event capacity and price are immutable after creation. Discovery and personal history currently fetch all matching records, suitable for an initial catalog. Host attendee lists are paginated and summary totals use aggregate database queries.

## Primary references

- [Kavenegar Verify Lookup](https://kavenegar.com/rest.html#lookup)
- [Zarinpal connection and verification](https://www.zarinpal.com/docs/paymentGateway/connectToGateway)
- [Zarinpal currency](https://www.zarinpal.com/docs/paymentGateway/moreFeatures/currency)
- [Zarinpal verification behavior](https://www.zarinpal.com/docs/paymentGateway/moreFeatures/session-validation)
- [Zarinpal request minimum](https://www.zarinpal.com/docs/sdk/php/method/request) and [maximum/error codes](https://www.zarinpal.com/docs/paymentGateway/errorList)
- [D1 prepared statements and batches](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- Inspiration: [Tiwall](https://www.tiwall.com/) and [Visit Stockholm events](https://www.visitstockholm.com/events/).

Photo credits are available at `/credits`. Iran Sans X webfonts supplied by the project owner are in `public/fonts/iransansx/`, with provenance in `NOTICE.txt`. These are proprietary fonts; `public/fonts/OFL.txt` applies only to the retained legacy Vazirmatn assets.

## Publication

The logical database binding and reserved Site identity are in `.openai/hosting.json`; no provider secrets belong there. Sites publication requires a source push, saved version, and deployment. The repository owner's instructions require explicit approval before any remote push. On another Workers host, use the generated build and D1 migrations with the equivalent `DB` binding and environment variables. The separate VPS deployment below transfers the local source over SSH and requires no Git push.

## Docker (port 8082)

With Docker Engine and the Compose plugin available, run:

```sh
docker compose up --build --wait
```

Open `http://localhost:8082`. The image builds the existing Node standalone target,
runs as the unprivileged `node` user, and applies pending SQLite migrations before
starting the server on `0.0.0.0:8082`. A migration failure prevents startup.
`--wait` waits for the container to become healthy. `GET /api/health` checks that
the server can read the events table without authentication or sample-data
initialization. It returns uncached HTTP 200 when ready and HTTP 503 on database
failure, without exposing database details. Docker checks it every 30 seconds,
allows five seconds per check and a 30-second startup period, and marks the
container unhealthy after three consecutive failures. An unhealthy status does
not itself restart the container; the restart policy applies when the process exits.

Compose reads provider credentials and feature flags from your shell or a local
`.env` file (see `.env.example` for the available settings). Environment files are
excluded from the image. Set a random `OTP_SECRET` of at least 32 characters and
the real provider credentials to enable phone login and paid checkout. Without
configuration, the app starts with an empty catalog; sample events, temporary
login, and the payment bypass are disabled. An existing `.env` can explicitly
enable these flags. `APP_ORIGIN` defaults to `http://localhost:8082`; for a public
deployment, set it to the application's HTTPS origin. Behind a trusted reverse
proxy, set `VINEXT_TRUSTED_HOSTS` to the public host and configure the proxy to
overwrite forwarded headers, as in the existing Nginx deployment template.

The `mvp-data` named volume stores both `/data/mvp.sqlite` and `/data/uploads`.
Compose fixes these paths independently of any VPS paths in `.env`. Data survives
container rebuilds and `docker compose down`; `docker compose down --volumes`
deletes it. Back up the database and uploaded photos together before upgrades.
Use one app container with this SQLite volume. Existing untracked databases need
their migration history established before using the startup migrator.

```sh
docker compose ps
docker compose logs -f app
docker compose up --build --wait
docker compose down
```

To run the typecheck, SQLite, media, and Node integration suites inside the same
pinned Node image before deployment:

```sh
docker build --target verify --progress=plain .
```

The verification stage uses isolated test data, sends no external SMS or payment,
and is excluded from the final runtime image. Docker may reuse a successful test
layer when its inputs have not changed. The final image still needs a Compose
startup check: confirm healthy status, inspect `http://localhost:8082`, and verify
that database records and uploaded photos survive container recreation. Docker
Engine must be running and accessible; on WSL, enable Docker Desktop integration
for the distribution before running these commands.

## Node.js VPS deployment

The VPS target uses the existing Vinext standalone server and Node's SQLite driver. `npm run build:node` selects `db/node.ts` through `vite.config.ts`, while `npm run build` retains the Workers target. Both targets use the same application handlers and SQL migrations. Build outputs share `dist`, so rebuild for the intended target before starting it.

```sh
npm ci
npm run typecheck
npm run build:node
npm run test:sqlite
npm run test:integration:node
# Set DATABASE_PATH to an absolute path outside the source/release directory.
node --env-file=/etc/mvp/mvp.env scripts/migrate-node.mjs
HOST=127.0.0.1 PORT=3010 VINEXT_TRUSTED_HOSTS=dev.rshi.info \
  node --env-file=/etc/mvp/mvp.env dist/standalone/server.js
```

`scripts/migrate-node.mjs` applies unapplied migrations transactionally and records their checksums. It fails if an applied migration has changed. Never point it at an existing untracked database; establish its migration history first. The integration suite creates and removes its own temporary database and confirms that migrations can run twice safely.

Deployment layout for `https://dev.rshi.info`:

| Purpose | Server path |
| --- | --- |
| Timestamped source/build releases | `/opt/mvp/releases/` |
| Active release symlink | `/opt/mvp/current` |
| Persistent database | `/var/lib/mvp/mvp.sqlite` |
| Environment and secrets, readable by root and the service account | `/etc/mvp/mvp.env` |
| Pinned Node 22 runtime | `/opt/node/node-v22.23.2-linux-x64/bin/node` |
| Local database snapshots, newest 14 retained | `/var/backups/mvp/` |
| Nginx virtual host | `/etc/nginx/sites-available/dev.rshi.info` |

The templates are in `deploy/`. `mvp.service` runs as the unprivileged `mvp` user, listens only on loopback, applies migrations before startup, and restarts on failure. Nginx redirects HTTP to HTTPS and overwrites proxy headers so the app sees the original HTTPS origin and issues Secure session cookies. Let’s Encrypt renewal uses the webroot challenge and a deploy hook to validate/reload Nginx. The existing Certbot timer renews certificates.

The authorized development configuration enables `TEMP_LOGIN_ENABLED=true` and `SEED_SAMPLE_EVENTS=true`. `SKIP_PAY_DEV=false`; SMS and real paid checkout require provider credentials. `APP_ORIGIN=https://dev.rshi.info`. A server-generated OTP secret stays in the environment file and is never placed in the release archive.

Useful operations:

```sh
systemctl status mvp
journalctl -u mvp -n 100 --no-pager
systemctl restart mvp
systemctl start mvp-backup
systemctl list-timers mvp-backup.timer certbot.timer
certbot renew --cert-name dev.rshi.info --dry-run
```

`mvp-backup.timer` creates a daily consistent SQLite snapshot and checks its integrity before deleting old snapshots. These snapshots are local to this VPS; off-server disaster recovery is not configured. Back up before future releases. Build/test in a new timestamped directory, change `/opt/mvp/current` only after validation, then restart `mvp`. For a code rollback, restore the previous symlink and restart; database schema changes require a separately reviewed compatible rollback or restoration of a stopped database from backup.

**Learning Notes:** the Node adapter implements the prepared-statement methods used by this application and executes each batch in a synchronous SQLite transaction. It preserves numbered parameters, foreign keys, capacity checks, and rollback on errors. It is not a general replacement for the complete D1 API.

**Why This Matters:** the VPS runs a standalone application server with durable data, without depending on a Workers development emulator. This deployment uses one application process and one SQLite file; scaling to multiple servers would require a separate database design. Node 22's SQLite API is experimental, so the Node version is pinned and runtime upgrades should repeat the integration suite.

References: [Vinext standalone output](https://github.com/cloudflare/vinext#cli-reference), [Node 22 SQLite](https://nodejs.org/download/release/v22.23.2/docs/api/sqlite.html), [Nginx proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html), [Certbot renewal](https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates).


## Event creation and uploaded photos

Hosts publish events with a required Google Maps place/share link, a Persian calendar, and five-minute start/end time sliders. All dates and times use `Asia/Tehran`; the end must follow the start on the same day. Written directions are optional. Maps share links are stored without network resolution. Only an explicit coordinate query supplies distance data; events without coordinates remain visible by city and are excluded from proximity-only results.

A cover and up to six ordered gallery photos are optional. Supported formats are JPEG, PNG, and static WebP, up to 5 MiB per file and 20 MiB combined. Server validation checks actual file signatures, container structure and dimensions (12,000 pixels per side / 40 megapixels maximum); it does not fully decode compressed pixels. The complete multipart request is bounded to 21 MiB, including requests without a Content-Length header. Photos are sent only when the host publishes; form previews are local object URLs.

`POST /api/host` accepts a multipart `data` JSON field, one optional `cover` file, and repeated `gallery` files in display order. JSON requests continue to support publishing status changes and creation without photos. The server requires a valid `maps_url` for new events. Event summaries return nullable `image` (cover), `thumbnail` (cover or first gallery photo), `maps_url`, and coordinates. Event detail additionally returns ordered `{id,url}` gallery entries. `/api/media/[id]` serves only database-referenced media with the verified MIME type and `nosniff`. Promotional images remain public when ticket sales are paused.

For Node/VPS, set `MEDIA_PATH=/var/lib/mvp/uploads` in the service environment; it must be an absolute path outside release directories. The service account must own this directory. Existing systemd write access to `/var/lib/mvp` already covers it. The Nginx template sets `client_max_body_size 21m`. Missing storage produces a 503 for photo submissions; creating an event without photos still works.

For Workers, the hosting configuration declares the `BUCKET` R2 binding. Local development and integration tests use local R2. A real bucket must be provisioned and bound before deploying uploads to Cloudflare; this change does not provision remote resources. Do not place uploaded photos in the release's `public/` directory or in D1/SQLite.

The new migration replaces only the nullable columns, preserving the events table and its booking/ticket/scanner relationships. Do not replace it with a generated parent-table rebuild: foreign-key cascades would remove scanner links. Failed saves compensate stored files only after confirming the event did not commit. An uncertain database outcome retains files and logs the event ID for operator reconciliation.

The VPS backup job now writes a verified `.sqlite` snapshot together with a matching `.media` directory containing that snapshot's referenced immutable images. Keep each pair together and restore the image directory to `MEDIA_PATH` when restoring its database. A missing referenced image aborts the backup without deleting prior verified snapshots. Retention keeps the newest 14 pairs; older database-only backups remain supported.

Validation commands:

```sh
npm run typecheck
npm run test:sqlite
npm run test:media
npm run test:d1-migration
npm run build:node
npm run test:integration:node
npm run build
npm run test:integration
```

Builds share `dist`, so run each integration suite immediately after its corresponding build. The integration suites exercise real uploads, media reads, authorization, input limits, transaction rollback and restart persistence with isolated local storage; they send no external SMS or payment. The D1 migration test verifies populated legacy bookings, tickets, check-ins and scanner tokens through actual local Wrangler D1.


**Learning Notes:** authorization/origin/rate-limit failures discard at most 21 MiB of the pending upload stream, with a five-second time bound, without parsing or storing files. This avoids the Workerd unread-request-body failure reproduced by consecutive rejected multipart requests ([upstream report](https://github.com/cloudflare/workerd/issues/1730)).

**Why This Matters:** unauthorized uploads remain rejected before image processing, while the next request continues to work on both supported runtimes. Integration tests preserve the anonymous, regular-user, and cross-origin rejection sequence without retries.

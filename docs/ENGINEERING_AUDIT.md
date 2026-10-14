# Dentarith engineering takeover audit

Audit date: 2026-10-13 (Asia/Calcutta). Baseline commit:
`773ea1c36ee5b5015f4f1b3b6749f4142ef6ace4`.
This report distinguishes inspected code from verified runtime behavior.

## Repository, synchronization, and deployment

- Actual repository: `C:\Users\Yaswanth Nath\dentai\dentai`.
- Origin: https://github.com/nath2807/dentai (public).
- Initial branch: `main`, clean working tree, tracking `origin/main`.
- Read-only `git ls-remote origin HEAD refs/heads/main` matched local HEAD;
  `git rev-list --left-right --count HEAD...origin/main` returned `0 0`.
  No unpushed main commits or missing remote main commits at inspection time.
- Latest commit adds periodontal charting, PostgreSQL, and authentication.
  Previous commit `b31f89b` covers design/tooth-numbering transformation.
  These changes are available; the originating AI tool cannot be established
  from Git metadata. Work in another checkout or unsaved editor is unverified.
- GitHub combined commit status reports Vercel success. Production deployment
  `7022249573` points to the baseline SHA. Its latest success status is dated
  `2026-10-12T19:45:43Z`, targeting
  https://dentai-3ya1f6sjs-nath2807.vercel.app.
  See [Vercel's recorded check](https://vercel.com/nath2807/dentai/F7cJUwwxej4umuscA1Nz62Pey3zX)
  and [GitHub deployment metadata](https://api.github.com/repos/nath2807/dentai/deployments/7022249573/statuses).
- No tracked Vercel project configuration, GitHub Actions workflow, or migration
  command exists. Production database health, environment variable presence,
  custom-domain alias, and runtime clinical workflows remain unverified.
- Takeover edits are on `codex/engineering-takeover-audit`; nothing was pushed or deployed.

## Actual architecture and implementation

Single Next.js 16.4.0 App Router application, React/React DOM 19.3.0,
TypeScript 5.9.3, Tailwind 4.3.3, Zod 4.6.5, `@google/genai` 2.28.0,
`pg` 8.23.1, ESLint 9.39.5, and Vitest 3.2.4 (installed versions).
Local verification used Node 25.8.1 and npm 11.16.0. The installed Next guide
requires Node >=20.9; the README's old Node 18 prerequisite was inaccurate.

Routes include landing, case list/intake/detail/demo/report, reports, settings,
Gemini analysis, four auth endpoints, and six cloud endpoints. Shared UI is in
`src/components`; domain and storage code is in `src/lib`.

Clinical cases are saved in browser localStorage, not a dedicated patient
registry. Structured case metadata supports de-identified identifiers/history.
Clinical input/output schemas and local backup validation exist. Radiograph
binary data is stripped for storage; AI analysis receives `radiograph: null`.

Production factories select PostgreSQL and reject missing DATABASE_URL.
Development/test factories use memory when the database is unconfigured.
PostgreSQL stores users, JSONB case records, and audit events. Ownership is
per authenticated user; organization text is not a clinic tenancy model.
HMAC-SHA256 cookies and PBKDF2 password verification are custom implementations.
Redis REST rate limiting protects login/registration. SQL mutations and audit
inserts generally share transactions; updates use row locks and optional versions.

All historically referenced files exist, including `db-client.ts`, `db-migrate.ts`,
both PostgreSQL stores, `cloud-repository.ts`, `auth-service.ts`, `security.ts`,
API `route.ts` files, and `fail-closed.test.ts`.

Implemented code includes clinical intake, permanent-tooth chart, six-site
periodontal records, ranked differential display, evidence/contradiction/missing
information views, clinician review, printable reports, local backup/import,
synthetic benchmarks, settings authentication, and manual cloud sync/import.
These are implementations, not a declaration of production readiness.

The existing design uses white/slate clinical surfaces, navy/teal accents,
responsive layouts, visible focus rings, reduced-motion CSS, and print styles.
It already contains a substantial departure from the historical cyber theme.
Browser automation failed to initialize, so visual, keyboard, mobile, hydration,
and print-layout quality are not certified by this audit. Preserve this design
work while testing and refining it.

## Verification and limits

| Check | Baseline result | Current local verification |
| --- | --- | --- |
| Vitest | 16 files; 164 passed, 2 skipped | 17 files; 204 passed; live suite excluded |
| ESLint | Passed, no diagnostics | Passed, no diagnostics |
| TypeScript without emit | Passed | Passed |
| Production build | Passed; all listed routes compiled | Passed |
| Production dependency audit | npm reported zero vulnerabilities | No dependency changes |
| Local HTTP smoke | Eight UI URLs returned 200; `/api/auth/me` 200; unauthenticated cloud cases/audit 401 | No route changes |

The eight UI URLs were `/`, `/cases`, `/cases/new`, `/cases/demo`, `/settings`,
`/reports`, `/cases/audit-missing`, and `/cases/audit-missing/report`. Dynamic
missing-case pages return their shell; HTTP 200 does not prove client behavior.
No live AI request, live SQL migration, successful DB health query, registration, patient
record access, production API mutation, push, or deployment was performed.

Build/start warn about an unrelated package-lock in the user's home folder.
There is no measured performance profile. Unit tests named `workflow-e2e`
do not exercise a real browser. Live PostgreSQL assertions remain unverified;
the repaired six-check suite is now separate from the default tests.
Local `.env.local` contains a configured Gemini key; no values were displayed.
It does not document/configure the full production services.

## P0 — security and data integrity

| Finding | Evidence | Required outcome |
| --- | --- | --- |
| Redis HTTP errors fall back to memory in production; invalid responses can default to counter 1 | Baseline `src/lib/security.ts:149`; 13 of 19 new regression cases failed before the fix | **Fixed locally:** reject provider HTTP/JSON/counter failures; bound requests to 3 seconds; preserve development fallback |
| Baseline tests can inherit a live DB and delete whole tables | Baseline `postgres-integration.test.ts:26,44`; PostgreSQL `clear()` methods; auth/cloud fixtures call `clear()` | **Repaired locally:** credentials isolated; live suite requires explicit loopback test URL; persistent bulk clearing rejected; valid synthetic fixtures and connection-only teardown. Live assertions remain unverified |
| Account changes reuse local clinical records and sync cursor | `case-storage.ts:46`; `cloud-sync-client.ts:26,183,212` | Account-isolated storage/cursors; explicit treatment of existing anonymous records; no cross-account uploads/displays |
| Sync omits versions and can overwrite unsent local edits with pulled records | `cloud-sync-client.ts:213,245,256`; `postgres-cloud-repository.ts:483` | Persist/send server version; preserve conflict copies; only acknowledge successful items; do not overwrite dirty records |
| AI analysis lacks session/rate-limit guards | `src/app/api/analyze/route.ts:100` calls Gemini directly after validation | Protect production AI usage before outbound calls; test unauthenticated, limited, unavailable, and valid flows; retain an explicitly defined synthetic-demo policy |
| Database TLS accepts unverified certificates | `src/lib/db-client.ts:113` sets `rejectUnauthorized: false` | Verified TLS with provider CA/URL handling tested; confirm hosting requirements before changing production config |
| Explicit FDI references can select the wrong tooth | `src/lib/tooth-numbering.ts:72,86` strips prefix then searches Universal first | Explicit notation in input, persistence, display, and AI context; regressions for every overlapping number; no silent legacy reinterpretation |
| Complete cloud records are not validated | `cloud-types.ts:49` uses `z.any`; repository ignores parsed case result; `postgres-cloud-repository.ts:215,305,311` stores unvalidated analysis/review/form values/statuses | Shared full-record validation, state invariants, bounded data, safe errors; prevent invalid clinician sign-off and arbitrary image payloads in nested fields |

FDI 11 identifies the maxillary right central incisor, corresponding to Universal
#8. Current `findTooth("FDI 11")` strips FDI and chooses Universal #11 instead,
the maxillary left canine. The permanent-tooth mapping table and displayed
quadrant sequence align with the
[ADA Universal/ISO mapping](https://www.ada.org/-/media/project/ada-organization/ada/ada-org/files/publications/cdt/universal_tooth_designation_system_valueset_2.pdf);
the defect is in resolving notation, not the table. Current tests cover selected
conversions but omit these ambiguous inputs. Primary dentition is unsupported.

Further P0 investigation: sync/migration per-item errors serialize raw `err.message`
(`postgres-cloud-repository.ts:524,647`); transactional connection failures happen
outside `db-client.ts`'s error wrapper (`:149`); some auth/cloud routes emit raw
errors or verify sessions outside their try block. Add credential-leakage and
availability regressions before changing these paths. Do not claim an observed
production leak from static analysis alone.

## P1 — essential reliability and clinical correctness

- Run the repaired DB integration suite on an approved disposable local database.
  The baseline's always-skipped checks, missing foreign-key user fixtures, unused
  TEST_DATABASE_URL, and destructive cleanup were replaced. Six assertions now
  cover pool reopening, tenant isolation, concurrency, migration idempotence,
  rollback, and audit atomicity. No usable PostgreSQL/Docker runtime was available
  for real execution. See [POSTGRES_TESTING.md](POSTGRES_TESTING.md).
- Propagate deletion tombstones: the client neither queues deleted cases nor
  applies pulled deletions (`cloud-sync-client.ts:255`). Batch >100 cases needs
  chunking. Failed push results currently still advance the cursor and mark synced.
  Timestamp cursors are captured after the pull and can miss concurrent changes;
  use a consistent server boundary. Add client sync tests (currently absent).
- Validate tooth/arch/quadrant concordance at the API and import boundaries.
  Store notation explicitly; require a migration/review strategy for ambiguous
  historical records. Do not infer it from an overlapping tooth number.
- Bind clinician review attribution to authenticated identity for cloud records.
  Free-text `reviewedBy` and UI wording do not establish a verified electronic
  signature. Validate analysis/review status after findings change.
- Validate periodontal record keys/tooth identifiers, duplicate identities,
  supplied CAL consistency, and recorded BOP denominators. At present supplied
  CAL is trusted (`periodontal-types.ts:333`) and BOP can exceed 100% when positive
  BOP sites lack PD (`:317,325,350`). Aggregate site counts do not demonstrate
  complete six-site records for each tooth (`:355`). Clinical protocol changes
  require clinician review; do not replace these rules from intuition.
- Define safe session validation/revocation: `auth-service.ts:124` allows missing
  expiresAt in a correctly signed payload; no runtime session schema exists.
  Logout clears a cookie but does not revoke a copied signed token. Roles are
  declared but cloud access currently enforces ownership, not role capabilities.
- Establish one canonical SQL migration source and a reviewed execution path.
  Schema is duplicated in `db-migrate.ts`, `db-schema.sql`, and migration SQL.
  Existing advisory lock and transaction are useful safeguards; checksum/drift
  detection and constraints remain missing. Automatic async demo seeding from
  constructors can race and insert placeholder credentials; keep it out of production.
- Add CI for isolated tests, lint, types, build, and preview browser workflows.
  Confirm production configuration through authorized metadata and synthetic checks.

## P2 — UI/UX, documentation, and performance

- Validate current UI at desktop/mobile sizes, keyboard navigation, chart
  orientation, form errors, dark/light claims, and printed reports. Refine the
  established premium clinical palette without a wholesale redesign.
- Remove public demo-login defaults from production settings; represent sync
  error/pending/conflict states accurately. Migration backup failures currently
  only warn and consent defaults true in the client; make the recovery/consent
  flow match its stated guarantees.
- Replace outdated local-only and zero-cloud claims with actual local/cloud
  behavior; document required services and operating limitations.
- Profile large periodontal/chart pages before optimization. Batch sync/import
  use sequential DB operations; list/audit queries default to unbounded results.
  Add bounded pagination and provider/query timeouts based on measurements.
- Clarify pool error logging and serverless connection budgets; avoid raw
  provider error messages. Resolve the home-directory lockfile warning with
  reviewed framework root settings if it persists in the intended environment.

## P3 — future improvements

No new product features are approved by this takeover. After P0–P2 acceptance,
extend synthetic clinical benchmarks and measured performance coverage. Any
broader dental workflows or tenancy expansion must begin with founder and
clinician acceptance criteria and the existing architecture review.

## First five implementation tasks

1. **Rate limiter failure handling — implemented locally.** Regression tests
   reproduce production bypasses, reject invalid responses and HTTP/network
   failures, retain valid allow/deny behavior, and require a timeout signal.
2. **Safe database test lifecycle — implementation repaired; live verification open.**
   Default tests exclude live integration and isolate service/PG settings.
   Bulk PostgreSQL clears are disabled. A separate explicit local test command
   creates valid synthetic users, retains rows, and fails on unavailable services.
   Guard/failure paths passed; the six live assertions still need real execution.
3. **Account-scoped, lossless sync.** Acceptance: account switch never uploads
   another account's cases; second sync succeeds; local dirty copies survive
   conflicts; tombstones propagate; failed items remain pending; >100 cases work.
4. **Explicit tooth notation.** Acceptance: FDI 11 and Universal #11 resolve
   differently and correctly; all permanent teeth round-trip; incompatible
   anatomy is rejected; legacy ambiguous records are preserved for review.
5. **Protected AI and validated cloud records.** Acceptance: unauthorized or
   unconfigured production requests make no Gemini call; invalid records produce
   safe 4xx; review/analysis state and radiograph exclusions survive round-trips.

Before production implementation of tasks 3–5, settle how anonymous existing
records are assigned to accounts, how ambiguous tooth identifiers are reviewed,
and whether an unauthenticated synthetic AI demo remains a product requirement.
Do not delay independent security and test-isolation fixes for those decisions.

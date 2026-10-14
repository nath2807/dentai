<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Dentarith engineering conventions

Work on the existing clinical copilot. Preserve completed functionality and existing
instructions. See [README.md](README.md) for setup and
[docs/ENGINEERING_AUDIT.md](docs/ENGINEERING_AUDIT.md) for the takeover baseline,
known defects, acceptance criteria, and priority backlog.

### Architecture

- Next.js App Router and React/TypeScript live in `src/app`; shared clinical UI
  lives in `src/components`. Styling uses Tailwind and `src/app/globals.css`.
- Clinical input and AI output schemas are in `src/lib/clinical-case.ts` and
  `clinical-analysis.ts`. Tooth anatomy is centralized in `tooth-numbering.ts`;
  periodontal measurements and calculations live in `periodontal-types.ts`.
- Browser persistence is `case-storage.ts`; cloud transport is `cloud-sync-client.ts`.
  Current browser records and sync cursors are NOT scoped to accounts. Do not
  treat the current implementation as safe for shared-device patient records.
- `auth-service.ts` signs HMAC sessions and selects the user store. Production
  user/case stores use PostgreSQL via `db-client.ts`, `postgres-user-store.ts`,
  and `postgres-cloud-repository.ts`. SQL ownership is scoped by user ID.
- `/api/analyze` calls Gemini with validated text and excludes radiograph payloads.
  `/api/auth/*` provides authentication; `/api/cloud/*` provides cases, sync,
  audit events, and local-to-cloud case import. Cloud import is distinct from
  SQL schema migration (`db-migrate.ts`).

### Development and verification

1. Inspect relevant code and the installed Next.js guide before framework changes.
2. Define acceptance criteria and identify privacy/clinical consequences.
3. Implement the smallest appropriate change; preserve existing records and formats.
4. Add regression tests for security, storage, clinical calculations, and behavior changes.
5. Run targeted tests, `npm test`, `npm run lint`,
   `node node_modules/typescript/bin/tsc --noEmit --incremental false`, and
   `npm run build` as appropriate. Record skipped checks explicitly.
6. Explain the resulting behavior, verification, and remaining risks.

Use strict TypeScript and runtime validation at trust boundaries. Avoid `any`,
unchecked request casts, and raw error messages in public responses. Use SQL
parameters, transactions for mutations plus audit events, and expected versions
for concurrent changes. Do not mark analysis/review as current after clinical
findings change without verification. Browser interaction checks must use
synthetic fixtures in an isolated origin/profile.

`vitest.config.ts` clears inherited database, Redis, authentication, and Gemini
credentials for the default test suite. Keep this isolation. Do not load
`.env.local` into tests. PostgreSQL `clear()` methods deliberately reject bulk
clearing; keep destructive cleanup out of persistence providers.
The default suite excludes live integration. `npm run test:postgres` requires
explicit opt-in and a loopback `TEST_DATABASE_URL` for a disposable database;
see [docs/POSTGRES_TESTING.md](docs/POSTGRES_TESTING.md). It never falls back to
application DATABASE_URL. Review migrations and approve the disposable target
before running. Failed connectivity fails the command. Fixtures disable demo
seeding, create real synthetic users, and retain rows; teardown only closes pools.
Library tests named `workflow-e2e` are not browser end-to-end coverage.

### Dental domain rules

- Clinical support remains clinician-controlled. Missing or unrecorded findings
  must not become negative/normal findings. Do not create autonomous diagnoses,
  prescriptions, or treatment orders.
- Supported chart anatomy currently covers 32 permanent teeth. FDI quadrants are
  patient's upper right=1, upper left=2, lower left=3, lower right=4; positions
  run 1–8 from the midline. Viewer orientation must remain facing the patient.
- Keep notation explicit: Universal #8 = FDI 11; #19 = FDI 36; #30 = FDI 46.
  Bare numbers overlap between systems. Do not silently reinterpret legacy
  records or infer a numbering system from an overlapping number. Check arch
  and quadrant concordance. Use the ADA mapping linked in the audit as reference.
- Retain unrecorded periodontal values as null/undefined. Preserve the documented
  gingival-margin sign convention. Validate derived CAL against source
  measurements and use consistent recorded-site denominators for BOP.
- Clinical protocol/staging changes require authoritative sources and clinician
  review. Do not claim clinical validation from software tests.

### Security and data restrictions

- Never expose secrets or real patient data in tool output, logs, tests, screenshots,
  commits, or documentation. Inspect configuration by variable names/presence only.
- Do not connect to an unknown live database: development store constructors can
  seed demo rows. Do not run destructive SQL, production schema migrations, or
  whole-table cleanup without explicit approval.
- Production persistence must fail closed if PostgreSQL is unconfigured.
  Authentication needs a strong server-side secret and secure HTTP-only cookies.
  Distributed rate limiting must fail closed on all provider failures.
- Keep raw radiographs out of cloud/AI payloads. Validate full records, including
  form values, analysis, review, status, and timestamps; do not assume TypeScript
  interfaces protect API input. Scope access to the authenticated user on every query.
- Do not enable public demo credentials in production. Treat certificate
  verification bypasses and logging raw provider errors as unresolved defects.

### Git and deployment safeguards

- Inspect status, branch, HEAD, and remote state first. Preserve uncommitted work.
  Use a dedicated `codex/*` development branch for substantial changes.
- Do not reset, clean, rebase others' work, force-push, or overwrite founder work.
  Do not push until review and validation are complete.
- Do not deploy to production without explicit approval. A passing build or Vercel
  status does not prove runtime database/authentication configuration is correct.
- Before any approved deployment, confirm the intended commit, environment,
  migration plan, rollback/recovery plan, required variable presence, test results,
  and deployment status. Keep production changes separate from local audit work.

# Disposable PostgreSQL integration tests

`npm test` is the offline suite. It strips inherited service and PostgreSQL
environment settings and excludes `postgres-integration.test.ts`. Bulk
`clear()` is disabled on PostgreSQL stores; in-memory fixtures retain their
normal reset behavior.

`npm run test:postgres` is a separate opt-in suite. Before using it, provision
and explicitly approve a disposable PostgreSQL database on loopback, then review
`src/lib/db-migrate.ts`. The suite applies migrations and writes synthetic users,
cases, and audit events. Never point it at an application, production, or patient
database, including a production database forwarded through a local tunnel.

## Target requirements

- Set `RUN_POSTGRES_INTEGRATION_TESTS` to exactly `true`.
- Supply `TEST_DATABASE_URL` directly; no `.env.local` loading or DATABASE_URL fallback.
- Use `postgres://` or `postgresql://`, an explicit user, and `localhost`,
  `127.0.0.1`, or `[::1]`.
- Name the database `dentarith_test` or `dentarith_test_*`.
- Query options and URL fragments are rejected to prevent connection overrides.
- The local test connection uses plain PostgreSQL; inherited PGSSL mode,
  passwords, options, and other service credentials are isolated by the config.

In a separate PowerShell terminal, set only the explicitly approved test
connection (replace the placeholder locally; do not share its value):

```powershell
$env:RUN_POSTGRES_INTEGRATION_TESTS = 'true'
$env:TEST_DATABASE_URL = '<approved disposable local PostgreSQL URL>'
npm run test:postgres
```

This command is intentionally a startup failure without explicit opt-in or with
an invalid target. With a valid target, unavailable PostgreSQL fails the suite
before migration/fixtures. It does not report success by conditionally skipping
the meaningful assertions. The suite also verifies the server's database name
before applying migrations. A database's name and hostname do not prove it is
disposable; the operator must verify that before opting in.

## Coverage and lifecycle

The six tests cover migration idempotence, persistence after reopening a pool,
user-scoped reads/updates/lists/audit records, concurrent version conflicts,
and rollback of both case insertion and case update if audit insertion fails.

Fixtures create valid synthetic users before foreign-key case records. Each run
uses unique IDs and disables automatic demo seeding. Teardown only closes the
pool. It performs no DELETE, TRUNCATE, DROP, or global clearing. Synthetic rows
remain for inspection; the database owner manages its lifetime separately.
No automatic destructive database disposal is included.

## Verification status

2026-10-13: default tests and target/cleanup safety regressions passed. Missing
opt-in and an unreachable loopback target were verified to return failure.
No usable local PostgreSQL/Docker runtime was available, so the six live
assertions have not passed against a real server. Do not treat their presence
as evidence of verified durable persistence.

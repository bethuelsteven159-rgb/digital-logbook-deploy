# Non-destructive database migration path

This folder replaces the old destructive reset flow.

## What changed

- `setup.js` no longer drops the `public` schema.
- `migrate.js` applies ordered SQL migrations once and records them in `schema_migrations`.
- Every migration runs inside a transaction. If it fails, PostgreSQL rolls it back.
- The runner rejects `DROP SCHEMA`, `DROP TABLE`, `TRUNCATE`, and `ALTER TABLE ... DROP COLUMN`.
- Applied migration files are checksum-protected so they cannot be silently edited later.
- `inspect.js` writes a schema-only snapshot without exporting row data or secrets.
- Seeding is intentionally NOT part of setup/migration.

## Important first step

Your current `DATABASE_URL` contains a literal `...` in the hostname. Fix that first by copying
the complete connection string from Neon.

## Recommended workflow for your current database

1. Restore the Neon database to the desired point in time if needed.
2. Fix `server/.env` so `DATABASE_URL` contains the complete Neon hostname.
3. Put `migrate.js`, `setup.js`, `inspect.js`, and the `migrations/` folder inside `server/db/`.
4. Run:

   node db/inspect.js

5. Review `db/schema-snapshot.json`. This is the actual live schema and should be compared with
   the application code and any old `schema.sql`.
6. Only after the live schema is understood, create numbered migrations such as:

   db/migrations/001_add_missing_entry_links.sql
   db/migrations/002_add_format_versions.sql

7. Apply migrations with:

   node db/migrate.js

   or:

   node db/setup.js

Both commands are non-destructive.

## Do not convert an unverified old schema.sql into a migration

`CREATE TABLE IF NOT EXISTS` is safe for existing tables, but it does NOT add missing columns,
constraints, or changed definitions to a table that already exists. If `schema.sql` may be stale,
the live schema snapshot must be treated as the starting point.

## Seeding

Keep test/demo seed data separate from production migrations. Your existing `seed.sql` inserts
test records, so do not run it automatically against production.
